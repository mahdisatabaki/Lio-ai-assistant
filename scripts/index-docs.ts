/**
 * Builds the documentation knowledge index (`docs/TECH.md` 12).
 *
 * Operator command, not an endpoint. Nothing crawls documentation during a user
 * request, and there is no public reindex API.
 *
 * Usage:
 *   npm run docs:index              index into the configured database
 *   npm run docs:index -- --dry-run parse and chunk only, no database, no embeddings
 *   npm run docs:index -- --limit=N stop after N files (for a quick check)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { chunkMarkdown } from "../lib/rag/chunk.ts";
import type { DocChunk } from "../lib/rag/types.ts";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const limitArg = [...args].find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

async function main() {
  const { cloneDocs, listMarkdownFiles, toSourcePath, DOCS_CORPUS_SUBPATH } =
    await import("./lib/docs-source.ts");

  console.log("Cloning liara-cloud/docs (shallow)...");
  const checkout = cloneDocs();

  try {
    const corpusRoot = join(checkout.root, DOCS_CORPUS_SUBPATH);
    const files = listMarkdownFiles(corpusRoot).slice(0, limit);
    console.log(`Markdown files: ${files.length}`);

    const chunks: DocChunk[] = [];
    let failures = 0;

    for (const file of files) {
      const sourcePath = toSourcePath(checkout.root, file);
      try {
        chunks.push(...chunkMarkdown(sourcePath, readFileSync(file, "utf8")));
      } catch (error) {
        failures += 1;
        console.error(
          `  failed: ${sourcePath} — ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    console.log(`Chunks generated: ${chunks.length}`);

    if (dryRun) {
      report(summarizeDryRun(files.length, chunks, failures));
      return;
    }

    // Imported lazily so --dry-run needs neither database nor AI configuration.
    const { embedBatch } = await import("../lib/rag/embed.ts");
    const { createPgChunkStore } = await import("../lib/rag/store.ts");
    const { applySync, planSync, summarize } = await import("../lib/rag/sync.ts");
    const { closePool } = await import("../lib/server/db.ts");

    try {
      const store = createPgChunkStore();
      const plan = planSync(chunks, await store.listExisting());

      console.log(
        `Plan: ${plan.unchanged.length} unchanged, ${plan.inserted.length} new, ` +
          `${plan.updated.length} changed, ${plan.toDelete.length} stale`,
      );

      const applied = await applySync(plan, store, embedBatch);
      report(summarize(plan, files.length, applied, failures));
    } finally {
      await closePool();
    }
  } finally {
    checkout.cleanup();
  }
}

function summarizeDryRun(filesRead: number, chunks: DocChunk[], failures: number) {
  return {
    filesRead,
    chunksGenerated: chunks.length,
    unchanged: 0,
    embedded: 0,
    inserted: 0,
    updated: 0,
    deleted: 0,
    failures,
  };
}

/** Counts only — never chunk text, embeddings, or configuration. */
function report(summary: Record<string, number>) {
  console.log("\nSummary");
  for (const [key, value] of Object.entries(summary)) {
    console.log(`  ${key.padEnd(18)} ${value}`);
  }
}

main().catch((error) => {
  console.error(
    `Indexing failed: ${error instanceof Error ? error.message : error}`,
  );
  process.exitCode = 1;
});
