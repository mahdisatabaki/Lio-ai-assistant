import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { missingServerEnvVars, requireServerEnv } from "@/lib/server/env";

const REQUIRED = [
  "DATABASE_URL",
  "LIARA_AI_API_KEY",
  "LIARA_AI_BASE_URL",
  "LIARA_CHAT_MODEL",
  "LIARA_EMBEDDING_MODEL",
] as const;

const SECRET_VALUE = "super-secret-value-that-must-never-be-logged";

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(REQUIRED.map((n) => [n, process.env[n]]));
  for (const name of REQUIRED) delete process.env[name];
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function setAll() {
  for (const name of REQUIRED) process.env[name] = `value-for-${name}`;
}

describe("requireServerEnv", () => {
  it("returns the configuration when every variable is set", () => {
    setAll();
    expect(requireServerEnv()).toEqual({
      databaseUrl: "value-for-DATABASE_URL",
      liaraAiApiKey: "value-for-LIARA_AI_API_KEY",
      liaraAiBaseUrl: "value-for-LIARA_AI_BASE_URL",
      liaraChatModel: "value-for-LIARA_CHAT_MODEL",
      liaraEmbeddingModel: "value-for-LIARA_EMBEDDING_MODEL",
    });
  });

  it("names every missing variable, not just the first", () => {
    setAll();
    delete process.env.DATABASE_URL;
    delete process.env.LIARA_CHAT_MODEL;

    expect(() => requireServerEnv()).toThrow(
      /Missing required environment variables: DATABASE_URL, LIARA_CHAT_MODEL/,
    );
  });

  it("points the reader at how to fix it", () => {
    expect(() => requireServerEnv()).toThrow(/\.env\.example/);
  });

  it("treats a blank or whitespace-only value as missing", () => {
    setAll();
    process.env.LIARA_AI_API_KEY = "   ";
    expect(missingServerEnvVars()).toEqual(["LIARA_AI_API_KEY"]);
  });

  it("never puts a configured value in the error message", () => {
    setAll();
    process.env.LIARA_AI_API_KEY = SECRET_VALUE;
    delete process.env.DATABASE_URL;

    try {
      requireServerEnv();
      expect.unreachable("requireServerEnv should have thrown");
    } catch (error) {
      const text = String(error);
      expect(text).not.toContain(SECRET_VALUE);
      expect(text).toContain("DATABASE_URL");
    }
  });
});

describe("missingServerEnvVars", () => {
  it("reports all names when nothing is configured", () => {
    expect(missingServerEnvVars()).toEqual([...REQUIRED]);
  });

  it("reports nothing when everything is configured", () => {
    setAll();
    expect(missingServerEnvVars()).toEqual([]);
  });
});
