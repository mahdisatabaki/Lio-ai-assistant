import { describe, expect, it } from "vitest";

import {
  chunkMarkdown,
  hashContent,
  MAX_CHARS,
  platformFor,
  serviceFor,
  sourceUrlFor,
  splitFrontMatter,
  splitIntoSections,
  splitOversized,
} from "./chunk";

const PATH = "public/llms/paas/nextjs/how-tos/deploy-app.md";

describe("splitFrontMatter", () => {
  it("parses front matter and returns the remaining body", () => {
    const { frontMatter, body } = splitFrontMatter(
      "---\ntitle: استقرار Next.js\nservice: paas\n---\n# سرفصل\nمتن",
    );
    expect(frontMatter.title).toBe("استقرار Next.js");
    expect(body.trim().startsWith("# سرفصل")).toBe(true);
  });

  it("passes through a document without front matter", () => {
    const { frontMatter, body } = splitFrontMatter("# سرفصل\nمتن");
    expect(frontMatter).toEqual({});
    expect(body).toBe("# سرفصل\nمتن");
  });
});

describe("splitIntoSections", () => {
  it("splits on headings", () => {
    const sections = splitIntoSections("# یک\nمتن یک\n\n# دو\nمتن دو");
    expect(sections.map((s) => s.heading)).toEqual(["یک", "دو"]);
  });

  it("tracks nested heading ancestry", () => {
    const sections = splitIntoSections(
      "# صفحه\nمقدمه\n\n## بخش\nمتن\n\n### زیربخش\nجزئیات",
    );
    expect(sections.map((s) => s.headingPath)).toEqual([[], ["صفحه"], ["صفحه", "بخش"]]);
  });

  it("pops back out of deeper headings", () => {
    const sections = splitIntoSections(
      "# A\n.\n\n## B\n.\n\n### C\n.\n\n## D\n.",
    );
    expect(sections.find((s) => s.heading === "D")?.headingPath).toEqual(["A"]);
  });

  it("does not treat a # comment inside a code fence as a heading", () => {
    const sections = splitIntoSections(
      "# واقعی\nمتن\n\n```bash\n# این کامنت است\nnpm install\n```\n",
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].body).toContain("# این کامنت است");
  });

  it("handles tilde fences too", () => {
    const sections = splitIntoSections("# سرفصل\n~~~\n# not a heading\n~~~\n");
    expect(sections).toHaveLength(1);
  });
});

describe("splitOversized", () => {
  it("leaves a section under the cap intact", () => {
    expect(splitOversized("کوتاه")).toEqual(["کوتاه"]);
  });

  it("splits a long section on paragraph boundaries", () => {
    const paragraph = "الف ".repeat(500);
    const parts = splitOversized(`${paragraph}\n\n${paragraph}\n\n${paragraph}`);
    expect(parts.length).toBeGreaterThan(1);
  });

  it("never cuts inside a code fence", () => {
    const filler = "ب ".repeat(1_500);
    const fence = "```bash\n" + "echo hello\n".repeat(50) + "```";
    const parts = splitOversized(`${filler}\n\n${fence}\n\n${filler}`);

    for (const part of parts) {
      const fences = (part.match(/^\s*```/gm) ?? []).length;
      expect(fences % 2).toBe(0);
    }
  });
});

describe("source metadata", () => {
  it("derives the public documentation URL", () => {
    expect(sourceUrlFor(PATH)).toBe(
      "https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/",
    );
  });

  it("collapses an index file to its directory URL", () => {
    expect(sourceUrlFor("public/llms/object-storage/index.md")).toBe(
      "https://docs.liara.ir/object-storage/",
    );
  });

  it("handles Windows-style separators", () => {
    expect(sourceUrlFor("public\\llms\\dbaas\\postgresql.md")).toBe(
      "https://docs.liara.ir/dbaas/postgresql/",
    );
  });

  it("reads service and platform from the path", () => {
    expect(serviceFor(PATH)).toBe("paas");
    expect(platformFor(PATH)).toBe("nextjs");
    expect(serviceFor("public/llms/object-storage/about.md")).toBe("object-storage");
    expect(platformFor("public/llms/object-storage/about.md")).toBeNull();
  });
});

describe("chunkMarkdown", () => {
  const markdown = [
    "---",
    "title: استقرار برنامه Next.js",
    "---",
    "# استقرار",
    "برای شروع پروژه را آماده کنید.",
    "",
    "## فایل liara.json",
    "این فایل تنظیمات را نگه می‌دارد.",
    "",
    "```json",
    '{ "platform": "next" }',
    "```",
  ].join("\n");

  it("produces one chunk per section", () => {
    const chunks = chunkMarkdown(PATH, markdown);
    expect(chunks).toHaveLength(2);
    expect(chunks.map((c) => c.heading)).toEqual(["استقرار", "فایل liara.json"]);
  });

  it("attaches citation metadata to every chunk", () => {
    for (const chunk of chunkMarkdown(PATH, markdown)) {
      expect(chunk.title).toBe("استقرار برنامه Next.js");
      expect(chunk.sourceUrl).toBe(
        "https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/",
      );
      expect(chunk.sourcePath).toBe(PATH);
      expect(chunk.service).toBe("paas");
      expect(chunk.platform).toBe("nextjs");
    }
  });

  it("preserves code fences and exact tokens", () => {
    const chunk = chunkMarkdown(PATH, markdown).at(-1);
    expect(chunk?.content).toContain('{ "platform": "next" }');
    expect(chunk?.content).toContain("```json");
  });

  it("prefixes each chunk with its heading path for context", () => {
    const chunk = chunkMarkdown(PATH, markdown).at(-1);
    expect(chunk?.content.startsWith("استقرار برنامه Next.js › استقرار › فایل liara.json")).toBe(true);
  });

  it("numbers chunks sequentially", () => {
    expect(chunkMarkdown(PATH, markdown).map((c) => c.chunkIndex)).toEqual([0, 1]);
  });

  it("keeps every chunk within the size cap plus its header", () => {
    const huge = `# بزرگ\n${"ج ".repeat(20_000)}`;
    for (const chunk of chunkMarkdown(PATH, huge)) {
      expect(chunk.content.length).toBeLessThan(MAX_CHARS * 2);
    }
  });

  it("hashes content stably and distinctly", () => {
    const a = chunkMarkdown(PATH, markdown);
    const b = chunkMarkdown(PATH, markdown);
    expect(a.map((c) => c.contentHash)).toEqual(b.map((c) => c.contentHash));
    expect(new Set(a.map((c) => c.contentHash)).size).toBe(a.length);
  });

  it("changes the hash when the text changes", () => {
    expect(hashContent("الف")).not.toBe(hashContent("ب"));
  });

  it("falls back to the first heading when front matter has no title", () => {
    expect(chunkMarkdown(PATH, "# تنها سرفصل\nمتن")[0].title).toBe("تنها سرفصل");
  });

  it("ignores an empty document", () => {
    expect(chunkMarkdown(PATH, "   \n\n  ")).toEqual([]);
  });
});
