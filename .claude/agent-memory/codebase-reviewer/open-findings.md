---
name: open-findings
description: Open review findings for vosk.dev with id, severity, path and one line; check each for a fix on the next run, mark fixed with date, drop after the following run
metadata:
  type: project
---

Ids are stable across runs. First run 2026-11-18, second 2026-11-19 (HEAD 3bde271).

**Verified fixed 2026-11-19 (dropped from the list):** S1, S2 (data + chat routes), L1, L2, L4 (hero-cta), D1, D2, D3,
D4 (Nordmark adopts the hooks only in held changes), D5, D6, X4, X5.

**Open, carried from 2026-11-18 (owner's session deferred them):**
- L3 P2 Cube showcase at lib/components root (`lib/cube.ts`, `lib/sales-dashboard*.ts`, `components/sales-dashboard*.tsx`); 13 docs cite the paths.
- B1 P1 `src/lib/marketing/chat-tools.ts:130-974` createChatTools 845 lines (pnl 561 at :77, trucks 342, mirelo 341, ceo-digest 324).
- B2 P1 `src/lib/nordmark/engine/view.ts:698` `numbers(c, id: string)` 445-line switch; no CardId union.
- B3 P2 `src/components/marketing/marketing-app.tsx:152` Board 507 lines.

**New 2026-11-19:**
- S3 P1 `src/components/superset-embed.tsx:5,34` imports `lib/env` (Zod) and `work/[slug]/page.tsx:21,23` imports SupersetEmbed + ChatPanel statically: +70 kB gz on all 11 showcase pages (264 vs 194). Fix: domain as prop, client lazy wrappers like SalesDashboardLazy.
- L5 P2 route-local shared UI: `work/showcase-card.tsx` imported by home `page.tsx:17` and `services/[slug]/page.tsx:14`; `blog/title-bar.module.css` by services/service-card and work/showcase-card.
- B4 P2 `src/app/[locale]/work/[slug]/page.tsx:99-475` ShowcasePage 377 lines, 4 ReportDialogs + platform ternary at :296-320 (file 462 -> 480 lines).
- D7 P2 hand-rolled non-evicting rate limiters left beside `report-data/rate-limit.ts`: superset guest-token route `:25-32`, contact `actions.ts:18-25`, ceo-digest `chat-tools.ts:213`; IP parse x2.
- D8 P2 each reader env name written twice: `lib/js-reports.ts:43-45` REPORT_DATA_ENV and `lib/<report>/server.ts:14`.
- D9 P2 `once()` copied in `marketing/data/loader.ts:64` and `trucks/data/loader.ts:48`.

Related: [[baseline]], [[hot-spots]]
