---
name: hot-spots
description: Files that came up repeatedly in vosk.dev reviews (showcase page, chat-tools, report apps, client env imports) so the next run reads them first
metadata:
  type: project
---

- `src/app/[locale]/work/[slug]/page.tsx` (480 lines at 11-19, 501 at 11-25, growing each feature): every report button, data chat, JSON-LD; its static client imports set the JS of all 11 showcase pages. Raised 11-18 (L2) and 11-19 (S3, B4).
- `src/lib/<report>/chat-tools.ts` (324-845-line factories): B1 both runs.
- `src/components/<report>/*-app.tsx` and `pnl/shell.tsx`: Board components 300-500 lines; load + chat now shared (`report-load.ts`, `chat/report-chat.tsx`).
- Client modules importing config: `superset-embed.tsx` -> `lib/env.ts` (11-19); nav -> site.ts was S1 (fixed 11-18). Grep every run.
- Per-report plumbing is now thin (11-18 cleanup): routes and server.ts are 14-18 lines each over `src/lib/report-data/`; a new report adds a route, server.ts, artifacts.ts and a load script that call it.
- `src/lib/structured-data.ts`, `src/lib/metadata.ts`, `src/lib/i18n/en.ts`: the SEO pass edits these.
- `src/components/freight/freight-app.tsx` + `public/data/freight/` (11-24): 889-line client file; 14.7 MB of Parquet read per open with no-store. Re-measure bytes each run (scratch script reading Parquet metadata).
- `src/lib/report-data/columns.ts` `artifactSources`: its codec drags hyparquet into client popups.

- `src/components/cashflow/` + `src/lib/cashflow/` (11-26, uncommitted): Board 445 lines, views.tsx heat grid, URL write-back; cross-imports trucks' parquet-columns.
- Cross-report imports: grep `@/lib/<other report>/` inside each report folder every run (cashflow -> trucks found 11-26).

Related: [[open-findings]]
