import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Minimal Vitest setup. Tests are co-located (`*.test.ts`) next to the code
 * they cover and run in the default `node` environment — no DOM is needed.
 *
 * The `@/` alias must mirror `tsconfig.json` `paths`, otherwise every import
 * in a test resolves to nothing.
 *
 * Two projects, because two kinds of test need opposite React builds:
 *  - `server` (`*.test.ts`) sets the `react-server` condition, because
 *    `lib/content.ts` imports `server-only`, whose default export throws by design
 *    outside a Server Component. It has to go under `ssr.resolve` (both
 *    `conditions` and `externalConditions`): `server-only` is externalised, so
 *    plain `resolve.conditions` never governs it and the import throws anyway.
 *  - `components` (`*.test.tsx`) renders client components to a string with
 *    `react-dom/server`, which that same condition forbids.
 */
const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        ssr: {
          resolve: {
            conditions: ["react-server"],
            externalConditions: ["react-server"],
          },
        },
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "components",
          environment: "node",
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
  },
});
