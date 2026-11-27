# CEO weekly digest — data design (2026-11-16)

A third n8n showcase: every Monday morning the CEO of a fictional SaaS company gets one styled email with last week's
growth, marketing and cash KPIs. n8n reads the numbers from Supabase, an LLM writes a short commentary from those
numbers only, and n8n sends the email. This file covers the data and the KPI build; the email design and the workflow
come next.

**Status 11-16 (afternoon):** the owner's answers reshaped the morning draft: a SaaS SME instead of a retailer, 10 KPIs
at most (marketing and cash, receivables and payables included), data for 2024–2026, kept in Supabase. SQL rewritten in
`data/ceo-digest/sql/` (002 tables, 003 views, 004 reference, 005 a deterministic generator) and tested in a local
in-memory Postgres (PGlite): every view computes, the checks below pass. In Supabase still only `001` (empty schema +
two NOLOGIN roles): the push of 002–005 via MCP was declined, waiting on the owner's call on how to apply it.

**Status 11-16 (evening):** the showcase's front is now a data chat with an "email me this" n8n workflow
(`chat-and-email.md`, the contract). The data grew for it: a date the data is "as of", clicks and impressions, a
customer list, their invoices, and eight SQL functions (`006`) that the site and n8n both call. A third role,
`ceo_digest_n8n`, joins `001`. The weekly figures did not move (same `v_kpi_weekly` signature). Tested locally in
PGlite, 001 included; nothing of it is in Supabase yet: the owner applies 001 → 006.

## The company

**Tidewell** (fictional): online booking and client management software for small health and wellness practices
(physio, beauty, fitness), sold in Europe, EUR. An SME: ARR about €2.5M (Jan 2024) → €3.3M → €4.4M → €5.7M (end 2026),
~2,000 → ~3,100 customers, 36 → ~63 staff, a €5M equity round in June 2025.

| Dimension | Members |
|---|---|
| Plan | Starter €39/month (card), Pro €99 → €109 from April 2025 (card), Clinic ~€300–330/month per account (billed a year ahead by invoice, net 30) |
| Acquisition channel | Paid search, Paid social, Content and SEO, Partners and referrals (all with 14-day trials), Outbound sales (demos, no trial) |
| Cash category | Card collections, invoice collections, payroll, paid ads, content / partner commissions / sales tools, hosting and software, rent, VAT, other opex, equipment, equity |

Opening cash €3.3M on 2024-01-01; minimum runway policy 12 months; subscription gross margin 80 %.

## Grain and tables

Weekly (ISO week, Monday to Sunday), 2024-W01 to 2026-W53: 157 weeks. 12 weekly and reference tables, about 4,900
rows, under 1 MB. Two finer tables for the chat, customers and their invoices: 110,644 rows, about 10 MB (below).

"Today" is `company.data_as_of` = **Sunday 15 Nov 2026**, the close of W46. The weekly facts run on to the year's end
(the plan, and how the stories end); the chat's functions stop at that date.

| Table | Grain | What |
|---|---|---|
| `company` | 1 row | name, currency, opening cash, minimum runway, gross margin, `data_as_of` |
| `dim_week` | week | ISO year / week, label, month, same week last year |
| `dim_plan`, `dim_channel`, `dim_cash_category` | member | plans (billing), channels (trial or not), cash categories (flow, direction) |
| `kpi` | KPI | the catalogue: unit, which way is good, what it is flagged against, threshold, definition |
| `fact_mrr_weekly` | week × plan | the MRR bridge: customers and MRR open, new, expansion, contraction, churn; closing derived |
| `fact_marketing_weekly` | week × channel | spend, MQLs, trials started / ended / converted, new customers, new MRR; impressions and clicks (paid search and paid social, 0 for the rest) |
| `fact_target_weekly` | week | plan: ARR, net new MRR, MQLs, marketing budget, CAC |
| `fact_cash_weekly` | week × cash category | signed bank movements |
| `fact_ar_weekly` | week × age bucket | receivables at the week's close (Clinic invoices) |
| `fact_ap_weekly` | week × due bucket | payables at the week's close (supplier invoices, net 30) |
| `dim_customer` | customer | 5,271 rows: name, practice type, city, country, plan, acquisition channel, signup date, churn date (empty = active), sites |
| `fact_customer_invoice` | customer × invoice date | 105,373 rows: invoice, due and paid dates, amount, status on `data_as_of` (paid / open / overdue) |

## The KPI build (views, `003-views.sql`)

All arithmetic is in SQL. n8n picks the week and formats; the LLM comments on rows it is given and never computes.

| View | One row per | Feeds |
|---|---|---|
| `v_week_growth`, `v_week_marketing`, `v_week_cash`, `v_week_working_capital` | week | the KPI view |
| `v_kpi_weekly` | week × KPI | the 10 tiles: value, last week, last year, 13-week average, target, deltas, flag |
| `v_mrr_by_plan` | week × plan | the MRR bridge by plan |
| `v_marketing_by_channel` | week × channel | the funnel by channel, CAC and conversion now and 4 weeks before |
| `v_cash_by_category` | week × cash category | where the cash went, vs last year and the 13-week average |

The 10 KPIs (`kpi` table, `004-reference.sql`). Deltas are relative for € and counts, absolute (points, months) for
rates and runway. A KPI is flagged when it moves the bad way past its threshold.

| Section | KPI | Flagged against |
|---|---|---|
| Growth | ARR | plan, −2 % |
| | Net new MRR, last 4 weeks | plan, −30 % |
| | MRR churn, last 4 weeks | last year, +0.4 pts |
| Marketing | Marketing-qualified leads | plan, −15 % |
| | Trial-to-paid, last 4 weeks | last year, −2.5 pts |
| | Blended CAC, last 4 weeks | plan, +15 % |
| Cash | Cash at week end | not flagged |
| | Runway (months, 13-week average burn) | below the 12-month policy |
| Working capital | Overdue receivables % | last year, +5 pts |
| | Payables due in the next 14 days | 13-week average, +50 % |

Over 2025–2026 about 3 % of KPI-weeks are flagged: net new MRR 11 % (seasonal dips against an evenly phased plan),
overdue receivables 7 %, CAC 6 %, runway 4 % (spring 2025, before the round), churn and payables 2 %, ARR 1 %; MQLs and
trial conversion never, they stay as context for the commentary.

## The chat's functions (`006-chat-functions.sql`, `007-top-customers-period.sql`)

Eight functions in 006 and a ninth in 007 (2026-11-27), the closed set behind the chat's tools and the email (`chat-and-email.md` has the columns). Plain
SQL, `security invoker`, no dynamic SQL: text arguments are only compared as values.

| Function | Returns |
|---|---|
| `fn_meta()` | company, currency, first day of the data, `data_as_of`, weeks (150) |
| `fn_marketing_by_channel(p_from, p_to)` | a row per channel and a total: spend, impressions, clicks, CTR, CPC, MQLs, trials, new customers, CAC, new MRR |
| `fn_marketing_by_week(p_from, p_to)` | a row per week: spend and budget, clicks, CPC, MQLs and target, new customers, CAC |
| `fn_cash_by_category(p_from, p_to)` | a row per cash category, then `total_in`, `total_out`, `net`: signed amount, share of its direction, same weeks last year |
| `fn_cash_by_week(p_from, p_to)` | a row per week: cash in, cash out (both positive), net, closing cash, runway, receivables, overdue receivables, payables due in 14 days |
| `fn_customers_by_plan(p_as_of)` | a row per plan and a total: active, new and churned in 28 days, average tenure, invoices and billed in 12 months, overdue |
| `fn_customer_search(p_query, p_limit)` | customers whose name, city or practice type contains the text; active first, then the most billed |
| `fn_top_customers(p_order, p_limit)` | the top by `billed`, `tenure` (active only), `invoices`, `overdue` (only those who have one), `newest` |
| `fn_top_customers_period(p_from, p_to, p_metric, p_limit)` (**007**, 2026-11-27) | the top 1–25 over any period by `billed` (invoiced in it), `paid` (collected in it), `invoices`, `overdue` (at its last day), with each one's share and how many had any; days, not weeks |

Rules they share:

- A period is cut to 2024-01-01 … `data_as_of`; an empty bound means that end of the data. A week counts when its
  Thursday is in the period. A period with no week in it (all of it after `data_as_of`, or turned around) gives no rows.
- CPC and CTR cover the two ad channels. On a total row CPC is ad spend ÷ clicks, not all spend ÷ clicks.
- Last year's cash is empty unless every week of the period has a week a year earlier, so for anything touching 2024.
- Customers are seen on `data_as_of`: the 184 who sign up later are left out, a later churn has not happened.
- The search is a plain substring test, not a pattern (`%` means `%`). A blank text returns nothing. `p_limit` is held
  to 1–20 (empty = 10). An unknown `p_order` returns nothing.
- Money comes back as numeric with 2 decimals, rates in percent with 2, months with 1, counts as integers.

`v_customer` (also in 006) is the row both customer functions return: the customer with its invoices rolled up.

## The data (`005-generate.sql`)

A deterministic generator in SQL: noise comes from md5 of fixed keys, so every run gives the same rows. It needs no CSV
and no loader: running 004 then 005 as `postgres` refills everything. Shape: January demand peak, summer and Christmas
dips, Starter churn high and Clinic churn at January renewals, a Pro price rise in 2025, payroll on the 25th, rent
quarterly, VAT quarterly, 30 % of Clinic renewals billed in January.

Clicks hang off the spend: paid search at €2.55–3.95 a click and about 4 % click-through, paid social at €0.92–1.58 and
about 1 %. In the W42–W48 push social clicks cost €1.46 against €1.15 in the ten weeks before.

The customer list is cut from the weekly counts, so the two agree exactly: 2,015 customers in the opening base (920
Starter, 760 Pro, 335 Clinic, signed up 2019–2023), then every new one on a day of its week, with its plan and
channel; every churn on a day of its week. A customer keeps its plan. Names come from two word lists and a suffix by
practice type (Physiotherapy, Beauty, Fitness), in 39 euro-area cities; all fictional, none repeats.

Invoices run from each signup to `data_as_of`. Starter and Pro: a card charge a month, paid on the day, at the list
price (a quarter of customers have 10 % off, 15 % pay for an add-on). Clinic: one invoice per contract year, net 30,
priced by sites, paid the way the receivables are (most by the due date, a tail late). They follow list prices and
do **not** tie to the MRR bridge or the cash table to the euro: on `data_as_of` overdue invoices are €117,930 here and
€120,507 in `fact_ar_weekly`. January holds 30.5 % of the Clinic renewals of 2024–2026 (39 % in 2024, 30 % in 2025,
25 % in 2026: new accounts renew on their own dates; the weekly facts keep 30 % every year).

Stories in autumn 2026, so the email of **Mon 16 Nov 2026 (week W46)** has something to say:

| Weeks | Story | Shows as |
|---|---|---|
| W42–W48 | a paid social push: spend ×1.7, dearer and weaker leads | CAC €907 vs €780 plan (flag), trial conversion dips |
| W43–W47 | Starter churn ×1.9 after a competitor's free tier | MRR churn 1.73 % vs 1.25 % last year (flag) |
| W38 → W50 | a 12-site physio chain's €52,800 annual invoice, due W42, paid W50 | overdue receivables 30 % vs 19 % last year (flag) |
| | the chain is customer 1075, **Zwaluw Physio Group**, Utrecht, Clinic since 14 Sep 2022 | invoice of 14 Sep 2026, due 14 Oct, overdue on `data_as_of`; top of `fn_top_customers('overdue')` |
| W44 | the annual cloud commitment, €96,000, due W48 | payables due in 14 days €125k vs €44k average (flag) |
| W46 | Q3 VAT payment | in the cash table |

W46 values: ARR €5.51M (plan €5.57M), net new MRR €7.4k over 4 weeks, 499 MQLs, cash €3.82M, runway 18.5 months.
On `data_as_of`: 3,031 active customers (894 Starter, 1,418 Pro, 719 Clinic), 106 new and 92 churned in 28 days,
€5.27M billed in 12 months, 18 overdue invoices.

## Checks (run after a load)

- The MRR bridge rolls: every week's opening equals the week before's closing, per plan (0 breaks).
- New customers and new MRR by channel equal those by plan, every week (0 mismatches).
- Row counts: 157 weeks, 471 MRR, 785 marketing, 157 targets, 1,727 cash, 785 receivables, 628 payables.
- No KPI is empty after 2024-W05 (runway excepted).
- Signature of `v_kpi_weekly` (md5 of week, KPI, value to 6 decimals and flag, ordered): `c9d5a2d36a011ac84e733e36cd8ceb75`.
  The same before and after the customer tables and clicks were added.

The customer checks are queries in `data/ceo-digest/checks/reconcile.sql`, one row each, expected values in the
comments. Local run, 11-16:

- New customers per week × plan against `customers_new`: 0 mismatches of 471. Per week × channel against
  `new_customers`: 0 of 785. Churned per week × plan against `customers_churned`: 0 of 471.
- Active per plan at every week's open and close against `customers_open` and `customers_close`: 0 of 471 each. The
  first open is the opening base: 920 / 760 / 335.
- `fn_customers_by_plan` on every Sunday up to `data_as_of` against `customers_close`: 0 of 450.
- Row counts: 5,271 customers (2,015 opening, 184 after `data_as_of`), 5,271 distinct names; 105,373 invoices
  (105,291 paid, 64 open, 18 overdue).
- Invoices: none after `data_as_of`, before a signup or from a churn day on; every status matches its dates; every
  card customer is charged on its signup day and then with no gap over 31 days; every Clinic customer has one invoice
  per contract year.
- CPC inside €2.50–4.00 (search) and €0.90–1.60 (social) in all 314 ad weeks; the other 471 rows are 0.
- The functions' totals tie: marketing by week = by channel, cash by week = the `net` row.
- Signature of the new objects (md5 over the customers, the invoices and the click columns, ordered; query 11):
  `66e01bf4a83acdb0af770078461b9e8d`.

`data/ceo-digest/checks/fn-samples.json` holds what each function returns for fixed calls (October 2026, 2026 to
date, the search for "physio", the tops, customers by plan). The chat's answer key is derived from it.

## Size

Measured in the local Postgres (`pg_total_relation_size`): `fact_customer_invoice` 8.8 MB (6.3 MB of rows, 2.4 MB the
key's index), `dim_customer` 1.2 MB, the 12 weekly and reference tables 1.0 MB. About **11 MB** for the schema, 10 MB
of it new. Supabase stood at 315 MB of 500 before the load. A third of the invoices (35,263) are dated before 2024,
the opening base's history; starting invoices at 2024 would save about 3 MB and make "billed to date" a
since-2024 figure, so they stay.

## Who reads it

One login per holder, both NOLOGIN until the owner sets a password, both on the Session pooler, port 5432:

- `ceo_digest_reader`: the site's chat route (Vercel env `CEO_DIGEST_DATABASE_URL`).
- `ceo_digest_n8n`: the n8n email workflow (a Postgres credential in n8n).

Each can read the tables and views of `ceo_digest_demo` and run its functions, and nothing else anywhere. Nobody else
can run the functions: the default grant to PUBLIC is revoked at the end of 006. `ceo_digest_loader` is optional (005
runs as `postgres`); it stays for a refill from the owner's machine and has no right to run the functions.

Order to apply, as `postgres`, each file in one call: 001, 002, 003, 004, 005, 006, 007. After a re-run of 002 (it drops
everything with cascade) run 003 to 007 again; after a re-run of 006 alone, run 007 again. 005 takes a few seconds: it writes 110,000 rows and draws churn in a
loop of 456 steps.
