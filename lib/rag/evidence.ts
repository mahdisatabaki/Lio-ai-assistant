import type { RetrievalResult } from "./retrieve";
import type { RetrievedChunk } from "./types";

/**
 * Decides whether retrieved evidence is strong enough to answer
 * (`docs/TECH.md` 17).
 *
 * The thresholds here are starting values, not tuned constants. `docs/TECH.md`
 * is explicit that the real relevance threshold must come from EVALS against a
 * live index, which has not been possible yet. They are collected in one place
 * so tuning later is a single edit.
 */

export const EVIDENCE_THRESHOLDS = {
  /** A literal token match is the strongest signal the MVP has. */
  minChunksForExactMatch: 1,
  /** Without an exact match, more semantic agreement is required. */
  minChunksForSemantic: 2,
};

export type EvidenceDecision =
  | { kind: "answer"; chunks: RetrievedChunk[] }
  | { kind: "clarify" }
  | { kind: "abstain" };

/**
 * Weak evidence splits two ways.
 *
 * Clarification is only worth asking when a better query would plausibly find
 * something — that is, when the user gave us little to search with. If they
 * already asked a detailed question and the index still has nothing, asking
 * them to rephrase wastes their time; abstaining is the honest answer.
 */
export function decideEvidence(
  result: RetrievalResult,
  query: string,
): EvidenceDecision {
  const { chunks, hasExactMatch } = result;

  if (hasExactMatch && chunks.length >= EVIDENCE_THRESHOLDS.minChunksForExactMatch) {
    return { kind: "answer", chunks };
  }

  if (chunks.length >= EVIDENCE_THRESHOLDS.minChunksForSemantic) {
    return { kind: "answer", chunks };
  }

  const looksUnderspecified = query.trim().length < 40 && result.tokens.length === 0;
  return looksUnderspecified ? { kind: "clarify" } : { kind: "abstain" };
}

/** Sources for the UI: retrieval metadata only, deduplicated by URL. */
export function sourcesFrom(chunks: RetrievedChunk[]) {
  const seen = new Set<string>();
  const sources = [];

  for (const chunk of chunks) {
    if (seen.has(chunk.sourceUrl)) continue;
    seen.add(chunk.sourceUrl);
    sources.push({
      title: chunk.title,
      heading: chunk.heading ?? undefined,
      url: chunk.sourceUrl,
    });
  }

  return sources;
}
