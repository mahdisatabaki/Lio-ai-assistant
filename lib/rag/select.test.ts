import { describe, expect, it } from "vitest";

import { MAX_SELECTED_CHUNKS, selectPrimaryEvidence } from "./select";
import type { RetrievedChunk } from "./types";

/**
 * Document selection is what makes a decisive answer possible (BL-086). These
 * lock the cases that previously produced scattered answers: a canonical page
 * losing to a page that merely repeats the word, and passages from several
 * documents reaching the model at once.
 */

let nextId = 1;

function chunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    id: nextId++,
    sourcePath: "public/llms/paas/nextjs/x.md",
    sourceUrl: "https://docs.liara.ir/paas/nextjs/x/",
    title: "صفحه",
    heading: null,
    platform: null,
    service: null,
    content: "متن",
    score: 1,
    matchedBy: ["semantic"],
    matchedTokens: [],
    ...overrides,
  };
}

describe("selectPrimaryEvidence", () => {
  it("returns null when nothing was retrieved", () => {
    expect(selectPrimaryEvidence([])).toBeNull();
  });

  it("never mixes documents: every selected chunk shares one source URL", () => {
    const evidence = selectPrimaryEvidence([
      chunk({ sourceUrl: "https://docs.liara.ir/a/" }),
      chunk({ sourceUrl: "https://docs.liara.ir/b/" }),
      chunk({ sourceUrl: "https://docs.liara.ir/a/" }),
    ]);

    const urls = new Set(evidence!.selectedChunks.map((c) => c.sourceUrl));
    expect(urls.size).toBe(1);
    expect(evidence!.documentId).toBe(evidence!.selectedChunks[0].sourceUrl);
  });

  it("identifies a document by source URL, not chunk id", () => {
    const evidence = selectPrimaryEvidence([
      chunk({ id: 11, sourceUrl: "https://docs.liara.ir/a/", heading: "یک" }),
      chunk({ id: 22, sourceUrl: "https://docs.liara.ir/a/", heading: "دو" }),
    ]);

    expect(evidence!.selectedChunks).toHaveLength(2);
    expect(evidence!.documentId).toBe("https://docs.liara.ir/a/");
  });

  it("prefers the page whose title carries the literal token", () => {
    // The dedicated ECONNRESET page ranks second but is titled for the token;
    // the generic page merely mentions it in passing.
    const evidence = selectPrimaryEvidence(
      [
        chunk({
          sourceUrl: "https://docs.liara.ir/paas/nextjs/fix-common-errors/about/",
          title: "رفع خطاهای رایج",
          content: "فهرستی از خطاها از جمله ECONNRESET و موارد دیگر.",
        }),
        chunk({
          sourceUrl: "https://docs.liara.ir/paas/nextjs/fix-common-errors/econnreset/",
          title: "رفع خطای ECONNRESET",
          content: "افزایش منابع و راه‌اندازی مجدد.",
        }),
      ],
      ["ECONNRESET"],
    );

    expect(evidence!.sourceUrl).toContain("econnreset");
    expect(evidence!.evidenceReason).toContain("title:econnreset");
  });

  it("prefers the named service over a page that merely repeats the word", () => {
    // "object" appears throughout the AI SDK cookbook; the service hint settles it.
    const evidence = selectPrimaryEvidence(
      [
        chunk({
          sourceUrl: "https://docs.liara.ir/ai/cookbook/rsc/generate-object/",
          title: "generateObject",
          service: "ai",
          content: "object object object",
        }),
        chunk({
          sourceUrl: "https://docs.liara.ir/object-storage/details/about/",
          title: "Object Storage",
          service: "object-storage",
          content: "فضای ذخیره‌سازی ماندگار.",
        }),
      ],
      [],
      null,
      "object-storage",
    );

    expect(evidence!.sourceUrl).toContain("object-storage");
  });

  it("prefers the framework the query named", () => {
    const evidence = selectPrimaryEvidence(
      [
        chunk({
          sourceUrl: "https://docs.liara.ir/paas/angular/how-tos/deploy-app/",
          platform: "angular",
          content: "mirror لیارا",
        }),
        chunk({
          sourceUrl: "https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/",
          platform: "nextjs",
          content: "mirror لیارا",
        }),
      ],
      ["mirror"],
      "nextjs",
    );

    expect(evidence!.sourceUrl).toContain("nextjs");
  });

  it("rewards a document that answers across several passages", () => {
    const evidence = selectPrimaryEvidence([
      chunk({ sourceUrl: "https://docs.liara.ir/solo/" }),
      chunk({ sourceUrl: "https://docs.liara.ir/rich/", heading: "الف" }),
      chunk({ sourceUrl: "https://docs.liara.ir/rich/", heading: "ب" }),
      chunk({ sourceUrl: "https://docs.liara.ir/rich/", heading: "ج" }),
    ]);

    expect(evidence!.sourceUrl).toContain("rich");
    expect(evidence!.evidenceReason).toContain("3 passages");
  });

  it("bounds how many passages reach the model", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      chunk({ sourceUrl: "https://docs.liara.ir/same/", heading: `h${i}` }),
    );

    expect(selectPrimaryEvidence(many)!.selectedChunks).toHaveLength(MAX_SELECTED_CHUNKS);
  });

  it("keeps the top-ranked document when there is nothing to distinguish them", () => {
    const evidence = selectPrimaryEvidence([
      chunk({ sourceUrl: "https://docs.liara.ir/first/" }),
      chunk({ sourceUrl: "https://docs.liara.ir/second/" }),
    ]);

    expect(evidence!.sourceUrl).toContain("first");
    expect(evidence!.evidenceReason).toContain("top-ranked");
  });

  it("is deterministic: the same input always yields the same document", () => {
    const build = () => [
      chunk({ id: 1, sourceUrl: "https://docs.liara.ir/a/" }),
      chunk({ id: 2, sourceUrl: "https://docs.liara.ir/b/" }),
    ];

    expect(selectPrimaryEvidence(build())!.documentId).toBe(
      selectPrimaryEvidence(build())!.documentId,
    );
  });
});
