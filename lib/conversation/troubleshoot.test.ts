import { describe, expect, it, vi } from "vitest";

import type { RetrievalResult } from "@/lib/rag/retrieve";
import { selectPrimaryEvidence } from "@/lib/rag/select";
import type { RetrievedChunk } from "@/lib/rag/types";

import { observe } from "./diagnose";
import { buildChatResponse, type ChatDeps } from "./respond";
import { createInitialState, enterJourney } from "./state";
import type { ChatRequest, ConversationState } from "./types";

/**
 * The frozen Troubleshooting Eval Pack (`docs/EVALS.md` 8), at behavior level.
 *
 * The model is a double, so these assert routing, deterministic observations,
 * grounding contracts, and state — not generated wording.
 */

function chunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    id: 1,
    sourcePath: "public/llms/paas/nextjs/fix-common-errors/econnreset.md",
    sourceUrl: "https://docs.liara.ir/paas/nextjs/fix-common-errors/econnreset/",
    title: "رفع خطای ECONNRESET",
    heading: null,
    platform: null,
    service: null,
    content: "افزایش منابع برنامه و راه‌اندازی مجدد.",
    score: 1,
    matchedBy: ["lexical", "semantic"],
    matchedTokens: ["ECONNRESET"],
    ...overrides,
  };
}

function deps(overrides: Partial<ChatDeps> = {}): ChatDeps {
  return {
    retrieve: vi.fn(
      async (): Promise<RetrievalResult> => ({
        chunks: [chunk()],
        evidence: selectPrimaryEvidence([chunk()], ["ECONNRESET"]),
        tokens: ["ECONNRESET"],
        hasExactMatch: true,
      }),
    ),
    generate: vi.fn(async () => "### برداشت من\nبه نظر می‌رسه...\n\n### قدم بعدی\nیک کار."),
    ...overrides,
  };
}

const send = (message: string, d: ChatDeps, state?: ConversationState) =>
  buildChatResponse(
    { message, recentMessages: [], state: state ?? createInitialState() } as ChatRequest,
    "req-t",
    d,
  );

describe("T-01 — ECONNRESET", () => {
  const input = "پروژه Next من روی لیارا بالا میاد ولی این خطا رو می‌بینم:\n`Error: read ECONNRESET`\nباید چیکار کنم؟";

  it("routes to troubleshooting and preserves the exact token", async () => {
    const d = deps();
    const response = await send(input, d);

    expect(response.meta.intent).toBe("troubleshooting");
    expect(d.retrieve).toHaveBeenCalledWith(expect.stringContaining("ECONNRESET"));
    expect(response.state.activeError).toContain("ECONNRESET");
  });

  it("cites the retrieved Liara source and offers a result follow-up", async () => {
    const response = await send(input, deps());

    expect(response.sources?.[0].url).toContain("econnreset");
    expect(response.actions?.map((a) => a.id)).toContain("fixed");
  });
});

describe("T-02 — npm mirror / package install failure", () => {
  it("treats it as troubleshooting and grounds on retrieval", async () => {
    const d = deps();
    const response = await send(
      "موقع deploy پروژه Next اینو می‌گیرم:\n`npm ERR! network request to package registry failed`",
      d,
    );

    expect(response.meta.intent).toBe("troubleshooting");
    expect(d.generate).toHaveBeenCalledOnce();
    expect(response.sources?.length).toBeGreaterThan(0);
  });
});

describe("T-03 — missing start script", () => {
  const input = [
    "deploy پروژه Next شکست می‌خوره. این بخش package.json منه:",
    "```json",
    '{ "scripts": { "dev": "next dev", "build": "next build" } }',
    "```",
  ].join("\n");

  it("detects the missing script deterministically", () => {
    expect(observe(input)).toContainEqual({ kind: "missing-start-script" });
  });

  it("hands that observation to the model instead of asking a questionnaire", async () => {
    const generate = vi.fn<ChatDeps["generate"]>(async () => "پاسخ");
    const response = await send(input, deps({ generate }));

    const context = generate.mock.calls[0]![1];
    expect(context.observations).toContainEqual({ kind: "missing-start-script" });
    expect(response.meta.intent).toBe("troubleshooting");
  });

  it("does not fire when a start script is present", () => {
    const ok = '```json\n{ "scripts": { "build": "next build", "start": "next start" } }\n```';
    expect(observe(ok)).not.toContainEqual({ kind: "missing-start-script" });
  });
});

describe("T-04 — liara.json platform mismatch", () => {
  const input = [
    "پروژه‌م Next هست. این liara.json رو گذاشتم:",
    "```json",
    '{ "app": "shop-web", "platform": "node" }',
    "```",
    "به نظرت مشکلی داره؟",
  ].join("\n");

  it("detects the mismatch and reports the found value", () => {
    expect(observe(input)).toContainEqual({ kind: "platform-mismatch", found: "node" });
  });

  it("does not flag a correct platform value", () => {
    const ok = 'پروژه Next.js\n```json\n{ "platform": "next" }\n```';
    expect(observe(ok).some((o) => o.kind === "platform-mismatch")).toBe(false);
  });

  it("stays quiet when the project is not Next.js", () => {
    const other = 'پروژه من Django است\n```json\n{ "platform": "django" }\n```';
    expect(other).toBeTruthy();
    expect(observe(other).some((o) => o.kind === "platform-mismatch")).toBe(false);
  });
});

describe("T-05 — ambiguous failure", () => {
  it("asks for the error text instead of guessing", async () => {
    const d = deps();
    const response = await send("deploy نشد. ارور میده. چیکار کنم؟", d);

    expect(response.message).toContain("متن خطا");
    expect(d.generate).not.toHaveBeenCalled();
    expect(d.retrieve).not.toHaveBeenCalled();
  });

  it("does not ask again once real output arrives", async () => {
    const d = deps();
    const response = await send(
      "npm ERR! code ECONNRESET\nnpm ERR! network request failed\nnpm ERR! retrying",
      d,
    );

    expect(response.message).not.toContain("متن خطا یا چند خط آخر");
    expect(d.generate).toHaveBeenCalledOnce();
  });
});

describe("T-06 — undocumented config trap", () => {
  const input = [
    "برای سریع‌تر شدن Next روی لیارا این تنظیم درسته؟",
    "```json",
    '{ "next": { "superTurboMode": true } }',
    "```",
    "مقدار بهترش چنده؟",
  ].join("\n");

  it("flags the unknown key rather than accepting it", () => {
    expect(observe(input)).toContainEqual({
      kind: "unknown-config-key",
      key: "superTurboMode",
    });
  });

  it("does not flag a documented key", () => {
    const ok = 'Next.js\n```json\n{ "next": { "mirror": false } }\n```';
    expect(ok).toBeTruthy();
    expect(observe(ok).some((o) => o.kind === "unknown-config-key")).toBe(false);
  });
});

describe("BL-051 — troubleshooting continuation", () => {
  const journey: ConversationState = {
    ...enterJourney(createInitialState(), "nextjs-deploy"),
    currentStep: "D02_CHECK_READINESS",
  };

  it("keeps the journey and its step while troubleshooting", async () => {
    const response = await send("خطا گرفتم موقع بیلد", deps(), journey);

    expect(response.meta.intent).toBe("troubleshooting");
    expect(response.state.activeJourney).toBe("nextjs-deploy");
    expect(response.state.currentStep).toBe("D02_CHECK_READINESS");
  });

  it("offers fixed / still-failing / new-log follow-ups", async () => {
    const response = await send(
      "خطا گرفتم موقع بیلد:\n`Error: read ECONNRESET`",
      deps(),
      journey,
    );
    expect(response.actions?.map((a) => a.id)).toEqual([
      "fixed",
      "still-failing",
      "new-log",
    ]);
  });

  it("returns to the journey after the user reports success", async () => {
    const errored = await send("خطا گرفتم موقع بیلد", deps(), journey);
    const recovered = await send("درست شد.", deps(), errored.state);

    expect(recovered.meta.intent).toBe("deployment");
    expect(recovered.state.activeError).toBeNull();
    expect(recovered.state.activeJourney).toBe("nextjs-deploy");
  });

  it("carries prior context into the follow-up prompt", async () => {
    const generate = vi.fn<ChatDeps["generate"]>(async () => "پاسخ");
    const withHistory: ConversationState = { ...journey, attemptedFix: "start رو اضافه کردم" };

    await buildChatResponse(
      {
        message: "هنوز همون خطا رو می‌گیرم: ECONNRESET",
        recentMessages: [{ id: "1", role: "user", content: "خطای قبلی" }],
        state: withHistory,
      },
      "req-2",
      deps({ generate }),
    );

    const context = generate.mock.calls[0]![1];
    expect(context.state.attemptedFix).toBe("start رو اضافه کردم");
    expect(context.recentMessages).toHaveLength(1);
  });
});

describe("config described in prose still gets diagnosed", () => {
  it("does not ask for error output when the user named the config", async () => {
    const d = deps();
    const response = await send(
      "پروژه‌م Next هست ولی توی liara.json نوشتم platform: node. مشکلیه؟",
      d,
    );

    expect(response.message).not.toContain("متن خطا یا چند خط آخر");
    expect(d.retrieve).toHaveBeenCalled();
  });

  it("still asks when there is genuinely nothing to work with", async () => {
    const d = deps();
    const response = await send("deploy نشد. ارور میده.", d);

    expect(response.message).toContain("متن خطا");
    expect(d.retrieve).not.toHaveBeenCalled();
  });
});
