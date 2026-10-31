# Mirelo Sales & Revenue — the JS showcase

The custom-JavaScript flavour of the Mirelo sales dashboard (a fictional neobank and microlender, PL / RO / PT),
built and hosted in this repo as a showcase item: `/work/online-sales-report`. Brought in on 2026-10-31 from the
PNL repo's **`mirelo-sales/js-app/` pack** (`.sync`, 2026-10-28; its README is `pack-readme-2026-10-28.md` here, the
hand-over note `../report-packs-2026-10-31.md`) and **owned by this repo from then on**, the same way as the P&L
(`../pnl/README.md`, 2026-10-31 section). The Power BI flavour is the owner's; its publish-to-web URL goes into the
showcase entry's `powerBi` field when it exists, and the page then shows two buttons.

## Where things are

| What | Path |
|---|---|
| Engine (framework-free, every number and string): cube, metrics, KPIs, the five views, detail sample, copy, formats, URL codec | `src/lib/mirelo/` (the pack's `lib/sales/` flattened; `parquet-columns.ts` beside it) |
| UI (inline SVG charts, CSS Modules) | `src/components/mirelo/`, root `sales-app.tsx`; `glass.tsx` + `chart-scale.ts` vendored from the P&L app |
| Showcase entry | `src/lib/work.ts` → `online-sales-report`, platform `js`, report `mirelo` |
| Data (prebuilt in rusloc/pnl, 915 kB; the loan sample loads on first need) | `public/data/mirelo/` |
| Test fixtures | `data/mirelo/checks/control_totals_eur.csv` |
| Tests (92 + 4 skipped: the detail-sample block needs the raw `fact_loan.parquet`, not shipped) | `src/lib/mirelo/*.test.ts` |

## Decisions taken here (2026-10-31)

- **The 1440 × 810 board is scaled, not scrolled.** The app is px-exact at that size; `src/components/report-board.tsx`
  measures the popup and applies `transform: scale()` when it is narrower, so a laptop sees the whole board. The
  pack's `.page { min-height: 100vh }` went: the board host fills the popup instead.
- **State in React** (`src/components/report-search.ts`): the Selection ↔ URL contract of the pack (`?view=…&market=…
  &period=…&month=…&cmp=…&drill=…`) is kept as the report's state inside the popup; "Copy link" (`controls.tsx`)
  takes the share URL as a prop instead of reading `location.href`, so it hands out the showcase page's URL plus
  the state, and such a link opens the popup in that state.
- **Inter** comes from `src/components/inter-font.ts` (next/font) on the board host, read by `sales.module.css`
  through `--font-inter`; the pack's root layout and `globals.css` resets are not needed under Tailwind's preflight.
- **Content as shipped** (owner, 10-30): the L11 "Attainment by channel" placeholder, no mark-click cross-filtering,
  and the three open questions in the pack README (budget per revenue stream, leaderboard columns, the loan-state
  snapshot) stay as they are until the PNL side changes them and re-issues the pack.
