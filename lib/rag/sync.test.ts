import { describe, expect, it, vi } from "vitest";

import { applySync, type ChunkStore, type ExistingChunk, planSync, summarize } from "./sync";
import type { DocChunk } from "./types";

function chunk(
  sourcePath: string,
  chunkIndex: number,
  contentHash: string,
): DocChunk {
  return {
    sourcePath,
    sourceUrl: `https://docs.liara.ir/${sourcePath}/`,
    title: "Doc",
    heading: `H${chunkIndex}`,
    service: "paas",
    platform: "nextjs",
    chunkIndex,
    content: `content-${contentHash}`,
    contentHash,
  };
}

const existing = (
  sourcePath: string,
  chunkIndex: number,
  contentHash: string,
): ExistingChunk => ({ sourcePath, chunkIndex, contentHash });

function fakeStore(rows: ExistingChunk[] = []) {
  const upsert = vi.fn<ChunkStore["upsert"]>(async () => {});
  const deleteChunks = vi.fn<ChunkStore["deleteChunks"]>(async () => {});
  const store: ChunkStore = {
    listExisting: async () => rows,
    upsert,
    deleteChunks,
  };
  return { store, upsert, deleteChunks };
}

describe("planSync", () => {
  it("treats everything as new against an empty index", () => {
    const plan = planSync([chunk("a.md", 0, "h1")], []);
    expect(plan.inserted).toHaveLength(1);
    expect(plan.toEmbed).toHaveLength(1);
    expect(plan.unchanged).toHaveLength(0);
  });

  it("does not re-embed a chunk whose hash is unchanged", () => {
    const plan = planSync([chunk("a.md", 0, "h1")], [existing("a.md", 0, "h1")]);
    expect(plan.unchanged).toHaveLength(1);
    expect(plan.toEmbed).toHaveLength(0);
    expect(plan.updated).toHaveLength(0);
  });

  it("re-embeds a chunk whose content changed", () => {
    const plan = planSync([chunk("a.md", 0, "h2")], [existing("a.md", 0, "h1")]);
    expect(plan.updated).toHaveLength(1);
    expect(plan.toEmbed).toHaveLength(1);
    expect(plan.inserted).toHaveLength(0);
  });

  it("marks a removed chunk for deletion", () => {
    const plan = planSync([], [existing("gone.md", 0, "h1")]);
    expect(plan.toDelete).toEqual([existing("gone.md", 0, "h1")]);
  });

  it("deletes only the trailing chunks when a file shrinks", () => {
    const plan = planSync(
      [chunk("a.md", 0, "h1")],
      [existing("a.md", 0, "h1"), existing("a.md", 1, "h2")],
    );
    expect(plan.unchanged).toHaveLength(1);
    expect(plan.toDelete).toEqual([existing("a.md", 1, "h2")]);
  });

  it("keys identity by path and index together", () => {
    const plan = planSync(
      [chunk("a.md", 0, "h1"), chunk("b.md", 0, "h1")],
      [existing("a.md", 0, "h1")],
    );
    expect(plan.unchanged.map((c) => c.sourcePath)).toEqual(["a.md"]);
    expect(plan.inserted.map((c) => c.sourcePath)).toEqual(["b.md"]);
  });

  it("handles a mixed run", () => {
    const plan = planSync(
      [chunk("a.md", 0, "same"), chunk("a.md", 1, "changed"), chunk("new.md", 0, "fresh")],
      [existing("a.md", 0, "same"), existing("a.md", 1, "old"), existing("old.md", 0, "x")],
    );

    expect(plan.unchanged).toHaveLength(1);
    expect(plan.updated).toHaveLength(1);
    expect(plan.inserted).toHaveLength(1);
    expect(plan.toDelete).toHaveLength(1);
    expect(plan.toEmbed).toHaveLength(2);
  });
});

describe("applySync", () => {
  it("embeds nothing and writes nothing when the index is current", async () => {
    const plan = planSync([chunk("a.md", 0, "h1")], [existing("a.md", 0, "h1")]);
    const { store, upsert, deleteChunks } = fakeStore();
    const embed = vi.fn(async () => []);

    const result = await applySync(plan, store, embed);

    expect(embed).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteChunks).not.toHaveBeenCalled();
    expect(result).toEqual({ embedded: 0, deleted: 0 });
  });

  it("embeds only changed chunks and pairs each with its vector", async () => {
    const plan = planSync(
      [chunk("a.md", 0, "same"), chunk("a.md", 1, "changed")],
      [existing("a.md", 0, "same"), existing("a.md", 1, "old")],
    );
    const { store, upsert } = fakeStore();
    const embed = vi.fn(async (values: string[]) => values.map(() => [0.1, 0.2]));

    const result = await applySync(plan, store, embed);

    expect(embed).toHaveBeenCalledOnce();
    expect(embed.mock.calls[0][0]).toEqual(["content-changed"]);
    expect(upsert.mock.calls[0][0]).toEqual([
      { chunk: expect.objectContaining({ contentHash: "changed" }), embedding: [0.1, 0.2] },
    ]);
    expect(result.embedded).toBe(1);
  });

  it("refuses a mismatched embedding count rather than misaligning vectors", async () => {
    const plan = planSync([chunk("a.md", 0, "h1"), chunk("a.md", 1, "h2")], []);
    const { store, upsert } = fakeStore();
    const embed = vi.fn(async () => [[0.1]]);

    await expect(applySync(plan, store, embed)).rejects.toThrow(/mismatch/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("leaves the existing index intact when embedding fails", async () => {
    const plan = planSync([chunk("a.md", 0, "new")], [existing("stale.md", 0, "x")]);
    const { store, upsert, deleteChunks } = fakeStore();
    const embed = vi.fn(async () => {
      throw new Error("embedding provider unreachable");
    });

    await expect(applySync(plan, store, embed)).rejects.toThrow(/unreachable/);
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteChunks).not.toHaveBeenCalled();
  });

  it("removes stale rows", async () => {
    const plan = planSync([], [existing("gone.md", 0, "h1")]);
    const { store, deleteChunks } = fakeStore();

    const result = await applySync(plan, store, async () => []);

    expect(deleteChunks).toHaveBeenCalledOnce();
    expect(result.deleted).toBe(1);
  });

  it("is safe to run twice — the second run is a no-op", async () => {
    const incoming = [chunk("a.md", 0, "h1")];
    const first = planSync(incoming, []);
    const { store, upsert } = fakeStore();
    await applySync(first, store, async (v) => v.map(() => [0.1]));
    expect(upsert).toHaveBeenCalledOnce();

    const second = planSync(incoming, [existing("a.md", 0, "h1")]);
    await applySync(second, store, async (v) => v.map(() => [0.1]));
    expect(upsert).toHaveBeenCalledOnce();
  });
});

describe("summarize", () => {
  it("reports counts only, with no chunk text", () => {
    const plan = planSync(
      [chunk("a.md", 0, "same"), chunk("b.md", 0, "new")],
      [existing("a.md", 0, "same"), existing("old.md", 0, "x")],
    );

    const summary = summarize(plan, 2, { embedded: 1, deleted: 1 });

    expect(summary).toEqual({
      filesRead: 2,
      chunksGenerated: 2,
      unchanged: 1,
      embedded: 1,
      inserted: 1,
      updated: 0,
      deleted: 1,
      failures: 0,
    });
    expect(Object.values(summary).every((v) => typeof v === "number")).toBe(true);
  });
});
