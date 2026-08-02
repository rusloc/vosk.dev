import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Minimal Vitest setup. Tests are co-located (`*.test.ts`) next to the code
 * they cover and run in the default `node` environment — everything under test
 * so far is server-side, so no DOM is needed.
 *
 * The `@/` alias must mirror `tsconfig.json` `paths`, otherwise every import
 * in a test resolves to nothing.
 *
 * The `react-server` condition is set because `lib/content.ts` imports
 * `server-only`, whose default export throws by design outside a Server Component.
 * It has to go under `ssr.resolve` (both `conditions` and `externalConditions`):
 * `server-only` is externalised, so plain `resolve.conditions` never governs it and
 * the import throws anyway.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  ssr: {
    resolve: {
      conditions: ["react-server"],
      externalConditions: ["react-server"],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
