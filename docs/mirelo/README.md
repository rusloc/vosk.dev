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

## 2026-11-01: the owner's review of the live report (diverges from the pack)

Ten changes, built here and handed to the PNL side as `C:\__PBI\PNL\.sync\2026-11-01-mirelo-sales-changes.md`
(+ `.patch`, the diff for reference) so it can align the pack and the Power BI report. In short:

- **Header:** the Market / Period / Month / Comparator controls are gone; one **Filters** button opens a glass pop-up
  (Period: Week disabled, the data is monthly · Month · Quarter to date · Year to date, "Up to" month; Comparison;
  Region), the applied filters read as one line beside it. R12M left the UI; `period=r12m` links still parse.
- **Cards:** ⓘ top-left beside the title on hero and KPI cards; KPI cards show "vs Budget" and "vs PY" both (no hover
  swap); the hero cards show a visible **Details →** (the whole card still opens the view).
- **Charts:** the story callout is plain text (no yellow box, in the chart's aria-label); o6's prior year is a filled
  yellow bar under the actual one.
- **Pop-ups:** matte frosted glass, 28 px blur, 1 px `#1a1a1a` border, shadow; **this glass copy is Mirelo's own now**
  (the P&L keeps its own). The detail view is a centred window over a 20 % dark-grey mask, not a right-half slide-over.
- **Board:** `ReportBoard fill` scales to fit the popup both ways (≤ 1.25×) and grows taller than 810 px; the extra
  height goes to the chart rows and band tables (`sales-app.tsx`). Nordmark keeps the old behaviour.
