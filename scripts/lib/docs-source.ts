import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Acquires the official Liara documentation corpus.
 *
 * A shallow clone of the source repository rather than crawling rendered pages:
 * the Markdown is clean, headings and code fences survive, and source paths are
 * stable enough to derive citation URLs from.
 *
 * The corpus is not vendored into this repository. It is large, it belongs to
 * someone else, and it would go stale in our git history.
 */

export const DOCS_REPO = "https://github.com/liara-cloud/docs.git";
export const DOCS_CORPUS_SUBPATH = join("public", "llms");

export type DocsCheckout = { root: string; cleanup: () => void };

/** Shallow-clones the docs repo into a temp directory. */
export function cloneDocs(repo = DOCS_REPO): DocsCheckout {
  const root = mkdtempSync(join(tmpdir(), "liara-docs-"));

  execFileSync(
    "git",
    ["clone", "--depth", "1", "--filter=blob:none", "--quiet", repo, root],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

/** Lists every Markdown file under a directory, sorted for stable ordering. */
export function listMarkdownFiles(dir: string): string[] {
  const found: string[] = [];

  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".md") && statSync(path).size > 0) found.push(path);
    }
  };

  walk(dir);
  return found.sort();
}

/** Normalises an absolute checkout path to a stable repo-relative path. */
export function toSourcePath(root: string, absolute: string): string {
  return absolute
    .slice(root.length)
    .split("\\")
    .join("/")
    .replace(/^\//, "");
}
