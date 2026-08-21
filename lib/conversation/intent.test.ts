import { describe, expect, it } from "vitest";

import { detectIntent } from "./intent";
import { createInitialState, enterJourney } from "./state";

const fresh = createInitialState();
const inJourney = enterJourney(fresh, "nextjs-deploy");

describe("detectIntent — new conversation", () => {
  it.each([
    ["یه مشکلی برای پروژه‌م پیش اومده."],
    ["پروژه‌م بالا نمیاد و ارور می‌ده"],
    ["موقع بیلد خطا می‌گیرم"],
  ])("routes Persian failure language to troubleshooting: %s", (text) => {
    expect(detectIntent(text, fresh)).toBe("troubleshooting");
  });

  it("routes a pasted stack trace to troubleshooting", () => {
    const log = [
      "npm ERR! code ECONNRESET",
      "npm ERR! network request to https://registry.npmjs.org failed",
      "npm ERR! network This is a problem related to network connectivity.",
    ].join("\n");

    expect(detectIntent(log, fresh)).toBe("troubleshooting");
  });

  it.each([
    ["می‌خوام پروژه‌م رو آنلاین کنم."],
    ["چطور پروژه رو دیپلوی کنم؟"],
    ["می‌خوام پروژه‌م رو روی لیارا بذارم"],
  ])("routes deployment language to deployment: %s", (text) => {
    expect(detectIntent(text, fresh)).toBe("deployment");
  });

  it("prefers troubleshooting when a failure is described during deployment talk", () => {
    expect(detectIntent("موقع دیپلوی خطا خوردم", fresh)).toBe("troubleshooting");
  });

  it("routes an ordinary question to general", () => {
    expect(detectIntent("آبجکت استوریج لیارا برای چه کاری خوبه؟", fresh)).toBe(
      "general",
    );
  });

  it.each(["سلام", "؟", "کمک"])(
    "asks for clarification instead of guessing on %s",
    (text) => {
      expect(detectIntent(text, fresh)).toBe("unknown");
    },
  );

  it("treats empty input as unknown", () => {
    expect(detectIntent("   ", fresh)).toBe("unknown");
  });
});

describe("detectIntent — inside an active journey", () => {
  it("enters troubleshooting on an error without abandoning the journey", () => {
    expect(detectIntent("خطا گرفتم", inJourney)).toBe("troubleshooting");
  });

  it("keeps deployment when the user reports success", () => {
    expect(detectIntent("انجام شد", inJourney)).toBe("deployment");
  });

  it("answers a side question as general rather than resetting", () => {
    expect(
      detectIntent("راستی دیتابیس پستگرس لیارا چطور کار می‌کنه؟", inJourney),
    ).toBe("general");
  });
});

describe("factual questions that mention deployment", () => {
  it.each([
    "آیا باید پوشه node_modules رو موقع استقرار روی لیارا آپلود کنم؟",
    "برای استقرار، توی package.json چه اسکریپتی لازمه؟",
  ])("routes to general Q&A: %s", (text) => {
    expect(detectIntent(text, fresh)).toBe("general");
  });

  it("still starts the journey for an actual request to deploy", () => {
    expect(detectIntent("می‌خوام پروژه‌م رو آنلاین کنم.", fresh)).toBe("deployment");
    expect(detectIntent("چطور پروژه رو دیپلوی کنم؟", fresh)).toBe("deployment");
  });
});
