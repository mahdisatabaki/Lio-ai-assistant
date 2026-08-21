import { describe, expect, it, vi } from "vitest";

import { selectPrimaryEvidence } from "@/lib/rag/select";

import { buildChatResponse, type ChatDeps } from "./respond";
import { createInitialState } from "./state";
import type { ConversationState } from "./types";

/**
 * The approved call budget (`docs/TECH.md` 19), enforced as tests.
 *
 * Counting calls is the only way an accidental extra model request stays
 * visible — cost regressions are silent otherwise, and the challenge scores
 * cost efficiency explicitly.
 */

function counted() {
  const chunks = [
    {
      id: 1,
      sourcePath: "p.md",
        sourceUrl: "https://docs.liara.ir/x/",
        title: "T",
        heading: null,
        platform: null,
        service: null,
        content: "c",
        score: 1,
        matchedBy: ["semantic"] as ("semantic" | "lexical")[],
        matchedTokens: [],
      },
      {
        id: 2,
        sourcePath: "q.md",
        sourceUrl: "https://docs.liara.ir/y/",
        title: "T2",
        heading: null,
        platform: null,
        service: null,
        content: "c2",
        score: 0.9,
        matchedBy: ["semantic"] as ("semantic" | "lexical")[],
        matchedTokens: [],
      },
  ];

  const retrieve = vi.fn(async () => ({
    chunks,
    // Real selector, so the budget is measured against production behavior.
    evidence: selectPrimaryEvidence(chunks, []),
    tokens: [],
    hasExactMatch: false,
  }));
  const generate = vi.fn(async () => "پاسخ");
  return { deps: { retrieve, generate } as ChatDeps, retrieve, generate };
}

const journey = (step: ConversationState["currentStep"]): ConversationState => ({
  ...createInitialState(),
  activeJourney: "nextjs-deploy",
  framework: "nextjs",
  currentStep: step,
});

describe("zero-cost paths", () => {
  it("a guided step costs no embedding and no generation", async () => {
    const c = counted();
    await buildChatResponse(
      { message: "نصب شد.", recentMessages: [], state: journey("D04_ENSURE_CLI") },
      "req",
      c.deps,
    );

    expect(c.retrieve).not.toHaveBeenCalled();
    expect(c.generate).not.toHaveBeenCalled();
  });

  it("holding a step costs nothing either", async () => {
    const c = counted();
    await buildChatResponse(
      { message: "باشه", recentMessages: [], state: journey("D06_CREATE_RESOURCES") },
      "req",
      c.deps,
    );

    expect(c.retrieve).not.toHaveBeenCalled();
    expect(c.generate).not.toHaveBeenCalled();
  });

  it("Build on Liara planning costs nothing", async () => {
    const c = counted();
    await buildChatResponse(
      {
        message: "پروژه Next.js با دیتابیس postgres و آپلود فایل کاربر دارم.",
        recentMessages: [],
        state: createInitialState(),
      },
      "req",
      c.deps,
    );

    expect(c.retrieve).not.toHaveBeenCalled();
    expect(c.generate).not.toHaveBeenCalled();
  });

  it("an ambiguous error is clarified without any AI call", async () => {
    const c = counted();
    await buildChatResponse(
      { message: "deploy نشد. ارور میده.", recentMessages: [], state: createInitialState() },
      "req",
      c.deps,
    );

    expect(c.retrieve).not.toHaveBeenCalled();
    expect(c.generate).not.toHaveBeenCalled();
  });

  it("an unsupported framework costs nothing", async () => {
    const c = counted();
    await buildChatResponse(
      { message: "پروژه Django دارم، می‌خوام آنلاینش کنم.", recentMessages: [], state: createInitialState() },
      "req",
      c.deps,
    );

    expect(c.retrieve).not.toHaveBeenCalled();
    expect(c.generate).not.toHaveBeenCalled();
  });
});

describe("bounded-cost paths", () => {
  it("general Q&A is exactly one retrieval and one generation", async () => {
    const c = counted();
    await buildChatResponse(
      {
        message: "آبجکت استوریج لیارا برای چه کاری خوبه؟",
        recentMessages: [],
        state: createInitialState(),
      },
      "req",
      c.deps,
    );

    expect(c.retrieve).toHaveBeenCalledTimes(1);
    expect(c.generate).toHaveBeenCalledTimes(1);
  });

  it("troubleshooting is exactly one retrieval and one generation", async () => {
    const c = counted();
    await buildChatResponse(
      {
        message: "npm ERR! code ECONNRESET\nnpm ERR! network failed\nnpm ERR! retry",
        recentMessages: [],
        state: createInitialState(),
      },
      "req",
      c.deps,
    );

    expect(c.retrieve).toHaveBeenCalledTimes(1);
    expect(c.generate).toHaveBeenCalledTimes(1);
  });

  it("a side question during a journey stays at one retrieval and one generation", async () => {
    const c = counted();
    await buildChatResponse(
      {
        message: "راستی Object Storage چیه؟",
        recentMessages: [],
        state: journey("D08_DEPLOY"),
      },
      "req",
      c.deps,
    );

    expect(c.retrieve).toHaveBeenCalledTimes(1);
    expect(c.generate).toHaveBeenCalledTimes(1);
  });

  it("abstention spends the retrieval but never the generation", async () => {
    const retrieve = vi.fn(async () => ({ chunks: [], evidence: null, tokens: [], hasExactMatch: false }));
    const generate = vi.fn(async () => "پاسخ");

    await buildChatResponse(
      {
        message: "آیا لیارا از یک قابلیت کاملاً ثبت‌نشده و فرضی پشتیبانی می‌کند؟",
        recentMessages: [],
        state: createInitialState(),
      },
      "req",
      { retrieve, generate },
    );

    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(generate).not.toHaveBeenCalled();
  });

  it("never retries or chains a failed generation", async () => {
    const c = counted();
    const generate = vi.fn(async () => {
      throw new Error("upstream error");
    });

    await buildChatResponse(
      { message: "سؤالی درباره سرویس‌های لیارا دارم", recentMessages: [], state: createInitialState() },
      "req",
      { retrieve: c.deps.retrieve, generate },
    );

    // One attempt only: no fallback model, no retry loop.
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
