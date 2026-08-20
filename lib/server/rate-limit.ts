import { config } from "@/lib/config";

/**
 * In-memory fixed-window rate limiter (`docs/TECH.md` 25).
 *
 * Single-instance control, not a distributed guarantee. State resets on restart
 * and is not shared across instances — accepted explicitly, because the MVP runs
 * as one application and Redis would be infrastructure bought for nothing.
 *
 * Kept out of `lib/server/` secrets territory: it holds no configuration beyond
 * counts, so it is safe to unit test directly.
 */

type Window = { count: number; resetAt: number };

const WINDOW_MS = 60_000;

/** Cached on globalThis so a hot reload does not reset everyone's window. */
const STORE_KEY = Symbol.for("liara.assistant.rateLimit");
type StoreHolder = { [STORE_KEY]?: Map<string, Window> };

function store(): Map<string, Window> {
  const holder = globalThis as StoreHolder;
  holder[STORE_KEY] ??= new Map();
  return holder[STORE_KEY];
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets, for Retry-After. */
  retryAfter: number;
};

export function checkRateLimit(
  key: string,
  limit: number = config.chatRateLimitPerMinute,
  now: number = Date.now(),
): RateLimitResult {
  const windows = store();
  const existing = windows.get(key);

  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > limit) {
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: limit - existing.count, retryAfter };
}

/**
 * Best-effort client identity.
 *
 * Behind Liara's proxy the direct socket address is the proxy, so the forwarded
 * header is used when present. It is spoofable — acceptable for abuse damping,
 * never for anything security-critical.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Test hook. Not used in production paths. */
export function resetRateLimits(): void {
  store().clear();
}
