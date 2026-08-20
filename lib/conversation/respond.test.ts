import { describe, expect, it, vi } from "vitest";

import type { RetrievalResult } from "@/lib/rag/retrieve";
import type { RetrievedChunk } from "@/lib/rag/types";

import {
  ABSTENTION_MESSAGE,
  buildChatResponse,
  type ChatDeps,
} from "./respond";
import { createInitialState } from "./state";
import type { ChatRequest, ConversationState } from "./types";

/**
 * Behavior tests for the answer pipeline.
 *
 * Retrieval and generation are test doubles: Liara AI and PostgreSQL are not
 * reachable from this machine, so these prove the decision tree and the
 * grounding contract, not live model quality.
 */

function chunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    id: 1,
    sourcePath: "public/llms/paas/nextjs/how-tos/deploy-app.md",
    sourceUrl: "https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/",
    title: "استقرار برنامه Next.js",
    heading: "فایل liara.json",
    content: "برای اجرای برنامه به اسکریپت start نیاز است.",
    score: 0.9,
    matchedBy: ["semantic"],
    matchedTokens: [],
    ...overrides,
  };
}

function retrieval(overrides: Partial<RetrievalResult> = {}): RetrievalResult {
  return {
    chunks: [chunk(), chunk({ id: 2, sourceUrl: "https://docs.liara.ir/paas/liarajson/" })],
    tokens: [],
    hasExactMatch: false,
    ...overrides,
  };
}

function deps(overrides: Partial<ChatDeps> = {}): ChatDeps {
  return {
    retrieve: vi.fn(async () => retrieval()),
    generate: vi.fn(async () => "جواب کوتاه فارسی."),
    ...overrides,
  };
}

function request(message: string, state?: ConversationState): ChatRequest {
  return { message, recentMessages: [], state: state ?? createInitialState() };
}

const ask = (message: string, d: ChatDeps, state?: ConversationState) =>
  buildChatResponse(request(message, state), "req-1", d);

describe("BL-040 — grounded general answers", () => {
  it("retrieves, generates once, and returns the answer", async () => {
    const d = deps();
    const response = await ask("آبجکت استوریج لیارا چیه؟", d);

    expect(d.retrieve).toHaveBeenCalledOnce();
    expect(d.generate).toHaveBeenCalledOnce();
    expect(response.message).toBe("جواب کوتاه فارسی.");
    expect(response.meta.intent).toBe("general");
  });

  it("sends only the retrieved chunks, never a whole page dump", async () => {
    const generate = vi.fn<ChatDeps["generate"]>(async () => "پاسخ");
    await ask("سؤال درباره دیتابیس لیارا و نحوه اتصال به آن", deps({ generate }));

    const context = generate.mock.calls[0]![1];
    expect(context.chunks).toHaveLength(2);
  });

  it("passes conversation state so known facts are not asked again", async () => {
    const generate = vi.fn<ChatDeps["generate"]>(async () => "پاسخ");
    const state: ConversationState = {
      ...createInitialState(),
      framework: "nextjs",
      attemptedFix: "کش رو پاک کردم",
    };

    await ask("سؤال عمومی درباره سرویس‌های لیارا و کاربردشان", deps({ generate }), state);

    const context = generate.mock.calls[0]![1];
    expect(context.state.framework).toBe("nextjs");
    expect(context.state.attemptedFix).toBe("کش رو پاک کردم");
  });
});

describe("BL-041 — sources, clarification, abstention", () => {
  it("takes sources from retrieval metadata, not from model text", async () => {
    const generate = vi.fn<ChatDeps["generate"]>(
      async () => "ببین https://evil.example.com/fake رو که خودم ساختم.",
    );
    const response = await ask("آبجکت استوریج لیارا دقیقاً چه کاربردی داره؟", deps({ generate }));

    expect(response.sources?.map((s) => s.url)).toEqual([
      "https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/",
      "https://docs.liara.ir/paas/liarajson/",
    ]);
    expect(response.sources?.some((s) => s.url.includes("evil"))).toBe(false);
  });

  it("deduplicates sources that share a URL", async () => {
    const d = deps({
      retrieve: async () =>
        retrieval({ chunks: [chunk({ id: 1 }), chunk({ id: 2, heading: "بخش دیگر" })] }),
    });

    const response = await ask("آبجکت استوریج لیارا دقیقاً چه کاربردی داره؟", d);
    expect(response.sources).toHaveLength(1);
  });

  it("answers on a single chunk when a literal token matched", async () => {
    const d = deps({
      retrieve: async () =>
        retrieval({ chunks: [chunk()], tokens: ["ECONNRESET"], hasExactMatch: true }),
    });

    const response = await ask("درباره ECONNRESET در لیارا توضیح بده", d);
    expect(response.message).toBe("جواب کوتاه فارسی.");
  });

  it("abstains instead of guessing when evidence is thin", async () => {
    const d = deps({ retrieve: async () => retrieval({ chunks: [] }) });
    const response = await ask(
      "آیا لیارا از قابلیت فرضی و ثبت‌نشده‌ای برای شتاب‌دهی پشتیبانی می‌کند؟",
      d,
    );

    expect(response.message).toBe(ABSTENTION_MESSAGE);
    expect(response.sources ?? []).toEqual([]);
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("never attaches sources to an abstention", async () => {
    const d = deps({ retrieve: async () => retrieval({ chunks: [] }) });
    const response = await ask(
      "سؤال طولانی و مفصلی که هیچ مستندی برایش پیدا نمی‌شود و باید صادقانه رد شود",
      d,
    );
    expect(response.sources).toBeUndefined();
  });
});

describe("BL-042 — failure behavior", () => {
  const failing = (stage: "retrieve" | "generate") =>
    deps(
      stage === "retrieve"
        ? {
            retrieve: async () => {
              throw new Error("connection refused");
            },
          }
        : {
            generate: async () => {
              throw new Error("upstream 503");
            },
          },
    );

  it("returns safe Persian copy when retrieval is down", async () => {
    const response = await ask("سؤالی درباره سرویس‌های لیارا", failing("retrieve"));
    expect(response.message).toMatch(/مستندات لیارا وصل بشم|در دسترس نیست/);
    expect(response.sources ?? []).toEqual([]);
  });

  it("returns safe Persian copy when the model is down", async () => {
    const response = await ask("سؤالی درباره سرویس‌های لیارا", failing("generate"));
    expect(response.message).toMatch(/هوش مصنوعی/);
  });

  it("never leaks internal error text", async () => {
    for (const stage of ["retrieve", "generate"] as const) {
      const response = await ask("سؤالی درباره سرویس‌های لیارا", failing(stage));
      expect(response.message).not.toMatch(/connection refused|503|Error|stack/i);
    }
  });

  it("preserves journey state through a failure so retry loses nothing", async () => {
    const state: ConversationState = {
      ...createInitialState(),
      activeJourney: "nextjs-deploy",
      currentStep: "D02_CHECK_READINESS",
      framework: "nextjs",
    };

    const response = await ask("راستی دیتابیس پستگرس لیارا چطور کار می‌کنه؟", failing("retrieve"), state);

    expect(response.state.activeJourney).toBe("nextjs-deploy");
    expect(response.state.currentStep).toBe("D02_CHECK_READINESS");
  });

  it("does not answer from model memory when retrieval fails", async () => {
    const d = failing("retrieve");
    await ask("پورت پیش‌فرض Next.js روی لیارا چنده؟", d);
    expect(d.generate).not.toHaveBeenCalled();
  });
});
