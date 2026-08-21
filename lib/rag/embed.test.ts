import { describe, expect, it } from "vitest";

import { EMBED_BATCH_CHARS, EMBED_BATCH_SIZE, planEmbeddingBatches } from "./embed";

/**
 * Batching is bounded by characters as well as count. Count alone sent ~320,000
 * characters in one request against the real Liara endpoint and the response
 * came back unparseable, which failed a full production index run.
 */
describe("planEmbeddingBatches", () => {
  it("returns nothing for no input", () => {
    expect(planEmbeddingBatches([])).toEqual([]);
  });

  it("keeps small inputs in one batch", () => {
    expect(planEmbeddingBatches(["a", "b", "c"])).toEqual([["a", "b", "c"]]);
  });

  it("caps a batch at the count limit", () => {
    const values = Array.from({ length: EMBED_BATCH_SIZE + 5 }, () => "x");
    const batches = planEmbeddingBatches(values);

    expect(batches[0]).toHaveLength(EMBED_BATCH_SIZE);
    expect(batches[1]).toHaveLength(5);
  });

  it("splits on the character budget before the count limit", () => {
    // Ten inputs of 20,000 chars: far under 64 by count, far over by size.
    const values = Array.from({ length: 10 }, () => "x".repeat(20_000));
    const batches = planEmbeddingBatches(values);

    expect(batches.length).toBeGreaterThan(1);
    for (const batch of batches) {
      const chars = batch.reduce((sum, v) => sum + v.length, 0);
      expect(chars).toBeLessThanOrEqual(EMBED_BATCH_CHARS);
    }
  });

  it("never drops or reorders values", () => {
    const values = Array.from({ length: 200 }, (_, i) => `v${i}`.repeat(500));
    expect(planEmbeddingBatches(values).flat()).toEqual(values);
  });

  it("keeps an oversized single value rather than losing it", () => {
    const huge = "x".repeat(EMBED_BATCH_CHARS * 2);
    expect(planEmbeddingBatches([huge])).toEqual([[huge]]);
  });
});
