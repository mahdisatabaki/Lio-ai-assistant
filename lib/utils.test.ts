import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("flex", "gap-2")).toBe("flex gap-2");
  });

  it("drops falsy values", () => {
    expect(cn("flex", false && "hidden", undefined, null)).toBe("flex");
  });

  it("lets a later Tailwind utility win over an earlier conflicting one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("keeps logical and physical spacing utilities separate", () => {
    // RTL-first UI relies on logical utilities, which must not be merged away
    // by their physical counterparts.
    expect(cn("ps-2", "pl-4")).toBe("ps-2 pl-4");
  });
});
