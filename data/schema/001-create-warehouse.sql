-- Demo warehouse — Finance / P&L star schema.
--
-- Backs the public Superset showcase on vosk.dev/work. Every figure in it is SYNTHETIC and
-- generated from this repo (see data/seed/); no client data reaches the public showcase.
--
-- Grain: one row per month × account × cost centre × scenario. A general ledger is
-- transactional in reality, but a P&L dashboard reads it at month grain, and generating at
-- the grain you report at keeps the seed honest about what it can answer.
--
-- Sign convention: amounts are SIGNED — revenue positive, costs negative — so a plain
-- SUM(amount) down the account hierarchy is net profit, and a waterfall needs no CASE
-- expression per section. dim_account.sign records the expected direction for validation.
--
-- Idempotent: safe to re-run. Drops and rebuilds the schema.

drop schema if exists demo cascade;
create schema demo;

-- ---------------------------------------------------------------------------
-- Dimensions
-- ---------------------------------------------------------------------------

-- Month grain. `date_key` is yyyymm00 so it stays sortable and joinable as an integer
-- while `period_start` gives Superset a real date column for its time filters.
create table demo.dim_date (
  date_key        integer     primary key,
  period_start    date        not null unique,
  period_end      date        not null,
  fiscal_year     smallint    not null,
  fiscal_quarter  smallint    not null,
  quarter_label   text        not null,
  month_number    smallint    not null,
  month_name      text        not null,
  month_short     text        not null
);

comment on table demo.dim_date is 'Month-grain calendar. Fiscal year = calendar year for this demo.';

create table demo.dim_account (
  account_key       smallint  primary key,
  account_code      text      not null unique,
  account_name      text      not null,
  -- Statement section drives the waterfall: Revenue → COGS → Opex → Other.
  statement_section text      not null,
  -- Sub-grouping within a section, for the cost-breakdown charts.
  account_group     text      not null,
  -- Expected direction of `amount`: +1 for income, -1 for cost. Validation, not arithmetic.
  sign              smallint  not null,
  sort_order        smallint  not null,
  constraint dim_account_sign_ck check (sign in (-1, 1))
);

create table demo.dim_cost_center (
  cost_center_key  smallint  primary key,
  cost_center_code text      not null unique,
  cost_center_name text      not null,
  business_function text     not null,
  region           text      not null,
  -- Only revenue-owning centres carry income accounts; see the seed's applicability rule.
  is_revenue_owner boolean   not null default false
);

create table demo.dim_scenario (
  scenario_key  smallint  primary key,
  scenario_name text      not null unique,
  -- Budget and forecast are plans; actual is what happened. Charts default to actual.
  is_actual     boolean   not null
);

-- ---------------------------------------------------------------------------
-- Fact
-- ---------------------------------------------------------------------------

create table demo.fact_gl (
  gl_key          bigserial primary key,
  date_key        integer   not null references demo.dim_date (date_key),
  account_key     smallint  not null references demo.dim_account (account_key),
  cost_center_key smallint  not null references demo.dim_cost_center (cost_center_key),
  scenario_key    smallint  not null references demo.dim_scenario (scenario_key),
  amount          numeric(14, 2) not null,
  -- One row per combination; the seed relies on this to stay re-runnable.
  constraint fact_gl_grain_uq unique (date_key, account_key, cost_center_key, scenario_key)
);

-- Every dashboard query filters by period and scenario first, then slices by account or
-- cost centre — so lead with those two rather than indexing each key separately.
create index fact_gl_period_scenario_ix on demo.fact_gl (date_key, scenario_key);
create index fact_gl_account_ix         on demo.fact_gl (account_key);
create index fact_gl_cost_center_ix     on demo.fact_gl (cost_center_key);

-- ---------------------------------------------------------------------------
-- Reporting view
-- ---------------------------------------------------------------------------

-- Register THIS as the Superset dataset rather than fact_gl. Superset's chart builder is
-- far easier to work in against a flat, labelled table, and it keeps the star schema free
-- to change shape without editing every chart.
create view demo.v_pl_monthly as
select
  d.period_start,
  d.fiscal_year,
  d.quarter_label,
  d.month_short,
  a.account_code,
  a.account_name,
  a.statement_section,
  a.account_group,
  a.sort_order   as account_sort_order,
  c.cost_center_code,
  c.cost_center_name,
  c.business_function,
  c.region,
  s.scenario_name,
  s.is_actual,
  f.amount
from demo.fact_gl f
join demo.dim_date        d on d.date_key        = f.date_key
join demo.dim_account     a on a.account_key     = f.account_key
join demo.dim_cost_center c on c.cost_center_key = f.cost_center_key
join demo.dim_scenario    s on s.scenario_key    = f.scenario_key;

comment on view demo.v_pl_monthly is 'Flattened P&L for Superset. Register as the dataset; amounts are signed.';
