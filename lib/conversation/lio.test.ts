import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  GENERAL_SYSTEM_PROMPT,
  TROUBLESHOOTING_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";

import { selectPrimaryEvidence } from "@/lib/rag/select";

import { failure } from "./failures";
import { buildChatResponse, type ChatDeps } from "./respond";
import { createInitialState } from "./state";
import type { ConversationState } from "./types";

/**
 * Lio's identity is a personality layer, not a licence to guess. These lock the
 * few properties that would quietly erode: the slogan leaking into replies, an
 * emoji softening a serious failure, and the persona diluting the grounding and
 * confirmation rules underneath it.
 */

const SLOGAN = "نگران نباش، با هم دیپلویش می‌کنیم";

/** Playful marks that must never decorate a serious failure. */
const PLAYFUL_EMOJI = /[😀-🙏✨🎉🚀👋🔥💪😉🙂👍]/u;

function deps(overrides: Partial<ChatDeps> = {}): ChatDeps {
  return {
    retrieve: vi.fn(async () => ({ chunks: [], evidence: null, tokens: [], hasExactMatch: false })),
    generate: vi.fn(async () => "پاسخ"),
    ...overrides,
  };
}

const send = (message: string, state?: ConversationState, d: ChatDeps = deps()) =>
  buildChatResponse(
    { message, recentMessages: [], state: state ?? createInitialState() },
    "req-lio",
    d,
  );

const journey = (step: ConversationState["currentStep"]): ConversationState => ({
  ...createInitialState(),
  activeJourney: "nextjs-deploy",
  framework: "nextjs",
  currentStep: step,
});

describe("A — the welcome experience introduces Lio", () => {
  const home = readFileSync(join("components", "home-screen.tsx"), "utf8");

  it("introduces Lio by name", () => {
    expect(home).toContain("سلام، من لیو هستم");
  });

  it("shows the slogan exactly once, on Home", () => {
    expect(home.split(SLOGAN)).toHaveLength(2);
  });

  it("keeps both frozen primary actions", () => {
    expect(home).toContain("یه مشکلی برای پروژه‌م پیش اومده");
    expect(home).toContain("می‌خوام پروژه‌م رو آنلاین کنم");
  });
});

describe("B — the slogan never leaks into ordinary replies", () => {
  it("is absent from deterministic journey and clarification copy", async () => {
    const replies = await Promise.all([
      send("می‌خوام پروژه‌م رو آنلاین کنم."),
      send("نصب شد.", journey("D04_ENSURE_CLI")),
      send("deploy نشد. ارور میده."),
      send("دیپلوی شد و برنامه بالا اومد.", journey("D08_DEPLOY")),
      send("پروژه Django دارم، می‌خوام آنلاینش کنم."),
    ]);

    for (const reply of replies) expect(reply.message).not.toContain(SLOGAN);
  });

  it("instructs the model not to write it either", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("را در پاسخ‌ها ننویس");
  });
});

describe("C — serious failures stay serious", () => {
  it.each(["retrieval-unavailable", "embedding-unavailable", "model-unavailable", "index-empty"] as const)(
    "%s carries no playful emoji",
    (kind) => {
      expect(failure(kind).message).not.toMatch(PLAYFUL_EMOJI);
    },
  );

  it("does not blame the user", () => {
    expect(failure("index-empty").message).toContain("نه سؤال تو");
  });

  it("tells the model to drop emoji and humour on serious errors", () => {
    expect(TROUBLESHOOTING_SYSTEM_PROMPT).toContain("بدون ایموجی و بدون شوخی");
  });
});

describe("D — consequential actions still require confirmation", () => {
  it("both prompts demand explicit confirmation before an impactful change", () => {
    for (const prompt of [GENERAL_SYSTEM_PROMPT, TROUBLESHOOTING_SYSTEM_PROMPT]) {
      expect(prompt).toContain("تأیید صریح بگیر");
      expect(prompt).toContain("بدون تأیید کاربر، انجامش نده");
    }
  });

  it("names the operations that need it", () => {
    for (const term of ["حذف", "ری‌استارت", "تغییر پلن یا هزینه", "متغیر محیطی", "DNS"]) {
      expect(GENERAL_SYSTEM_PROMPT).toContain(term);
    }
  });
});

describe("E — technical tokens survive the persona", () => {
  it("keeps a pasted error string byte-for-byte in state", async () => {
    const reply = await send("موقع استقرار خطا گرفتم:\n`Error: read ECONNRESET`", journey("D08_DEPLOY"));
    expect(reply.state.activeError).toContain("ECONNRESET");
  });

  it("still forbids rewriting technical strings", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("دقیقاً همان‌طور که هست");
  });

  it("shows the real app id in the deploy command", async () => {
    const reply = await send("آماده‌ست.", { ...journey("D07_PREPARE_INPUTS"), appId: "shop-web" });
    expect(reply.message).toContain("liara deploy --app=shop-web --platform=next");
  });
});

describe("F — grounding survives the persona", () => {
  it("still abstains when evidence is thin", async () => {
    const d = deps();
    const reply = await send(
      "آیا لیارا از یک قابلیت کاملاً ثبت‌نشده و فرضی پشتیبانی می‌کند؟",
      createInitialState(),
      d,
    );

    expect(reply.message).toContain("نتونستم تأیید کنم");
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("keeps the abstention sentence in the prompt", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("اگر شواهد کافی نیست");
  });
});

describe("H — the approved assets exist", () => {
  it.each(["liv-wave-web-512.webp", "liv-wave-web-small.webp"])("%s is present", (file) => {
    expect(existsSync(join("public", "images", file))).toBe(true);
  });

  it("Home uses the large asset and Conversation the small one", () => {
    expect(readFileSync(join("components", "home-screen.tsx"), "utf8")).toContain(
      "/images/liv-wave-web-512.webp",
    );
    expect(readFileSync(join("components", "conversation-view.tsx"), "utf8")).toContain(
      "/images/liv-wave-web-small.webp",
    );
  });

  it("marks the decorative Conversation instance as empty alt", () => {
    expect(readFileSync(join("components", "conversation-view.tsx"), "utf8")).toMatch(
      /alt=""/,
    );
  });
});

describe("an abstention shows no source", () => {
  it("drops the card when the model declines for lack of evidence", async () => {
    const d = deps({
      generate: vi.fn(async () => "کلید «superTurboMode» در مستندات لیارا پیدا نشد و تأییدش نکردم."),
      retrieve: vi.fn(async () => {
        const chunk = {
          id: 1,
          sourcePath: "p.md",
          sourceUrl: "https://docs.liara.ir/unrelated/",
          title: "صفحه نامرتبط",
          heading: null,
          platform: null,
          service: null,
          content: "متن",
          score: 1,
          matchedBy: ["semantic"] as ("semantic" | "lexical")[],
          matchedTokens: [],
        };
        return {
          chunks: [chunk],
          evidence: selectPrimaryEvidence([chunk], []),
          tokens: [],
          hasExactMatch: false,
        };
      }),
    });

    const reply = await send("آیا کلید superTurboMode پشتیبانی می‌شود؟", createInitialState(), d);
    expect(reply.sources ?? []).toEqual([]);
  });
});
