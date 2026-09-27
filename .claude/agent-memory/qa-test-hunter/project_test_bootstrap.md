---
name: test-bootstrap
description: Vitest 4 in VOSK.DEV is node-only (no jsdom/RTL/MSW) — four co-located suites as of 2026-09-27 (contact action, cube client, sales-dashboard query + calc); components stay untestable
metadata:
  type: project
---

Test infrastructure landed 2026-08-01: Vitest 4 only (no jsdom, no React Testing Library, no MSW), `vitest.config.mts` at repo root, scripts `test` / `test:watch`. As of 2026-09-27 there are four co-located suites, 146 tests, all green: `src/app/[locale]/contact/actions.test.ts`, `src/lib/cube.test.ts`, `src/lib/sales-dashboard.test.ts`, `src/lib/sales-dashboard-calc.test.ts`. The dashboard suites were written by the user/other agents, not by this one.

**Why:** `submitContactForm` was the highest-complexity zero-coverage function in the repo (flagged CRAP 210). The user chose Vitest over Jest for the Turbopack/ESM/TS-strict fit, and explicitly wanted no unused dependencies installed.

**How to apply:** tests are co-located as `*.test.ts` next to their subject (there is no `__tests__` convention). Adding a DOM/component test means installing `jsdom` + `@testing-library/*` first — check with the user before doing so, since "don't install what you don't use" was an explicit constraint. The practical consequence: anything in `src/components/*` can only be *reported*, not pinned — the recommended route is lifting view logic into a pure `lib/*` module (GAP-001). See `domain/coverage-map.md` for what is still uncovered.

**Expires:** 2026-11-01 (re-confirm the stack before assuming it is still Vitest-only).
