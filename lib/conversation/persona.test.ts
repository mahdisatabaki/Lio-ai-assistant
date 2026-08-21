import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  GENERAL_SYSTEM_PROMPT,
  TROUBLESHOOTING_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { selectPrimaryEvidence } from "@/lib/rag/select";

import { failure } from "./failures";
import { journeyStepView } from "./journey";
import { buildChatResponse, type ChatDeps } from "./respond";
import { createInitialState } from "./state";
import type { ConversationState } from "./types";

/**
 * Lio persona regression suite (LIO-01 … LIO-15).
 *
 * Two kinds of assertion here, deliberately:
 *
 * - Deterministic copy is checked directly, because we own every word of it.
 * - Generated answers cannot be asserted word-for-word, so the *contract* given
 *   to the model is checked instead — the rule must be present and unambiguous.
 *   Whether the model actually obeys is measured live by `npm run eval:live`;
 *   a prompt containing a rule is not proof the rule is followed.
 *
 * No model call runs here.
 */

const SLOGAN = "نگران نباش، با هم دیپلویش می‌کنیم";
const EMOJI = /\p{Extended_Pictographic}/gu;
/** Marks that must never decorate a serious failure. */
const PLAYFUL = /[😀-🙏✨🎉🚀🔥💪😉🙂👍]/u;
/** Formal, administrative Persian that is not Lio's voice. */
const FORMAL = /شما|می‌باشد|میباشد|بفرمایید|نمایید|فرمایید|مایل به|جهت اطلاع/;
/** Sending the user to go read documentation. */
const HOMEWORK = /مستندات را بخوان|مستندات رو بخوان|این صفحه را بررسی|به مستندات مراجعه|مطالعه کن/;

function deps(overrides: Partial<ChatDeps> = {}): ChatDeps {
  return {
    retrieve: vi.fn(async () => ({
      chunks: [],
      evidence: null,
      tokens: [],
      hasExactMatch: false,
    })),
    generate: vi.fn(async () => "پاسخ"),
    ...overrides,
  };
}

const send = (message: string, state?: ConversationState, d: ChatDeps = deps()) =>
  buildChatResponse(
    { message, recentMessages: [], state: state ?? createInitialState() },
    "req-persona",
    d,
  );

const journey = (step: ConversationState["currentStep"]): ConversationState => ({
  ...createInitialState(),
  activeJourney: "nextjs-deploy",
  framework: "nextjs",
  currentStep: step,
});

/** Every user-facing string the product can emit without a model. */
function deterministicCopy(): string[] {
  const steps = (
    [
      "D01_CONFIRM_PROJECT",
      "D02_CHECK_READINESS",
      "D03_BUILD_PLAN",
      "D04_ENSURE_CLI",
      "D05_AUTHENTICATE",
      "D06_CREATE_RESOURCES",
      "D07_PREPARE_INPUTS",
      "D08_DEPLOY",
      "D10_DONE",
    ] as const
  )
    .map((id) =>
      journeyStepView(id, { framework: "nextjs", needsPostgres: false, needsPersistentUploads: false }),
    )
    .filter((view) => view !== null)
    .map((view) => view!.body);

  const failures = (
    ["retrieval-unavailable", "embedding-unavailable", "model-unavailable", "index-empty"] as const
  ).map((kind) => failure(kind).message);

  return [...steps, ...failures];
}

describe("LIO-01 — welcome", () => {
  const home = readFileSync(join("components", "home-screen.tsx"), "utf8");

  it("introduces Lio and carries the slogan exactly once", () => {
    expect(home).toContain("سلام، من لیو هستم");
    expect(home.split(SLOGAN)).toHaveLength(2);
  });

  it("uses at most one emoji", () => {
    const copy = home.match(/سلام، من لیو هستم[^<]*/)?.[0] ?? "";
    expect((copy.match(EMOJI) ?? []).length).toBeLessThanOrEqual(1);
  });
});

describe("LIO-02 — voice across every deterministic string", () => {
  it("never slips into formal administrative Persian", () => {
    for (const copy of deterministicCopy()) {
      expect(copy, copy.slice(0, 60)).not.toMatch(FORMAL);
    }
  });

  it("never sends the user off to read documentation", () => {
    for (const copy of deterministicCopy()) {
      expect(copy, copy.slice(0, 60)).not.toMatch(HOMEWORK);
    }
  });

  it("instructs the model in the same voice", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("با ضمیر «تو» حرف بزن");
    expect(GENERAL_SYSTEM_PROMPT).toContain("محاوره‌ای بنویس، نه کتابی");
  });
});

describe("LIO-03 — troubleshooting shape", () => {
  it("demands one diagnosis and one action", () => {
    expect(TROUBLESHOOTING_SYSTEM_PROMPT).toContain("### تشخیص");
    expect(TROUBLESHOOTING_SYSTEM_PROMPT).toContain("### قدم بعدی");
    expect(TROUBLESHOOTING_SYSTEM_PROMPT).toContain("چند علت احتمالی ردیف نکن");
  });

  it("protects exact technical strings", () => {
    expect(TROUBLESHOOTING_SYSTEM_PROMPT).toContain("ECONNRESET");
    expect(TROUBLESHOOTING_SYSTEM_PROMPT).toMatch(/دقیقاً همان‌طور که هست/);
  });
});

describe("LIO-04 — serious errors", () => {
  it.each(["retrieval-unavailable", "embedding-unavailable", "model-unavailable", "index-empty"] as const)(
    "%s stays sober",
    (kind) => {
      const { message } = failure(kind);
      expect(message).not.toMatch(PLAYFUL);
      expect(message).not.toMatch(FORMAL);
    },
  );

  it("tells the model to drop humour when it is serious", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("خطای جدی");
    expect(GENERAL_SYSTEM_PROMPT).toMatch(/نه شوخی، نه ایموجی/);
  });
});

describe("LIO-05 — the user is never blamed", () => {
  it("forbids blame explicitly", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("سرزنشش نکن");
    expect(GENERAL_SYSTEM_PROMPT).toContain("مشکل از سمت شماست");
  });

  it("does not blame in the empty-index message", () => {
    expect(failure("index-empty").message).toContain("نه سؤال تو");
  });
});

describe("LIO-06 — uncertainty", () => {
  it("asks one focused question instead of speculating", async () => {
    const d = deps();
    const reply = await send("deploy نشد. ارور میده.", createInitialState(), d);

    expect(reply.message).toContain("متن خطا");
    expect(d.generate).not.toHaveBeenCalled();
    expect(reply.sources ?? []).toEqual([]);
  });

  it("keeps the abstention sentence and bans hypothesis lists", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("نتونستم تأیید کنم");
    expect(GENERAL_SYSTEM_PROMPT).toContain("با فهرست‌کردن احتمال‌ها جبرانش نکن");
  });
});

describe("LIO-07/08 — paid and destructive actions need confirmation", () => {
  it.each([
    "حذف",
    "تغییر پلن",
    "اقدام مالی",
    "ری‌استارت",
    "دیپلوی مجدد",
    "متغیر محیطی",
    "بازگردانی",
    "DNS",
    "برگشت‌ناپذیر",
  ])("names %s as needing confirmation", (operation) => {
    expect(GENERAL_SYSTEM_PROMPT).toContain(operation);
  });

  it("requires the impact to be stated before asking", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("چه چیزی عوض می‌شود");
    expect(GENERAL_SYSTEM_PROMPT).toContain("آیا هزینه دارد");
    expect(GENERAL_SYSTEM_PROMPT).toMatch(/بدون تأیید کاربر، کار اثرگذار انجام نده/);
  });

  it("asks plainly rather than in legal language", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("زبان حقوقی و اداری نه");
  });
});

describe("LIO-09 — success", () => {
  it("reports the outcome, not just completion", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("فقط «انجام شد» نگو");
    expect(GENERAL_SYSTEM_PROMPT).toContain("جشن اغراق‌آمیز نه");
  });

  it("keeps the completion step warm but brief", async () => {
    const done = journeyStepView("D10_DONE", {
      framework: "nextjs",
      needsPostgres: false,
      needsPersistentUploads: false,
    });

    expect((done!.body.match(EMOJI) ?? []).length).toBeLessThanOrEqual(1);
  });
});

describe("LIO-10 — support escalation", () => {
  it("requires a prepared summary rather than 'open a ticket'", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("کاربر را با «تیکت بزن» رها نکن");
    expect(GENERAL_SYSTEM_PROMPT).toContain("کارهایی که امتحان شده");
  });

  it("forbids secrets in that summary and does not claim to file it", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("خودت تیکت ثبت نمی‌کنی");
    expect(GENERAL_SYSTEM_PROMPT).toMatch(/رمز، توکن، کلید یا مقدار محرمانه/);
  });
});

describe("LIO-11 — session continuity", () => {
  it("carries a failed fix into the prompt so it is not suggested again", async () => {
    const generate = vi.fn<ChatDeps["generate"]>(async () => "پاسخ");
    const chunk = {
      id: 1,
      sourcePath: "p.md",
      sourceUrl: "https://docs.liara.ir/paas/nextjs/x/",
      title: "صفحه",
      heading: null,
      platform: null,
      service: null,
      content: "متن",
      score: 1,
      matchedBy: ["semantic"] as ("semantic" | "lexical")[],
      matchedTokens: [],
    };

    const state: ConversationState = {
      ...journey("D08_DEPLOY"),
      attemptedFix: "افزایش زمان build",
    };

    await buildChatResponse(
      { message: "راستی این گزینه چطور کار می‌کنه؟", recentMessages: [], state },
      "req",
      deps({
        generate,
        retrieve: vi.fn(async () => ({
          chunks: [chunk],
          evidence: selectPrimaryEvidence([chunk], []),
          tokens: [],
          hasExactMatch: false,
        })),
      }),
    );

    expect(generate.mock.calls[0]![1].state.attemptedFix).toBe("افزایش زمان build");
    expect(GENERAL_SYSTEM_PROMPT).toContain("دوباره پیشنهاد نکن");
  });

  it("does not add cross-session memory", () => {
    // State is carried by the request; nothing persists it.
    expect(createInitialState()).toMatchObject({ activeJourney: null, appId: null });
  });
});

describe("LIO-12 — the slogan stays on Home", () => {
  it("never appears in deterministic copy", () => {
    for (const copy of deterministicCopy()) expect(copy).not.toContain(SLOGAN);
  });

  it("is forbidden in generated answers", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("در پاسخ‌ها ننویس");
  });
});

describe("LIO-13 — emoji budget", () => {
  it("every deterministic message stays within one emoji", () => {
    for (const copy of deterministicCopy()) {
      expect((copy.match(EMOJI) ?? []).length, copy.slice(0, 50)).toBeLessThanOrEqual(1);
    }
  });

  it("instructs the model to the same budget", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("حداکثر یک ایموجی در هر پیام");
  });
});

describe("LIO-14 — no documentation homework", () => {
  it("bans the phrasings outright", () => {
    for (const banned of ["مستندات را بخوان", "این صفحه را بررسی کن", "برای اطلاعات بیشتر مراجعه کن"]) {
      expect(GENERAL_SYSTEM_PROMPT).toContain(banned);
    }
    expect(GENERAL_SYSTEM_PROMPT).toContain("این کار توست، نه تکلیف او");
  });

  it("states the standing-alone test for an answer", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("اگر کارت منبع حذف شود");
  });
});

describe("LIO-15 — the source stays secondary", () => {
  it("tells the model the source is evidence, not the answer", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("منبع جای جواب نیست");
    expect(GENERAL_SYSTEM_PROMPT).toContain("آدرس و لینک ننویس");
  });

  it("renders the source after the action in the UI", () => {
    const view = readFileSync(join("components", "conversation-view.tsx"), "utf8");
    expect(view.indexOf("ActionChips")).toBeLessThan(view.lastIndexOf("SourceCards"));
  });
});

describe("LIO-16 — the voice rule is unambiguous", () => {
  it("forbids «شما» outright rather than only preferring «تو»", () => {
    // Saying "use تو" was not enough: the model still produced «فایل
    // package.json شما» on a normal question. The ban has to be explicit.
    expect(GENERAL_SYSTEM_PROMPT).toContain("کلمه‌ی «شما» و صرف‌های محترمانه‌اش را اصلاً به کار نبر");
  });

  it("asks for spoken rather than bookish verb forms", () => {
    expect(GENERAL_SYSTEM_PROMPT).toContain("«می‌کنه» نه «می‌کند»");
  });
});
