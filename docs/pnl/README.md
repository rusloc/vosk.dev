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

## Where things are (10-22, kept)

| What | Path |
|---|---|
| Engine, loader, state (framework-free, every number) | `src/lib/pnl/` |
| UI (Ledger design, CSS Modules) | `src/components/pnl/`, entry `src/components/pnl-report-lazy.tsx` |
| Showcase entry | `src/lib/work.ts` → `unified-management-pnl`, platform `js` |
| Data (frozen; built 2026-10-22) | `public/data/pnl/` — `manifest.json`, `pl-P.parquet`, `pl-S.parquet`, `ops.parquet` |
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
