# CEO weekly digest — data design (draft for review, 2026-11-16)

A third n8n showcase: every Monday morning the CEO of a fictional company gets one styled email with last week's
sales KPIs and what happened to cash. n8n reads the numbers from Supabase, an LLM writes a short commentary from those
numbers only, and n8n sends the email. This file covers the data and the KPI build. The email design and the workflow
come after the owner accepts this.

**Status 11-16:** SQL drafted in `data/ceo-digest/sql/` and tested in a local in-memory Postgres with formula data
(all views compute; flags, the cash roll-forward, the 13-week outlook and the W53 last-year mapping checked). In
Supabase only `001` ran: empty schema `ceo_digest_demo` + roles `ceo_digest_loader` / `ceo_digest_reader`, both NOLOGIN.
`002` (tables), `003` (views) and `004` (reference rows) are NOT applied; the owner declined the table step pending
review. No rows anywhere.

## The company

**Kalma Home** (fictional): home and kitchen goods, about €60M net sales a year, EUR.

| Dimension | Members |
|---|---|
| Channel | Online store (paid at order), Retail partners (60-day terms), Hotels & restaurants (B2B, 30-day terms) |
| Region | DACH, Nordics, Benelux, UK |
| Category | Cookware, Small appliances, Tableware, Kitchen textiles, Storage |
| Cash category | 9 operating (customer receipts, suppliers, payroll, rent, marketing, IT, VAT + payroll tax, corporate tax, other), capex, loan drawdown / repayment, interest |
| Pipeline stage | Qualified 10 %, Proposal 30 %, Negotiation 60 %, Commit 85 % (retail and B2B deals only) |

Opening cash €6.5M on 2024-01-01; cash buffer policy €3M.

## Grain and tables

Everything is weekly (ISO week, Monday to Sunday): the email is weekly and the 500 MB plan is at 63 % (11-16), so daily
rows would cost space for nothing. 17 tables, about 60k rows for 2024-W01 to 2027-W52, an estimated 6–8 MB.

| Table | Grain | What |
|---|---|---|
| `company` | 1 row | name, currency, opening cash, cash buffer policy |
| `dim_week` | week | ISO year / week, label, month, same week last year |
| `dim_channel`, `dim_region`, `dim_category` | member | sales dimensions; `payment_terms_days` marks credit channels |
| `dim_cash_category` | member | flow (operating / investing / financing), direction |
| `dim_pipeline_stage` | stage | probability for the weighted pipeline |
| `kpi` | KPI | the catalogue: unit, which way is good, what it is flagged against, threshold, definition |
| `fact_sales_weekly` | week × channel × region × category | units, gross sales, discounts, returns, COGS; net sales derived |
| `fact_orders_weekly` | week × channel × region | orders, new customers (orders span categories, so their own grain) |
| `fact_sales_target_weekly` | week × channel × region | budget: net sales, gross margin |
| `fact_cash_weekly` | week × cash category | signed bank movements |
| `fact_cash_forecast` | issued week × week × cash category | the rolling 13-week forecast, re-issued every Monday |
| `fact_ar_weekly` | week × channel × age bucket | receivables at the week's close |
| `fact_ap_weekly` | week × due bucket | payables at the week's close |
| `fact_pipeline_weekly` | week × channel × stage | open deals and value at the week's close |
| `fact_pipeline_flow_weekly` | week × channel | created, won, lost (deals and value) |

## The KPI build (views, `003-views.sql`)

All arithmetic is in SQL. n8n picks the week and formats; the LLM comments on rows it is given and never computes.

| View | One row per | Feeds |
|---|---|---|
| `v_week_sales`, `v_week_cash`, `v_week_working_capital`, `v_week_pipeline` | week | the KPI view |
| `v_kpi_weekly` | week × KPI | the tiles: value, last week, last year, target, three deltas, flag |
| `v_sales_breakdown` | week × channel / region / category | sales tables and top movers, vs LY and target |
| `v_cash_by_category` | week × cash category | where the cash went, actual vs forecast |
| `v_cash_outlook` | issued week × week | the 13-week cash line and its low point |

The 18 KPIs (`kpi` table, `004-reference.sql`). Deltas are relative for € and counts, absolute (points, days) for
rates and DSO. A KPI is flagged when it moves the bad way past its threshold.

| Section | KPI | Flagged against |
|---|---|---|
| Sales | Net sales | budget, −5 % |
| | Net sales YTD | budget, −3 % |
| | Gross margin % | budget, −1.5 pts |
| | Discount rate | last year, +2 pts |
| | Return rate | last year, +1 pt |
| Customers | Orders | last year, −10 % |
| | New customers | last year, −15 % |
| | Average order, online | last year, −8 % |
| Cash | Cash at week end | the forecast issued that Monday, −3 % |
| | Net cash flow | shown vs forecast, not flagged |
| | Operating cash flow | not flagged |
| | Lowest cash, next 13 weeks | below the €3M buffer |
| Working capital | Overdue receivables % | last week, +2 pts |
| | DSO | last year, +5 days |
| | Payables due next week | not flagged |
| Pipeline | Weighted pipeline | last year, −10 % |
| | Won this week | not flagged |
| | Win rate, last 4 weeks | last year, −5 pts |

## The data, once the design is accepted

A deterministic generator (seeded, re-runnable) writes 2024-W01 to 2027-W52, loaded by `ceo_digest_loader`. Shape:
Q4 peak with Black Friday and Christmas weeks, a January returns spike, a summer dip in B2B, about +8 % a year.
Recent weeks carry stories for the email to find, for example a UK online promotion that lifts sales and cuts margin,
a hotel group paying late (overdue receivables jump), a quarterly VAT payment, and warehouse capex in December–January
that takes the 13-week low point close to the €3M buffer. Totals reconcile by construction (net sales derived, cash
closing rolled from the opening balance).

## Open questions for the owner

1. Company, channels, regions, categories: keep, or another business (e.g. a SaaS company with ARR and burn)?
2. KPIs: the 18 above, thresholds as set? Anything a CEO email must have that is missing (headcount, EBITDA estimate)?
3. Data range: pre-generate to the end of 2027 so the email stays "live" every Monday for a year, or append week by week?
4. AOV online only, orders and new customers across all channels: OK?
5. Supabase is at 63 %; this adds under 2 %. The Nordmark load is still pending; if both together pass ~70 %, this goes
   to Neon instead (the SQL is plain Postgres).
