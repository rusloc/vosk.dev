---
name: test-bootstrap
description: Vitest was introduced to VOSK.DEV on 2026-08-01 with one suite (contact Server Action); everything else is still uncovered
metadata:
  type: project
---

Test infrastructure landed 2026-08-01: Vitest 4 only (no jsdom, no React Testing Library, no MSW), `vitest.config.mts` at repo root, scripts `test` / `test:watch`, one co-located suite at `src/app/[locale]/contact/actions.test.ts` (29 tests).

**Why:** `submitContactForm` was the highest-complexity zero-coverage function in the repo (flagged CRAP 210). The user chose Vitest over Jest for the Turbopack/ESM/TS-strict fit, and explicitly wanted no unused dependencies installed.

**How to apply:** tests are co-located as `*.test.ts` next to their subject (there is no `__tests__` convention). Adding a DOM/component test means installing `jsdom` + `@testing-library/*` first — check with the user before doing so, since "don't install what you don't use" was an explicit constraint. See `domain/coverage-map.md` for what is still uncovered.

**Expires:** 2026-11-01 (re-confirm the stack before assuming it is still Vitest-only).
