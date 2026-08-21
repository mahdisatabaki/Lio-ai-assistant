/**
 * Failure behavior for the RAG path (`docs/TECH.md` 29).
 *
 * The rule that matters: when retrieval or the model is unavailable, the
 * product says so. It never answers a Liara question from the model's own
 * memory, because a confident ungrounded answer is worse than an outage — it
 * turns the assistant into a generic chatbot wearing Liara's name.
 */

export type FailureKind =
  | "retrieval-unavailable"
  | "embedding-unavailable"
  | "model-unavailable"
  | "index-empty";

export type FailureInfo = {
  kind: FailureKind;
  /** Persian, user-facing, safe to display. Never contains internals. */
  message: string;
  /** Whether the same request is worth sending again unchanged. */
  retryable: boolean;
};

const FAILURES: Record<FailureKind, Omit<FailureInfo, "kind">> = {
  "retrieval-unavailable": {
    message:
      "الان به منبع مستندات لیارا دسترسی ندارم. بدون منبع ترجیح می‌دم جواب حدسی ندم؛ چند لحظه دیگه دوباره بفرست.",
    retryable: true,
  },
  "embedding-unavailable": {
    message:
      "جست‌وجو در مستندات لیارا موقتاً در دسترس نیست. چون بدون منبع جواب نمی‌دم، یه بار دیگه امتحان کن.",
    retryable: true,
  },
  "model-unavailable": {
    message:
      "ارتباط با سرویس هوش مصنوعی برقرار نشد. متن سؤالت حفظ شده؛ دوباره بفرست تا ادامه بدیم.",
    retryable: true,
  },
  "index-empty": {
    message:
      "فهرست مستندات لیارا هنوز ساخته نشده، برای همین جوابی که بشه بهش تکیه کرد ندارم. این مشکل سمت سرویسه، نه سؤال تو.",
    retryable: false,
  },
};

export function failure(kind: FailureKind): FailureInfo {
  return { kind, ...FAILURES[kind] };
}

/**
 * Maps a thrown error to a user-safe failure.
 *
 * Classification is intentionally coarse. The internal message is inspected
 * only to pick the right Persian sentence and is never shown or logged verbatim
 * to the user.
 */
export function classifyError(error: unknown, stage: "retrieval" | "generation"): FailureInfo {
  const text = error instanceof Error ? error.message.toLowerCase() : String(error);

  if (stage === "generation") return failure("model-unavailable");

  if (/embed/.test(text)) return failure("embedding-unavailable");

  return failure("retrieval-unavailable");
}

/** Structured log line. Carries no secrets, no user content, no embeddings. */
export function failureLog(
  requestId: string,
  info: FailureInfo,
  error: unknown,
): string {
  return JSON.stringify({
    event: "chat_failure",
    request_id: requestId,
    error_code: info.kind,
    // Error type only — not the message, which can echo a connection string.
    error_type: error instanceof Error ? error.name : typeof error,
  });
}
