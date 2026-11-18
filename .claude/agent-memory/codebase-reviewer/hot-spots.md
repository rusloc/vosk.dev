---
name: hot-spots
description: Files that came up repeatedly in vosk.dev reviews (per-report plumbing, showcase page, chat-tools, nav) so the next run reads them first
metadata:
  type: project
---

First seen 2026-11-18:
- `src/app/[locale]/work/[slug]/page.tsx` (462 lines): hand-kept chat list, every report button, SEO JSON-LD.
- Per-report plumbing, copied per report: `src/app/api/<report>/[...path]/route.ts`, `src/lib/<report>/server.ts`, `src/lib/<report>/artifacts.ts`, `src/lib/<report>/data/loader.ts`, `scripts/<report>-load.ts`. A new report adds copy n+1.
- `src/lib/<report>/chat-tools.ts` (352-963 lines): closure factories + system prompts.
- `src/components/nav.tsx` + `src/lib/site.ts` + `src/lib/env.ts`: client bundle weight on every page.
- `src/lib/structured-data.ts`, `src/lib/metadata.ts`, `src/lib/i18n/en.ts`: the SEO pass edits these.

Related: [[open-findings]]
