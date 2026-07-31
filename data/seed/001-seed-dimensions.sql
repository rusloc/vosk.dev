-- Dimension seed. Deterministic and idempotent — re-running produces identical rows.
-- Run after data/schema/001-create-warehouse.sql.

-- ---------------------------------------------------------------------------
-- dim_date — 36 months, FY2023–FY2025
-- ---------------------------------------------------------------------------

insert into demo.dim_date (
  date_key, period_start, period_end, fiscal_year,
  fiscal_quarter, quarter_label, month_number, month_name, month_short
)
select
  (extract(year from m)::int * 10000 + extract(month from m)::int * 100)::int,
  m::date,
  (m + interval '1 month - 1 day')::date,
  extract(year from m)::smallint,
  extract(quarter from m)::smallint,
  'FY' || extract(year from m)::int || ' Q' || extract(quarter from m)::int,
  extract(month from m)::smallint,
  trim(to_char(m, 'Month')),
  to_char(m, 'Mon')
from generate_series(date '2023-01-01', date '2025-12-01', interval '1 month') as m
on conflict (date_key) do nothing;

-- ---------------------------------------------------------------------------
-- dim_account — P&L hierarchy, ordered for the waterfall
-- ---------------------------------------------------------------------------

insert into demo.dim_account (
  account_key, account_code, account_name, statement_section, account_group, sign, sort_order
) values
  (10, '4000', 'Product revenue',        'Revenue', 'Recurring',      1, 10),
  (11, '4100', 'Services revenue',       'Revenue', 'Non-recurring',  1, 20),
  (12, '4200', 'Subscription revenue',   'Revenue', 'Recurring',      1, 30),
  (20, '5000', 'Direct materials',       'COGS',    'Variable',      -1, 40),
  (21, '5100', 'Direct labour',          'COGS',    'Variable',      -1, 50),
  (22, '5200', 'Hosting & infrastructure','COGS',   'Fixed',         -1, 60),
  (30, '6000', 'Salaries & wages',       'Opex',    'People',        -1, 70),
  (31, '6100', 'Marketing',              'Opex',    'Go-to-market',  -1, 80),
  (32, '6200', 'Travel & entertainment', 'Opex',    'Go-to-market',  -1, 90),
  (33, '6300', 'Facilities',             'Opex',    'Overhead',      -1, 100),
  (34, '6400', 'Professional fees',      'Opex',    'Overhead',      -1, 110),
  (35, '6500', 'Software & tools',       'Opex',    'Overhead',      -1, 120),
  (40, '7000', 'Depreciation',           'Other',   'Non-cash',      -1, 130),
  (41, '7100', 'Interest expense',       'Other',   'Financing',     -1, 140)
on conflict (account_key) do nothing;

-- ---------------------------------------------------------------------------
-- dim_cost_center
-- ---------------------------------------------------------------------------

insert into demo.dim_cost_center (
  cost_center_key, cost_center_code, cost_center_name, business_function, region, is_revenue_owner
) values
  (1, 'CC-100', 'Sales — EMEA',       'Commercial', 'EMEA',     true),
  (2, 'CC-110', 'Sales — Americas',   'Commercial', 'Americas', true),
  (3, 'CC-120', 'Sales — APAC',       'Commercial', 'APAC',     true),
  (4, 'CC-200', 'Marketing',          'Commercial', 'Global',   false),
  (5, 'CC-300', 'Engineering — EMEA', 'Product',    'EMEA',     false),
  (6, 'CC-310', 'Engineering — APAC', 'Product',    'APAC',     false),
  (7, 'CC-400', 'Customer Success',   'Delivery',   'Global',   true),
  (8, 'CC-500', 'Finance & Admin',    'G&A',        'Global',   false)
on conflict (cost_center_key) do nothing;

-- ---------------------------------------------------------------------------
-- dim_scenario
-- ---------------------------------------------------------------------------

insert into demo.dim_scenario (scenario_key, scenario_name, is_actual) values
  (1, 'Actual',   true),
  (2, 'Budget',   false),
  (3, 'Forecast', false)
on conflict (scenario_key) do nothing;
