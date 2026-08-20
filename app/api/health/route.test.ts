import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("responds 200", () => {
    expect(GET().status).toBe(200);
  });

  it("responds with the stable health body", async () => {
    await expect(GET().json()).resolves.toEqual({ status: "ok" });
  });

  it("responds as JSON", () => {
    expect(GET().headers.get("content-type")).toContain("application/json");
  });
});
