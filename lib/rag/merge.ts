import type { Candidate, RetrievedChunk } from "./types.ts";

/**
 * Reciprocal Rank Fusion of the semantic and lexical arms
 * (`docs/TECH.md` 16.3).
 *
 * RRF fuses by *rank*, not by score, which is the property we need: cosine
 * similarity and substring-match counts are not comparable numbers, and any
 * attempt to normalise them into one scale would be invented weighting.
 *
 * score(chunk) = Σ over arms of 1 / (K + rank)
 *
 * A chunk found by both arms therefore outranks one found by either alone,
 * which is exactly the behavior an error-token query needs.
 */

/** Standard RRF damping. Larger K flattens the influence of top ranks. */
export const RRF_K = 60;

export const DEFAULT_FINAL_COUNT = 5;

/** Stable identity for deduplication: the same heading of the same page. */
export function dedupeKey(candidate: Candidate): string {
  return `${candidate.sourceUrl}#${candidate.heading ?? ""}`;
}

export function fuseCandidates(
  semantic: Candidate[],
  lexical: Candidate[],
  finalCount: number = DEFAULT_FINAL_COUNT,
): RetrievedChunk[] {
  const fused = new Map<
    string,
    {
      candidate: Candidate;
      score: number;
      matchedBy: Set<"semantic" | "lexical">;
      matchedTokens: Set<string>;
      bestRank: number;
    }
  >();

  const absorb = (arm: "semantic" | "lexical", candidates: Candidate[]) => {
    candidates.forEach((candidate, index) => {
      const key = dedupeKey(candidate);
      const contribution = 1 / (RRF_K + index + 1);
      const existing = fused.get(key);

      if (existing) {
        existing.score += contribution;
        existing.matchedBy.add(arm);
        existing.bestRank = Math.min(existing.bestRank, index);
        for (const token of candidate.matchedTokens ?? []) {
          existing.matchedTokens.add(token);
        }
        return;
      }

      fused.set(key, {
        candidate,
        score: contribution,
        matchedBy: new Set([arm]),
        matchedTokens: new Set(candidate.matchedTokens ?? []),
        bestRank: index,
      });
    });
  };

  absorb("semantic", semantic);
  absorb("lexical", lexical);

  return [...fused.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Deterministic tie-breaks so repeated queries return a stable order.
      if (a.bestRank !== b.bestRank) return a.bestRank - b.bestRank;
      return a.candidate.id - b.candidate.id;
    })
    .slice(0, finalCount)
    .map(({ candidate, score, matchedBy, matchedTokens }) => ({
      id: candidate.id,
      sourcePath: candidate.sourcePath,
      sourceUrl: candidate.sourceUrl,
      title: candidate.title,
      heading: candidate.heading,
      content: candidate.content,
      score,
      // Sorted so the field is stable across runs.
      matchedBy: [...matchedBy].sort(),
      matchedTokens: [...matchedTokens].sort(),
    }));
}
