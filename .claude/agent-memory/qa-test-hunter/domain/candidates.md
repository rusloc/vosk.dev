<!-- next-id: CAND-007 -->

# Candidates

Single-occurrence observations awaiting a second sighting.

### CAND-001 · Vite/Vitest config must be `.mts` in this repo · first seen 2026-08-01

**Where:** `vitest.config.mts` (was `vitest.config.ts`)
**Why interesting:** `package.json` has no `"type": "module"`, so Vite's native config loader warns on every run: _"ESM syntax in a file loaded as CommonJS"_ and threatens to break in a future major. Renaming to `.mts` silences it; `tsconfig.json` already includes `**/*.mts`, and eslint lints it fine.
**Watch for:** the same warning if anyone adds `postcss.config.ts`, `playwright.config.ts`, etc. (2026-09-27: Node 24 prints the sibling `MODULE_TYPELESS_PACKAGE_JSON` warning when a `.ts` under `src/` is imported directly — same root cause, not a second sighting of the config case.)
**Tags:** vite, vitest, esm, cjs, config
**Promote-to:** test-infra-quirks.md on second sighting
**Expires:** 2026-10-30

### CAND-002 · Zod defaults leak untranslated English into localized forms · first seen 2026-08-01

**Where:** `src/lib/schema.ts` `makeContactSchema` — `.max(200)` on email, `.max(150)` on subject, and the type check on a missing `message` carry no custom message.
**Why interesting:** `makeContactSchema(t)` looks fully localized because the three "interesting" rules take `t.*` strings, so the gap is invisible on inspection. A `ru` visitor omitting the message gets `"Invalid input: expected string, received null"`.
**Watch for:** any other `makeXSchema(t)` factory where only some rules take a message argument.
**Tags:** zod, i18n, validation, localization
**Promoted-to:** DEF-001 on 2026-09-27 (second sighting: hard-coded `MONTHS` in `components/sales-dashboard.tsx`)

### CAND-003 · Env parsing outside the action's try/catch turns misconfig into a 500 · first seen 2026-08-01

**Where:** `src/app/[locale]/contact/actions.ts` calls `getContactConfig()` (which does `contactEnvSchema.parse`) before the `try` block.
**Why interesting:** the config module is written defensively (everything optional, graceful "not configured" fallback) but `z.string().min(1).optional()` still THROWS on `""` — and an empty-string env var is the single most likely operator mistake in a Vercel dashboard. The friendly fallback is unreachable in exactly the case it was written for.
**Watch for:** other `*.parse()` calls in request-path code sitting outside error handling. (2026-09-27: `lib/cube.ts` got this right — `process.env.X || undefined` before `.optional()`, with a comment naming the trap. Not a second hit; a fix pattern to point at.)
**Tags:** zod, env, server-action, error-handling, vercel
**Promote-to:** defect-patterns.md on second sighting
**Expires:** 2026-10-30

### CAND-004 · Badge colour/arrow chosen from the unrounded delta while the text is rounded · first seen 2026-09-27

**Where:** `src/components/sales-dashboard.tsx` `Delta` — `variant={change > 0 ? "success" : …}` and the arrow use the raw `change`; `signedPercent` / `signedPoints` (`signDisplay: "exceptZero"`, 1 decimal) round first, so `0.0004` prints `0%` / `0.0 pp` (verified on Node 24) beside a green up-arrow.
**Why interesting:** deterministic, user-visible, and invisible to the suite — no test can reach the component (GAP-001) and the calc layer is correct. Same class as "sort key ≠ display key".
**Watch for:** any `Intl.NumberFormat` with `signDisplay` whose sibling colour/icon is picked from the raw number.
**Tags:** intl, rounding, signDisplay, badge, ui-logic
**Promote-to:** defect-patterns.md on second sighting
**Expires:** 2026-12-26

### CAND-005 · Strict row contract passes a timezone-shifted `date_trunc` · first seen 2026-09-27

**Where:** `src/lib/sales-dashboard.ts:88-90` — `timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}/)`, then `.slice(0, 7)` / `.slice(0, 4)`.
**Why interesting:** the file's premise is "a renamed measure fails the build, not the chart" — but the one drift that would silently corrupt every chart passes: if Cube ever serialised `date_trunc('month', …)` as `2025-05-31T22:00:00.000Z` (query-timezone change, SQL API upgrade), every month and year lands one back and `.strict()` is satisfied. Observed live format on 2026-09-22 was `T00:00:00.000`, so it holds today.
**Watch for:** the same lenient regex in any other Cube/Superset query module. A second sighting is grounds for `^\d{4}-\d{2}-01(?:[T ]00:00:00|$)` on months and `^\d{4}-01-01` on years.
**Tags:** cube, zod, timestamp, timezone, contract-drift, date_trunc
**Promote-to:** defect-patterns.md on second sighting
**Expires:** 2026-12-26

### CAND-006 · An empty report table is a cacheable 200 on the data routes · first seen 2026-11-26

**Where:** `src/lib/report-data/artifacts.ts` `runArtifact` (rows branch) + `src/lib/report-data/route.ts` `CACHE_CONTROL`; seen while auditing the unloaded `cashflow_demo`.
**Why interesting:** the manifest has a "not loaded" guard (throws → 502, uncached) but a table has none: zero rows → `{col: []}` → 200 with `s-maxage=86400, stale-while-revalidate=604800`. A reader URL set (or a 002 rebuild run) before the load pins empty tables on the CDN for a day; the page then fails with "0 rows, manifest says N" until a redeploy. The loader itself is safe (truncate + insert in one transaction).
**Watch for:** any go-live order other than load → env → deploy; a 002 rebuild on a live report; a second report hitting this in production.
**Tags:** cdn, cache, empty-table, report-data, go-live, s-maxage
**Promote-to:** defect-patterns.md on second sighting
**Expires:** 2027-02-24
