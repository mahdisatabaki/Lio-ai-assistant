import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Minimal runner for pure logic modules (docs/TECH.md section 30.1).
// No DOM environment yet: component-level checks are added when the UI needs them.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` resolves to a module that throws on import unless the
      // resolver applies the `react-server` condition, which Node does not do
      // for dependencies. Point it at the same empty module a Server Component
      // gets, so server modules can be unit tested at all.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
