import { createHash } from "node:crypto";

import type { DocChunk } from "./types";

/**
 * Heading-aware Markdown chunking (`docs/TECH.md` 13).
 *
 * Sections, not fixed-size windows: a documentation heading and its body are
 * one retrievable idea, and cutting mid-explanation is what makes naive RAG
 * cite the wrong half of a page.
 *
 * Character sizing rather than tokens, on purpose. A tokenizer dependency buys
 * precision this stage does not need — these bounds only decide when a section
 * is too unwieldy to embed whole.
 */

export const TARGET_CHARS = 3_000;
export const MAX_CHARS = 5_000;

const DOCS_BASE_URL = "https://docs.liara.ir";

type Section = {
  heading: string | null;
  /** Ancestor headings, outermost first, for context in the embedded text. */
  headingPath: string[];
  body: string;
};

/** Splits front matter from the body. Returns raw YAML-ish lines only. */
export function splitFrontMatter(markdown: string): {
  frontMatter: Record<string, string>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
  if (!match) return { frontMatter: {}, body: markdown };

  const frontMatter: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    frontMatter[pair[1].toLowerCase()] = pair[2]
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }

  return { frontMatter, body: markdown.slice(match[0].length) };
}

/**
 * Splits Markdown on ATX headings, tracking the heading path.
 *
 * Fenced code is masked first so a `#` comment inside a shell block is never
 * mistaken for a heading — the failure that silently shreds code examples.
 */
export function splitIntoSections(body: string): Section[] {
  const lines = body.split(/\r?\n/);
  const sections: Section[] = [];
  const path: { level: number; text: string }[] = [];

  let current: Section = { heading: null, headingPath: [], body: "" };
  let inFence = false;
  let fenceMarker = "";

  const flush = () => {
    if (current.body.trim().length > 0 || current.heading) sections.push(current);
  };

  for (const line of lines) {
    const fence = /^\s*(```+|~~~+)/.exec(line);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (fence[1][0] === fenceMarker) {
        inFence = false;
      }
      current.body += `${line}\n`;
      continue;
    }

    const heading = inFence ? null : /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);

    if (heading) {
      flush();
      const level = heading[1].length;
      const text = heading[2].trim();

      while (path.length > 0 && path[path.length - 1].level >= level) path.pop();

      current = {
        heading: text,
        headingPath: path.map((entry) => entry.text),
        body: "",
      };
      path.push({ level, text });
      continue;
    }

    current.body += `${line}\n`;
  }

  flush();
  return sections;
}

/**
 * Splits an oversized section on paragraph boundaries, never inside a fence.
 *
 * A code block that would exceed the cap on its own is kept whole: a truncated
 * command is worse than a long chunk.
 */
export function splitOversized(text: string, maxChars = MAX_CHARS): string[] {
  if (text.length <= maxChars) return [text];

  const blocks: string[] = [];
  let buffer = "";
  let inFence = false;

  for (const paragraph of text.split(/\n{2,}/)) {
    const fenceCount = (paragraph.match(/^\s*(?:```|~~~)/gm) ?? []).length;
    const wouldExceed = buffer.length + paragraph.length + 2 > maxChars;

    if (!inFence && wouldExceed && buffer.trim().length > 0) {
      blocks.push(buffer.trim());
      buffer = "";
    }

    buffer += (buffer ? "\n\n" : "") + paragraph;
    if (fenceCount % 2 === 1) inFence = !inFence;
  }

  if (buffer.trim().length > 0) blocks.push(buffer.trim());

  // Paragraph boundaries are not guaranteed to exist. A wall of prose with no
  // blank line would otherwise sail through at any size and blow the embedding
  // request, so oversized non-fence blocks get a hard split.
  return blocks.flatMap((block) =>
    block.length > maxChars && !/^\s*(?:```|~~~)/m.test(block)
      ? hardSplit(block, maxChars)
      : [block],
  );
}

/** Last-resort split on the nearest whitespace before the limit. */
function hardSplit(text: string, maxChars: number): string[] {
  const parts: string[] = [];
  let rest = text;

  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    const breakAt = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(" "));
    const cut = breakAt > maxChars * 0.5 ? breakAt : maxChars;

    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest.length > 0) parts.push(rest);
  return parts;
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Derives the public documentation URL from a repository path.
 *
 * `public/llms/paas/nextjs/how-tos/deploy-app.md`
 *   → `https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/`
 */
export function sourceUrlFor(sourcePath: string): string {
  const relative = sourcePath
    .replace(/\\/g, "/")
    .replace(/^.*?public\/llms\//, "")
    .replace(/\.md$/, "")
    .replace(/\/index$/, "");

  return `${DOCS_BASE_URL}/${relative}/`.replace(/\/{2,}$/, "/");
}

/** First path segment is the Liara service area: paas, dbaas, object-storage. */
export function serviceFor(sourcePath: string): string | null {
  const relative = sourcePath.replace(/\\/g, "/").replace(/^.*?public\/llms\//, "");
  const [service] = relative.split("/");
  return service && service.endsWith(".md") === false ? service : null;
}

/** Second segment under `paas` is the platform: nextjs, django, laravel. */
export function platformFor(sourcePath: string): string | null {
  const relative = sourcePath.replace(/\\/g, "/").replace(/^.*?public\/llms\//, "");
  const parts = relative.split("/");
  if (parts[0] !== "paas" || parts.length < 2) return null;
  const platform = parts[1];
  return platform.endsWith(".md") ? null : platform;
}

function titleFor(
  frontMatter: Record<string, string>,
  sections: Section[],
  sourcePath: string,
): string {
  if (frontMatter.title) return frontMatter.title;

  const firstHeading = sections.find((section) => section.heading)?.heading;
  if (firstHeading) return firstHeading;

  return (
    sourcePath
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.replace(/\.md$/, "") ?? sourcePath
  );
}

/**
 * Turns one Markdown file into retrievable chunks.
 *
 * Each chunk's embedded text is prefixed with its heading path so an isolated
 * body still carries the context that makes it findable.
 */
export function chunkMarkdown(sourcePath: string, markdown: string): DocChunk[] {
  const { frontMatter, body } = splitFrontMatter(markdown);
  const sections = splitIntoSections(body);
  const title = titleFor(frontMatter, sections, sourcePath);
  const sourceUrl = sourceUrlFor(sourcePath);
  const service = serviceFor(sourcePath);
  const platform = platformFor(sourcePath);

  const chunks: DocChunk[] = [];

  for (const section of sections) {
    const trimmed = section.body.trim();
    if (trimmed.length === 0) continue;

    const contextPath = [...section.headingPath, section.heading]
      .filter((entry): entry is string => Boolean(entry))
      .join(" › ");

    const header = contextPath ? `${title} › ${contextPath}` : title;

    for (const part of splitOversized(trimmed)) {
      chunks.push({
        sourcePath,
        sourceUrl,
        title,
        heading: section.heading,
        service,
        platform,
        chunkIndex: chunks.length,
        content: `${header}\n\n${part}`,
        contentHash: hashContent(`${header}\n\n${part}`),
      });
    }
  }

  return chunks;
}
