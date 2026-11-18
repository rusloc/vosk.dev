---
name: open-findings
description: Open review findings for vosk.dev with id, severity, path and one line; check each for a fix on the next run, mark fixed with date, drop after the following run
metadata:
  type: project
---

Raised 2026-11-18 (first review). Ids are stable across runs.

**Fixed 2026-11-18 (main session, uncommitted until the owner pushes; verify on the next run, then drop):** S1 (nav takes
`brand` as a prop), S2 (`src/lib/report-data/rate-limit.ts`; superset guest-token, contact action and the ceo-digest send
limit still keep their own maps), L1 (`src/lib/mirelo/heat.ts`), L2 (`CHAT_REPORTS` + `REPORT_DATA_ENV` in
`lib/js-reports.ts`), L4 (hero-cta deleted; marketing `engine/tokens.ts` KEPT: it is the vendored pack's §5.1 token
table, treat as waived), D1 (`src/lib/report-data/` + `scripts/lib/load-report.ts`; mirelo/pnl artifacts and P&L typed
loaders left per report), D2 (rule constants in `lib/chat/tools.ts`, prompts byte-identical), D3 (`components/use-modal.ts`,
`close-icon.tsx`), D4 (`components/report-load.ts`, `chat/report-chat.tsx`; P&L load left as is), D5 (`resolveLocale`),
D6, SEO notes X4 (AREA_SERVED, `tierOffer`) and X5 (`lib/person.ts`, `withTitleSuffix`, `siteConfig.locale`).
**Deferred by the owner's session:** L3 (13 docs/memories cite the paths), B1, B2, B3 (next time those files change).

- S1 P0 `src/components/nav.tsx:6` imports siteConfig -> env.ts -> Zod: 64 kB gz (+11 kB) on every page, for `siteConfig.name`.
- S2 P2 rate-limit `hits` Maps never evict IP keys: 5 data routes `:25-32`, `src/lib/chat/route.ts:80-87`.
- L1 P1 cycle `src/lib/mirelo/clients.ts:3` <-> `loans.ts:1` (heatLevels / kpi, CATEGORY_ROLES).
- L2 P1 chat-report allow-list hand-kept in `src/app/[locale]/work/[slug]/page.tsx:125-135`; Nordmark chat (uncommitted) needs an edit there; move to `lib/js-reports.ts`.
- L3 P2 Cube showcase files at lib/components root (`lib/cube.ts`, `lib/sales-dashboard*.ts`, `components/sales-dashboard*.tsx`) unlike the other reports.
- L4 P2 dead: `src/components/hero-cta.tsx` (+css), `src/lib/marketing/engine/tokens.ts`.
- B1 P1 `src/lib/marketing/chat-tools.ts:119-963` 845-line closure (also pnl 561, mirelo 341).
- B2 P1 `src/lib/nordmark/engine/view.ts:698-1145` 445-line switch on `id: string`; no CardId union (also metrics.ts:96, view.ts:637).
- B3 P2 `src/components/marketing/marketing-app.tsx:180-701` Board 522 lines.
- D1 P1 per-report data plumbing x5: api routes, server.ts, artifacts.ts, loader columns seam, scripts/*-load.ts (~700 redundant lines). Nordmark is copy 5.
- D2 P1 chat system-prompt core rules (incl. injection guard) copied in 6 chat-tools files.
- D3 P1 3 modal impls (report-dialog, send-message-button, services/conditions-button) drifted on scroll-lock restore + Escape.
- D4 P1 report-app load effect x4 and Ask AI dialog block x5 in components/<report>/*-app.tsx.
- D5 P2 `(isLocale(locale) ? locale : "en") as Locale` x16 in 8 pages; add resolveLocale.
- D6 P2 `src/lib/trucks/test-utils/csv.ts` == `src/lib/csv.ts`.
- SEO-pass notes: T-01 spec wording (sendGTMEvent) is stale vs data-ga; ShowcaseCard/ReportMock/ServiceCard route-local; areaServed x3; en_US literals; name literal in en.ts (site.ts imports en.ts, so en.ts must not import site.ts).

Related: [[baseline]], [[hot-spots]]
