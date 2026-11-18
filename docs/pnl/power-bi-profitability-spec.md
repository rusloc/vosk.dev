# Profitability view: spec for the Power BI rebuild

Source of truth: the web (JS) P&L report on vosk.dev, `/work/pnl-suite` → Web report → Profitability tab, as of
2026-11-17. This file describes that view so it can be rebuilt as one page of the Power BI report (ACME Unified PnL).
Where Power BI cannot do exactly what the web view does, a "Power BI" note gives the closest match.

What changed from the earlier pack (10-28):

- **One page instead of two.** The old page 1 (region table + concentration bars) stays on top as it was. The old
  page 2 goes directly underneath it.
- **The "Growth × margin by region" bubble chart is gone.** It is replaced by a combo chart, "Revenue and margin by
  month": net revenue as columns, contribution margin % as a line.
- **The concentration legend is gone.** The concentration visual shows the bars only.

---

## 1. Basis and filters (applies to every visual on the page)

| Item | Rule |
| --- | --- |
| Company | One company at a time: **Consumer Products** (entity `P`) or **Commerce Cloud** (entity `S`). |
| Base version | Actual by default (Latest estimate and Budget are selectable). Actual never includes months after the last close (C-01). |
| Period | The report's period slicer (YTD, quarter, full year, last 12 months, custom month range). Every visual covers the same months. |
| Comparison | Compare A. If Compare A is "none", use Compare B. If both are "none", use Prior year. Options: Budget, Latest estimate, Prior year. Prior year = the same months a year earlier, Actual version (C-04). |
| Currency | **Constant currency always on this page:** every version, prior year included, translated at the selected fiscal year's budget rates (C-12). Reporting currency USD, EUR or GBP. |
| Units | Millions (1 decimal) or thousands (0 decimals), from the units slicer. |
| Breakdown | **By region only.** Opex and everything below contribution are booked at entity × region (C-31), so Adj. EBITDA by region is measured and never allocated. |
| Slice filters | Region, channel, category / service line and segment filters from the report's filter pane apply to all visuals. |

Number formats (N-06):

- Amounts: `$1,488.6 m` (currency symbol, thousands separator, units suffix ` m` or ` k`).
- Percentages: one decimal, `39.1%`.
- Margin differences: signed, in percentage points, `−0.6 pp`.
- Negatives use a true minus sign (U+2212) and never show `−0.0`. A missing value shows `n/a`.

P&L lines used (spine numbers from `requirements.md`):

| Code | Line | Formula |
| --- | --- | --- |
| NR | Net revenue (Consumer Products shows it as "Net sales") | gross revenue + gross-to-net deductions |
| GP | Gross profit | NR + cost of revenue; GM % = GP ÷ NR |
| CM | Contribution margin | GP + variable selling & cost-to-serve; CM % = CM ÷ NR |
| EBITDA | Adjusted EBITDA | CM + operating expenses |

---

## 2. Layout

The page is one canvas (16:9, e.g. 1280 × 720) laid out as two rows:

```
┌──────────────────────────────────────────────┬──────────────────────────┐
│ A. Profitability by Region (table)            │ B. Concentration - share │
│    ~64 % width                                │    by profit level       │
│                                               │    ~36 % width           │
├───────────────────────────────┬──────────────┴──────────────────────────┤
│ C. Revenue and margin by month │ D. Mix - region × category             │
│    (combo chart) 50 % width    │    (heatmap matrix) 50 % width         │
└───────────────────────────────┴─────────────────────────────────────────┘
   top row ≈ 44 % of the height, bottom row ≈ 56 %
```

- Every visual has a title and an ⓘ that opens its explanation (texts in §4–§7, "ⓘ text").
- Page subtitle under visual A's title: `Constant currency (FY2026 budget rates) - USD m - vs Budget`. This is built
  from the selection: the fiscal year, currency, units and comparison name.
- Company accent colours: Consumer Products `#2453A6` (tint `#E8EEF8`), Commerce Cloud `#6B48C8` (tint `#F0EBFB`).
- Region colours, used only in visual B, are assigned in the table's row order: 1st `#6B48C8`, 2nd `#2453A6`, 3rd
  `#3BA37B`, 4th `#E2804A`.

---

## 3. "How to read" text for the page

- **Top:** table by region at constant currency (status dot on CM Δ only) and concentration bars (share of revenue,
  contribution and Adj. EBITDA; hover a segment for its region).
- **Below:** revenue and margin by month: net revenue as bars (left axis), contribution margin % as the line (right
  axis), quarters past 12 months. Next to it, the mix of region × category (service line for Commerce Cloud).
- **Basis:** constant currency by default when comparing. By region nothing is allocated (opex is booked by region,
  C-31).

---

## 4. Visual A: "Profitability by Region" (table)

One row per region, **sorted by net revenue, descending**, then a bold **Total** row.

| # | Column header | Value | Format |
| --- | --- | --- | --- |
| 1 | Region | region name | text |
| 2 | Net revenue | NR (CC) | amount |
| 3 | Δ vs {comparison} % | NR ÷ comparison NR − 1 | signed %, plain text, **no colour** |
| 4 | GM % | GP ÷ NR | % |
| 5 | CM % | CM ÷ NR | % |
| 6 | CM Δ pp | CM % − comparison CM % | signed pp, with a **status dot** in front |
| 7 | Contribution | CM (CC) | amount |
| 8 | Adj. EBITDA | EBITDA (CC) | amount |

The header of column 3 names the comparison: "Δ vs Budget %", "Δ vs Latest estimate %" or "Δ vs Prior year %".

**Status dot, on CM Δ only:** no other cell in the table is coloured. "Higher is better" applies.

| Status | Rule (d = CM Δ as a fraction) | Dot colour |
| --- | --- | --- |
| on track | abs(d) ≤ 0.003 (±0.3 pp) | grey `#8592A3` |
| ahead | d > +0.003 | green `#3BA37B` |
| watch | −0.010 ≤ d < −0.003 | amber `#D9A441` |
| off track | d < −0.010 | red `#C2410C` |

**Power BI:** a table visual. Use conditional formatting → Icons on the CM Δ pp column, with rules on a measure
that returns the status (1–4), and a coloured circle icon. Sort by Net revenue descending.

**ⓘ text:** "Constant currency, rows by net revenue. Δ vs {comparison} % on net revenue; GM % and CM % of the region's
revenue; CM Δ = contribution margin % minus {comparison} in pp, the only column with a status dot. Adj. EBITDA is
booked by region (C-31): nothing here is allocated." Formula: GM % = GP ÷ NR; CM % = contribution ÷ NR; CM Δ = CM % −
comparison CM %. Status dot: on track ±0.3 pp, watch to 1.0 pp, off track beyond, ahead = green.

Measures the earlier pack used for this visual (check the names in the model): `Prof Net Revenue`, `Prof NR Δ % (CC)`,
`Gross Profit`, `Contribution Margin`, `KPI CM %`, `Adjusted EBITDA`. **New:** a CM Δ pp measure and its status
measure.

---

## 5. Visual B: "Concentration - share by profit level"

Three horizontal 100 % bars, one per profit level, top to bottom: **Net revenue**, **Contribution**, **Adj. EBITDA**.
Each bar is split into one segment per region:

- **Segment share** = region value ÷ company value of that level.
- **Segment order** follows the table's row order (NR descending), with the region colours from §2.
- **Labels:** the share sits inside the segment (`44.2%`, one decimal, white, bold) where the segment is wide
  enough; narrow segments have no label.
- **Hover:** "{level}: {region} {share}".
- **No legend** (owner, 2026-11-15). The ⓘ lists the regions.

**Reading:** a region whose share shrinks from revenue to contribution dilutes the margin; one whose share grows
adds to it.

**Power BI:** a 100 % stacked bar chart. Y axis = a disconnected 3-row "Profit level" table (sort order 1–3). Legend =
Region. Value = one SWITCH measure that returns NR, CM or EBITDA for the level. Data labels: "Percent of total". Turn
the legend off.

**ⓘ text:** "Three 100 % bars: each region's share of net revenue, of contribution and of Adj. EBITDA (booked by region),
regions in the table's order; hover a segment for its region. A region whose share shrinks from revenue to contribution
dilutes the margin; one whose share grows is accretive." Formula: share = region value ÷ company value, per level;
drift = EBITDA share − NR share (pp). ⓘ values per region: "NR share / CM share / EBITDA share (drift ±x.x pp)".

Measure the earlier pack used: `Prof NR Share` (the same pattern on Contribution Margin and Adjusted EBITDA).

---

## 6. Visual C: "Revenue and margin by month" (combo chart, new)

This replaces the bubble chart. **One chart for the company total** under the page's filters (not split by region).

| Element | Spec |
| --- | --- |
| X axis | One period per month of the selected period, labelled `Jan`, `Feb`, …, with the year (`2026`) under the first month and wherever the year changes. |
| Columns (left Y axis) | Net revenue (CC) of the period, in the selected units. The axis starts at 0 and its title is "Net revenue, $ m (left)". Fill = the company accent at about 32 % (a light tint). |
| Line (right Y axis) | Contribution margin % = CM ÷ NR **of the period** (ratio of the sums, not an average of months). Dark line `#101B2B`, 2 px, white markers with a dark outline. Axis title "Contribution margin % (right)". |
| Right axis range | Fitted to the line, so it does **not** start at 0. It shares the left axis's gridlines. |
| Data labels | CM % above each marker (`39.4%`) while there is room. In a crowded chart, label the last point only. No labels on the columns. |
| Tooltip | `{Month Year}: net revenue $X m, contribution $Y m, CM Z%` |
| Legend | Top left: "Net revenue, $ m (left)" and "Contribution margin % (right)". |
| Longer periods | **More than 12 months → one period per fiscal quarter** (`Q1`, `Q2`…, year under the first quarter of each year). The title becomes "Revenue and margin by quarter". A partial quarter says so in its tooltip ("2 of 3 months"). |
| One month (e.g. MTD) | A single column and a single marker with its label. |

Months follow C-01: with Actual as the base, months after the last close are not shown.

**Power BI:** "Line and clustered column chart". X axis = the date table's month (Month-Year, sorted by month index).
Column y-axis = the NR (CC) measure. Line y-axis = the CM % measure. Secondary axis on, with "Start" left at Auto (not
0). Data labels on the line series only. For the quarter rule, use one of these:

- a field parameter (Month / Quarter) that defaults to Month and switches to Quarter when the selection exceeds
  12 months, if the model can drive it; or
- an X-axis hierarchy Year → Quarter → Month that opens at Month, with the >12-month rule stated in the ⓘ.

**ⓘ text:** "Bars: net revenue of each period, left axis. Line: contribution margin %, the share of revenue left after
the cost of sales and the variable costs, right axis. A line that climbs while the bars stay level means each sale earns
more. Company total under the report's filters, constant currency; hover a period for its figures. A period longer than
12 months shows quarters." Formula: CM % = contribution ÷ net revenue of the period. ⓘ values: the whole period first
("net revenue $X m, CM Z%"), then one row per period.

---

## 7. Visual D: "Mix - region × category" (heatmap)

The title reads "Mix - region × service line" for Commerce Cloud and "Mix - region × category" for Consumer Products.

| Part | Spec |
| --- | --- |
| Rows | Regions in the table's order (NR descending), then a **Total** row. |
| Columns | The company's categories / service lines in their sort order (no "unassigned"), then a **Total** column. |
| Column header | Line name, and under it "GM 51.6%" (GP ÷ NR of that line, whole company). |
| Cell, line 1 | NR (CC) of region × line, bold (`$418.3 m`). |
| Cell, line 2 | Share of the region's NR, no decimals (`28%`). |
| Cell colour | The cell's NR against the largest cell on the page: a ramp from the company tint (small) to the company accent (large). Text turns white on the darker half. Totals have no colour. |
| Tooltip | "{Region} × {line}: NR $X m, Y% of the region, GM Z%" |
| Check | Row and column totals reconcile to visual A's Net revenue column and Total. |

**Power BI:** a matrix. Rows = Region, columns = Category / Service line, values = NR (CC) and "share of region" (NR ÷
NR with the line filter removed). Use background-colour conditional formatting on NR with a gradient from the tint to
the accent, and font colour by rule. A matrix column header cannot show a measure, so put the line's GM % in an extra
bottom row labelled "GM %" or in the header tooltip.

**ⓘ text:** "Cells: net revenue at constant currency and its share of the region; colour = the cell's net revenue (dark =
large). Column headers carry the line's gross margin %. Row and column totals reconcile to the table." Formula: cell =
NR(region, line); share = cell ÷ region NR; colour = cell ÷ largest cell; header GM = GP ÷ NR of the line.

---

## 8. Acceptance figures (from the web report, live data, 2026-11-17)

These should match if the Power BI model loads the same data.

**Consumer Products, Actual YTD Sep 2026 vs Budget, constant currency (FY2026 budget rates), USD m:**

| Region | Net revenue | Δ vs Budget % | GM % | CM % | CM Δ pp | Contribution | Adj. EBITDA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| North America | $1,488.6 m | −2.7% | 49.4% | 39.2% | −0.5 pp (watch) | $583.1 m | $299.4 m |
| Continental Europe | $944.1 m | −2.8% | 49.4% | 39.1% | −0.6 pp (watch) | $369.4 m | $189.4 m |
| Asia-Pacific | $518.3 m | −2.9% | 49.4% | 39.1% | −0.6 pp (watch) | $202.7 m | $104.0 m |
| UK & Ireland | $418.1 m | −2.7% | 49.4% | 39.1% | −0.6 pp (watch) | $163.6 m | $83.9 m |
| **Total** | **$3,369.0 m** | **−2.8%** | **49.4%** | **39.1%** | **−0.6 pp (watch)** | **$1,318.8 m** | **$676.7 m** |

- **Concentration** (NA / CE / AP / UK):
  - Net revenue: 44.2 / 28.0 / 15.4 / 12.4 %
  - Contribution: 44.2 / 28.0 / 15.4 / 12.4 %
  - Adj. EBITDA: 44.3 / 28.0 / 15.4 / 12.4 %
- **Combo, CM % Jan → Sep 2026:** 39.4, 39.4, 39.3, 39.3, 39.3, 39.4, 39.1, 38.7, 38.6 %.
- **Mix:**
  - Column totals: Home care $946.3 m (GM 51.6%), Personal care & beauty $907.5 m (GM 59.6%), Kitchen & household
    $681.6 m (GM 47.5%), Electronics accessories $501.3 m (GM 34.7%), Toys & leisure $332.3 m (GM 41.5%).
  - Grand total $3,369.0 m.
  - Top-left cell (North America × Home care): $418.3 m, 28%.

**Consumer Products, custom range Jan 2024 – Dec 2025 vs Budget, CC:**

- Total: net revenue $8,692.6 m, Δ −0.8%, GM 48.9%, CM 39.3%, CM Δ −0.1 pp (on track), contribution $3,413.6 m,
  Adj. EBITDA $1,718.3 m.
- Combo by quarter (24 months > 12), CM % Q1 2024 → Q4 2025: 40.0, 40.0, 39.6, 38.5, 39.8, 39.7, 39.2, 38.1 %.

---

## 9. Out of scope / open

- **Group view** (both companies consolidated) was not checked for this spec. C-46 says each region in the Group view
  includes its own eliminations.
- **The web report's AI chat** has no Power BI counterpart here.
