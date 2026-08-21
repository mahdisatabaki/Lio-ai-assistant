import { describe, expect, it } from "vitest";

import { extractTechnicalTokens, hasTechnicalSignal } from "./tokens";

const has = (text: string, token: string) =>
  extractTechnicalTokens(text).some((t) => t.toLowerCase() === token.toLowerCase());

describe("extractTechnicalTokens — EVALS retrieval cases", () => {
  it("finds ECONNRESET inside a Persian sentence (R-01)", () => {
    expect(has("موقع دیپلوی خطای ECONNRESET می‌گیرم", "ECONNRESET")).toBe(true);
  });

  it("finds package.json (R-02)", () => {
    expect(has("توی package.json اسکریپت start ندارم", "package.json")).toBe(true);
  });

  it("finds npm ERR! as one phrase, not shredded (R-03)", () => {
    const tokens = extractTechnicalTokens("npm ERR! code ECONNRESET");
    expect(tokens.some((t) => /^npm ERR!$/i.test(t))).toBe(true);
    expect(tokens).toContain("ECONNRESET");
  });

  it("finds liara.json (R-04)", () => {
    expect(has("تنظیم liara.json برای Next.js", "liara.json")).toBe(true);
  });
});

describe("extractTechnicalTokens — shapes", () => {
  it.each([
    ["ENOENT", "ENOENT: no such file"],
    ["EADDRINUSE", "Error: listen EADDRINUSE"],
    ["DATABASE_URL", "متغیر DATABASE_URL رو ست نکردم"],
    ["TypeError", "TypeError: x is not a function"],
    ["@liara/cli", "نصب @liara/cli"],
    [".env.local", "فایل .env.local رو ساختم"],
    ["next.config.ts", "توی next.config.ts تنظیم کردم"],
  ])("extracts %s", (expected, text) => {
    expect(has(text, expected)).toBe(true);
  });

  it("extracts a CLI invocation", () => {
    const tokens = extractTechnicalTokens("با liara deploy دیپلوی کردم");
    expect(tokens.some((t) => /^liara deploy$/i.test(t))).toBe(true);
  });
});

describe("extractTechnicalTokens — noise rejection", () => {
  it("returns nothing for ordinary Persian prose", () => {
    expect(extractTechnicalTokens("سلام، پروژه من چطور آنلاین می‌شود؟")).toEqual([]);
  });

  it("extracts the product name from a conceptual Persian question", () => {
    // This once returned nothing, and bare semantic search answered an Object
    // Storage question in production while citing AI-SDK `generate-object`
    // cookbook pages. The product name is the literal that fixes the citation.
    expect(
      extractTechnicalTokens("آبجکت استوریج لیارا برای چه کاری خوبه؟"),
    ).toEqual(["object storage"]);
  });

  it("does not treat plain English words as technical", () => {
    expect(extractTechnicalTokens("how do i deploy my project online")).toEqual([]);
  });

  it("drops common prose abbreviations", () => {
    expect(has("for example, e.g. this", "e.g")).toBe(false);
  });

  it("never emits a token containing Persian letters", () => {
    for (const token of extractTechnicalTokens("خطای ECONNRESET در پروژه‌ی من")) {
      expect(token).not.toMatch(/[؀-ۿ]/);
    }
  });

  it("deduplicates repeated tokens", () => {
    const tokens = extractTechnicalTokens("ECONNRESET again ECONNRESET");
    expect(tokens.filter((t) => t === "ECONNRESET")).toHaveLength(1);
  });

  it("bounds how many tokens one query can contribute", () => {
    const noisy = Array.from({ length: 40 }, (_, i) => `FILE_NAME_${i}`).join(" ");
    expect(extractTechnicalTokens(noisy).length).toBeLessThanOrEqual(12);
  });

  it("hasTechnicalSignal follows extraction", () => {
    expect(hasTechnicalSignal("خطای ECONNRESET")).toBe(true);
    expect(hasTechnicalSignal("سلام چطوری؟")).toBe(false);
  });
});

describe("Persian product spellings", () => {
  it.each([
    ["آبجکت استوریج لیارا چیه؟", "object storage"],
    ["چطور یه باکت بسازم؟", "bucket"],
    ["دیتابیس پستگرس لیارا", "postgres"],
    ["شبکه خصوصی چطور کار می‌کنه؟", "private network"],
  ])("maps %s to the English token", (query, expected) => {
    expect(extractTechnicalTokens(query)).toContain(expected);
  });

  it("still extracts nothing from ordinary Persian prose", () => {
    expect(extractTechnicalTokens("سلام، حالت چطوره؟")).toEqual([]);
  });
});
