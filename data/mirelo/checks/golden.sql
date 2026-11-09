-- The Mirelo chat's answer key, SQL half (plan .log/report/2026-11-07-ai-chat-metrics-plan.md §2, §3).
-- Figures the generator's control totals do not carry, computed straight from mirelo_demo from each metric's formula,
-- NOT from the report engine, so they check it. Read-only; run as any role that reads mirelo_demo (MCP execute_sql).
-- The result is frozen in chat-golden.csv; src/lib/mirelo/chat-metrics.test.ts checks get_metric against it.
-- EUR figures use Portugal only (EUR, no FX) or counts and single-market ratios, where the rate cancels.
-- Key: metric | market | from | to | filters ("k=v;k=v").

with
f as (select * from mirelo_demo.funnel_month),
l as (select * from mirelo_demo.loans_month),
p as (select * from mirelo_demo.portfolio_month),
s as (select * from mirelo_demo.subs_month),
r as (select * from mirelo_demo.revenue_month),
t as (select * from mirelo_demo.target_month),
a as (select * from mirelo_demo.agent_month)
select key, value from (
  -- funnel
  select 'leads|PL|2026-09|2026-09|' as key, (select sum(leads)::float8 from f where market = 'PL' and month = '2026-09') as value
  union all select 'applications|PL|2026-09|2026-09|', (select sum(submitted)::float8 from f where market = 'PL' and month = '2026-09')
  union all select 'approved|ALL|2026-07|2026-09|', (select sum(approved)::float8 from f where month between '2026-07' and '2026-09')
  union all select 'approval_rate|PL|2026-07|2026-09|', (select sum(approved)::float8 / sum(submitted) from f where market = 'PL' and month between '2026-07' and '2026-09')
  union all select 'approval_rate|ALL|2025-01|2025-12|client=NEW', (select sum(approved)::float8 / sum(submitted) from f where not repeat and month between '2025-01' and '2025-12')
  union all select 'approval_rate|RO|2026-09|2026-09|client=RETURNING', (select sum(approved)::float8 / sum(submitted) from f where repeat and market = 'RO' and month = '2026-09')
  union all select 'approval_rate|ALL|2026-01|2026-09|channel=PARTNER', (select sum(approved)::float8 / sum(submitted) from f where channel = 'PARTNER' and month between '2026-01' and '2026-09')
  union all select 'take_up|ALL|2026-01|2026-09|channel=PAID', (select sum(disbursed)::float8 / sum(approved) from f where channel = 'PAID' and month between '2026-01' and '2026-09')
  union all select 'take_up|PT|2026-09|2026-09|product=STEP12', (select sum(disbursed)::float8 / sum(approved) from f where market = 'PT' and product = 'STEP12' and month = '2026-09')
  union all select 'lead_to_loan|RO|2026-04|2026-06|', (select sum(disbursed)::float8 / sum(leads) from f where market = 'RO' and month between '2026-04' and '2026-06')
  union all select 'kyc_pass_rate|ALL|2026-09|2026-09|', (select sum(kyc_passed)::float8 / sum(submitted) from f where month = '2026-09')
  union all select 'start_rate|PT|2026-07|2026-09|', (select sum(started)::float8 / sum(leads) from f where market = 'PT' and month between '2026-07' and '2026-09')
  -- volume
  union all select 'loans|PL|2026-07|2026-09|product=FLEX30', (select sum(loans)::float8 from l where market = 'PL' and product = 'FLEX30' and month between '2026-07' and '2026-09')
  union all select 'loans|ALL|2026-09|2026-09|client=RETURNING', (select sum(loans)::float8 from l where repeat and month = '2026-09')
  union all select 'new_clients|ALL|2025-01|2025-12|channel=AGENT', (select sum(loans)::float8 from l where not repeat and channel = 'AGENT' and month between '2025-01' and '2025-12')
  union all select 'repeat_loans|RO|2026-07|2026-09|', (select sum(loans)::float8 from l where repeat and market = 'RO' and month between '2026-07' and '2026-09')
  union all select 'share_of_loans|ALL|2026-09|2026-09|channel=PAID', (select sum(loans) filter (where channel = 'PAID')::float8 / sum(loans) from l where month = '2026-09')
  union all select 'share_of_loans|PL|2026-01|2026-09|product=STEP6', (select sum(loans) filter (where product = 'STEP6')::float8 / sum(loans) from l where market = 'PL' and month between '2026-01' and '2026-09')
  union all select 'avg_ticket|PT|2026-07|2026-09|', (select sum(principal_local) / sum(loans) from l where market = 'PT' and month between '2026-07' and '2026-09')
  union all select 'principal|PT|2025-01|2025-12|channel=APP', (select sum(principal_local) from l where market = 'PT' and channel = 'APP' and month between '2025-01' and '2025-12')
  -- budget (counts, or EUR in Portugal)
  union all select 'budget:loans|PL|2026-07|2026-09|', (select sum(value) from t where metric = 'LOANS' and market = 'PL' and month between '2026-07' and '2026-09')
  union all select 'budget:new_clients|ALL|2025-01|2025-12|', (select sum(value) from t where metric = 'NEW_CLIENTS' and month between '2025-01' and '2025-12')
  union all select 'budget:revenue|PT|2026-09|2026-09|', (select sum(value) from t where metric = 'REVENUE_LOCAL' and market = 'PT' and month = '2026-09')
  -- portfolio, month-end
  union all select 'active_loans|ALL|2026-09|2026-09|', (select sum(loans_active)::float8 from p where month = '2026-09')
  union all select 'dpd30_count|PL|2026-09|2026-09|', (select sum(loans_dpd_30p)::float8 / sum(loans_active) from p where market = 'PL' and month = '2026-09')
  union all select 'dpd30|PL|2026-09|2026-09|product=STEP12', (select sum(bal_30_59 + bal_60_89 + bal_90p) / sum(outstanding) from p where market = 'PL' and product = 'STEP12' and month = '2026-09')
  union all select 'dpd90|RO|2026-06|2026-06|product=FLEX30', (select sum(bal_90p) / sum(outstanding) from p where market = 'RO' and product = 'FLEX30' and month = '2026-06')
  union all select 'outstanding|PT|2026-09|2026-09|product=FLEX90', (select sum(outstanding) from p where market = 'PT' and product = 'FLEX90' and month = '2026-09')
  union all select 'balance_1_29|PT|2026-09|2026-09|', (select sum(bal_1_29) from p where market = 'PT' and month = '2026-09')
  union all select 'roll_30_60|PT|2026-09|2026-09|', (select (select sum(bal_60_89) from p where market = 'PT' and month = '2026-09') / (select sum(bal_30_59) from p where market = 'PT' and month = '2026-08'))
  union all select 'roll_1_30|PT|2026-08|2026-08|', (select (select sum(bal_30_59) from p where market = 'PT' and month = '2026-08') / (select sum(bal_1_29) from p where market = 'PT' and month = '2026-07'))
  union all select 'provision|PT|2026-09|2026-09|', (select sum(provision) from p where market = 'PT' and month = '2026-09')
  union all select 'cost_of_risk|PT|2026-07|2026-09|', (select (sum(provision) / 3 * 12) / (sum(outstanding) / 3) from p where market = 'PT' and month between '2026-07' and '2026-09')
  union all select 'written_off|PT|2025-01|2025-12|', (select sum(written_off) from p where market = 'PT' and month between '2025-01' and '2025-12')
  -- vintages and cohorts
  union all select 'early_default_6m|ALL|2026-09|2026-09|', (
    select sum(first_90p) filter (where mob <= 6)::float8
         / (select sum(d) from (select distinct market, disbursed as d from mirelo_demo.vintage where vintage = '2026-03') x)
    from mirelo_demo.vintage where vintage = '2026-03')
  union all select 'second_loan_90d|ALL|2026-01|2026-03|', (
    select sum(repeated)::float8 / sum(clients) from mirelo_demo.cohort_curve
    where day = 90 and observable and cohort between '2026-01' and '2026-03')
  union all select 'second_loan_30d|PL|2026-07|2026-07|', (
    select sum(repeated)::float8 / sum(clients) from mirelo_demo.cohort_curve
    where day = 30 and observable and market = 'PL' and cohort = '2026-07')
  -- revenue (Portugal, EUR)
  union all select 'revenue_lending|PT|2025-01|2025-12|', (select sum(amount_local) from r where market = 'PT' and stream in ('INTEREST', 'FEE') and month between '2025-01' and '2025-12')
  union all select 'revenue_per_loan|PT|2026-07|2026-09|', (
    select (select sum(amount_local) from r where market = 'PT' and stream in ('INTEREST', 'FEE') and month between '2026-07' and '2026-09')
         / (select sum(loans) from l where market = 'PT' and month between '2026-07' and '2026-09'))
  union all select 'lending_yield|PT|2026-01|2026-09|', (
    select ((select sum(amount_local) from r where market = 'PT' and stream in ('INTEREST', 'FEE') and month between '2026-01' and '2026-09') / 9 * 12)
         / ((select sum(outstanding) from p where market = 'PT' and month between '2026-01' and '2026-09') / 9))
  union all select 'revenue|PT|2026-07|2026-09|product=CARD', (select sum(amount_local) from r where market = 'PT' and product = 'CARD' and month between '2026-07' and '2026-09')
  -- subscriptions
  union all select 'subscribers|ALL|2026-09|2026-09|', (select sum(subscribers_end)::float8 from s where tier in ('PLUS', 'PRO') and month = '2026-09')
  union all select 'subscribers|RO|2026-09|2026-09|tier=PRO', (select sum(subscribers_end)::float8 from s where tier = 'PRO' and market = 'RO' and month = '2026-09')
  union all select 'subscribers_new|PL|2026-07|2026-09|', (select sum(subscribers_new)::float8 from s where tier in ('PLUS', 'PRO') and market = 'PL' and month between '2026-07' and '2026-09')
  union all select 'subscribers_churned|ALL|2025-01|2025-12|', (select sum(subscribers_churned)::float8 from s where tier in ('PLUS', 'PRO') and month between '2025-01' and '2025-12')
  union all select 'subscriber_churn_rate|ALL|2025-01|2025-12|', (select sum(subscribers_churned)::float8 / sum(subscribers_start) from s where tier in ('PLUS', 'PRO') and month between '2025-01' and '2025-12')
  union all select 'mrr|PT|2026-09|2026-09|', (select sum(mrr_local) from s where tier in ('PLUS', 'PRO') and market = 'PT' and month = '2026-09')
  union all select 'mrr_per_subscriber|PT|2026-09|2026-09|tier=PLUS', (select sum(mrr_local) / sum(subscribers_end) from s where tier = 'PLUS' and market = 'PT' and month = '2026-09')
  -- sales force
  union all select 'agent_attainment|ALL|2026-07|2026-09|', (select sum(loans)::float8 / sum(target_loans) from a where month between '2026-07' and '2026-09')
  -- speed (the median of the loans themselves)
  union all select 'hours_to_cash|PT|2026-09|2026-09|', (select percentile_cont(0.5) within group (order by hours_to_cash) from mirelo_demo.loan where market = 'PT' and month = '2026-09')
) g
order by key;
