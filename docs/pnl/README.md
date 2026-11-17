# Management P&L suite — the JS showcase

The custom-JavaScript flavour ("Track C") of the ACME Unified P&L, built and hosted in this repo as a showcase
item: `/work/pnl-suite` (until 2026-10-31 `/work/unified-management-pnl`, which now 308s there).

## 2026-10-31: replaced by the standalone-app pack

The owner had the PNL repo's **`pnl/js-app/` pack** (`.sync`, 2026-10-28; its README is `pack-readme-2026-10-28.md`
here, the hand-over note `../report-packs-2026-10-31.md`) replace the 10-22 copy. The pack is the P&L part of
`js-report/` as of 10-28: the 10-27 views redesign (Vitals, two-page Analysis with the largest variances, two-page
Profitability, glass pop-ups, company picker, period picker v2), **without the Group view and the slice filters** the
10-22 copy had built here (its `restrictToBuilt` forces P / S and clears the slices; the company picker lists Group
as "not built yet"). The 10-22 code, its allocation-parity fixture and its decisions below are history now; git has
them (`b38fc8f` and before).

How it was brought in (the same way as on 10-22, now for three reports at once, see `../mirelo/README.md` and
`../nordmark/README.md`):

- **Copied in, not framed.** `lib/{data,engine,state,test-utils}` → `src/lib/pnl/`, `components/` →
  `src/components/pnl/`, `public/data/` → `public/data/pnl/`, `fixtures/checks/` → `data/pnl/checks/`. Files renamed
  to kebab-case, `.ts` import extensions dropped, the pack's Prettier style (single quotes, 120 columns) replaced by
  the site's. The pack's `app/` (root layout, page, `globals.css`) and `next.config.ts` (CSP `frame-ancestors`,
  `EMBED_ALLOWED_ORIGINS`) are not needed: the report is a client component in the site's own popup.
- **State in React, not in the page URL** (`src/components/report-search.ts`, shared by the three reports): the
  client root reads `window.location.search` once and keeps the query string in state through the same Zod codec
  the standalone app used for its URL; "Copy link" gives the showcase page's URL plus the state, and a page URL
  carrying one of the report's keys (`lib/js-reports.ts`) opens the popup in that state on arrival.
- **Tokens and base type on the report root** (`ledger.module.css` `.app`), fonts through `fonts.ts` on the same
  element, `height: 100%` of the popup instead of `100dvh`, `min-width: 1024px` (N-09): the popup scrolls below that.
- **Tests:** the pack's 196 (+ 1 skipped: the Track B bookmark cross-check, which needs the PBIP) run in the site's
  Vitest projects; the CSV reader moved to `src/lib/csv.ts`, shared by the three reports' control-total tests.
- **Rule of the pack:** fixes go back to `rusloc/pnl` through a dated `.sync` note and the pack is re-issued; a
  re-issue is a copy-over of the same folders plus the adaptations above (the port script lives in the session
  scratchpad only; the list above is the recipe).

## 2026-10-31, later: Analysis is one page (owner's layout change)

The owner asked for the two Analysis sub-pages to be merged: **the largest variances on top (the former page 2), the
two bridges side by side underneath (the former page 1)**, equal halves (`views.module.css` `.stacked`). The pager,
the ← → keys and the `p` URL key now belong to Profitability only; a shared link with `v=analysis&p=2` is rewritten
to the one page. "How to read - Analysis" says Top / Bottom instead of Page 1 / Page 2. **This is a change made
here, not in the pack:** the PNL side was asked to do the same in the Power BI report; its `pnl/js-app/` pack still
has the two pages, so a re-issued pack must carry this change (or it is re-applied: `analysis-view.tsx`, `shell.tsx`
`paged`, `view-copy.ts`) before it replaces these files.

## 2026-10-31, evening: the variances filter, and the mix heatmap coloured by cell (owner's changes)

- **"Largest variances vs Budget" lost its control block** (Top 8 / 12 / All, By block / By |Δ|, Cut). It now shows
  every leaf line with data, ranked by |Δ|, the P&L block as a grey suffix; the footer is the one total at operating
  profit (the "shown / other / coverage" rows went with Top-N).
- **A funnel replaces the cut:** a glass pop-up with one radio row per dimension (Region, and the company's Channel /
  Category / Price tier or Sales motion / Service line / Customer segment), "All" plus the members, never the
  unassigned one. The chosen members combine (AND): "North America · Online marketplaces · Home care · Premium" is
  the panel's subtitle, and a single member works alone. Engine: `largestVariances(ctx, filter)` reads the leaf
  vectors of the member tuple from `ctx.leaves(plan, tr, dims)`; lines below contribution margin are allocated by NR
  share whenever the filter has a non-region dimension (C-31, `alloc.`). Members partition the total (test).
- **URL:** `lvn` / `lvm` / `lvc` are gone; `lvr` / `lvch` / `lvln` / `lvsg` carry the filter (one code each, shape
  checked in `view-state.ts`, membership by `engine.validVarFilter` in the shell, so a code of the other company is
  dropped and the link rewritten).
- **Profitability page 2, "Mix - region × category":** the cells are now coloured by their own net revenue against
  the largest cell (a heatmap of the mix), no longer by the column's GM %, which stays in the header.
- **Still a divergence from the `pnl/js-app/` pack**, like the page merge above: a re-issue must carry both.

## 2026-11-09: the data in Supabase, and "Ask AI" with verified answers

**The rows left the build.** As Mirelo's (11-03) and ACME Marketing's (11-05), the P&L's data now lives in the shared
Supabase project, schema **`pnl_demo`**, read by the site through its own server route. The owner asked for it with the
chat ("move data into Supabase"); the rule is CLAUDE.md § Supabase.

- **Schema and roles:** `data/pnl/sql/001-schema-and-roles.sql` (`pnl_loader`, `pnl_reader`: NOLOGIN until the owner sets
  passwords; the reader hardened like the others, connection limit 30, `search_path = pnl_demo`, read-only, 15 s
  statements) and `002-schema.sql` (`document` for the manifest; `pl_p`, `pl_s`, `ops` with the Parquet's integer codes
  and cents plus `seq`; the manifest's lookups `dict_code`, `dim_month`, `dim_account`, `dim_region`, `fact_fx_rate` for
  SQL over the facts). Applied 11-09 via MCP as `postgres`; denials proven on real rows (42501 for both roles against
  `qbo` and `demo_sales`), the privilege sweep shows `pnl_demo` only, `anon` / `authenticated` have no USAGE,
  advisors(security) zero lints. Database before the load: 257 MB (the P&L adds roughly 30 MB).
- **Loader:** `scripts/pnl-load.ts` (`node --env-file=.env.local --import tsx scripts/pnl-load.ts`, as `pnl_loader`
  through `PNL_LOAD_DATABASE_URL`): truncates, loads the three fact tables and the lookups in one transaction, then
  verifies every chunk the route serves against the Parquet (`--verify` alone re-checks).
- **The route:** `/api/pnl/<name>` (`src/app/api/pnl/[...path]/route.ts` → `src/lib/pnl/server.ts`, `pnl_reader`,
  released when idle) serves `manifest.json`, `ops.json` and **nine chunks per company** of one version × twelve
  months (`pl-P/v0-m0-11.json` …), as JSON columns: a whole company is ≈ 10 MB of JSON, more than one function
  response may carry, a chunk ≈ 1–2 MB. `src/lib/pnl/artifacts.ts` maps the names to queries; the request contributes
  only a validated version index and month range.
- **The browser:** `src/lib/pnl/data/columns-loader.ts` (`columnsSource`) fetches the chunks and rebuilds the same typed
  arrays `parquet-loader.ts` built from the files; `dataset.ts` takes a `DatasetSource` (`parquetSource` for the
  tests and scripts, `columnsSource` for the site). The engine did not change.
- **The page:** the "Web report" button shows only when `PNL_DATABASE_URL` is set (`isJsReportLive`, like ACME
  Marketing). **Set it in Vercel before pushing**, or the P&L page has no report button until it is.

**Ask AI** on `/work/pnl-suite` and in the report's toolbar (Ledger palette), with a 61-metric catalogue and an
answer key: `ai-chat.md` in this folder; the executive metric list in `.log/report/2026-11-09-pnl-exec-metrics.md`.

## 2026-11-15: Profitability on one page, growth and margin month by month, and custom ranges (owner's requests)

**Profitability is one scrolling page.** Page 1 (region table + concentration bars) stays on top as it was, page 2
(growth and margin + the mix heatmap) sits directly underneath (`views.module.css` `.profPage`: two rows that share the
height when the window has room, the page scrolls when it has not; at 1440 × 900 both fit, at 1280 × 720 it scrolls).
The pager went with its last user: the ‹ › buttons in the tabs row (`header.tsx`, `.pager` CSS), the ← → keys and the
`p` URL key (`view-state.ts`; `VIEW_STATE_KEYS` is the four variances-filter keys now). An old link with `p=2` still
opens, its `p` is an unknown key and the rewrite drops it. "How to read - Profitability" says Top / Below.

**Concentration shows the bars only.** The legend block under the bars (region name + "NR share → EBITDA share
(drift pp)") is gone; the title and the (i) stay. The region of a segment is on hover (`<title>`), its colour is the
same as in the growth and margin rows below, and the (i) values carry each region's three shares and the drift.

**"Growth × margin by region" is replaced by "Growth and margin by region", month by month.** The bubbles were
unreadable and static (the mix heatmap already shows a static figure). Now a grid of small line charts: one row per
region in the table's order, then the company; two columns, net revenue growth vs the same month a year earlier
(constant currency, so organic; prior year = Actual, C-04) and contribution margin %. One point per month of the
period (the base's months after C-01), one scale per column for every row (its range is printed under the column
title), the company dashed behind each region's line for reference, and only the last month's value written, at the
line's end, so no label can collide. One month (MTD) is a dot with its value. Months without a prior year (2024) are
gaps, and the panel title says so ("Growth n/a for 6 of 12 months: no prior year before Jan 2024"). Engine:
`profitability.ts` `trendsOf` → `TrendsVM` (`view-types.ts`), two scans by region × month through a new `byMonth`
option of `aggregateBy` (`slices.ts`, region cut only, nothing allocated) and `ViewContext.monthly`; the company is
the sum of its regions. Chart: `charts.tsx` `Trends` (geometry only). Tests: one month equals the table's total and
regional CM % and Δ vs prior year %, months follow the period and its C-01 cut, 2024 growth is n/a. The bubble chart
(`Bubble`, `BubbleVM`, the two-years-back trail plan) and the concentration `legend` field were removed with it.

**2026-11-17 (owner): the small multiples gave way to one combo chart, "Revenue and margin by month".** The grid
(ten small charts, two metrics) still did not read at a glance. Now one chart for the company under the report's
filters: net revenue as bars on the left axis (selected units), contribution margin % (contribution ÷ NR) as a line on
the right axis, both axes on the same gridlines; each point carries its CM % while a period is at least 46 px wide,
else the last one only; hover a period for NR, contribution and CM %. A period of more than 12 months (custom ranges)
shows fiscal quarters ("Revenue and margin by quarter"; a part quarter says how many months it holds). Engine:
`profitability.ts` `marginOf` → `MarginVM`, one scan by region × month (no prior-year scan any more, so no growth note);
chart: `charts.tsx` `MarginCombo`. Tests: one month = the table's total NR and CM %, the period's info total = the
table's, a 12-month range stays monthly, 24 months = 8 quarters. `TrendsVM`, `trendsOf` and `Trends` were removed;
the concentration segments keep their region colours, which no chart below repeats now.

**Custom ranges in the period picker.** A sixth time view, **Custom range** (`RANGE`): any month range, across
fiscal years, e.g. Oct 2025 – Sep 2026 or 2025 and 2026 (Jan 2025 – Dec 2026).

- **Picking it:** Period → Show → Custom range. The range starts as the months on screen (from LTM Sep 2026 it is
  Oct 2025 – Sep 2026 straight away). "Whole years" offers every year alone and every run of years (2024, 2024 – 2025,
  2024 – 2026, 2025, 2025 – 2026, 2026). "Range" is a From / To switch; the Year row and the month grid below edit the
  chosen end (labelled From or To; the covered months are shaded). For Oct 2025 → Sep 2026: Custom range, From,
  Year 2025, Oct; To, Year 2026, Sep. Moving one end past the other takes the other along (`period.ts` `rangePatch`).
  The From / To switch is picker state in the shell, not report state.
- **Bounds:** the range lives inside the data (Jan 2024 – Dec 2026). Under an Actual base the grid offers closed
  months only (C-01) and a range that reaches past the last close (a "2025 – 2026" span, or a link) is cut at Sep 2026
  with the existing Cut-off notice, exactly like Full year 2026; Latest estimate and Budget read the open months.
- **URL:** `tv=RANGE` with **`sfy` / `sm`** = the first month (fiscal year, month 1–12); `fy` / `m` are the last
  month, as before. `tv=RANGE&sfy=2025&sm=10` (+ the default `fy=2026&m=9`) = Oct 2025 – Sep 2026;
  `m=12&tv=RANGE&sfy=2025&sm=1&b=LE` = 2025 and 2026 on Latest estimate. `sfy` / `sm` are always written with RANGE
  and never without it; without RANGE they are ignored and dropped, so every older link reads as before. A missing or
  invalid start reads as January of the last month's year; a start after the end is swapped.
- **Every view follows it:** `resolveWindow` has a RANGE case and `versionPlan` passes the start, so the statement,
  Vitals, Analysis and Profitability read the same months. Budget and Latest estimate cover the same months; prior
  year is the same months 12 months earlier (C-04), and where part of the range has none the Prior year notice says
  how much ("Prior year n/a before Jan 2024: it covers 6 of the range's 12 months"; the extra clause only for a
  range, Track B's text unchanged otherwise). The FY Budget / FY latest estimate columns and the constant-currency
  rates are the fiscal year of the range's last month. The statement's column title and the chat scope read
  "Oct 2025 – Sep 2026"; the applied-filters pop-up shows Fiscal year "2025 – 2026" and Time view "Custom range".
- **Data:** the browser already loads every chunk of the company (each version × each 12 months, i.e. every fiscal
  year), so a range across years has all its months; a test checks every version × month is in exactly one chunk.
- **Chat:** `time_view` accepts `RANGE` with `from_fy` / `from_month`, and a visitor looking at a range is answered
  over it (`chat-tools.ts` `queryOf`, `MetricQuery.startFy` / `startMonth`); the answer key and its tests are unchanged.

Tests: the report's 17 test files, 317 passed + 1 skipped (the Track B cross-check); typecheck and lint green. Checked in
headless Edge against the dev server with live `pnl_demo` data, 1440 × 900 and 1280 × 720: Profitability for both
companies (YTD, MTD, Oct 2025 – Sep 2026, Jul 2024 – Jun 2025 with its notice), the period picker on both range ends
and on "2025 – 2026", the statement, Vitals and Analysis on a range. The report has no dark theme of its own (the
Ledger tokens are light); in the site's dark scheme it renders the same.

## Where things are (10-22, kept)

| What | Path |
|---|---|
| Engine, loader, state (framework-free, every number) | `src/lib/pnl/` |
| UI (Ledger design, CSS Modules) | `src/components/pnl/`, entry `src/components/pnl-report-lazy.tsx` |
| Showcase entry | `src/lib/work.ts` → `unified-management-pnl`, platform `js` |
| Data (frozen; built 2026-10-28) | ~~`public/data/pnl/`~~ → since 11-09 `data/pnl/parquet/` (`manifest.json`, `pl-P.parquet`, `pl-S.parquet`, `ops.parquet`) for the tests and the loader; the site reads Supabase schema `pnl_demo` through `/api/pnl/*` (see the 11-09 section) |
| Test fixtures | `data/pnl/checks/` — `control_totals_usd.csv` (T-06), `allocation_parity.csv` (C-31 parity) |
| Tests | `src/lib/pnl/**/*.test.ts`, `src/components/pnl/statement-table.test.tsx` — 148 of the site's own tests run beside them |
| Spec (copied, read-only reference) | this folder: `requirements.md`, `adr-0002-…`, `adr-0007-…`, `design-requirements.md`, `kpi-card-v2.md`, `info-popovers.md`, `data-contract.md`, `design-mockup/`, the two hand-off notes |

## Decisions taken here (2026-10-22)

- **Copied in, not embedded from elsewhere.** The report is a client component on the showcase page, opened in the
  same popup as the Cube dashboard. No iframe, so ADR-0002 §2.6 (CSP `frame-ancestors`, `EMBED_ALLOWED_ORIGINS`)
  does not apply. One new dependency: `hyparquet` 1.31.5 (approved in ADR-0002 §2.9).
- **The data is frozen.** The 69 MB of source CSVs and `scripts/build-data.ts` stayed behind; the four built files
  are the source now. The one parity check that needed the 758k-row `fact_pl_allocated` was reduced to
  `allocation_parity.csv` (1,656 rows: Σ cents per entity × version × month × region × slice value, Jan–Sep 2026,
  ACT + BUD) before the copy was cut loose. The engine matches every row within 0.36 USD (the generator's cent
  rounding).
- **State lives in React**, encoded by the same query-string codec the standalone app used for its URL (F-37).
  "Copy link" gives the showcase page's URL plus the state, and opening such a link opens the report in that state.
  Only the report's own keys do that, so a campaign link (`?utm_…`) stays on the page.
- **ADR-0007 applies** (Variance only, By function only, Expand all / Collapse all, entity switch on the brand mark,
  (i) pop-ups). **Key figures follow `kpi-card-v2.md`** (owner's request, 2026-10-22 19:40), which supersedes the
  K-24 sparklines and K-25 target bars: diverging "vs Budget / vs Prior year" bars instead.
- **The engine builds each entity's accounts × months matrix once** per version, slice filter and translation, and
  caches it; every column, key figure and breakdown is a sum over months of a matrix already built. Slice filters
  and the C-31 allocation live in that one scan (`src/lib/pnl/engine/aggregate.ts`).
- **Group eliminations** are derived, not stored (data contract): Intercompany eliminations in block 1 = minus the
  intercompany revenue, in block 6 = the same amount back, the Intercompany difference (C-37) = whatever the two
  sides fail to match — zero in this data, so the row stays hidden.
- **Slice chips behave like a BI slicer**: from "Select all", a click selects just that value (owner-friendly reading
  of F-33; the last value can never be switched off).
- **The key-figures legend pills carry no arrows**: on a tile the arrow shows direction and the colour whether it
  helps (design guide §2), so "▲ favourable" would mislead on a rising cost.
- **Bug fixed from the copied skeleton**: the statement's row styles targeted `td` only, so every line label (a
  `<th>`) rendered bold; they now target the row's cells.

## Build order (ADR-0002 §2.8, with ADR-0007)

| Step | Content | Proof |
|---|---|---|
| 0 | Copy in, run inside the popup | ✅ Consumer Products YTD Sep 2026 NR 3,398.5 in the popup |
| A | ADR-0007 statement controls: no Layout / Cost lens / Detail, Expand all / Collapse all (default collapsed), entity switch on the brand mark | ✅ state tests; screenshots |
| 4 | Group view: entity nodes, Intercompany eliminations nodes (M-05), hide-empty (M-22) | ✅ T-01, T-02, T-16; Group YTD Sep 2026 NR 3,972.7 |
| 5 | Slice filters + allocation in the engine (C-31), slice flyout, F-30 memory, notices, Reset (F-35) | ✅ T-03 (9 entity × slice cases) + parity on 1,656 rows; T-14, T-15, F-33 |
| 6–7 | Key figures (kpi-card-v2) over `ops.parquet`; Analysis: bridge (C-40) + largest variances (C-45) | ✅ T-05 (9 cases), T-10, T-17; tiles equal the statement; volume + price / mix = organic growth |
| 8 | Profitability (C-46) + CM bars; (i) pop-ups on the four visuals (L-15) | ✅ NR rows sum to the total, shares to 100 % (6 cases) |
| 9 | Hardening: view tabs keyboard-operable (N-08), engine timing (T-18), showcase copy, live | ✅ Group statement 12 ms cold / 0.6 ms warm; slowest view call 20 ms (N-01 budget 2 s) |

Final state (2026-10-22): 296 tests (148 of the site's, 148 of the report's), typecheck, lint and build green; every
view driven in headless Edge at 1440 × 900.

Deferred, as in ADR-0002 §5 Q5: Excel / PDF export (N-10), drill-through (M-27), per-user memory (F-37), reference
pages (L-02), phone layout (N-09).
