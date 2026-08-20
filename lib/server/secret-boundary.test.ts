import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guards the server/client secret boundary (BL-003).
 *
 * `server-only` already turns a client import of `lib/server/env.ts` into a
 * build error. This covers the gap it cannot see: source that reads a secret
 * variable straight from `process.env` somewhere the client bundle can reach,
 * or that re-exports one through a `NEXT_PUBLIC_` name, which Next.js inlines
 * into client JavaScript.
 */

const SOURCE_ROOTS = ["app", "components", "lib"];
const SERVER_ONLY_DIR = join("lib", "server");
const SECRET_VARS = ["LIARA_AI_API_KEY", "DATABASE_URL"];

function sourceFiles(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts"))
      found.push(path);
  }

  return found;
}

const files = SOURCE_ROOTS.flatMap((root) => sourceFiles(root)).map((path) =>
  relative(process.cwd(), path),
);

const isServerOnly = (path: string) =>
  path.split(sep).join("/").startsWith(SERVER_ONLY_DIR.split(sep).join("/"));

describe("secret boundary", () => {
  it("finds the source files it is supposed to scan", () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.some(isServerOnly)).toBe(true);
  });

  it.each(SECRET_VARS)("reads %s only inside lib/server", (variable) => {
    const offenders = files.filter(
      (path) => !isServerOnly(path) && readFileSync(path, "utf8").includes(variable),
    );

    expect(offenders).toEqual([]);
  });

  it("never exposes a secret through a NEXT_PUBLIC_ name", () => {
    const offenders = files.filter((path) =>
      /NEXT_PUBLIC_\w*(KEY|SECRET|TOKEN|PASSWORD|DATABASE)/i.test(
        readFileSync(path, "utf8"),
      ),
    );

    expect(offenders).toEqual([]);
  });

  it("keeps lib/server/env.ts behind the server-only marker", () => {
    expect(readFileSync(join("lib", "server", "env.ts"), "utf8")).toMatch(
      /^import "server-only";/m,
    );
  });
});
