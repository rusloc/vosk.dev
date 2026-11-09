# AI chat: verifiable metrics for Mirelo, ACME Marketing and the P&L (plan, 2026-11-07)

Asked 2026-11-07 18:29: (1) a long list of metrics, with the calculation of each, that the report AI answers
correctly for `/work/online-sales-report` (Mirelo) and `/work/marketing-acquisition-dashboard` (ACME Marketing), plus
a **verifiable answers list** and the under-the-hood ability to return each metric; (2) the same Ask AI, backend and
verifiable metrics for `/work/pnl-suite`. Nothing is built yet; the open questions are in §6.

## 1. Where things stand

- **Both live chats quote cards, nothing else.** Four tools per report (`report_snapshot`, `metric_trend`,
  `compare_markets` / `campaign_detail`, `explain_metric`) return the formatted strings of the engine's cards
  (`src/lib/mirelo/chat-tools.ts`, `src/lib/marketing/chat-tools.ts`). A question whose figure sits on no card ("revenue
  per loan in Romania", "CPM of the Meta campaigns", "approval rate of the Instagram channel in Q2") has no tool.
  The model then says "not in the report", or tries to answer from a table row that happens to fit.
- **No answer key exists for the chat.** `chat-tools.test.ts` checks the tools' shape and a few strings. Nothing checks
  that a question gets the right number.
- **Each report already has an independent answer source:** the generator's own control totals, re-checked by its
  `verify.py`. The engines are tested against them.
  - `data/mirelo/checks/control_totals_eur.csv`: 2,396 rows, 16 metrics × 4 markets × 36 months + FY24, FY25, FY26 YTD Sep.
  - `data/marketing/checks/control_totals_usd.csv`: 28,660 rows, about 200 metric codes × scopes (ALL, channel,
    campaign, platform) × periods (rolling 30 d, days, cohort months).
  - `data/pnl/checks/control_totals_usd.csv`: 552 rows, 23 statement lines × P / S / GROUP × ACT / BUD / LE × FY24,
    FY25, FY26, FY26 YTD Sep.
- **The P&L has no server side.** Its data is static Parquet in `public/data/pnl/` (1.6 MB), read in the browser by
  `hyparquet`. The engine (`src/lib/pnl/engine`) is framework-free, so it runs on the server unchanged.

## 2. The design (all three reports)

**Rule kept from ADR-0005: the model never computes.** Every figure comes from the engine, formatted the way the report
formats it. The new parts:

1. **A metric registry per report** (`src/lib/<report>/chat-metrics.ts`): for each metric an id, a name, aliases
   (EN + RU: "take-up", "conversion to loan", "выдачи"), the unit, the formula in words, the dimensions it can be cut
   by, whether a Budget / PY / plan exists, and `compute(selection) → number | null`, formatted by the report's own
   formatter. Most `compute`s call functions the cards already use (`metrics.ts`, `cube.ts`, `view-context.ts`); the
   rest are ratios of existing sums.
2. **One new tool, `get_metric`**, on top of the four: `{ metrics: up to 4 ids, period, market / filters, by?, cmp? }` →
   per metric: value, comparator value, Δ abs and %, status when the report has one, the formula line, and with `by`
   one row per member (market, product, channel, stream, campaign, region...). One call answers "approval rate and
   take-up in PL vs RO in Q3" instead of three snapshots, so answers get cheaper too.
3. **The catalogue goes in the cached system prompt** (id, name, aliases, one line each, ~60 metrics ≈ 1.5k tokens,
   cached at $0.01 / M). The model maps the question to ids; Zod rejects an unknown id, so a guessed metric fails loudly
   instead of returning a wrong figure.
4. **The answer key** (`data/<report>/checks/chat-golden.csv`): one row per question, with columns `id, question_en,
   question_ru, metric, args (JSON), expected_raw, expected_text, tolerance, source`. `source` is either a control-totals
   row (`CT:PL|2026-09|approval_rate`) or a golden SQL file (`SQL:golden/017-take-up-by-product.sql`). The SQL runs
   against `<report>_demo` once (MCP `execute_sql`, synthetic data); its result is frozen in the CSV and the SQL is kept
   so anyone can re-run it. **The SQL is written from the formula, not from the engine code**, so it checks the engine
   instead of copying it. Target: 80–120 rows per report, every metric at least twice (two markets or periods), plus
   10 "trap" rows: a month outside the data, a metric with no Budget, a figure that is not in the report. For those the
   expected answer is a refusal or "no Budget for this ratio".
5. **Two levels of proof:**
   - **Tool level** (Vitest, free, runs in `pnpm test`): every golden row → `get_metric` called directly → raw value
     within tolerance and the formatted text equal. Proves the numbers.
   - **Chat level** (`scripts/chat-eval.ts <report>`, real LLM, run by hand, ≈ $0.02–0.05 per report per run): every
     question goes through `runChat`; it passes when the expected text appears in the answer and the right metric id
     was called. Output: a pass-rate table in `.log/report/`. Proves the model picks the right metric and quotes it.
     Gate before each push that touches a catalogue: tool level 100 %, chat level ≥ 95 %, traps 100 %.
6. **The list visitors see** (if wanted, §6 Q1): suggestion chips drawn from the answer key, and an "every figure is
   checked against the source data" note with the count of verified questions.

## 3. Mirelo (lender): the metric catalogue

EUR at actual rates (constant currency where the report has it). Period: month, quarter, year, custom range of closed
months (2024-01 to the last close). Markets ALL / PL / RO / PT. Comparators: Budget (BUD), prior year (PY).
**Key:** CT = control totals row exists; SQL = golden SQL over `mirelo_demo`; ✚ = not on any card today (computed
from the same tables, linked to the nearest view).

| # | id | Metric | Calculation | Cuts | Cmp | Key |
|---|---|---|---|---|---|---|
| **Volume** |||||||
| 1 | `loans` | Loans disbursed | count of loans with disbursed date in the window (Σ `loans_month.loans`) | market, product, channel, new/repeat | BUD, PY | CT |
| 2 | `principal` | Principal disbursed | Σ principal_local ÷ month's actual rate | market, product, channel | BUD, PY | CT |
| 3 | `avg_ticket` | Average ticket | principal ÷ loans | market, product, channel | PY | SQL |
| 4 | `new_clients` | New clients | Σ first loans in the window | market, channel, product | BUD, PY | CT |
| 5 | `repeat_loans` ✚ | Repeat loans | loans with `repeat = true` | market, product, channel | PY | SQL |
| 6 | `repeat_share` | Repeat share of loans | repeat loans ÷ loans | market, product, channel | PY | CT (`returning_pct_loans`) |
| 7 | `borrowers` | Borrowers | distinct clients with a loan in the window | market | PY | CT |
| 8 | `returning_clients` | Returning clients | distinct borrowers with an earlier loan | market | PY | CT |
| 9 | `returning_share` | Returning share of clients | returning ÷ borrowers (no Budget) | market | PY | CT |
| 10 | `channel_mix` | Channel share of loans | loans by channel ÷ loans | market | PY | SQL |
| 11 | `product_mix` ✚ | Product share of loans | loans by product ÷ loans | market | PY | SQL |
| 12 | `principal_cc` ✚ | Principal at constant currency | Σ principal_local ÷ Budget rate | market | BUD | SQL |
| **Funnel** |||||||
| 13 | `leads` | Leads | Σ `funnel_month.leads` | market, product, channel, new/repeat | PY | SQL |
| 14 | `applications_started` | Started | Σ started | same | PY | SQL |
| 15 | `applications` | Submitted applications | Σ submitted | same | PY | SQL |
| 16 | `kyc_passed` ✚ | KYC passed | Σ kyc_passed | same | PY | SQL |
| 17 | `approved` | Approved | Σ approved | same | PY | SQL |
| 18 | `approval_rate` | Approval rate | approved ÷ submitted (no Budget) | same | PY | SQL |
| 19 | `approval_rate_new` | Approval rate, new applicants | approved ÷ submitted, repeat = false | market, channel, product | PY | SQL |
| 20 | `approval_rate_returning` | Approval rate, returning | approved ÷ submitted, repeat = true | market, product | PY | SQL |
| 21 | `kyc_pass_rate` ✚ | KYC pass rate | kyc_passed ÷ submitted | market, channel | PY | SQL |
| 22 | `take_up` | Take-up | disbursed ÷ approved | market, product, channel | PY | SQL |
| 23 | `lead_to_loan` | Lead → loan | disbursed ÷ leads | market, channel, new/repeat | PY | SQL |
| 24 | `start_rate` ✚ | Lead → started | started ÷ leads | market, channel | PY | SQL |
| **Speed** |||||||
| 25 | `hours_to_cash` | Time to cash | median hours, submission → cash, over the window's loans | market | PY | SQL (`loan.hours_to_cash`) |
| 26 | `hours_to_approve` | Time to approve | median hours, submitted → approved | market | PY | SQL (`window_stats`) |
| 27 | `hours_payout` | Payout time | median hours, approved → cash | market | PY | SQL |
| 28 | `days_between_loans` | Days between loans | median days between a repeat loan and the previous one | market | PY | SQL |
| 29 | `sla_breach_share` ✚ | Loans over SLA | loans with hours_to_cash > SLA ÷ loans | market | PY | SQL |
| **Portfolio** (month-end of the window's last month) |||||||
| 30 | `outstanding` | Outstanding balance | Σ outstanding at month-end, at that month's rate | market, product | PY | CT |
| 31 | `active_loans` | Active loans | Σ loans_active | market, product | PY | SQL |
| 32 | `dpd30_balance` | 30+ DPD balance | 30–59 + 60–89 + 90+ balances | market, product | PY | CT |
| 33 | `dpd30` | 30+ DPD % (balance) | 30+ balance ÷ outstanding | market, product | BUD (market only), PY | CT |
| 34 | `dpd90` | 90+ DPD % (balance) | 90+ balance ÷ outstanding | market, product | PY | CT |
| 35 | `dpd30_count` | 30+ DPD % (loans) | loans 30+ ÷ active loans | market, product | PY | SQL |
| 36 | `bucket_balance` | Balance by DPD bucket | month-end balance in current, 1–29, 30–59, 60–89, 90+ | market, product | PY | SQL |
| 37 | `roll_30_60` | Roll rate 30→60 | 60–89 balance this month ÷ 30–59 balance last month | market, product | PY | SQL |
| 38 | `roll_1_30` | Roll rate 1–29→30+ | 30–59 this month ÷ 1–29 last month | market | PY | SQL |
| 39 | `provision` | Provision (month-end) | Σ provision | market, product | PY | SQL |
| 40 | `cost_of_risk` | Cost of risk | Σ provision ÷ months × 12 ÷ average month-end outstanding | market | PY | SQL |
| 41 | `written_off` ✚ | Written off | Σ written_off in the window | market, product | PY | SQL |
| 42 | `first_90_6mob` | Early default (90+ at 6 MOB) | first-90+ loans with MOB ≤ 6 ÷ loans disbursed, vintage = 6 months before | market | PY | SQL (`vintage`) |
| 43 | `vintage_30` | Vintage 30+ by MOB | first-30+ loans up to MOB N ÷ disbursed, per vintage quarter | market | — | SQL |
| **Revenue** |||||||
| 44 | `revenue` | Revenue | Σ revenue_local ÷ month's actual rate, all streams | market, product, stream | BUD, PY | CT |
| 45 | `revenue_vs_budget` | Revenue attainment | revenue ÷ Budget revenue; ≥ 100 % good, 95–99.9 % watch | market | BUD | CT ÷ CT |
| 46 | `revenue_interest` | Interest income | Σ stream INTEREST | market, product | PY | CT |
| 47 | `revenue_fees` | Fee income | Σ stream FEE | market, product | PY | CT |
| 48 | `revenue_lending` | Lending revenue | interest + fees (Budget per loan product) | market | BUD, PY | CT + CT |
| 49 | `revenue_interchange` | Interchange | Σ stream INTERCHANGE | market | BUD, PY | CT |
| 50 | `revenue_subscriptions` | Subscription revenue | Σ stream SUBSCRIPTION | market, tier | BUD, PY | CT |
| 51 | `mrr` | MRR | Plus + Pro subscribers at month-end × monthly price | market, tier | PY | SQL (`subs_month.mrr_local`) |
| 52 | `subscribers` | Paying subscribers | Plus + Pro at month-end | market, tier | PY | SQL |
| 53 | `subs_new` | New subscribers | started a paid tier in the window | market, tier | PY | SQL |
| 54 | `subs_churned` | Churned subscribers | left a paid tier in the window | market, tier | PY | SQL |
| 55 | `subs_churn_rate` | Subscriber churn rate | churned ÷ subscribers at the start of the month (monthly average over a range) | market | PY | SQL |
| 56 | `arpu_sub` ✚ | MRR per subscriber | MRR ÷ subscribers | market, tier | PY | SQL |
| 57 | `revenue_per_loan` ✚ | Lending revenue per loan | (interest + fees) ÷ loans | market, product | PY | SQL |
| 58 | `revenue_yield` ✚ | Lending yield | (interest + fees) × 12 ÷ months ÷ average outstanding | market, product | PY | SQL |
| **Sales force and cohorts** |||||||
| 59 | `agent_attainment` | Agent quota attainment | agent loans ÷ quota loans in the window | agent | — | SQL (`agent_month`) |
| 60 | `agent_principal_attainment` ✚ | Agent principal attainment | agent principal ÷ quota principal | agent | — | SQL |
| 61 | `second_loan_n` | Second loan within N days | clients with a 2nd loan ≤ N days ÷ cohort clients (N = 30, 60, 90, 180; observable cohorts only) | market, cohort | — | SQL (`cohort_curve`) |
| **Budget lines** |||||||
| 62 | `budget_<x>` | Budget value of loans, principal, new clients, revenue, 30+ DPD | Σ `target_month` for the metric, at Budget rates | market (product for loans / revenue) | — | SQL |

Comparators for every row: Δ abs = value − comparator; Δ % = value ÷ comparator − 1; ratios in pp.

## 4. ACME Marketing (SaaS acquisition): the metric catalogue

USD. Window: 7d, 30d, MTD, QTD or custom days up to the as-of day. Filters: platform, channel, network, campaign,
market, sales tier, attribution model (DDA, last click, first touch, platform). Vitals compare with the same dates last
year; other cards with prev / LY / plan. The control totals cover nearly all of these, so most rows are CT.

| # | id | Metric | Calculation | Cuts | Key |
|---|---|---|---|---|---|
| **Delivery** ||||||
| 1 | `spend` | Spend (V1) | Σ spend_usd | channel, network, campaign, platform, market | CT |
| 2 | `plan` | Planned spend | Σ daily plan in the window | channel, campaign | CT |
| 3 | `pacing` | Pacing | spend ÷ plan to date | channel, campaign | CT |
| 4 | `spend_share` | Spend share | spend ÷ total spend | channel, campaign | CT |
| 5 | `impressions` | Impressions | Σ impressions | channel, campaign | CT |
| 6 | `clicks` | Clicks | Σ clicks | channel, campaign | CT |
| 7 | `ctr` | CTR | clicks ÷ impressions | channel, campaign | CT |
| 8 | `ctr_7d_change` | CTR 7-day trend | slope of daily CTR over 7 days | campaign | CT (`ctr_slope_7d`) |
| 9 | `cpm` | CPM | spend ÷ impressions × 1,000 | channel, campaign | CT |
| 10 | `cpc` | CPC | spend ÷ clicks | channel, campaign, keyword | CT |
| 11 | `frequency_7d` | Frequency 7 d | impressions 7 d ÷ reach 7 d | campaign | CT |
| **Funnel** ||||||
| 12 | `sessions` | Sessions | Σ sessions (web) | channel, page | CT |
| 13 | `store_views` | Store views | Σ store_views (app) | channel | CT |
| 14 | `installs` | Installs | Σ installs | channel, platform | CT |
| 15 | `signups` | New clients / sign-ups (V2) | Σ signups by sign-up day (never re-attributed) | all | CT |
| 16 | `activated` | Activated | Σ activated | all | CT |
| 17 | `trials` ✚ | Trials | Σ trials | all | SQL |
| 18 | `paid_customers` | Paid customers | Σ paid_<model> by conversion day | all × model | CT |
| 19 | `conversion_paid` | Conversion into paid (V3) | paid customers ÷ sign-ups, both in the window (period rate) | all × model | CT |
| 20 | `click_signup` | Click → sign-up | sign-ups ÷ clicks | channel | CT |
| 21 | `landing_signup` | Landing → sign-up | sign-ups ÷ sessions | channel, page | CT |
| 22 | `install_signup` | Install → sign-up | sign-ups ÷ installs | channel, platform | CT |
| 23 | `activation_rate` | Activation rate | activated ÷ sign-ups | platform, OS segment | CT |
| 24 | `time_to_activation` | Time to activation (V4) | median of the 7 activation bins, linear inside the bin, ÷ 24 (days) | all | CT (`act_median_hours`) |
| 25 | `activation_time_mix` | Activation time buckets | share of activations < 1 h, 1–6 h, 6–24 h, 1–2 d, 2–4 d, 4–7 d, 7–30 d | all | CT |
| 26 | `onboarding_step` | Onboarding step completion | users at step ÷ sign-ups | step | CT |
| **Cost and return** ||||||
| 27 | `cpl` | Cost per sign-up (CPL) | spend ÷ sign-ups | all | CT |
| 28 | `cost_per_activated` | Cost per activated | spend ÷ activated | all | CT |
| 29 | `cpa` | CPA | spend ÷ paid customers (model) | all × model | CT |
| 30 | `paid_cac` | Paid CAC (V5) | spend ÷ paid customers (model) | all × model | CT |
| 31 | `blended_cac` | Blended CAC | (spend + team cost) ÷ paid customers | channel | CT |
| 32 | `new_mrr` | New MRR | Σ mrr_<model> | all × model | CT |
| 33 | `roas_90d` | ROAS 90 d (V6) | new MRR × R90 ÷ spend; R90 = first-3-month revenue ÷ month-1 revenue of the newest complete cohort | all × model | CT |
| 34 | `roas_delta` | Δ ROAS (top movers) | ROAS now − ROAS comparator | campaign | CT |
| 35 | `arpa` | ARPA | MRR ÷ paying accounts | channel | CT |
| 36 | `ltv` | LTV | ARPA × gross margin ÷ monthly churn | channel | CT |
| 37 | `ltv_cac` | LTV:CAC | LTV ÷ blended CAC (floor shown on the card) | channel | CT |
| 38 | `payback_months` | Payback months | months until cumulative cohort revenue ≥ CAC | channel, cohort month | CT |
| 39 | `payback_curve` | Payback by month N | cumulative revenue to month N ÷ cohort CAC | cohort month | CT (`payback.mN`) |
| 40 | `plan_vs_cac` ✚ | Spend vs plan gap | spend − plan | channel, campaign | CT − CT |
| **Retention, churn, refunds** ||||||
| 41 | `retention_dN` | Retention day N | active on day N ÷ cohort (N = 1, 3, 7, 14, 30, 60, 90) | channel, cohort | CT |
| 42 | `churn_monthly` | Monthly churn | customers lost ÷ customers at start, trailing 3 complete months | channel | CT |
| 43 | `refund_rate` | Refund rate | refunds ÷ revenue, 12 acquisition months | channel | CT |
| 44 | `cohort_size` | Cohort size | paid customers acquired in the month | channel | CT |
| **Pages and segments** ||||||
| 45 | `page_cvr` | Page conversion | sign-ups ÷ sessions per landing page | page | CT |
| 46 | `page_bounce` | Bounce rate | bounced sessions ÷ sessions | page | CT |
| 47 | `page_lcp` | LCP | p75 largest contentful paint, ms | page | CT |
| 48 | `segment_activation` | Activation by OS | activated ÷ sign-ups per OS segment | segment | CT |
| 49 | `keyword_cvr` | Keyword / placement CVR | conversions ÷ clicks per term | campaign, term | SQL (`term_day`) |
| **Guardrails and data quality** ||||||
| 50 | `attribution_gap` | Attribution gap | platform-reported ÷ DDA paid customers − 1 | channel | CT |
| 51 | `brand_share` | Brand share of spend | brand search spend ÷ search spend | — | CT |
| 52 | `install_quality` | Install quality Δ | install → sign-up now vs baseline | campaign | CT |
| 53 | `alerts` | Alerts tripped | count and list of rules over threshold (pacing, fatigue, underspent, gap, stale) | campaign | CT |
| 54 | `data_freshness` | Source freshness | hours since each source's last load | source | CT |

Before the build I check rows 2, 8, 26, 35–38, 50–52 against `engine/view.ts`: those names come from the control
totals' codes, and the report's exact definition wins where they differ.

## 5. P&L (two companies): the metric catalogue and the chat

Currency USD / EUR / GBP, FX at actual or constant (Budget) rates. Entity P (consumer products), S (e-commerce SaaS);
Group if the engine supports it (§6). Time views MTD, QTD, YTD, LTM, FY for any closed month. Base: Actual, latest
estimate (LE = FC2609) or Budget; compare with Budget, LE or prior year. Cuts: region, channel, product line, price
segment (the variances and profitability views).

| # | id | Metric | Calculation | Key |
|---|---|---|---|---|
| **Statement lines** (sign: revenue +, costs −, as the statement) ||||
| 1 | `GR` | Gross revenue | Σ GR accounts | CT |
| 2 | `GTN` | Gross-to-net deductions | Σ GTN accounts | CT |
| 3 | `NR` | Net revenue | GR + GTN | CT |
| 4 | `COR` | Cost of revenue | Σ COR | CT |
| 5 | `GP` | Gross profit | NR + COR | CT |
| 6 | `VSC` | Variable selling & cost-to-serve | Σ VSC | CT |
| 7 | `CM` | Contribution margin | GP + VSC | CT |
| 8 | `SM` | Sales & marketing | Σ SM | CT |
| 9 | `RD` | R&D | Σ RD | CT |
| 10 | `GA` | G&A | Σ GA | CT |
| 11 | `OOI` | Other operating income / expense | Σ OOI | CT |
| 12 | `OPEX` | Operating expenses | SM + RD + GA + OOI | CT |
| 13 | `EBITDA` | Adjusted EBITDA | CM + OPEX | CT |
| 14 | `DA` | Depreciation & amortisation | Σ DA | CT |
| 15 | `UOP` | Underlying operating profit | EBITDA + DA | CT |
| 16 | `ADJ` | Adjusting items | Σ ADJ | CT |
| 17 | `OP` | Operating profit | UOP + ADJ | CT |
| 18 | `INV` | Investing income | Σ INV | CT |
| 19 | `PBFIT` | Profit before financing and tax | OP + INV | CT |
| 20 | `FIN` | Financing expenses | Σ FIN | CT |
| 21 | `PBT` | Profit before tax | PBFIT + FIN | CT |
| 22 | `TAX` | Income tax | Σ TAX | CT |
| 23 | `NP` | Net profit | PBT + TAX | CT |
| **Ratios** ||||
| 24 | `GM_PCT` | Gross margin % | GP ÷ NR | CT ÷ CT |
| 25 | `CM_PCT` | Contribution margin % | CM ÷ NR | CT ÷ CT |
| 26 | `EBITDA_PCT` | Adj. EBITDA margin % | EBITDA ÷ NR | CT ÷ CT |
| 27 | `OP_PCT` | Operating margin % | OP ÷ NR | CT ÷ CT |
| 28 | `NP_PCT` | Net margin % | NP ÷ NR | CT ÷ CT |
| 29 | `ETR_PCT` | Effective tax rate | −TAX ÷ PBT | CT ÷ CT |
| 30 | `OPEX_PCT` | Opex % of revenue | −OPEX ÷ NR | CT ÷ CT |
| 31 | `GTN_PCT` | Gross-to-net % | −GTN ÷ GR | CT ÷ CT |
| 32 | `SM_PCT` ✚, `RD_PCT` ✚, `GA_PCT` ✚ | Cost line % of NR | −line ÷ NR | CT ÷ CT |
| 33 | `AP_PCT` | A&P % of NR (P) | −A&P accounts ÷ NR | PQ |
| **Drivers** (`ops.parquet`) ||||
| 34 | `units` | Units sold (P) | Σ units | PQ |
| 35 | `nr_per_unit` | Net revenue per unit (P) | NR ÷ units | PQ |
| 36 | `gmv` | GMV processed (S) | Σ GMV | PQ |
| 37 | `take_rate` | Take rate (S) | NR ÷ GMV | PQ |
| 38 | `active_merchants` | Active merchants (S) | month-end count (average over a range) | PQ |
| 39 | `arr` | ARR run-rate (S) | subscription revenue of the last month × 12 | PQ |
| 40 | `revenue_mix` | Revenue mix | NR by line ÷ NR | PQ |
| **Variance analysis** ||||
| 41 | `var_abs`, `var_pct` | Variance of any line | base − compare; ÷ abs(compare); sign shows favourable | CT − CT |
| 42 | `fx_effect` | FX share of a variance | actual at actual rates − actual at constant rates | PQ |
| 43 | `top_variances` | Largest variances | lines ranked by abs Δ vs Budget, by region / channel / line / segment | PQ |
| 44 | `bridge_nr`, `bridge_profit` | Budget → actual bridge | volume, price, mix, cost drivers, then FX | PQ |
| 45 | `fy_outlook` | FY outlook vs Budget | LE full year − Budget full year, per key line | CT |
| 46 | `share_region` etc. | Share of NR / CM / EBITDA by region and category | slice ÷ total | PQ |
| 47 | `growth_vs_margin` | Growth vs margin per slice | NR vs PY %; CM % | PQ |

**Key:** CT = `data/pnl/checks/control_totals_usd.csv` (FY windows and YTD Sep, USD at actual rates); PQ = an
independent check script over the Parquet, written from the formula (not the engine), for MTD / QTD / LTM, EUR / GBP,
constant currency, drivers and slices.

**The chat for the P&L** reuses everything shared (`chatRoute`, `runChat`, `ChatPanel`, `AskAi`):

- `src/lib/pnl/chat-tools.ts`: `report_snapshot` (the vitals cards for a selection), `statement` (chosen lines vs both
  comparators), `get_metric` (the registry above, with `by`), `top_variances`, `explain_metric` (the ⓘ copy the vitals
  already carry: what, formula, source).
- `src/app/api/chat/pnl/route.ts` → `chatRoute({ name: "pnl", load })`; `load` builds the engine on the server from the
  Parquet (§6 Q3) and keeps it per instance; the report state is the P&L's URL query, parsed by its own
  `selection-schema.ts`.
- The Ask AI button on the `pnl-suite` page and in the report header, same behaviour as Mirelo and ACME.
- A third daily spend cap (`CHAT_DAILY_CAP_USD` is per route: three chats can spend up to 3 × $0.50 a day).

## 6b. Built 2026-11-07 (Mirelo, step 1 of §7), not pushed

- `src/lib/mirelo/chat-metrics.ts`: the catalogue, 57 metrics (9 derived) (Budget where the data has one, PY, cuts, derived
  marks); `get_metric` added to `chat-tools.ts` (5 tools now), its rules and the catalogue in the system prompt (7.1k chars).
- Answer key level 1, all green: control totals for 16 codes × 4 markets × 5 periods, and 51 golden rows from
  `data/mirelo/checks/golden.sql` (run via MCP on `mirelo_demo`, frozen in `chat-golden.csv`). Every golden row matched the
  engine on the first run.
- Level 2: `scripts/chat-eval.ts`, written, **not run** (needs `CHAT_LLM_API_KEY` in `.env.local`, Q5).
- ⚠️ Found: agent quota attainment, all agents, Q3 2026 = **411.6%** (SQL and engine agree): the quotas in
  `agent_month.target_loans` look ~4× too low for the loans recorded. Data question, not a chat bug.
- `pnpm typecheck`, `lint`, `test` (1,134) and `build` pass. Not yet: ACME, P&L, the preview check.

## 6a. Owner's answers (2026-11-07, 18:35)

- Q1 → **internal only.** The answer key exists to keep the AI on track when asked about a metric; the chat's answers
  are too limited today. No chips or notes for visitors. (§2 item 6 dropped.)
- Q2 → **yes, derived metrics, marked as derived** in the answer.
- Q3 → **Supabase first** for the P&L (`pnl_demo` + `pnl_reader`), chat after.
- Q4 → **Ledger palette** for the P&L's Ask AI button.
- Still open: Q5 (the LLM key in `.env.local` for the chat-level eval) and whether the P&L now goes to Supabase
  before the executive dashboard (plan item 1 had nordmark first).

## 6. Questions and issues (answers needed before the build)

1. **Who sees the "verifiable answers list"?** (a) an internal answer key + tests only; (b) also suggestion chips drawn
   from it and a "figures checked against the source data" note in the chat; (c) also a public list of verified
   questions on the showcase page.
2. **Metric scope.** The ✚ rows are figures no card shows. A visitor cannot check them in the report, and the
   "Show in the report" link lands on the nearest view. Keep them (marked "derived" in the answer), or answer only what
   the report shows?
3. **P&L data on the server.** (a) Now: the chat route fetches the deployed `public/data/pnl/*.parquet` (nothing new
   in the function bundle), and the seam swaps to Supabase when plan item 1 moves the P&L; (b) Supabase first
   (`pnl_demo` + `pnl_reader`, after the executive dashboard), chat after.
4. **P&L Ask AI look.** Same red/orange button as Mirelo and ACME, or in the P&L's Ledger palette?
5. ⚠️ **The chat-level eval needs the LLM key on this machine.** The script loads `.env.local` into its process (I do
   not open it). Does `.env.local` hold `CHAT_LLM_API_KEY`? If not, add it, or run only the free tool-level tests.
6. ⚠️ **Engine limits in the P&L.** `statement()` throws on slice filters ("not built yet — build step 5"), and the
   vitals views are single-company ("the Group view is not built in Track C"). Region / channel answers can then come
   only from the variances and profitability views, and Group may be answerable at statement-line level only. I check
   this first and answer Group questions only where the engine has them.
7. **Slug naming.** `online-sales-report` is the Mirelo lender report, not the Cube "online sales" showcase
   (`online-sales-cube`). I assume you mean Mirelo.

## 7. Build order once answered

1. Mirelo: registry + `get_metric` + golden SQL + `chat-golden.csv` + tool-level tests + eval script; run the eval.
2. ACME Marketing: the same (mostly CT keys, so faster).
3. P&L: server loader, tools, route, button, registry, golden rows, both test levels.
4. Docs (`docs/mirelo/ai-chat.md` → a section per report on the catalogue and the answer key), ADR-0005 note,
   AI instructions; then `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; then the preview check.
