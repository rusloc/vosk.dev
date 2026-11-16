-- ceo_digest_demo tables — a fictional mid-size company that sells home and kitchen goods through three channels in
-- four regions, seen the way a CEO's Monday email sees it: weekly. Drop-and-rebuild seed, applied via MCP execute_sql
-- by postgres (NOT a migration). Grants come from 001's default privileges. Views live in 003 (drop them first: the
-- cascade below takes them too, re-run 003 after this file).
--
-- Grain: ISO week (Monday to Sunday) everywhere. Money in EUR, numeric(14,2), signed only where a column says so.
-- Snapshots (receivables, payables, pipeline) are taken at the week's close, Sunday night.

set search_path = ceo_digest_demo;

drop table if exists
     company, dim_week, dim_channel, dim_region, dim_category, dim_cash_category, dim_pipeline_stage, kpi
    ,fact_sales_weekly, fact_orders_weekly, fact_sales_target_weekly, fact_cash_weekly, fact_cash_forecast
    ,fact_ar_weekly, fact_ap_weekly, fact_pipeline_weekly, fact_pipeline_flow_weekly
cascade;

-- ---------------------------------------------------------------- reference

-- One row: who the company is, and the two numbers the cash KPIs hang on.
create table company (
    company_id          smallint primary key check (company_id = 1),
    name                text not null,
    currency            char(3) not null default 'EUR',
    opening_cash_date   date not null check (extract(isodow from opening_cash_date) = 1), -- first week of the data
    opening_cash_eur    numeric(14,2) not null,
    min_cash_eur        numeric(14,2) not null   -- cash buffer policy: the 13-week low point is checked against it
);

create table dim_week (
    week_start      date primary key check (extract(isodow from week_start) = 1),
    iso_year        smallint not null,
    iso_week        smallint not null check (iso_week between 1 and 53),
    week_label      text not null,              -- 'W46 2026'
    month_start     date not null,              -- the month that holds the week's Thursday
    ly_week_start   date,                       -- same ISO week a year earlier (W53 → W52); null in the first year
    unique (iso_year, iso_week)
);

create table dim_channel (
    channel_id          smallint primary key,
    code                text not null unique,
    name                text not null,
    payment_terms_days  smallint not null,      -- 0 = paid at order (online); > 0 = sold on credit, counts for DSO
    sort                smallint not null
);

create table dim_region (
    region_id   smallint primary key,
    code        text not null unique,
    name        text not null,
    sort        smallint not null
);

create table dim_category (
    category_id smallint primary key,
    code        text not null unique,
    name        text not null,
    sort        smallint not null
);

create table dim_cash_category (
    cash_category_id smallint primary key,
    code             text not null unique,
    name             text not null,
    flow             text not null check (flow in ('operating', 'investing', 'financing')),
    direction        smallint not null check (direction in (1, -1)), -- 1 = money in, -1 = money out
    sort             smallint not null
);

create table dim_pipeline_stage (
    stage_id    smallint primary key,
    code        text not null unique,
    name        text not null,
    probability numeric(4,3) not null check (probability between 0 and 1), -- weight for the weighted pipeline
    sort        smallint not null
);

-- The KPI catalogue: what the email reports, how each KPI is read and when it gets flagged. The views compute the
-- values; this table decides which of them reach v_kpi_weekly and how they are judged.
--   flag_vs:   which base the flag compares against: target | ly | prev | policy (below company.min_cash_eur) | none
--   threshold: a relative move for eur and count KPIs (0.05 = 5 %), an absolute one for pct (0.02 = 2 points) and
--              days (5 = 5 days). A KPI is flagged when it moves the bad way (see `better`) by more than this.
create table kpi (
    kpi_code       text primary key,
    section        text not null check (section in ('sales', 'customers', 'cash', 'working_capital', 'pipeline')),
    name           text not null,
    unit           text not null check (unit in ('eur', 'pct', 'count', 'days')),
    better         text not null check (better in ('up', 'down')),
    flag_vs        text not null check (flag_vs in ('target', 'ly', 'prev', 'policy', 'none')),
    flag_threshold numeric(8,3) not null default 0 check (flag_threshold >= 0),
    definition     text not null,
    sort           smallint not null
);

-- ---------------------------------------------------------------- sales

-- week × channel × region × category. net_sales is derived, so it can't disagree with its parts.
create table fact_sales_weekly (
    week_start   date not null references dim_week,
    channel_id   smallint not null references dim_channel,
    region_id    smallint not null references dim_region,
    category_id  smallint not null references dim_category,
    units        integer not null check (units >= 0),
    gross_sales  numeric(14,2) not null check (gross_sales >= 0),
    discounts    numeric(14,2) not null check (discounts >= 0),
    returns      numeric(14,2) not null check (returns >= 0),
    net_sales    numeric(14,2) generated always as (gross_sales - discounts - returns) stored,
    cogs         numeric(14,2) not null check (cogs >= 0),
    primary key (week_start, channel_id, region_id, category_id)
);

-- week × channel × region. Orders span categories, so they get their own grain instead of being split.
create table fact_orders_weekly (
    week_start     date not null references dim_week,
    channel_id     smallint not null references dim_channel,
    region_id      smallint not null references dim_region,
    orders         integer not null check (orders >= 0),
    new_customers  integer not null check (new_customers >= 0), -- first order ever (online) or new account (others)
    primary key (week_start, channel_id, region_id)
);

-- The budget, phased by week: week × channel × region.
create table fact_sales_target_weekly (
    week_start           date not null references dim_week,
    channel_id           smallint not null references dim_channel,
    region_id            smallint not null references dim_region,
    net_sales_target     numeric(14,2) not null,
    gross_margin_target  numeric(14,2) not null,
    primary key (week_start, channel_id, region_id)
);

-- ---------------------------------------------------------------- cash

-- Bank movements, week × cash category. amount_eur is signed: + in, − out (its sign follows the category's direction).
-- Closing cash = company.opening_cash_eur + every week's net up to that week.
create table fact_cash_weekly (
    week_start        date not null references dim_week,
    cash_category_id  smallint not null references dim_cash_category,
    amount_eur        numeric(14,2) not null,
    primary key (week_start, cash_category_id)
);

-- The rolling 13-week cash forecast, re-issued every Monday: issued_week covers itself and the 12 weeks after it.
-- The forecast issued on a week's Monday for that same week is the one its actuals are judged against.
create table fact_cash_forecast (
    issued_week       date not null references dim_week,
    week_start        date not null references dim_week,
    cash_category_id  smallint not null references dim_cash_category,
    amount_eur        numeric(14,2) not null, -- signed like fact_cash_weekly
    primary key (issued_week, week_start, cash_category_id),
    check (week_start >= issued_week and week_start < issued_week + 91)
);

-- ---------------------------------------------------------------- working capital

-- Receivables at the week's close by age, per channel (online is paid at order and carries none).
create table fact_ar_weekly (
    week_start  date not null references dim_week,
    channel_id  smallint not null references dim_channel,
    bucket      text not null check (bucket in ('not_due', 'overdue_1_30', 'overdue_31_60', 'overdue_61_90', 'overdue_90_plus')),
    amount_eur  numeric(14,2) not null check (amount_eur >= 0),
    primary key (week_start, channel_id, bucket)
);

-- Payables at the week's close by due date.
create table fact_ap_weekly (
    week_start  date not null references dim_week,
    bucket      text not null check (bucket in ('due_next_week', 'due_later', 'overdue_1_30', 'overdue_31_plus')),
    amount_eur  numeric(14,2) not null check (amount_eur >= 0),
    primary key (week_start, bucket)
);

-- ---------------------------------------------------------------- pipeline (retail partners and B2B accounts)

-- Open deals at the week's close, by stage.
create table fact_pipeline_weekly (
    week_start      date not null references dim_week,
    channel_id      smallint not null references dim_channel,
    stage_id        smallint not null references dim_pipeline_stage,
    open_deals      integer not null check (open_deals >= 0),
    open_value_eur  numeric(14,2) not null check (open_value_eur >= 0), -- expected first-year value
    primary key (week_start, channel_id, stage_id)
);

-- What moved during the week.
create table fact_pipeline_flow_weekly (
    week_start         date not null references dim_week,
    channel_id         smallint not null references dim_channel,
    created_deals      integer not null check (created_deals >= 0),
    created_value_eur  numeric(14,2) not null check (created_value_eur >= 0),
    won_deals          integer not null check (won_deals >= 0),
    won_value_eur      numeric(14,2) not null check (won_value_eur >= 0),
    lost_deals         integer not null check (lost_deals >= 0),
    lost_value_eur     numeric(14,2) not null check (lost_value_eur >= 0),
    primary key (week_start, channel_id)
);
