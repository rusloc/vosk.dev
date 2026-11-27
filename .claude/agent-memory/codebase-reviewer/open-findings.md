---
name: open-findings
description: Open review findings for vosk.dev with id, severity, path and one line; check each for a fix on the next run, mark fixed with date, drop after the following run
metadata:
  type: project
---

Ids are stable across runs. Runs: 2026-11-18, 2026-11-19 (HEAD 3bde271), 2026-11-25 (HEAD 1fce91e), 2026-11-26 (cashflow diff only, working tree).
Nothing from the 11-19 list was fixed by 11-25.

**Open, carried from 2026-11-18 (owner's session deferred them):**
- L3 P2 Cube showcase at lib/components root (`lib/cube.ts`, `lib/sales-dashboard*.ts`, `components/sales-dashboard*.tsx`); 13 docs cite the paths.
- B1 P1 `src/lib/marketing/chat-tools.ts:130-974` createChatTools 845 lines (pnl 561 at :77, trucks 342, mirelo 341, ceo-digest 324).
- B2 P1 `src/lib/nordmark/engine/view.ts:698` `numbers(c, id: string)` 445-line switch; no CardId union.
- B3 P2 `src/components/marketing/marketing-app.tsx:152` Board 507 lines.

**Open, from 2026-11-19:**
- S3 P1 (FIXED in working tree 11-26, uncommitted: embed takes a `domain` prop; showcase 186 kB gz, no Zod in page chunks; verify at HEAD) `src/components/superset-embed.tsx:5,34` imports `lib/env` (Zod) and `work/[slug]/page.tsx:21,23` imports ChatPanel + SupersetEmbed statically: 265 vs 193 kB gz on the 8 prerendered showcase pages (11-25). Chunk holds Zod with ~40 locales + JSON Schema generator.
- L5 P2 shrank 11-25 (home no longer imports the card): `services/[slug]/page.tsx:15` imports `../../work/showcase-card`; `blog/title-bar.module.css` used by `services/service-card.tsx:2`, `work/showcase-card.tsx:6`.
- B4 P2 `src/app/[locale]/work/[slug]/page.tsx:100` ShowcasePage 398 lines (377 on 11-19), file 501 (480).
- D7 P2 hand-rolled limiters: guest-token `route.ts:25`, contact `actions.ts:23`, ceo-digest `chat-tools.ts:213`; IP parse at `actions.ts:63`, guest-token `:51` beside `report-data/rate-limit.ts:36`.
- D8 P2 (x5 with cashflow 11-26) reader env name twice: `lib/js-reports.ts:47-50` REPORT_DATA_ENV and `lib/<report>/server.ts` envVar.
- D9 P2 FIXED 2026-11-27 (`lib/report-data/once.ts`; nordmark loader keeps its inline copy until its release) `once()` copies: `marketing/data/loader.ts:64`, `trucks/data/loader.ts:48`, and since 11-24 `components/freight/freight-app.tsx:56-61` (inline `pending ??=`).

**New 2026-11-25:**
- S4 P0 freight popup reads 14.7 MB of Parquet column chunks (shipments 4.90 + postings 9.81 MB) with `cache: "no-store"` (`freight-app.tsx:49-55`): refetched every page load. Local-currency columns (~3.5 MB) deferrable (default USD, `:85`). Owner chose Parquet in the build; encoding and column set are not covered by that decision.
- S5 P2 FIXED 2026-11-27 (readRows imports hyparquet on demand in mirelo/marketing/trucks/cashflow parquet-columns; nordmark's copy still top-level until its release) (11-26: cashflow popup carries it too; freight's 2nd copy gone, all share one 18.3 kB chunk) hyparquet (18 kB gz) in Mirelo/Marketing/Trucks popups via `artifactSources` codec holding readRows (`report-data/columns.ts:68-90`); P&L shows the split works. Freight gets a 2nd identical hyparquet chunk.
- B5 P2 `src/components/freight/freight-app.tsx` 889 lines; Report `:151-553` 402 lines, builds the top-N table in the component (`:180`).

**New 2026-11-26, Cash flow demo (uncommitted feature; lines may move, other agents editing):**
- X1 P1 `components/cashflow/views.tsx:656` svg onFocus sets cursor 0,0 and the effect at :393-401 scrolls to it: first mouse click on a scrolled Quarter/Year grid is lost (code read, not reproduced).
- X2 P1 `components/cashflow/cashflow-app.tsx:162-181` replaceState of the page URL: strips utm_*/gclid on open, leaves keys after close; siblings use `useReportSearch`.
- X3 P2 `lib/cashflow/engine/data.ts:159` `r.cleared as Cleared` unchecked (CLEARED const unused).
- L6 P1 cashflow imports trucks' vendored `parquet-columns` (loader.ts:7, manifest.ts:2, engine/data.ts:1, test-utils, 2 scripts).
- L7 P2 `lib/work.ts:729-732` filter names `cashflow`; L8 P2 orphan `engine/tokens.ts` (cites nonexistent cashflow.module.css), dead `url-state.ts:220` re-export, `nav.ts:24` currentSec.
- S6 P2 FIXED 2026-11-27 (TipHost + external store; header ResizeObserver) tooltip state in Board: every mousemove re-renders Board + panel (year heat 494 rects/377 texts; SSR prod 0.9 ms); StatementView layout effect without deps reads offsetHeight each render.
- S7 P2 FIXED 2026-11-27 (tables start with the manifest) `lib/cashflow/data/loader.ts:35-56` manifest then tables (1 RTT waterfall), unmeasured.
- B6 P2 Board 445 lines (`cashflow-app.tsx:132`); B7 P2 ActivitiesView 400 (`views.tsx:346`), sort labels in component; B8 P2 `scripts/cashflow-build.ts:111` main 575.
- D10 P2 Tab focus-trap copies: cashflow-app.tsx:269, nordmark exec-app.tsx:182, pnl glass.tsx:99 (+mirelo fork). D11 P2 columnsSource fetch wrapper x5 (cashflow loader.ts:59, marketing/nordmark/pnl/trucks apps). D12 P2 cashflow test-utils/dataset.ts bypasses loadDataset (loader error paths untested).

**Judged acceptable 11-25 (do not re-raise):** chat-tools / chat-metrics similarity across reports (shared plumbing in `lib/chat/tools.ts`; formatValue/formatDelta and catalogue prompt lines differ per report units), the 4 thin `/api/<report>/[...path]` routes + `server.ts` (14-17 lines each over `report-data`), month-name tables (now 9 copies incl. freight).

Related: [[baseline]], [[hot-spots]]
