import { describe, expect, it } from "vitest";

import { platformHint, serviceHint } from "./retrieve";

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

describe("serviceHint", () => {
  it.each([
    ["آبجکت استوریج لیارا چیه؟", "object-storage"],
    ["Object Storage bucket", "object-storage"],
    ["دیتابیس پستگرس لیارا", "dbaas"],
  ])("detects the service in %s", (query, expected) => {
    expect(serviceHint(query)).toBe(expected);
  });

  it("returns null when no service is named", () => {
    expect(serviceHint("پروژه‌م بالا نمیاد")).toBeNull();
  });
});

describe("serviceHint — persistent user files", () => {
  it.each([
    "عکس‌های کاربرام رو روی خود برنامه نگه دارم یا نه؟",
    "کاربرها فایل آپلود می‌کنن، کجا ذخیره‌شون کنم؟",
  ])("routes an upload question to object storage: %s", (query) => {
    expect(serviceHint(query)).toBe("object-storage");
  });

  it("does not fire for an unrelated deployment question", () => {
    expect(serviceHint("چطور پروژه رو دیپلوی کنم؟")).toBeNull();
  });
});

describe("serviceHint — upload wording that is not about user files", () => {
  it("does not send a node_modules deployment question to Object Storage", () => {
    expect(
      serviceHint("آیا باید پوشه node_modules رو موقع استقرار روی لیارا آپلود کنم؟"),
    ).toBeNull();
  });
});
