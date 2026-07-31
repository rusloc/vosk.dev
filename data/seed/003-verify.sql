-- Verification — run after the schema and both seeds.
--
-- Two jobs: prove the load worked, and prove the numbers are the ones the case-study copy
-- claims. A seed that loads cleanly but produces a 40% net margin is still a broken demo.

\echo '== Row counts =='
select 'dim_date'        as table_name, count(*) from demo.dim_date
union all select 'dim_account',      count(*) from demo.dim_account
union all select 'dim_cost_center',  count(*) from demo.dim_cost_center
union all select 'dim_scenario',     count(*) from demo.dim_scenario
union all select 'fact_gl',          count(*) from demo.fact_gl
order by 1;

\echo '== Sign convention: revenue positive, costs negative =='
-- Any row here is a defect: an amount pointing the opposite way to its account's sign.
select a.account_code, a.account_name, a.sign, count(*) as bad_rows
from demo.fact_gl f
join demo.dim_account a on a.account_key = f.account_key
where sign(f.amount) <> a.sign and f.amount <> 0
group by 1, 2, 3;

\echo '== Annual P&L, actuals — expect revenue near $18.4M and a low-teens net margin =='
select
  d.fiscal_year,
  sum(f.amount) filter (where a.statement_section = 'Revenue')            as revenue,
  sum(f.amount) filter (where a.statement_section = 'COGS')               as cogs,
  sum(f.amount) filter (where a.statement_section = 'Revenue')
    + sum(f.amount) filter (where a.statement_section = 'COGS')           as gross_profit,
  sum(f.amount) filter (where a.statement_section in ('Opex', 'Other'))   as opex_and_other,
  sum(f.amount)                                                          as net_profit,
  round(100 * sum(f.amount)
        / nullif(sum(f.amount) filter (where a.statement_section = 'Revenue'), 0), 1) as net_margin_pct
from demo.fact_gl f
join demo.dim_date     d on d.date_key    = f.date_key
join demo.dim_account  a on a.account_key = f.account_key
join demo.dim_scenario s on s.scenario_key = f.scenario_key
where s.is_actual
group by 1
order by 1;

\echo '== Budget vs actual variance by year =='
select
  d.fiscal_year,
  sum(f.amount) filter (where s.scenario_name = 'Actual')   as actual,
  sum(f.amount) filter (where s.scenario_name = 'Budget')   as budget,
  sum(f.amount) filter (where s.scenario_name = 'Forecast') as forecast
from demo.fact_gl f
join demo.dim_date     d on d.date_key     = f.date_key
join demo.dim_scenario s on s.scenario_key = f.scenario_key
group by 1
order by 1;

\echo '== Narrative anomalies should stand out against their own 12-month average =='
-- These are the months to point at during a demo. If the ratios are near 1.0 the
-- anomaly block in 002-seed-facts.sql did not apply.
with monthly as (
  select f.account_key, d.date_key, d.fiscal_year, sum(abs(f.amount)) as amt
  from demo.fact_gl f
  join demo.dim_date     d on d.date_key     = f.date_key
  join demo.dim_scenario s on s.scenario_key = f.scenario_key
  where s.is_actual and f.account_key in (10, 12, 20, 31)
  group by 1, 2, 3
),
-- The window has to be computed over the full year BEFORE the months of interest are
-- selected — filtering first would average the four chosen rows against themselves.
with_avg as (
  select m.*, avg(m.amt) over (partition by m.account_key, m.fiscal_year) as year_avg
  from monthly m
)
select
  a.account_code,
  a.account_name,
  w.date_key,
  round(w.amt, 0)      as month_amount,
  round(w.year_avg, 0) as year_avg,
  round(w.amt / nullif(w.year_avg, 0), 2) as ratio
from with_avg w
join demo.dim_account a on a.account_key = w.account_key
where w.date_key in (20240900, 20250300, 20230700, 20251100)
order by a.account_code, w.date_key;

\echo '== Determinism fingerprint — identical across rebuilds =='
-- Re-run the whole pipeline and compare. A changed checksum means something in the
-- generator stopped being deterministic.
select md5(string_agg(t, '|' order by t)) as fingerprint
from (
  select date_key || ':' || account_key || ':' || cost_center_key || ':' || scenario_key
         || ':' || amount as t
  from demo.fact_gl
) s;
