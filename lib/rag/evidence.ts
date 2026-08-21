import type { RetrievalResult } from "./retrieve.ts";
import type { PrimaryEvidence } from "./types.ts";

/**
 * Decides whether one document carries enough evidence to answer
 * (`docs/TECH.md` 17, BL-089).
 *
 * The decision is now about a single document rather than a pile of chunks. If
 * the winning page does not support an answer, the fix is never to widen the
 * net and let the model hedge across pages — it is to ask one focused question
 * or to say plainly that we could not confirm it.
 */

export const EVIDENCE_THRESHOLDS = {
  /**
   * Minimum score for the winning document.
   *
   * The selector already folds rank, literal-token hits, and platform/service
   * agreement into one number, so a second chunk-count rule would double-count
   * the same signal and abstain on good single-passage answers. A top-ranked
   * document scores 10 and a rank-3 document with nothing else going for it
   * scores about 3.3 — this sits between them.
   */
  minDocumentScore: 4,
};

export type EvidenceDecision =
  | { kind: "answer"; evidence: PrimaryEvidence }
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
  const { evidence, hasExactMatch } = result;

  const looksUnderspecified = query.trim().length < 40 && result.tokens.length === 0;

  if (!evidence) return looksUnderspecified ? { kind: "clarify" } : { kind: "abstain" };

  // A literal token match is the strongest signal the MVP has, so it answers on
  // its own; otherwise the document has to clear the score bar.
  if (hasExactMatch || evidence.documentScore >= EVIDENCE_THRESHOLDS.minDocumentScore) {
    return { kind: "answer", evidence };
  }

  return looksUnderspecified ? { kind: "clarify" } : { kind: "abstain" };
}

/**
 * The source shown to the user: exactly one, from the document the answer was
 * built on.
 *
 * Several cards invited the reader to go and compare pages themselves, which is
 * the job the product exists to do for them.
 */
export function sourcesFrom(evidence: PrimaryEvidence | null) {
  if (!evidence) return [];

  const heading = evidence.selectedChunks[0]?.heading ?? undefined;

  return [{ title: evidence.title, heading, url: evidence.sourceUrl }];
}
