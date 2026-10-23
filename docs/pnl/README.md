# Unified management P&L — the JS showcase

The custom-JavaScript flavour ("Track C") of the ACME Unified P&L, built and hosted in this repo as a showcase
item. Copied on 2026-10-22 from `rusloc/pnl` → `js-report/` (build slices 0–3: data, engine core reconciled to the
552 control totals, Ledger shell, statement) and **owned by this repo from then on**: nothing here reads, builds
from or reports back to the PNL repo (owner's call, 2026-10-22).

## Where things are

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
