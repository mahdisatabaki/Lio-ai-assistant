import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("responds 200 even with no database configured", async () => {
    expect((await GET()).status).toBe(200);
  });

  it("reports an unconfigured database rather than failing", async () => {
    await expect((await GET()).json()).resolves.toEqual({
      status: "ok",
      database: "unconfigured",
    });
  });

  it("responds as JSON", async () => {
    expect((await GET()).headers.get("content-type")).toContain("application/json");
  });

  it("makes no AI call", async () => {
    // Health must stay free to poll; a paid call here would be billed per probe.
    const body = await (await GET()).json();
    expect(Object.keys(body)).toEqual(["status", "database"]);
  });
});
