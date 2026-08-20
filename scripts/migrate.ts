/**
 * Applies the knowledge-index migration (`docs/TECH.md` 14).
 *
 * Resolves the embedding width from the configured model before creating the
 * vector column, because pgvector fixes that dimension at creation time.
 *
 * Usage: npm run db:migrate
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveEmbeddingDimensions } from "../lib/rag/embed.ts";
import { closePool, getPool } from "../lib/server/db.ts";

const MIGRATION = join(process.cwd(), "db", "migrations", "001_knowledge_index.sql");

async function main() {
  const override = process.env.LIARA_EMBEDDING_DIMENSIONS;

  const dimensions = override
    ? Number(override)
    : await resolveEmbeddingDimensions();

  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new Error(`Invalid embedding dimensions: ${dimensions}`);
  }

  console.log(
    `Embedding dimensions: ${dimensions}${override ? " (from LIARA_EMBEDDING_DIMENSIONS)" : " (probed from the configured model)"}`,
  );

  const sql = readFileSync(MIGRATION, "utf8").replaceAll(
    "{{EMBEDDING_DIMENSIONS}}",
    String(dimensions),
  );

  await getPool().query(sql);
  console.log("Migration applied.");
}

main()
  .catch((error) => {
    console.error(`Migration failed: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => closePool());
