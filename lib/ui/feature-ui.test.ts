import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { featureModeFor, MODE_THEMES, themeFor } from "./modes";

/**
 * Feature-presentation regression (UI-01 … UI-13).
 *
 * These read the components as source rather than rendering them: the suite has
 * no DOM environment, and what needs protecting here is structural — the two
 * feature names, the colour semantics, and the absence of standing text under
 * the composer. Live rendering is checked in the browser during QA.
 */

const home = readFileSync(join("components", "home-screen.tsx"), "utf8");
const conversation = readFileSync(join("components", "conversation-view.tsx"), "utf8");
const composer = readFileSync(join("components", "composer.tsx"), "utf8");
const onboarding = readFileSync(join("components", "onboarding.tsx"), "utf8");
const app = readFileSync(join("components", "assistant-app.tsx"), "utf8");

describe("UI-01 — both feature names render", () => {
  it.each(["عیب‌یابی با لیو", "دیپلوی با لیو"])("Home shows %s", (name) => {
    expect(home).toContain(name);
  });

  it("asks how Lio can help", () => {
    expect(home).toContain("لیو چطور کمکت کنه؟");
  });

  it("puts no description paragraph inside a card", () => {
    // The old cards carried a `hint` line; the new ones are icon plus name.
    expect(home).not.toContain("hint:");
  });
});

describe("UI-02/03 — cards open the right conversation", () => {
  it("the troubleshooting card seeds a troubleshooting message", () => {
    expect(home).toContain("یه مشکلی برای پروژه‌م پیش اومده.");
  });

  it("the deployment card seeds a deployment message", () => {
    expect(home).toContain("می‌خوام پروژه‌م رو آنلاین کنم.");
  });

  it("uses real buttons, not clickable divs", () => {
    expect(home).toMatch(/<button[\s\S]*?type="button"/);
    expect(home).toContain("focus-visible:");
  });
});

describe("UI-04 — general Q&A stays available", () => {
  it("keeps the composer on Home, below the cards", () => {
    expect(home).toContain("<Composer");
    expect(home.indexOf("لیو چطور کمکت کنه؟")).toBeLessThan(home.indexOf("<Composer"));
  });

  it("invites a general question without making it a third card", () => {
    expect(home).toContain("یا هر سؤال دیگه‌ای درباره لیارا داری از لیو بپرس");
  });
});

describe("UI-05/06/07 — onboarding runs once and can be skipped", () => {
  it("stores only a completion marker", () => {
    expect(onboarding).toContain('ONBOARDING_KEY = "lio_onboarding_v1"');
    expect(onboarding).toContain('setItem(ONBOARDING_KEY, "completed")');
  });

  it("is shown only when the marker is absent", () => {
    expect(app).toContain("hasCompletedOnboarding");
    expect(app).toContain("const showOnboarding = !completedOnboarding");
  });

  it("offers skip on every screen", () => {
    expect(onboarding).toContain("رد کردن");
    expect(onboarding).toContain("onClick={finish}");
  });

  it("treats unavailable storage as already-completed rather than trapping the user", () => {
    expect(onboarding).toMatch(/catch \{[\s\S]*?return true;/);
  });

  it("carries all three screens with the approved copy", () => {
    expect(onboarding).toContain("لیو، هم‌تیمی فنی تو در لیارا");
    expect(onboarding).toContain("عیب‌یابی با لیو");
    expect(onboarding).toContain("دیپلوی با لیو");
    expect(onboarding).toContain("ببین لیو چه کارهایی می‌کنه");
    expect(onboarding).toContain("شروع کنیم");
  });
});

describe("UI-08/09 — mode colour is reserved for feature mode", () => {
  it("troubleshooting is orange, deployment is purple", () => {
    expect(MODE_THEMES.troubleshooting.accent).toBe("#F28500");
    expect(MODE_THEMES.deployment.accent).toBe("#7C3AED");
  });

  it("an error inside a deployment shows troubleshooting mode", () => {
    expect(
      featureModeFor({ intent: "troubleshooting", activeJourney: "nextjs-deploy" }),
    ).toBe("troubleshooting");
  });

  it("an active journey otherwise shows deployment mode", () => {
    expect(featureModeFor({ intent: "general", activeJourney: "nextjs-deploy" })).toBe(
      "deployment",
    );
  });

  it("a plain question has no mode", () => {
    expect(featureModeFor({ intent: "general", activeJourney: null })).toBeNull();
    expect(themeFor(null)).toBeNull();
  });

  it("labels the mode in text as well as colour", () => {
    expect(MODE_THEMES.troubleshooting.label).toBe("عیب‌یابی");
    expect(MODE_THEMES.deployment.label).toBe("دیپلوی");
    expect(conversation).toContain("{theme.label}");
  });
});

describe("UI-10 — user and Lio messages look different", () => {
  it("gives the user slate and Lio white", () => {
    expect(conversation).toContain("bg-slate-100");
    expect(conversation).toContain("bg-white");
  });

  it("never paints a message with a mode colour", () => {
    for (const hex of ["#F28500", "#7C3AED"]) {
      expect(conversation).not.toContain(`bg-[${hex}]`);
    }
  });
});

/** Source with comments stripped, so a note about the code is not read as UI copy. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("UI-11 — nothing permanent sits below the composer", () => {
  it("has no standing helper line in the rendered markup", () => {
    const markup = withoutComments(composer);
    expect(markup).not.toContain("Shift+Enter");
    // The only paragraph left is the conditional error.
    expect((markup.match(/<p /g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("still shows an oversized-input error when one is active", () => {
    expect(composer).toContain("tooLong ?");
    expect(composer).toContain('role="alert"');
  });
});

describe("UI-12 — Lio assets are present and referenced", () => {
  it.each(["liv-wave-web-512.webp", "liv-wave-web-small.webp"])("%s exists", (file) => {
    expect(existsSync(join("public", "images", file))).toBe(true);
  });

  it("Home and onboarding use the mascot; Conversation keeps it small", () => {
    expect(home).toContain("/images/liv-wave-web-512.webp");
    expect(onboarding).toContain("/images/liv-wave-web-512.webp");
    expect(conversation).toContain("/images/liv-wave-web-small.webp");
  });
});

describe("UI-13 — the source stays after the action", () => {
  it("renders action chips before the source card", () => {
    expect(conversation.indexOf("ActionChips")).toBeLessThan(
      conversation.lastIndexOf("SourceCards"),
    );
  });
});
