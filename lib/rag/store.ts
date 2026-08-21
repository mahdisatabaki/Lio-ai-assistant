import "server-only";

import { getPool } from "../server/db.ts";

import { toVectorLiteral } from "./embed.ts";
import type { ChunkStore, ExistingChunk } from "./sync.ts";
import type { DocChunk } from "./types.ts";

/** PostgreSQL-backed `ChunkStore` for the indexer (`docs/TECH.md` 15). */
export function createPgChunkStore(): ChunkStore {
  return {
    async listExisting(): Promise<ExistingChunk[]> {
      const { rows } = await getPool().query<{
        source_path: string;
        chunk_index: number;
        content_hash: string;
      }>(`SELECT source_path, chunk_index, content_hash FROM doc_chunks`);

      return rows.map((row) => ({
        sourcePath: row.source_path,
        chunkIndex: row.chunk_index,
        contentHash: row.content_hash,
      }));
    },

    async upsert(entries): Promise<void> {
      if (entries.length === 0) return;

      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        for (const { chunk, embedding } of entries) {
          await client.query(
            `INSERT INTO doc_chunks
               (source_path, source_url, title, heading, service, platform,
                chunk_index, content, content_hash, embedding, indexed_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector, now())
             ON CONFLICT (source_path, chunk_index) DO UPDATE SET
               source_url   = EXCLUDED.source_url,
               title        = EXCLUDED.title,
               heading      = EXCLUDED.heading,
               service      = EXCLUDED.service,
               platform     = EXCLUDED.platform,
               content      = EXCLUDED.content,
               content_hash = EXCLUDED.content_hash,
               embedding    = EXCLUDED.embedding,
               indexed_at   = now()`,
            [
              chunk.sourcePath,
              chunk.sourceUrl,
              chunk.title,
              chunk.heading,
              chunk.service,
              chunk.platform,
              chunk.chunkIndex,
              chunk.content,
              chunk.contentHash,
              toVectorLiteral(embedding),
            ],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async deleteChunks(keys): Promise<void> {
      if (keys.length === 0) return;

      await getPool().query(
        `DELETE FROM doc_chunks
          WHERE (source_path, chunk_index) IN (
            SELECT * FROM unnest($1::text[], $2::int[])
          )`,
        [keys.map((k) => k.sourcePath), keys.map((k) => k.chunkIndex)],
      );
    },
  };
}

export type { DocChunk };
