import "server-only";

import { getPool } from "@/lib/server/db";

import { embedQuery, toVectorLiteral } from "./embed";
import { fuseCandidates } from "./merge";
import { extractTechnicalTokens } from "./tokens";
import type { Candidate, RetrievedChunk } from "./types";

/**
 * Semantic + exact-token retrieval (`docs/TECH.md` 16).
 *
 * Two arms, fused by rank. Semantic search handles natural questions; the
 * lexical arm handles the literal strings semantic search is worst at
 * (`ECONNRESET`, `liara.json`). Neither alone covers the product's real traffic.
 *
 * No reranker model and no ANN index — both are explicitly deferred until
 * measurement justifies them.
 */

export const SEMANTIC_CANDIDATES = 8;
export const LEXICAL_CANDIDATES = 8;
export const FINAL_CHUNKS = 5;

type Row = {
  id: string;
  source_path: string;
  source_url: string;
  title: string;
  heading: string | null;
  content: string;
  score: string | null;
};

function toCandidate(row: Row, matchedTokens?: string[]): Candidate {
  return {
    id: Number(row.id),
    sourcePath: row.source_path,
    sourceUrl: row.source_url,
    title: row.title,
    heading: row.heading,
    content: row.content,
    rawScore: row.score === null ? undefined : Number(row.score),
    matchedTokens,
  };
}

/** Cosine distance in pgvector is `<=>`; smaller is closer, so similarity is 1 - d. */
async function semanticSearch(query: string, limit: number): Promise<Candidate[]> {
  const embedding = await embedQuery(query);

  const { rows } = await getPool().query<Row>(
    `SELECT id, source_path, source_url, title, heading, content,
            1 - (embedding <=> $1::vector) AS score
       FROM doc_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT $2`,
    [toVectorLiteral(embedding), limit],
  );

  return rows.map((row) => toCandidate(row));
}

/**
 * Case-insensitive substring lookup over title, heading, and content.
 *
 * Fields are weighted, not just counted. A token in a heading — Liara's docs
 * use `## فایل liara.json` on every platform page — signals the section is
 * *about* that token, while a body mention is often incidental. Flat counting
 * ranked an unrelated email-server page above the Next.js page for
 * `liara.json`; weighting fixes that without a search engine.
 *
 * Tokens are passed as parameters, never interpolated.
 */
const TITLE_WEIGHT = 3;
const HEADING_WEIGHT = 2;
const CONTENT_WEIGHT = 1;

async function lexicalSearch(
  tokens: string[],
  limit: number,
): Promise<Candidate[]> {
  if (tokens.length === 0) return [];

  const matchCount = tokens
    .map(
      (_, i) =>
        `(CASE WHEN lower(title) LIKE $${i + 1} THEN ${TITLE_WEIGHT} ELSE 0 END` +
        ` + CASE WHEN lower(coalesce(heading, '')) LIKE $${i + 1} THEN ${HEADING_WEIGHT} ELSE 0 END` +
        ` + CASE WHEN lower(content) LIKE $${i + 1} THEN ${CONTENT_WEIGHT} ELSE 0 END)`,
    )
    .join(" + ");

  const patterns = tokens.map((token) => `%${token.toLowerCase()}%`);

  const { rows } = await getPool().query<Row>(
    `SELECT id, source_path, source_url, title, heading, content,
            (${matchCount}) AS score
       FROM doc_chunks
      WHERE (${matchCount}) > 0
      ORDER BY score DESC, id ASC
      LIMIT $${tokens.length + 1}`,
    [...patterns, limit],
  );

  return rows.map((row) =>
    toCandidate(
      row,
      tokens.filter((token) =>
        `${row.title} ${row.heading ?? ""} ${row.content}`
          .toLowerCase()
          .includes(token.toLowerCase()),
      ),
    ),
  );
}

export type RetrievalResult = {
  chunks: RetrievedChunk[];
  /** Technical tokens the query offered to the lexical arm. */
  tokens: string[];
  /** True when at least one chunk matched a literal token — strong evidence. */
  hasExactMatch: boolean;
};

/**
 * Retrieves grounding evidence for a query.
 *
 * The evidence API for answer generation (BL-040). It returns citation metadata
 * alongside the text so the answer layer never has to invent a source URL.
 */
export async function retrieveDocumentation(
  query: string,
  finalCount: number = FINAL_CHUNKS,
): Promise<RetrievalResult> {
  const tokens = extractTechnicalTokens(query);

  const [semantic, lexical] = await Promise.all([
    semanticSearch(query, SEMANTIC_CANDIDATES),
    lexicalSearch(tokens, LEXICAL_CANDIDATES),
  ]);

  const chunks = fuseCandidates(semantic, lexical, finalCount);

  return {
    chunks,
    tokens,
    hasExactMatch: chunks.some((chunk) => chunk.matchedBy.includes("lexical")),
  };
}
