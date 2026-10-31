# Nordmark Retail executive dashboard — the JS showcase

The custom-JavaScript flavour of the Nordmark Retail executive dashboard (a fictional multi-category reseller, NL +
BE stores, online, wholesale; ADR-0013 in rusloc/pnl), built and hosted in this repo as a showcase item:
`/work/executive-dashboard`. Brought in on 2026-10-31 from the PNL repo's **`nordmark-exec/js-app/` pack** (`.sync`,
2026-10-30; its README is `pack-readme-2026-10-30.md` here, the hand-over note `../report-packs-2026-10-31.md`) and
**owned by this repo from then on**, the same way as the P&L (`../pnl/README.md`, 2026-10-31 section). The Power BI
flavour is the owner's; its publish-to-web URL goes into the showcase entry's `powerBi` field when it exists, and
the page then shows two buttons.

## Where things are

| What | Path |
|---|---|
| Engine (framework-free, every number and string): cube, calendar, period items, metrics, status bands, copy, view model, URL codec | `src/lib/nordmark/engine/` |
| Data contract (strict Zod manifest), loader, Parquet columns | `src/lib/nordmark/data/` |
| UI: client root, cards, layers (Filters menu, How to read, bench, ⓘ and drill pop-ups), bars | `src/components/nordmark/`, root `exec-app.tsx` |
| Stylesheet (the prototype v5 sheet the pack ships as global CSS), **scoped under `.nordmark`** | `src/components/nordmark/exec.css` |
| Showcase entry | `src/lib/work.ts` → `executive-dashboard`, platform `js`, report `nordmark` |
| Data (prebuilt in rusloc/pnl, 452 kB, all on first paint) | `public/data/nordmark/` |
| Test fixtures | `data/nordmark/checks/control_totals_eur.csv` (26,143 rows), `control_totals_category_eur.csv` (10,514) |
| Tests (458) | `src/lib/nordmark/**/*.test.ts`, `src/components/nordmark/*.test.ts(x)` |

## Decisions taken here (2026-10-31)

- **The global stylesheet is scoped, not converted.** The pack's `app/globals.css` uses plain class names on purpose
  (one page, one sheet, diffable against the design prototype). Rewriting it as a CSS Module would touch every
  `className` in the components, so every selector was prefixed with `.nordmark ` instead (`:root`, `html`, `body`
  became the root itself; `@keyframes` untouched), and the file is imported from the client root as global CSS.
  The two tests that read the sheet look rules up with the prefix.
- **The 1440 × 810 board is scaled** (`src/components/report-board.tsx`), which also makes it the containing block
  of every `position: fixed` element in the sheet (the side bar, scrim, menu, pop-ups, drawer, tooltip): they stay
  inside the popup. `100vh` / `100vw` in the sheet became `100%` for the same reason, and the tooltip's position
  (`exec-app.tsx`) is computed in board coordinates: viewport rect minus the root's rect, divided by the board
  scale (`useBoardScale`), with the board height as the bottom edge.
- **State in React** (`src/components/report-search.ts`): the pack's URL contract (`?i=…&c=…&r=…&cat=…&group=…
  &lever=…&owner=…`, retired `p`) is kept as the report's state inside the popup; a showcase-page URL carrying one
  of those keys opens the popup in that state.
- **Escape inside a layer closes the layer only.** The app's own handler closes it and returns focus to the opener
  before the popup's handler runs, so the popup now reads the key event's target, not `activeElement`
  (`report-dialog.tsx`). The layer's `body { overflow: hidden }` lock was dropped: the popup already holds it.
- **Inter** comes from `src/components/inter-font.ts` on the report root, read by the sheet through `--font-inter`.
- **Open items from the pack** (not blockers): Δ colour under Last year / Previous keeps the status colour; scoped
  EBITDA (a region pick) is a contribution before central costs with no copy note; the ⓘ copy export and the
  parity rows are pending on the PNL side.
