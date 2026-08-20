import "server-only";

import { embed, embedMany } from "ai";

import { embeddingModel } from "@/lib/server/ai";

/**
 * Embedding access for indexing and querying (`docs/TECH.md` 15, 28.1).
 *
 * Indexing batches, because Liara's endpoint accepts arrays and one request per
 * chunk would multiply cost and latency for no benefit.
 */

/** Conservative batch size; large enough to matter, small enough to retry cheaply. */
export const EMBED_BATCH_SIZE = 64;

export async function embedQuery(query: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel(), value: query });
  return embedding;
}

export async function embedBatch(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];

  const all: number[][] = [];
  for (let i = 0; i < values.length; i += EMBED_BATCH_SIZE) {
    const { embeddings } = await embedMany({
      model: embeddingModel(),
      values: values.slice(i, i + EMBED_BATCH_SIZE),
    });
    all.push(...embeddings);
  }

  return all;
}

/**
 * Asks the configured model for its embedding width by embedding one token.
 *
 * The migration needs this before the vector column can exist, and it is the
 * only trustworthy source — model catalogs drift.
 */
export async function resolveEmbeddingDimensions(): Promise<number> {
  const probe = await embedQuery("liara");
  if (!Array.isArray(probe) || probe.length === 0) {
    throw new Error("Embedding model returned no vector; cannot resolve dimensions.");
  }
  return probe.length;
}

/** pgvector accepts a bracketed literal: [0.1,0.2,...]. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
