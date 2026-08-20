import { describe, expect, it, vi } from "vitest";

import { buildPlan, collectNeeds, mergeNeeds, servicesFor } from "./plan";
import { buildChatResponse, type ChatDeps } from "./respond";
import { createInitialState } from "./state";
import type { ConversationState } from "./types";

const deps: ChatDeps = {
  retrieve: vi.fn(async () => ({ chunks: [], tokens: [], hasExactMatch: false })),
  generate: vi.fn(async () => "should not be called"),
};

const send = (message: string, state?: ConversationState) =>
  buildChatResponse(
    { message, recentMessages: [], state: state ?? createInitialState() },
    "req-b",
    deps,
  );

describe("B-01 — simple Next.js project", () => {
  it("recommends PaaS only", () => {
    const needs = collectNeeds("یه پروژه ساده Next.js دارم و می‌خوام آنلاینش کنم");
    expect(servicesFor(needs)).toEqual(["paas-nextjs"]);
  });

  it("adds no service the user did not justify", () => {
    const plan = buildPlan(collectNeeds("پروژه Next.js ساده"));
    expect(plan.services.map((s) => s.service)).toEqual(["paas-nextjs"]);
    expect(JSON.stringify(plan)).not.toMatch(/redis|ایمیل|dns/i);
  });
});

describe("B-02 — Next.js + PostgreSQL", () => {
  it.each([
    "پروژه Next.js دارم که به دیتابیس PostgreSQL وصله",
    "پروژه نکست با پستگرس",
    "Next.js project using prisma with a database",
  ])("detects the database need in: %s", (text) => {
    expect(servicesFor(collectNeeds(text))).toEqual(["paas-nextjs", "postgresql"]);
  });

  it("explains why the database is recommended", () => {
    const plan = buildPlan(collectNeeds("Next.js با دیتابیس postgres"));
    const db = plan.services.find((s) => s.service === "postgresql");
    expect(db?.reason).toMatch(/دیتابیس/);
  });
});

describe("B-03 — Next.js + PostgreSQL + persistent uploads", () => {
  it("adds object storage only when uploads are described", () => {
    const needs = collectNeeds(
      "پروژه Next.js با دیتابیس postgres و کاربرها هم عکس آپلود می‌کنن",
    );
    expect(servicesFor(needs)).toEqual([
      "paas-nextjs",
      "postgresql",
      "object-storage",
    ]);
  });

  it("gives a concrete reason for object storage", () => {
    const plan = buildPlan(
      collectNeeds("Next.js، دیتابیس postgres، آپلود فایل توسط کاربر"),
    );
    const storage = plan.services.find((s) => s.service === "object-storage");
    expect(storage?.reason).toMatch(/ماندگار|آپلود/);
  });

  it("does not add storage for a project that merely shows images", () => {
    const needs = collectNeeds("سایت Next.js که چند تا عکس ثابت توی صفحه داره");
    expect(servicesFor(needs)).toEqual(["paas-nextjs"]);
  });
});

describe("needs collection", () => {
  it("recognises an unsupported framework", () => {
    expect(collectNeeds("پروژه Django دارم").framework).toBe("unsupported");
  });

  it("accumulates needs across turns", () => {
    const first = collectNeeds("پروژه Next.js دارم");
    const second = collectNeeds("راستی دیتابیس هم لازم دارم");
    const merged = mergeNeeds(first, second);

    expect(merged.framework).toBe("nextjs");
    expect(merged.needsPostgres).toBe(true);
  });

  it("does not forget the framework when a later message omits it", () => {
    const merged = mergeNeeds(collectNeeds("Next.js"), collectNeeds("آپلود فایل دارم"));
    expect(merged.framework).toBe("nextjs");
    expect(merged.needsPersistentUploads).toBe(true);
  });
});

describe("BL-060/061 — planning through the conversation", () => {
  it("plans without any model or retrieval call", async () => {
    await send("می‌خوام پروژه‌م رو آنلاین کنم.");
    expect(deps.generate).not.toHaveBeenCalled();
    expect(deps.retrieve).not.toHaveBeenCalled();
  });

  it("D01 — starts by confirming the framework", async () => {
    const response = await send("می‌خوام پروژه‌م رو آنلاین کنم.");

    expect(response.state.currentStep).toBe("D01_CONFIRM_PROJECT");
    expect(response.message).toMatch(/Next\.js/);
    expect(response.actions?.map((a) => a.id)).toContain("confirm-nextjs");
  });

  it("D02 — moves to readiness once Next.js is confirmed", async () => {
    const started = await send("می‌خوام پروژه‌م رو آنلاین کنم.");
    const confirmed = await send("بله، پروژه‌م Next.js هست. انجام شد.", started.state);

    expect(confirmed.state.currentStep).toBe("D02_CHECK_READINESS");
    expect(confirmed.message).toMatch(/package\.json/);
    expect(confirmed.state.completedSteps).toContain("D01_CONFIRM_PROJECT");
  });

  it("D03 — shows the plan card after readiness", async () => {
    const started = await send("می‌خوام پروژه‌م رو آنلاین کنم.");
    const confirmed = await send("بله، پروژه‌م Next.js هست. انجام شد.", started.state);
    const planned = await send("هم build و هم start رو دارم. انجام شد.", confirmed.state);

    expect(planned.state.currentStep).toBe("D03_BUILD_PLAN");
    expect(planned.plan?.services.map((s) => s.service)).toEqual(["paas-nextjs"]);
    expect(planned.actions?.map((a) => a.id)).toContain("start-steps");
  });

  it("reflects an added database need in the plan and state", async () => {
    const started = await send("می‌خوام پروژه Next.js رو آنلاین کنم.");
    const confirmed = await send("بله، پروژه‌م Next.js هست. انجام شد.", started.state);
    const planned = await send("پروژه‌م دیتابیس postgres هم لازم داره.", confirmed.state);

    expect(planned.state.requiredServices).toContain("postgresql");
  });

  it("J-05 — refuses to guide an unsupported framework without pretending", async () => {
    const response = await send("پروژه Django دارم، می‌خوام آنلاینش کنم.");

    expect(response.state.activeJourney).toBeNull();
    expect(response.state.currentStep).toBeNull();
    expect(response.message).toMatch(/Next\.js/);
    expect(response.actions?.map((a) => a.id)).toContain("ask-general");
  });

  it("moves into the CLI step after the plan is accepted", async () => {
    const state: ConversationState = {
      ...createInitialState(),
      activeJourney: "nextjs-deploy",
      framework: "nextjs",
      currentStep: "D03_BUILD_PLAN",
      completedSteps: ["D01_CONFIRM_PROJECT", "D02_CHECK_READINESS"],
    };

    const response = await send("قدم‌به‌قدم شروع کنیم. انجام شد.", state);
    expect(response.state.currentStep).toBe("D04_ENSURE_CLI");
  });
});
