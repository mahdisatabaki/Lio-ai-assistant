import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Minimal runner for pure logic modules (docs/TECH.md section 30.1).
// No DOM environment yet: component-level checks are added when the UI needs them.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
