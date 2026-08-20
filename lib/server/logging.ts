/**
 * Structured JSON logs to stdout (`docs/TECH.md` 27.1).
 *
 * Metadata only. User messages, retrieved chunk text, embeddings, model keys,
 * and the database URL never appear here — sizes and counts carry the
 * operational signal without turning logs into a copy of the conversation.
 *
 * No Sentry, no SDK: Liara's own log surface is the first place to look.
 */

export type ChatLogFields = {
  request_id: string;
  intent?: string;
  active_journey?: string | null;
  current_step?: string | null;
  latency_ms?: number;
  retrieval_count?: number;
  used_exact_match?: boolean;
  chat_model?: string;
  embedding_model?: string;
  input_size?: number;
  output_size?: number;
  token_usage?: number;
  status: "ok" | "error" | "rejected";
  error_code?: string;
};

/** Keys that must never be logged, whatever a caller passes. */
const FORBIDDEN = /^(message|content|prompt|chunks?|embedding|api_?key|database_?url|authorization)$/i;

export function logChat(fields: ChatLogFields): void {
  const safe: Record<string, unknown> = { event: "chat_request" };

  for (const [key, value] of Object.entries(fields)) {
    if (FORBIDDEN.test(key)) continue;
    if (value === undefined) continue;
    safe[key] = value;
  }

  console.log(JSON.stringify(safe));
}
