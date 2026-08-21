import "server-only";

import { embed, embedMany } from "ai";

import { embeddingModel } from "../server/ai.ts";

/**
 * Embedding access for indexing and querying (`docs/TECH.md` 15, 28.1).
 *
 * Indexing batches, because Liara's endpoint accepts arrays and one request per
 * chunk would multiply cost and latency for no benefit.
 */

/** Upper bound on inputs per request. */
export const EMBED_BATCH_SIZE = 64;

/**
 * Upper bound on characters per request.
 *
 * Count alone is not enough: chunks run up to ~5,000 characters, so 64 of them
 * reaches ~320,000 characters and the API returns a response the client cannot
 * parse. 196,000 was measured working and 320,000 failing, so this sits
 * deliberately below the proven-good figure.
 */
export const EMBED_BATCH_CHARS = 150_000;

/** Splits values into requests bounded by both count and total characters. */
export function planEmbeddingBatches(values: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let chars = 0;

  for (const value of values) {
    const tooMany = current.length >= EMBED_BATCH_SIZE;
    const tooLong = current.length > 0 && chars + value.length > EMBED_BATCH_CHARS;

    if (tooMany || tooLong) {
      batches.push(current);
      current = [];
      chars = 0;
    }

    current.push(value);
    chars += value.length;
  }

  if (current.length > 0) batches.push(current);
  return batches;
}

export async function embedQuery(query: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel(), value: query });
  return embedding;
}

export async function embedBatch(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];

  const all: number[][] = [];
  for (const batch of planEmbeddingBatches(values)) {
    const { embeddings } = await embedMany({ model: embeddingModel(), values: batch });
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
