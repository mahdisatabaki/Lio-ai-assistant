/** Shared retrieval shapes (`docs/TECH.md` 14, 16, 18.3). */

/** A chunk produced by the indexer, before it has an embedding. */
export type DocChunk = {
  sourcePath: string;
  sourceUrl: string;
  title: string;
  heading: string | null;
  service: string | null;
  platform: string | null;
  chunkIndex: number;
  content: string;
  contentHash: string;
};

/** A chunk retrieved from the index, with ranking metadata attached. */
export type RetrievedChunk = {
  id: number;
  sourcePath: string;
  sourceUrl: string;
  title: string;
  heading: string | null;
  content: string;
  /** Fused rank score. Higher is better. Comparable only within one query. */
  score: number;
  /** Which arms found this chunk, for debugging and abstention decisions. */
  matchedBy: ("semantic" | "lexical")[];
  /** Technical tokens that matched literally, when the lexical arm hit. */
  matchedTokens: string[];
};

/** One arm's ordered candidates. Rank is implied by array position. */
export type Candidate = {
  id: number;
  sourcePath: string;
  sourceUrl: string;
  title: string;
  heading: string | null;
  content: string;
  /** Raw arm score, kept for inspection. Not comparable across arms. */
  rawScore?: number;
  matchedTokens?: string[];
};
