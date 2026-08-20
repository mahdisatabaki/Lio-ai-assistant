/**
 * Non-secret application limits.
 *
 * These are plain constants on purpose. `docs/TECH.md` section 34 asks for
 * "sensible application defaults for non-secret tuning values" rather than a
 * wide environment surface, and constants behave identically on the server and
 * in the browser. Reading them from `process.env` would silently fall back to
 * the default in client code, because Next.js only inlines `NEXT_PUBLIC_`
 * variables — a footgun with no upside at this size.
 *
 * Nothing secret belongs in this file. Secrets live in `lib/server/env.ts`,
 * which the client cannot import.
 */
export const config = {
  /** Longest single user message accepted by the server (docs/TECH.md 24). */
  maxMessageChars: 12_000,

  /** Recent conversation messages carried per request (docs/TECH.md 24). */
  maxRecentMessages: 10,

  /** Chat requests allowed per minute per IP (docs/TECH.md 25). */
  chatRateLimitPerMinute: 20,

  /** Retrieved chunks sent to the answer generator (docs/TECH.md 16.3). */
  ragFinalChunkCount: 5,
} as const;
