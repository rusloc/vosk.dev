-- Fact seed — 36 months × 3 scenarios of synthetic general-ledger activity.
--
-- Deterministic by construction: every "random" value is an md5 hash of a stable key, so
-- the same SQL always produces the same warehouse. That matters more than it sounds — a
-- demo dashboard whose numbers move between rebuilds cannot be screenshotted, written
-- about, or pointed at during a call.
--
-- Run after data/seed/001-seed-dimensions.sql. Idempotent (unique grain constraint).

-- Deterministic pseudo-random in [0, 1). The low-31-bit mask avoids the signed-integer
-- edge on bit(32) casts, which would otherwise skew half the distribution negative.
create or replace function demo.rnd(seed text) returns numeric
language sql immutable as $$
  select ((('x' || substr(md5(seed), 1, 8))::bit(32)::bigint & 2147483647)::numeric
          / 2147483647.0);
$$;

comment on function demo.rnd(text) is 'Stable hash-based noise for the demo seed. Not for production use.';

insert into demo.fact_gl (date_key, account_key, cost_center_key, scenario_key, amount)
with base_amount (account_key, monthly_base) as (
  -- Chosen so annual actual revenue lands near $18.4M and net margin near 14% —
  -- the figures the case-study copy quotes.
  values (10, 210000), (11,  48000), (12, 155000),
         (20,  60000), (21,  90000), (22,  35000),
         (30,  75000), (31, 110000), (32,   9000),
         (33,  38000), (34,  26000), (35,   4500),
         (40,  30000), (41,  14000)
),
cc_scale (cost_center_key, scale) as (
  values (1, 1.00), (2, 1.25), (3, 0.62), (4, 1.00),
         (5, 1.00), (6, 0.70), (7, 0.85), (8, 1.00)
),
grid as (
  select
    d.date_key,
    d.month_number,
    a.account_key,
    a.sign,
    a.statement_section,
    c.cost_center_key,
    s.scenario_key,
    s.scenario_name,
    b.monthly_base,
    cs.scale,
    -- 0-based month index across the three fiscal years, for the growth curve.
    ((d.fiscal_year - 2023) * 12 + d.month_number - 1) as month_index
  from demo.dim_date d
  cross join demo.dim_account a
  cross join demo.dim_cost_center c
  cross join demo.dim_scenario s
  join base_amount b on b.account_key = a.account_key
  join cc_scale   cs on cs.cost_center_key = c.cost_center_key
  -- Not every account belongs to every cost centre. A fully dense cube is the tell-tale
  -- sign of generated data; the gaps are what make the cost-centre breakdown look real.
  where case
    when a.statement_section = 'Revenue'    then c.is_revenue_owner
    when a.account_key in (20, 21, 22)      then c.business_function in ('Product', 'Delivery')
    when a.account_key = 31                 then c.cost_center_code = 'CC-200'
    when a.account_key = 32                 then c.business_function in ('Commercial', 'Delivery')
    when a.account_key in (33, 34, 40, 41)  then c.business_function = 'G&A'
    else true  -- salaries and software sit in every cost centre
  end
),
shaped as (
  select
    g.*,
    -- Compounding growth, ~0.5%/month → a touch under 20% across the three years.
    power(1.005, g.month_index) as growth,
    -- Seasonality hits revenue and variable COGS; overheads barely move month to month.
    case
      when g.statement_section = 'Revenue' or g.account_key in (20, 21) then
        case g.month_number
          when 1 then 0.92 when 2 then 0.94 when 3  then 1.06
          when 4 then 0.98 when 5 then 1.00 when 6  then 1.05
          when 7 then 0.88 when 8 then 0.85 when 9  then 1.02
          when 10 then 1.06 when 11 then 1.10 else 1.14
        end
      else 1.00
    end as seasonality,
    -- Narrative anomalies — the handful of months worth actually talking through on a
    -- demo call. Actuals only: a plan that already contains the surprise explains nothing.
    case
      when g.scenario_name <> 'Actual' then 1.00
      -- Sep 2024: a campaign that ran well past its budget.
      when g.account_key = 31 and g.date_key = 20240900 then 2.10
      -- Mar 2025: supplier price shock on direct materials.
      when g.account_key = 20 and g.date_key = 20250300 then 1.38
      -- Jul 2023: product revenue dips on a slipped release.
      when g.account_key = 10 and g.date_key = 20230700 then 0.78
      -- Nov 2025: an unusually large renewal cohort lands.
      when g.account_key = 12 and g.date_key = 20251100 then 1.15
      else 1.00
    end as anomaly
  from grid g
)
select
  s.date_key,
  s.account_key,
  s.cost_center_key,
  s.scenario_key,
  round(
    s.sign * s.monthly_base * s.scale * s.growth * s.seasonality *
    case s.scenario_name
      -- Budget is a smooth plan: no noise, optimistic on revenue, tight on cost.
      when 'Budget' then case when s.statement_section = 'Revenue' then 1.05 else 0.97 end
      -- Forecast is a lightly re-based plan — close to actual, without the surprises.
      when 'Forecast' then
        1.01 + (demo.rnd('fc:' || s.date_key || ':' || s.account_key || ':' || s.cost_center_key) - 0.5) * 0.04
      -- Actual carries the real dispersion, plus the anomalies above.
      else
        s.anomaly *
        (1 + (demo.rnd('ac:' || s.date_key || ':' || s.account_key || ':' || s.cost_center_key) - 0.5) * 0.12)
    end,
    2
  ) as amount
from shaped s
on conflict (date_key, account_key, cost_center_key, scenario_key) do nothing;
