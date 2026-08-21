import { describe, expect, it } from "vitest";

import { platformHint } from "./retrieve";

/**
 * Liara repeats the same guidance on every platform's page, so `mirror` and
 * `package.json` match Angular, Django, and Flask identically. The platform hint
 * is what makes a Next.js question retrieve the Next.js page.
 */
describe("platformHint", () => {
  it.each([
    "پروژه‌م Next هست و توی liara.json مقدار platform رو چی بذارم؟",
    "deploy پروژه Next شکست می‌خوره",
    "پروژه Next.js دارم",
    "پروژه نکست من بالا نمیاد",
  ])("detects nextjs in: %s", (query) => {
    expect(platformHint(query)).toBe("nextjs");
  });

  it("detects other documented platforms", () => {
    expect(platformHint("پروژه Django دارم")).toBe("django");
    expect(platformHint("اپ Laravel من")).toBe("laravel");
  });

  it("returns null when no framework is named", () => {
    expect(platformHint("آبجکت استوریج لیارا چیه؟")).toBeNull();
  });
});
