import { describe, expect, it } from "vitest";

import { dedupeKey, fuseCandidates, RRF_K } from "./merge";
import type { Candidate } from "./types";

function candidate(id: number, overrides: Partial<Candidate> = {}): Candidate {
  return {
    id,
    sourcePath: `public/llms/paas/nextjs/doc-${id}.md`,
    sourceUrl: `https://docs.liara.ir/paas/nextjs/doc-${id}/`,
    title: `Doc ${id}`,
    heading: `Heading ${id}`,
    platform: null,
    service: null,
    content: `Content ${id}`,
    ...overrides,
  };
}

describe("fuseCandidates", () => {
  it("keeps a semantic-only candidate", () => {
    const [result] = fuseCandidates([candidate(1)], []);
    expect(result.id).toBe(1);
    expect(result.matchedBy).toEqual(["semantic"]);
  });

  it("keeps a lexical-only candidate with its matched tokens", () => {
    const [result] = fuseCandidates(
      [],
      [candidate(2, { matchedTokens: ["ECONNRESET"] })],
    );
    expect(result.matchedBy).toEqual(["lexical"]);
    expect(result.matchedTokens).toEqual(["ECONNRESET"]);
  });

  it("ranks a chunk found by both arms above either alone", () => {
    const both = candidate(1);
    const semanticOnly = candidate(2);
    const lexicalOnly = candidate(3, { matchedTokens: ["liara.json"] });

    const results = fuseCandidates([semanticOnly, both], [lexicalOnly, both]);

    expect(results[0].id).toBe(1);
    expect(results[0].matchedBy).toEqual(["lexical", "semantic"]);
  });

  it("merges a duplicate into one result rather than repeating it", () => {
    const shared = candidate(7);
    const results = fuseCandidates([shared], [shared]);
    expect(results).toHaveLength(1);
  });

  it("deduplicates by source URL and heading, not by row id", () => {
    // The same section re-indexed under a new id is still the same evidence.
    const a = candidate(10, { sourceUrl: "https://docs.liara.ir/x/", heading: "H" });
    const b = candidate(11, { sourceUrl: "https://docs.liara.ir/x/", heading: "H" });

    expect(fuseCandidates([a], [b])).toHaveLength(1);
  });

  it("treats different headings of one page as separate evidence", () => {
    const a = candidate(10, { sourceUrl: "https://docs.liara.ir/x/", heading: "One" });
    const b = candidate(11, { sourceUrl: "https://docs.liara.ir/x/", heading: "Two" });

    expect(fuseCandidates([a], [b])).toHaveLength(2);
  });

  it("scores by reciprocal rank", () => {
    const [first] = fuseCandidates([candidate(1)], []);
    expect(first.score).toBeCloseTo(1 / (RRF_K + 1), 10);
  });

  it("preserves rank order within a single arm", () => {
    const results = fuseCandidates([candidate(1), candidate(2), candidate(3)], []);
    expect(results.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("limits the final set", () => {
    const many = Array.from({ length: 20 }, (_, i) => candidate(i + 1));
    expect(fuseCandidates(many, [], 4)).toHaveLength(4);
  });

  it("is deterministic across repeated calls", () => {
    const semantic = [candidate(3), candidate(1)];
    const lexical = [candidate(2), candidate(1)];

    const once = fuseCandidates(semantic, lexical).map((r) => r.id);
    const twice = fuseCandidates(semantic, lexical).map((r) => r.id);
    expect(once).toEqual(twice);
  });

  it("carries citation metadata through unchanged", () => {
    const source = candidate(1, {
      sourcePath: "public/llms/paas/nextjs/how-tos/deploy-app.md",
      sourceUrl: "https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/",
      title: "استقرار برنامه Next.js",
      heading: "فایل liara.json",
    });

    const [result] = fuseCandidates([source], []);
    expect(result).toMatchObject({
      sourcePath: "public/llms/paas/nextjs/how-tos/deploy-app.md",
      sourceUrl: "https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/",
      title: "استقرار برنامه Next.js",
      heading: "فایل liara.json",
    });
  });

  it("returns nothing when both arms are empty", () => {
    expect(fuseCandidates([], [])).toEqual([]);
  });

  it("builds a stable dedupe key", () => {
    expect(dedupeKey(candidate(1, { sourceUrl: "u", heading: "h" }))).toBe("u#h");
    expect(dedupeKey(candidate(1, { sourceUrl: "u", heading: null }))).toBe("u#");
  });
});
