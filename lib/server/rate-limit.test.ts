import { beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@/lib/config";

import { checkRateLimit, clientKey, resetRateLimits } from "./rate-limit";
import { logChat } from "./logging";

beforeEach(() => resetRateLimits());

describe("checkRateLimit", () => {
  it("allows requests up to the configured limit", () => {
    for (let i = 0; i < config.chatRateLimitPerMinute; i += 1) {
      expect(checkRateLimit("ip-a").allowed).toBe(true);
    }
  });

  it("rejects the request after the limit", () => {
    for (let i = 0; i < config.chatRateLimitPerMinute; i += 1) checkRateLimit("ip-a");

    const result = checkRateLimit("ip-a");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("counts each client separately", () => {
    for (let i = 0; i < config.chatRateLimitPerMinute; i += 1) checkRateLimit("ip-a");

    expect(checkRateLimit("ip-a").allowed).toBe(false);
    expect(checkRateLimit("ip-b").allowed).toBe(true);
  });

  it("opens a fresh window after a minute", () => {
    const start = 1_000_000;
    for (let i = 0; i < config.chatRateLimitPerMinute; i += 1) {
      checkRateLimit("ip-c", config.chatRateLimitPerMinute, start);
    }
    expect(checkRateLimit("ip-c", config.chatRateLimitPerMinute, start).allowed).toBe(false);
    expect(
      checkRateLimit("ip-c", config.chatRateLimitPerMinute, start + 60_001).allowed,
    ).toBe(true);
  });

  it("reports remaining budget", () => {
    expect(checkRateLimit("ip-d", 3).remaining).toBe(2);
    expect(checkRateLimit("ip-d", 3).remaining).toBe(1);
  });
});

describe("clientKey", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://localhost/api/chat", { headers });

  it("prefers the first forwarded address", () => {
    expect(clientKey(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("falls back to the real-ip header", () => {
    expect(clientKey(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("degrades to a constant rather than throwing", () => {
    expect(clientKey(req({}))).toBe("unknown");
  });
});

describe("logChat", () => {
  it("emits a single JSON line of metadata", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logChat({ request_id: "r1", intent: "general", status: "ok", latency_ms: 12 });

    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line).toMatchObject({
      event: "chat_request",
      request_id: "r1",
      intent: "general",
      status: "ok",
    });
    spy.mockRestore();
  });

  it("drops any field whose name looks like content or a secret", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logChat({
      request_id: "r2",
      status: "ok",
      // Not part of the type; a caller could still pass one by mistake.
      ...({
        message: "لاگ کامل کاربر",
        api_key: "sk-secret",
        database_url: "postgres://u:p@h/db",
        embedding: [0.1, 0.2],
      } as Record<string, unknown>),
    });

    const raw = spy.mock.calls[0]![0] as string;
    expect(raw).not.toMatch(/sk-secret|postgres:\/\/|لاگ کامل|0\.1/);
    spy.mockRestore();
  });

  it("omits undefined fields instead of emitting nulls", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logChat({ request_id: "r3", status: "ok", intent: undefined });

    expect(JSON.parse(spy.mock.calls[0]![0] as string)).not.toHaveProperty("intent");
    spy.mockRestore();
  });
});
