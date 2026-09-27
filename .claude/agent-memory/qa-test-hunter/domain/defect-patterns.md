<!-- next-id: DEF-002 -->
<!-- next-id: GAP-002 -->

# Defect Patterns

Repo-specific defect classes (`kind: defect`) and untestable seams (`kind: gap`). Coverage gaps are folded in here with `GAP-NNN` IDs until this file crosses 400 lines.

### DEF-001 · User-visible English reaches the `ru` locale from a non-dictionary source · 2026-09-27

**kind:** defect
**Symptom:** a `ru` page renders English fragments while every dictionary string around them is Russian — `"Invalid input: expected string, received null"` under the contact form; `Jan–Aug 2025` in the dashboard caption and `Jan … Aug` on its x-axis.
**Cause:** the string never passed through `Dictionary`: (a) Zod's default message on a rule with no custom message (`makeContactSchema` `.max()` / type errors); (b) a module-level constant in a `'use client'` component (`MONTHS` in `components/sales-dashboard.tsx`). Both look localized on inspection because the surrounding copy takes `labels.*` / `t.*`.
**Fix / test:** grep the component/schema for string literals that reach JSX or an error message and are not `labels.*` / `t.*`. Test: run the formatter/parser with the `ru` dictionary and assert the output contains no `[A-Za-z]{3,}` outside known proper nouns; for Zod, parse an invalid `ru` payload and assert every issue message is a value in `ru.contact.*`.
**Seen:** `src/lib/schema.ts` (`makeContactSchema`, 2026-08-01, as CAND-002); `src/components/sales-dashboard.tsx:108-127` (`MONTHS` / `monthLabel`, 2026-09-27)
**Hits:** 2
**Tags:** i18n, ru, dictionary, zod, hard-coded-string, client-component
**Confidence:** medium
**Last-verified:** 2026-09-27
**Related:** GAP-001
**Status:** active

### GAP-001 · Dashboard view logic lives inside a `'use client'` component under a node-only Vitest · 2026-09-27

**kind:** gap
**Symptom:** the caption period label, `partialYear`, `monthLabel`, the tooltip rows and the Delta badge's colour/arrow choice in `components/sales-dashboard.tsx` have zero tests and cannot get any: `vitest.config.mts` is `environment: "node"`, `include: ["src/**/*.test.ts"]`, no jsdom, no RTL — and installing them was ruled out (see `project_test_bootstrap.md`).
**Cause:** presentation arithmetic (`points.length < 12`, `kpis.revenue.change === undefined` as the caption gate for all four tiles, sign taken from the raw `change` while `Intl` rounds the text) sits in the component body instead of `lib/sales-dashboard-calc.ts`.
**Fix / test:** lift to a pure module (e.g. `lib/sales-dashboard-view.ts`): `captionPeriod(kpis, points, year) → string | null`, `deltaTone(change, inPoints) → "up" | "down" | "flat"` decided on the ROUNDED value, `monthLabel(month, months: string[], withYear)`. Then `.test.ts` them like the calc file. Until then, findings in that component can only be reported, never pinned.
**Seen:** `src/components/sales-dashboard.tsx:238-260, 285-317` (2026-09-27)
**Hits:** 1
**Tags:** coverage-gap, client-component, node-env, refactor-demanded, dashboard
**Confidence:** low
**Last-verified:** 2026-09-27
**Related:** DEF-001, CAND-004
**Status:** active
