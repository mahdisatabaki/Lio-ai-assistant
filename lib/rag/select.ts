import type { PrimaryEvidence, RetrievedChunk } from "./types";

/**
 * Collapses ranked chunks into the one document an answer is built from
 * (BL-086).
 *
 * Retrieval deliberately looks wide; this narrows before generation. The model
 * is never asked to pick between pages — handed several, it hedges: competing
 * diagnoses, four source cards, no commitment. Deciding here, deterministically,
 * is what lets the answer be decisive.
 *
 * Pure and cheap on purpose: no second model call, no reranker.
 */

/** Chunks from one document, kept in fused-rank order. */
type DocumentGroup = {
  documentId: string;
  chunks: RetrievedChunk[];
  /** Best (lowest) position this document reached in the fused ranking. */
  bestRank: number;
};

/**
 * Weights are ordered by how much each signal says about *aboutness*.
 *
 * Rank alone is not enough: a page that merely mentions `ECONNRESET` in a list
 * can out-rank the page dedicated to it. A token in the *title* means the page
 * is about that token, so it outweighs both rank and a passing body mention —
 * which is what makes the canonical page win.
 */
export const SELECTION_WEIGHTS = {
  /** Fused rank, decaying with position. */
  rank: 10,
  /** The page is titled for the user's literal token: canonical. */
  titleToken: 20,
  /** A section is about it. */
  headingToken: 8,
  /** Mentioned somewhere in the body — real, but often incidental. */
  exactToken: 3,
  /** The query named this framework or service explicitly. */
  platformMatch: 10,
  serviceMatch: 10,
  /** Several relevant passages beat a single incidental mention. */
  perExtraChunk: 4,
};

/** Chunks carried into generation from the winning document. */
export const MAX_SELECTED_CHUNKS = 4;

function groupByDocument(chunks: RetrievedChunk[]): DocumentGroup[] {
  const groups = new Map<string, DocumentGroup>();

  chunks.forEach((chunk, index) => {
    // Source URL, not chunk id: one page is one document even when several of
    // its sections rank separately.
    const documentId = chunk.sourceUrl;
    const existing = groups.get(documentId);

    if (existing) existing.chunks.push(chunk);
    else groups.set(documentId, { documentId, chunks: [chunk], bestRank: index });
  });

  return [...groups.values()];
}

function scoreDocument(
  group: DocumentGroup,
  tokens: string[],
  platform: string | null,
  service: string | null,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const first = group.chunks[0];

  // Rank credit decays with position, so rank 1 is worth far more than rank 6.
  let score = SELECTION_WEIGHTS.rank / (group.bestRank + 1);
  if (group.bestRank === 0) reasons.push("top-ranked");

  const lowerTokens = tokens.map((t) => t.toLowerCase());
  const title = first.title.toLowerCase();
  const headings = group.chunks.map((c) => (c.heading ?? "").toLowerCase()).join(" ");
  const body = group.chunks.map((c) => c.content.toLowerCase()).join(" ");

  for (const token of lowerTokens) {
    if (title.includes(token)) {
      score += SELECTION_WEIGHTS.titleToken;
      reasons.push(`title:${token}`);
    } else if (headings.includes(token)) {
      score += SELECTION_WEIGHTS.headingToken;
      reasons.push(`heading:${token}`);
    } else if (body.includes(token)) {
      score += SELECTION_WEIGHTS.exactToken;
      reasons.push(`token:${token}`);
    }
  }

  if (platform && first.platform === platform) {
    score += SELECTION_WEIGHTS.platformMatch;
    reasons.push(`platform:${platform}`);
  }

  if (service && first.service === service) {
    score += SELECTION_WEIGHTS.serviceMatch;
    reasons.push(`service:${service}`);
  }

  score += (group.chunks.length - 1) * SELECTION_WEIGHTS.perExtraChunk;
  if (group.chunks.length > 1) reasons.push(`${group.chunks.length} passages`);

  return { score, reasons };
}

/**
 * Picks the winning document, or null when nothing was retrieved.
 *
 * A page whose *title* carries the user's literal token beats one that merely
 * mentions it in passing — which is how the dedicated `ECONNRESET` page wins
 * over a general error-list page, and how Object Storage docs beat an AI
 * cookbook that happens to repeat the word "object".
 */
export function selectPrimaryEvidence(
  chunks: RetrievedChunk[],
  tokens: string[] = [],
  platform: string | null = null,
  service: string | null = null,
): PrimaryEvidence | null {
  if (chunks.length === 0) return null;

  const scored = groupByDocument(chunks)
    .map((group) => ({ group, ...scoreDocument(group, tokens, platform, service) }))
    // Ties break on the better fused rank, so selection stays deterministic.
    .sort((a, b) => b.score - a.score || a.group.bestRank - b.group.bestRank);

  const winner = scored[0];
  const first = winner.group.chunks[0];

  return {
    documentId: winner.group.documentId,
    sourceUrl: first.sourceUrl,
    sourcePath: first.sourcePath,
    title: first.title,
    platform: first.platform,
    service: first.service,
    selectedChunks: winner.group.chunks.slice(0, MAX_SELECTED_CHUNKS),
    documentScore: Number(winner.score.toFixed(2)),
    evidenceReason: winner.reasons.join(", ") || "best available match",
  };
}
