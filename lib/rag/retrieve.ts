import "server-only";

import { getPool } from "../server/db.ts";

import { embedQuery, toVectorLiteral } from "./embed.ts";
import { fuseCandidates } from "./merge.ts";
import { selectPrimaryEvidence } from "./select.ts";
import { extractTechnicalTokens } from "./tokens.ts";
import type { Candidate, PrimaryEvidence, RetrievedChunk } from "./types.ts";

/**
 * Liara documents the same guidance once per platform, so `mirror` matches the
 * Angular, Django, and Flask pages identically. When the query names a
 * framework, its platform's page is the one the user needs.
 */
const PLATFORM_PATTERNS: [RegExp, string][] = [
  // Bare "Next" counts: users write "پروژه‌م Next هست" far more often
  // than they spell out "Next.js".
  [/(^|[^a-z])next(\.?js)?([^a-z]|$)|نکست/i, "nextjs"],
  [/django|جنگو/i, "django"],
  [/laravel|لاراول/i, "laravel"],
  [/angular/i, "angular"],
  [/flask/i, "flask"],
];

export function platformHint(query: string): string | null {
  return PLATFORM_PATTERNS.find(([pattern]) => pattern.test(query))?.[1] ?? null;
}

/**
 * Liara service named by the query, in either script.
 *
 * "object" appears in the AI SDK cookbook (`generateObject`, `streamObject`) as
 * often as in the Object Storage docs, and those cookbook pages outranked the
 * real answer in production. Naming the service the user asked about settles it.
 */
const SERVICE_PATTERNS: [RegExp, string][] = [
  [/object\s*storage|آبجکت\s*استوریج|ابجکت\s*استوریج|باکت|bucket/i, "object-storage"],
  [/postgres|پستگرس|دیتابیس|database|dbaas/i, "dbaas"],
  [/دامنه|domain|dns/i, "dns-management-system"],
  [/ایمیل|email|mail/i, "email-server"],
];

export function serviceHint(query: string): string | null {
  return SERVICE_PATTERNS.find(([pattern]) => pattern.test(query))?.[1] ?? null;
}

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
  platform: string | null;
  service: string | null;
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
    platform: row.platform,
    service: row.service,
    content: row.content,
    rawScore: row.score === null ? undefined : Number(row.score),
    matchedTokens,
  };
}

/**
 * Cosine distance in pgvector is `<=>`; smaller is closer, so similarity is 1 - d.
 *
 * When the query names a service, a second pass restricted to that service runs
 * alongside the general one and its hits are ranked first. Re-weighting was not
 * enough: for an Object Storage question the entire unfiltered top-8 was AI SDK
 * `generateObject` cookbook pages — the word "object" simply dominates, and the
 * real docs never reached the candidate set at all.
 *
 * The general pass is still included, so a wrong service guess degrades to
 * ordinary behavior instead of hiding the right answer.
 */
async function semanticSearch(
  query: string,
  limit: number,
  service: string | null = null,
): Promise<Candidate[]> {
  const vector = toVectorLiteral(await embedQuery(query));

  const run = async (onlyService: string | null) => {
    const { rows } = await getPool().query<Row>(
      `SELECT id, source_path, source_url, title, heading, platform, service, content,
              1 - (embedding <=> $1::vector) AS score
         FROM doc_chunks
        ${onlyService ? "WHERE service = $3" : ""}
        ORDER BY embedding <=> $1::vector
        LIMIT $2`,
      onlyService ? [vector, limit, onlyService] : [vector, limit],
    );
    return rows.map((row) => toCandidate(row));
  };

  if (!service) return run(null);

  const [scoped, general] = await Promise.all([run(service), run(null)]);

  const seen = new Set(scoped.map((c) => c.id));
  return [...scoped, ...general.filter((c) => !seen.has(c.id))];
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
const PLATFORM_WEIGHT = 4;
const SERVICE_WEIGHT = 4;

async function lexicalSearch(
  tokens: string[],
  limit: number,
  platform: string | null = null,
  service: string | null = null,
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

  // A platform match outweighs any single field match, so the framework the
  // user actually named wins over an identical page for another one.
  const params: unknown[] = [...patterns];
  let boosts = "";

  if (platform) {
    params.push(platform);
    boosts += `+ CASE WHEN platform = $${params.length} THEN ${PLATFORM_WEIGHT} ELSE 0 END`;
  }
  if (service) {
    params.push(service);
    boosts += `+ CASE WHEN service = $${params.length} THEN ${SERVICE_WEIGHT} ELSE 0 END`;
  }
  params.push(limit);
  const platformBoost = boosts;

  const { rows } = await getPool().query<Row>(
    `SELECT id, source_path, source_url, title, heading, platform, service, content,
            (${matchCount}) ${platformBoost} AS score
       FROM doc_chunks
      WHERE (${matchCount}) > 0
      ORDER BY score DESC, id ASC
      LIMIT $${params.length}`,
    params,
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
  /** Every fused candidate, across documents. Diagnostic, not what the model sees. */
  chunks: RetrievedChunk[];
  /** The one document generation is allowed to use (BL-086). */
  evidence: PrimaryEvidence | null;
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
  const platform = platformHint(query);
  const service = serviceHint(query);

  const [semantic, lexical] = await Promise.all([
    semanticSearch(query, SEMANTIC_CANDIDATES, service),
    lexicalSearch(tokens, LEXICAL_CANDIDATES, platform, service),
  ]);

  const chunks = fuseCandidates(semantic, lexical, finalCount);
  const evidence = selectPrimaryEvidence(chunks, tokens, platform, service);

  return {
    chunks,
    evidence,
    tokens,
    hasExactMatch: chunks.some((chunk) => chunk.matchedBy.includes("lexical")),
  };
}
