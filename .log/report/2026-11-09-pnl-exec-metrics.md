# The P&L report: what finance executives look at, and what the chat can now answer (2026-11-09)

Asked 2026-11-08 23:4x: "generate a list of metrics and dimensions that are most crucial and viewed by finance
executives, then build the AI button and verified answers" for `/work/pnl-suite`, and move its data into Supabase.
This is the list, ranked the way a CFO, an FP&A lead and a board reader actually read a monthly management P&L; the
catalogue in `src/lib/pnl/chat-metrics.ts` implements every row marked ✓, and `data/pnl/checks/chat-golden.csv` +
`src/lib/pnl/chat-metrics.test.ts` prove them. §4 lists what was left out and why.

## 1. The dimensions every question is asked in

| Dimension | Values in this report | Why it matters to an executive |
|---|---|---|
| **Company** | P Consumer Products, S Commerce Cloud, Group (consolidated, intercompany removed) | the two businesses have different margin structures; the Group is what the board sees |
| **Period** | MTD, QTD, YTD, LTM, FY, anchored on a fiscal year (2024–2026) and month; closed through Sep 2026 | "this month", "the quarter", "year to date", "run-rate" are different questions |
| **Base version** | Actual, Latest estimate (actuals + the 9+3 forecast), Budget | the LE is the number management is held to from October on |
| **Comparator** | Budget, Latest estimate, Prior year | "vs budget" is the control question; "vs last year" the growth question |
| **Currency and FX basis** | USD / EUR / GBP; actual rates or constant currency (the year's budget rates) | FX can hide or fake a miss; constant currency isolates the operating story |
| **Slices** | region (NA, EU, UK, AP); channel / sales motion; product category / service line; price segment / customer tier | "which region", "which channel" is the first follow-up to any variance |

## 2. The metrics, in the order executives read them

### Tier 1: the headline (asked every month, by everyone)

| ✓ | Metric | Calculation | Ids |
|---|---|---|---|
| ✓ | Net revenue, vs Budget, vs PY, growth % | GR + GTN; Δ and Δ % vs each comparator | `NR`, `NR_GROWTH` |
| ✓ | Organic growth (constant currency) | NR cc ÷ PY NR cc − 1 | `NR_GROWTH_ORGANIC` |
| ✓ | Gross profit and gross margin % | NR + COR; GP ÷ NR | `GP`, `GM_PCT` |
| ✓ | Adjusted EBITDA and margin % | CM + OPEX; EBITDA ÷ NR | `EBITDA`, `EBITDA_PCT`, `EBITDA_GROWTH` |
| ✓ | Operating profit and margin % | UOP + ADJ; OP ÷ NR | `OP`, `OP_PCT` |
| ✓ | Net profit and net margin % | PBT + TAX; NP ÷ NR | `NP`, `NP_PCT` |
| ✓ | Status vs Budget (on track / watch / off track / ahead) | the Vitals thresholds: ±1 % / ±3 % on amounts, ±0.3 pp / ±1 pp on ratios | every `get_metric` answer with a Budget |
| ✓ | **FY outlook**: latest estimate vs Budget, attainment | FY LE (closed actuals + forecast) and FY Budget, LE ÷ Budget | `FY_NR_LE`, `FY_NR_BUDGET`, `FY_NR_ATTAINMENT`, `FY_EBITDA_LE`, `FY_EBITDA_BUDGET`, `FY_EBITDA_ATTAINMENT` |

### Tier 2: the explanation (the FP&A conversation)

| ✓ | Metric | Calculation | Ids |
|---|---|---|---|
| ✓ | Every statement line vs Budget / LE / PY | the 23 lines of the spine, signed (costs negative; a positive Δ is favourable on every line) | `GR`, `GTN`, `COR`, `VSC`, `CM`, `SM`, `RD`, `GA`, `OOI`, `OPEX`, `DA`, `UOP`, `ADJ`, `INV`, `PBFIT`, `FIN`, `PBT`, `TAX` (+ the Tier 1 lines) |
| ✓ | Contribution margin % | CM ÷ NR | `CM_PCT` |
| ✓ | Opex % of revenue | − (SM + RD + GA) ÷ NR, as the Vitals card | `OPEX_PCT` |
| ✓ | Cost ratios | − line ÷ NR for COR, VSC, SM, R&D, G&A | `COR_PCT`, `VSC_PCT`, `SM_PCT`, `RD_PCT`, `GA_PCT` (derived) |
| ✓ | Gross-to-net % | − GTN ÷ GR | `GTN_PCT` |
| ✓ | Effective tax rate | − TAX ÷ PBT | `ETR_PCT` |
| ✓ | **Largest variances**, line by line, with FX share and allocation flag | the Analysis view's ranking, vs Budget / LE / PY, within one region / channel / line / segment | tool `top_variances` |
| ✓ | FX effect | at actual rates − at constant currency, for NR, EBITDA, OP | `FX_EFFECT_NR`, `FX_EFFECT_EBITDA`, `FX_EFFECT_OP` (derived) |
| ✓ | Mix: share of NR / CM / EBITDA by region, channel, line or segment | slice ÷ company total | `NR_SHARE`, `CM_SHARE`, `EBITDA_SHARE` (derived); any metric `by` a dimension |

### Tier 3: the operating drivers (the business behind the numbers)

| ✓ | Company | Metric | Calculation | Ids |
|---|---|---|---|---|
| ✓ | P | Units sold, net revenue per unit | Σ units; NR ÷ units | `UNITS`, `NR_PER_UNIT` |
| ✓ | P | A&P % of NR, A&P spend | − (working media + consumer promotions) ÷ NR | `AP_PCT`, `AP_SPEND` (derived) |
| ✓ | S | GMV processed, take rate | Σ GMV; Payments NR ÷ Payments GMV | `GMV`, `TAKE_RATE` |
| ✓ | S | Active merchants (month-end), GMV per merchant | stock at the window's end; GMV ÷ merchants | `ACTIVE_MERCHANTS`, `GMV_PER_MERCHANT` (derived) |
| ✓ | S | ARR run-rate | subscription NR of the last month × 12 | `ARR` |
| ✓ | S | Revenue mix | subscriptions / payments ÷ NR | `SUB_SHARE`, `PAY_SHARE` |

**Count: 61 metrics** (23 statement lines, 6 ratio rows, 8 cost ratios, 3 growth, 10 drivers, 6 outlook, 3 FX, 3
shares; 13 marked derived), plus the `statement`, `report_snapshot`, `top_variances` and `explain_metric` tools.

## 3. The verified answers

- **Level 1, free, in `pnpm test`** (`src/lib/pnl/chat-metrics.test.ts`): the generator's 552 control totals (P / S /
  Group × Actual / Budget / LE × FY2024, FY2025, FY2026 YTD Sep, FY2026 × 23 lines, USD at actual rates) read through
  the catalogue, every row within $0.01; and **56 golden rows** (`data/pnl/checks/chat-golden.csv`) for what the control
  totals do not carry: EUR and GBP, constant currency, MTD / QTD / LTM windows, slices by region, channel, line and
  segment (including the allocation of lines below contribution margin by net-revenue share), the Budget and prior-year
  columns, the latest estimate, the Group's consolidation, the drivers, the FY outlook, shares, and five traps that must
  read n/a (prior year before the history, a Commerce Cloud driver asked of Consumer Products, a share with no slice).
- **How the golden rows are computed independently:** `scripts/pnl-golden.ts` reads the Parquet with plain loops written
  from the data contract and the spec (translation per month × currency, the window rules, the LE and prior-year column
  rules, consolidation, allocation), not from the engine. Python has no data libraries on this machine and `pnl_demo`
  had no rows yet (the owner loads it), so the check runs over the Parquet; once the data is in Supabase the same
  questions can be re-run as SQL over `pnl_demo`, whose lookup tables (`dict_code`, `dim_month`, `dim_account`,
  `dim_region`, `fact_fx_rate`) exist for that.
- **Level 2, the model** (`scripts/chat-eval.ts pnl`, real LLM, ≈ $0.02 a run): every golden question through the chat
  loop; passes when the answer quotes the expected figure as the report formats it. Result: see
  `.log/report/2026-11-08-chat-eval-pnl.md`.

## 4. Left out, and why

- **Bridges (volume / price / mix / cost / FX from Budget to actual):** the Analysis view draws them; a chat answer
  would be a list of six steps. `top_variances` plus the FX effect cover the executive question ("what drove it").
  A `bridge` tool is a one-day addition if asked.
- **Profitability by region and category (the table and the heatmap):** `get_metric … by region` with `NR`, `CM_PCT`,
  `EBITDA` answers the same questions line by line; the view's page itself stays the place for the picture.
- **Group drivers and Group slices:** the Group is consolidated at statement-line level only (the engine's Group view is
  not built in Track C); drivers and cuts are per company, and the chat says so.
- **Headcount, cash, capex, working capital, covenant ratios:** not in this P&L's data.
- **Multi-member filters** (two regions at once): the report can show them, the chat answers one member or the whole
  company and says which.

## 5. Where it runs

The P&L's rows moved to Supabase schema `pnl_demo` (roles `pnl_loader`, `pnl_reader`, created 2026-11-09; the
loader `scripts/pnl-load.ts` and the owner's steps in `docs/pnl/README.md`). The site reads them through
`/api/pnl/<chunk>` as JSON columns (nine chunks per company, under the function response cap); the chat route
`/api/chat/pnl` builds the engine from the same chunks, both companies, once per instance.
