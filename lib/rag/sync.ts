import type { DocChunk } from "./types";

/**
 * Incremental index synchronization (`docs/TECH.md` 15).
 *
 * Embeddings cost money, so text that has not changed is never re-embedded.
 * Identity is `source_path + chunk_index`; `content_hash` decides whether the
 * text behind that identity moved.
 *
 * The planning half is pure and the I/O sits behind `ChunkStore`, so the
 * decision logic is testable without a database or an AI provider.
 */

/** What the planner needs to know about a row already in the index. */
export type ExistingChunk = {
  sourcePath: string;
  chunkIndex: number;
  contentHash: string;
};

export type SyncPlan = {
  unchanged: DocChunk[];
  /** New rows and changed rows both need an embedding before writing. */
  toEmbed: DocChunk[];
  inserted: DocChunk[];
  updated: DocChunk[];
  /** Rows whose file or chunk no longer exists. */
  toDelete: ExistingChunk[];
};

export type SyncSummary = {
  filesRead: number;
  chunksGenerated: number;
  unchanged: number;
  embedded: number;
  inserted: number;
  updated: number;
  deleted: number;
  failures: number;
};

export interface ChunkStore {
  listExisting(): Promise<ExistingChunk[]>;
  upsert(chunks: { chunk: DocChunk; embedding: number[] }[]): Promise<void>;
  deleteChunks(keys: ExistingChunk[]): Promise<void>;
}

const identity = (sourcePath: string, chunkIndex: number) =>
  `${sourcePath}#${chunkIndex}`;

/**
 * Decides what to embed, write, and delete. Pure — no I/O, no side effects.
 */
export function planSync(
  incoming: DocChunk[],
  existing: ExistingChunk[],
): SyncPlan {
  const existingByKey = new Map(
    existing.map((row) => [identity(row.sourcePath, row.chunkIndex), row]),
  );

  const plan: SyncPlan = {
    unchanged: [],
    toEmbed: [],
    inserted: [],
    updated: [],
    toDelete: [],
  };

  const seen = new Set<string>();

  for (const chunk of incoming) {
    const key = identity(chunk.sourcePath, chunk.chunkIndex);
    seen.add(key);
    const previous = existingByKey.get(key);

    if (!previous) {
      plan.inserted.push(chunk);
      plan.toEmbed.push(chunk);
      continue;
    }

    if (previous.contentHash === chunk.contentHash) {
      plan.unchanged.push(chunk);
      continue;
    }

    plan.updated.push(chunk);
    plan.toEmbed.push(chunk);
  }

  for (const row of existing) {
    if (!seen.has(identity(row.sourcePath, row.chunkIndex))) {
      plan.toDelete.push(row);
    }
  }

  return plan;
}

/**
 * Applies a plan: embeds only what changed, writes it, removes stale rows.
 *
 * Deletion runs last so a failed embedding leaves the previous index intact
 * rather than half-emptied.
 */
export async function applySync(
  plan: SyncPlan,
  store: ChunkStore,
  embedBatch: (values: string[]) => Promise<number[][]>,
): Promise<{ embedded: number; deleted: number }> {
  let embedded = 0;

  if (plan.toEmbed.length > 0) {
    const embeddings = await embedBatch(plan.toEmbed.map((chunk) => chunk.content));

    if (embeddings.length !== plan.toEmbed.length) {
      throw new Error(
        `Embedding count mismatch: expected ${plan.toEmbed.length}, received ${embeddings.length}.`,
      );
    }

    await store.upsert(
      plan.toEmbed.map((chunk, index) => ({ chunk, embedding: embeddings[index] })),
    );
    embedded = embeddings.length;
  }

  if (plan.toDelete.length > 0) {
    await store.deleteChunks(plan.toDelete);
  }

  return { embedded, deleted: plan.toDelete.length };
}

export function summarize(
  plan: SyncPlan,
  filesRead: number,
  applied: { embedded: number; deleted: number },
  failures = 0,
): SyncSummary {
  return {
    filesRead,
    chunksGenerated:
      plan.unchanged.length + plan.inserted.length + plan.updated.length,
    unchanged: plan.unchanged.length,
    embedded: applied.embedded,
    inserted: plan.inserted.length,
    updated: plan.updated.length,
    deleted: applied.deleted,
    failures,
  };
}
