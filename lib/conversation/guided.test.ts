import { describe, expect, it, vi } from "vitest";

import { classifyTurn, extractAppId } from "./result";
import { buildChatResponse, type ChatDeps } from "./respond";
import { createInitialState } from "./state";
import type { ConversationState, JourneyStepId } from "./types";

/** Deterministic paths must never call AI, so these doubles also assert that. */
function deps(): ChatDeps {
  return {
    retrieve: vi.fn(async () => ({ chunks: [], evidence: null, tokens: [], hasExactMatch: false })),
    generate: vi.fn(async () => "should not be called"),
  };
}

function at(step: JourneyStepId, extra: Partial<ConversationState> = {}): ConversationState {
  return {
    ...createInitialState(),
    activeJourney: "nextjs-deploy",
    framework: "nextjs",
    deploymentMethod: "cli",
    requiredServices: ["paas-nextjs"],
    currentStep: step,
    ...extra,
  };
}

const send = (message: string, state: ConversationState, d: ChatDeps = deps()) =>
  buildChatResponse({ message, recentMessages: [], state }, "req-g", d);

describe("BL-062 — D04 CLI", () => {
  it("shows the documented install command", async () => {
    const response = await send("قدم‌به‌قدم شروع کنیم. انجام شد.", at("D03_BUILD_PLAN"));
    expect(response.state.currentStep).toBe("D04_ENSURE_CLI");
    expect(response.message).toContain("npm install -g @liara/cli");
  });

  it("advances when the CLI is installed", async () => {
    const response = await send("Liara CLI نصب شد.", at("D04_ENSURE_CLI"));
    expect(response.state.currentStep).toBe("D05_AUTHENTICATE");
  });

  it("skips ahead when the user already has it", async () => {
    const response = await send("از قبل نصبه.", at("D04_ENSURE_CLI"));
    expect(response.state.currentStep).toBe("D05_AUTHENTICATE");
  });
});

describe("BL-062 — D05 authenticate", () => {
  it("shows liara login and never asks for credentials", async () => {
    const response = await send("از قبل نصبه.", at("D04_ENSURE_CLI"));
    expect(response.message).toContain("liara login");
    expect(response.message).not.toMatch(/رمز عبور|password|توکن/i);
  });

  it("does not claim to log in for the user", async () => {
    const response = await send("از قبل نصبه.", at("D04_ENSURE_CLI"));
    expect(response.message).toMatch(/خودت|دسترسی ندارم/);
  });

  it("advances when the user has logged in", async () => {
    expect((await send("لاگین کردم.", at("D05_AUTHENTICATE"))).state.currentStep).toBe(
      "D06_CREATE_RESOURCES",
    );
  });

  it("skips when already authenticated", async () => {
    expect(
      (await send("از قبل لاگین بودم.", at("D05_AUTHENTICATE"))).state.currentStep,
    ).toBe("D06_CREATE_RESOURCES");
  });
});

describe("BL-062 — D06 resources", () => {
  it("shows the documented create commands and the next platform value", async () => {
    const response = await send("لاگین کردم.", at("D05_AUTHENTICATE"));
    expect(response.message).toContain("liara network create");
    expect(response.message).toContain("liara create");
    expect(response.message).toContain("`next`");
  });

  it("tells an existing owner not to recreate", async () => {
    const response = await send("لاگین کردم.", at("D05_AUTHENTICATE"));
    expect(response.message).toMatch(/از قبل ساختیش|لازم نیست دوباره/);
  });

  it("remembers an app id the user supplies", async () => {
    const response = await send("ساختم. شناسه‌ش 'shop-web'", at("D06_CREATE_RESOURCES"));
    expect(response.state.appId).toBe("shop-web");
    expect(response.state.currentStep).toBe("D07_PREPARE_INPUTS");
  });
});

describe("BL-062 — D07 and D08", () => {
  it("D07 grounds readiness in node_modules and package.json", async () => {
    const response = await send("از قبل دارمش.", at("D06_CREATE_RESOURCES"));
    expect(response.state.currentStep).toBe("D07_PREPARE_INPUTS");
    expect(response.message).toContain("node_modules/");
    expect(response.message).toContain("package.json");
  });

  it("D08 uses the real app id instead of a placeholder", async () => {
    const response = await send("آماده‌ست.", at("D07_PREPARE_INPUTS", { appId: "shop-web" }));

    expect(response.state.currentStep).toBe("D08_DEPLOY");
    expect(response.message).toContain("liara deploy --app=shop-web --platform=next");
    expect(response.message).not.toContain("myapp");
  });

  it("D08 falls back to a clear placeholder when no id is known", async () => {
    const response = await send("آماده‌ست.", at("D07_PREPARE_INPUTS"));
    expect(response.message).toContain("--app=your-app-id");
  });

  it("never implies the assistant ran the command", async () => {
    const response = await send("آماده‌ست.", at("D07_PREPARE_INPUTS", { appId: "shop-web" }));
    expect(response.message).toMatch(/اجراش نمی‌کنم|خودت/);
  });
});

describe("BL-063 — holding, errors, and side questions", () => {
  it("a random remark does NOT advance the step", async () => {
    const response = await send("راستش امروز خیلی خسته‌ام", at("D08_DEPLOY"));
    expect(response.state.currentStep).toBe("D08_DEPLOY");
    expect(response.message).toMatch(/همین مرحله/);
  });

  it.each(["باشه", "مرسی", "اوهوم", "بعداً انجام میدم"])(
    "holds the step on: %s",
    async (text) => {
      expect((await send(text, at("D06_CREATE_RESOURCES"))).state.currentStep).toBe(
        "D06_CREATE_RESOURCES",
      );
    },
  );

  it("an error preserves the journey and its step", async () => {
    const d: ChatDeps = {
      retrieve: vi.fn(async () => ({ chunks: [], evidence: null, tokens: [], hasExactMatch: false })),
      generate: vi.fn(async () => "پاسخ"),
    };
    const response = await send(
      "موقع استقرار خطا گرفتم:\n`Error: read ECONNRESET`",
      at("D08_DEPLOY", { appId: "shop-web" }),
      d,
    );

    expect(response.meta.intent).toBe("troubleshooting");
    expect(response.state.activeJourney).toBe("nextjs-deploy");
    expect(response.state.currentStep).toBe("D08_DEPLOY");
    expect(response.state.appId).toBe("shop-web");
  });

  it("a side question preserves the journey, step, and app id", async () => {
    const d: ChatDeps = {
      retrieve: vi.fn(async () => ({ chunks: [], evidence: null, tokens: [], hasExactMatch: false })),
      generate: vi.fn(async () => "پاسخ"),
    };
    const response = await send(
      "راستی Object Storage چیه؟",
      at("D08_DEPLOY", { appId: "shop-web", completedSteps: ["D01_CONFIRM_PROJECT"] }),
      d,
    );

    expect(response.meta.intent).toBe("general");
    expect(response.state.currentStep).toBe("D08_DEPLOY");
    expect(response.state.appId).toBe("shop-web");
    expect(response.state.completedSteps).toContain("D01_CONFIRM_PROJECT");
  });

  it("returns to the same step after the error is fixed", async () => {
    const errored = at("D08_DEPLOY", { appId: "shop-web", activeError: "ECONNRESET" });
    const recovered = await send("درست شد.", errored);
    expect(recovered.state.activeError).toBeNull();
  });
});

describe("BL-064 — completion", () => {
  it("reaches DONE on an explicit success at D08", async () => {
    const response = await send(
      "دیپلوی شد و برنامه بالا اومد.",
      at("D08_DEPLOY", { appId: "shop-web" }),
    );
    expect(response.state.currentStep).toBe("D10_DONE");
    expect(response.message).toMatch(/تموم شد/);
  });

  it("reaches DONE on clearly successful pasted output", async () => {
    const response = await send(
      "Build succeeded\nDeployment was successful",
      at("D08_DEPLOY", { appId: "shop-web" }),
    );
    expect(response.state.currentStep).toBe("D10_DONE");
  });

  it("does NOT claim success merely because D08 was shown", async () => {
    const response = await send("آماده‌ست.", at("D07_PREPARE_INPUTS"));
    expect(response.state.currentStep).toBe("D08_DEPLOY");
    expect(response.message).not.toMatch(/تموم شد|موفق/);
  });

  it("does not complete on an ambiguous remark", async () => {
    expect((await send("خب", at("D08_DEPLOY"))).state.currentStep).toBe("D08_DEPLOY");
  });
});

describe("classifyTurn", () => {
  it.each([
    ["انجام شد", "D04_ENSURE_CLI", "success"],
    ["نصب شد", "D04_ENSURE_CLI", "success"],
    ["لاگین کردم", "D05_AUTHENTICATE", "success"],
    ["Error: read ECONNRESET", "D04_ENSURE_CLI", "failure"],
    ["Object Storage چیه؟", "D04_ENSURE_CLI", "side-question"],
    ["باشه حتماً", "D04_ENSURE_CLI", "unknown"],
  ])("classifies %s at %s as %s", (text, step, expected) => {
    expect(classifyTurn(text, step)).toBe(expected);
  });

  it("does not accept another step's completion wording", () => {
    expect(classifyTurn("لاگین کردم", "D04_ENSURE_CLI")).toBe("unknown");
  });

  it("lets a failure win over deployment wording", () => {
    expect(classifyTurn("deploy شد ولی Error: EADDRINUSE داد", "D08_DEPLOY")).toBe(
      "failure",
    );
  });

  it("only accepts step-specific wording at its own step", () => {
    expect(classifyTurn("لاگین کردم", "D05_AUTHENTICATE")).toBe("success");
    expect(classifyTurn("بعداً انجام میدم", "D05_AUTHENTICATE")).toBe("unknown");
  });
});

describe("extractAppId", () => {
  it.each([
    ["liara deploy --app=shop-web --platform=next", "shop-web"],
    ['{ "app": "my-store" }', "my-store"],
    ["شناسه‌ش 'blog-app' هست", "blog-app"],
  ])("extracts from %s", (text, expected) => {
    expect(extractAppId(text)).toBe(expected);
  });

  it("ignores the docs placeholder and platform words", () => {
    expect(extractAppId("liara deploy --app=myapp --platform=next")).toBeNull();
  });

  it("returns null when there is no id", () => {
    expect(extractAppId("سلام، حالت چطوره؟")).toBeNull();
  });
});

describe("BL-063 — resolving an error returns to the same step", () => {
  it("does not complete the deployment just because the error was fixed", async () => {
    const errored = at("D08_DEPLOY", { appId: "shop-web", activeError: "ECONNRESET" });
    const recovered = await send("درست شد.", errored);

    expect(recovered.state.currentStep).toBe("D08_DEPLOY");
    expect(recovered.state.activeError).toBeNull();
  });

  it("still completes on an explicit deploy success with no open error", async () => {
    const response = await send("دیپلوی شد.", at("D08_DEPLOY", { appId: "shop-web" }));
    expect(response.state.currentStep).toBe("D10_DONE");
  });
});
