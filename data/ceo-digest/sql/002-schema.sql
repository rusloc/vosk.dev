-- ceo_digest_demo tables — Tidewell, a fictional European SaaS SME (online booking and client management for small
-- health and wellness practices), seen the way its CEO's Monday email sees it: weekly. Drop-and-rebuild seed, applied
-- via MCP execute_sql by postgres (NOT a migration). Grants come from 001's default privileges. Views live in 003 (the
-- cascade below takes them, re-run 003 and 006 after this file); reference rows in 004, generated facts in 005, the
-- chat's functions in 006.
--
-- Grain: ISO week (Monday to Sunday) everywhere, 2024-W01 to 2026-W53. Money in EUR, numeric(14,2), signed only where
-- a column says so. Snapshots (receivables, payables) are taken at the week's close, Sunday night.
--
-- Two tables are finer than a week, for the data chat and the "email me this" workflow (docs/ceo-digest/
-- chat-and-email.md): dim_customer (one row per customer) and fact_customer_invoice (one row per charge or invoice).
-- Their customer counts reconcile exactly with the weekly facts; their amounts do not tie to the MRR bridge.

set search_path = ceo_digest_demo;

drop table if exists
     company, dim_week, dim_plan, dim_channel, dim_cash_category, kpi
    ,fact_mrr_weekly, fact_marketing_weekly, fact_target_weekly, fact_cash_weekly, fact_ar_weekly, fact_ap_weekly
    ,dim_customer, fact_customer_invoice
cascade;

-- ---------------------------------------------------------------- reference

-- One row: who the company is, and the policy the runway KPI is checked against.
create table company (
    company_id          smallint primary key check (company_id = 1),
    name                text not null,
    currency            char(3) not null default 'EUR',
    opening_cash_date   date not null check (extract(isodow from opening_cash_date) = 1), -- first week of the data
    opening_cash_eur    numeric(14,2) not null,
    min_runway_months   numeric(5,1) not null,  -- runway below this is flagged
    gross_margin_pct    numeric(4,3) not null,  -- subscription gross margin, for CAC payback
    -- "Today" for the chat and the email: a Sunday, the close of the last week they report. The weekly facts run on
    -- to the year's end (the plan, and the stories' endings); the 006 functions clamp every period to this date.
    data_as_of          date not null check (extract(isodow from data_as_of) = 7 and data_as_of > opening_cash_date)
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

-- Subscription plans. Starter and Pro pay monthly by card; Clinic is billed a year ahead by invoice, net 30.
create table dim_plan (
    plan_id         smallint primary key,
    code            text not null unique,
    name            text not null,
    billing         text not null check (billing in ('monthly_card', 'annual_invoice')),
    list_price_eur  numeric(8,2) not null,      -- per month, current list price (Clinic: average per account)
    sort            smallint not null
);

-- Acquisition channels. Outbound sales books demos, not trials: its leads are meetings and its customers won deals.
create table dim_channel (
    channel_id   smallint primary key,
    code         text not null unique,
    name         text not null,
    has_trial    boolean not null,
    paid_by      text not null check (paid_by in ('card', 'invoice')), -- ad platforms by card, the rest via payables
    sort         smallint not null
);

create table dim_cash_category (
    cash_category_id smallint primary key,
    code             text not null unique,
    name             text not null,
    flow             text not null check (flow in ('operating', 'investing', 'financing')),
    direction        smallint not null check (direction in (1, -1)), -- 1 = money in, -1 = money out
    sort             smallint not null
);

-- The KPI catalogue: what the email reports, how each KPI is read and when it gets flagged. The views compute the
-- values; this table decides which of them reach v_kpi_weekly and how they are judged.
--   flag_vs:   the base the flag compares against: target | ly (same week last year) | avg13 (mean of the 13
--              weeks before) | policy (runway below company.min_runway_months) | none
--   threshold: a relative move for eur and count KPIs (0.05 = 5 %), an absolute one for pct (0.02 = 2 points) and
--              months. A KPI is flagged when it moves the bad way (see `better`) by more than this.
create table kpi (
    kpi_code       text primary key,
    section        text not null check (section in ('growth', 'marketing', 'cash', 'working_capital')),
    name           text not null,
    unit           text not null check (unit in ('eur', 'pct', 'count', 'months')),
    better         text not null check (better in ('up', 'down')),
    flag_vs        text not null check (flag_vs in ('target', 'ly', 'avg13', 'policy', 'none')),
    flag_threshold numeric(8,3) not null default 0 check (flag_threshold >= 0),
    definition     text not null,
    sort           smallint not null
);

-- ---------------------------------------------------------------- recurring revenue

-- The MRR bridge, week × plan. Closing values are derived, so they can't disagree with their parts; a week's opening
-- equals the week before's closing (005 builds it that way, 001's acceptance checks it).
create table fact_mrr_weekly (
    week_start          date not null references dim_week,
    plan_id             smallint not null references dim_plan,
    customers_open      integer not null check (customers_open >= 0),
    customers_new       integer not null check (customers_new >= 0),
    customers_churned   integer not null check (customers_churned >= 0),
    customers_close     integer generated always as (customers_open + customers_new - customers_churned) stored,
    mrr_open            numeric(14,2) not null check (mrr_open >= 0),
    mrr_new             numeric(14,2) not null check (mrr_new >= 0),
    mrr_expansion       numeric(14,2) not null check (mrr_expansion >= 0),
    mrr_contraction     numeric(14,2) not null check (mrr_contraction >= 0),
    mrr_churn           numeric(14,2) not null check (mrr_churn >= 0),
    mrr_close           numeric(14,2) generated always as
                            (mrr_open + mrr_new + mrr_expansion - mrr_contraction - mrr_churn) stored,
    primary key (week_start, plan_id)
);

-- ---------------------------------------------------------------- marketing funnel

-- week × channel. Trials last 14 days: trials_ended are the trials started two weeks earlier, trials_converted the
-- ones that became paying customers. new_customers = trials_converted for trial channels, won deals for outbound;
-- their sum over channels equals fact_mrr_weekly.customers_new over plans, and new_mrr its mrr_new.
create table fact_marketing_weekly (
    week_start        date not null references dim_week,
    channel_id        smallint not null references dim_channel,
    spend_eur         numeric(14,2) not null check (spend_eur >= 0),
    mqls              integer not null check (mqls >= 0),        -- marketing-qualified leads (outbound: meetings)
    trials_started    integer not null check (trials_started >= 0),
    trials_ended      integer not null check (trials_ended >= 0),
    trials_converted  integer not null check (trials_converted >= 0 and trials_converted <= trials_ended),
    new_customers     integer not null check (new_customers >= 0),
    new_mrr           numeric(14,2) not null check (new_mrr >= 0),
    -- Ad platform figures: paid search and paid social only. The other channels carry 0 (their CPC and CTR are null).
    impressions       bigint  not null default 0 check (impressions >= 0),
    clicks            integer not null default 0 check (clicks >= 0 and clicks <= impressions),
    primary key (week_start, channel_id)
);

-- The plan, phased by week (company level).
create table fact_target_weekly (
    week_start           date primary key references dim_week,
    arr_target           numeric(14,2) not null,  -- ARR at the week's close
    net_new_mrr_target   numeric(14,2) not null,  -- that week's share of the year's net new MRR
    mqls_target          integer not null,
    marketing_budget     numeric(14,2) not null,
    cac_target           numeric(10,2) not null   -- blended CAC the year is planned at
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

-- ---------------------------------------------------------------- working capital

-- Receivables at the week's close by age. Only Clinic invoices (annual, net 30) create receivables.
create table fact_ar_weekly (
    week_start  date not null references dim_week,
    bucket      text not null check (bucket in ('not_due', 'overdue_1_30', 'overdue_31_60', 'overdue_61_90', 'overdue_90_plus')),
    amount_eur  numeric(14,2) not null check (amount_eur >= 0),
    primary key (week_start, bucket)
);

-- Payables at the week's close by due date (supplier invoices, net 30).
create table fact_ap_weekly (
    week_start  date not null references dim_week,
    bucket      text not null check (bucket in ('overdue', 'due_0_7', 'due_8_14', 'due_15_30')),
    amount_eur  numeric(14,2) not null check (amount_eur >= 0),
    primary key (week_start, bucket)
);

-- ---------------------------------------------------------------- customers (the chat's "clients" scope)

-- One row per customer ever: the opening base (signed up before 2024) and every new one since. The counts reconcile
-- with the weekly facts exactly: signups per week × plan = fact_mrr_weekly.customers_new, per week × channel =
-- fact_marketing_weekly.new_customers, churn dates per week × plan = customers_churned, and the customers active on a
-- week's Sunday = customers_close (005 builds it that way; the README lists the checks).
-- A customer stays on the plan it signed up for. Rows with signup_date after company.data_as_of exist (the weekly
-- facts run to the year's end); the 006 functions leave them out. customer_id is internal, in signup order.
create table dim_customer (
    customer_id    integer primary key,
    name           text not null unique,           -- fictional, from word lists
    practice_type  text not null check (practice_type in ('Physiotherapy', 'Beauty', 'Fitness')),
    city           text not null,
    country        text not null,
    plan_id        smallint not null references dim_plan,
    channel_id     smallint not null references dim_channel,   -- the channel that acquired it
    signup_date    date not null,
    churn_date     date check (churn_date > signup_date),      -- null = still a customer
    sites          smallint not null default 1 check (sites >= 1)
);

-- The functions scan this table whole (5,271 rows); these two only keep the foreign keys indexed.
create index dim_customer_plan_id_idx    on dim_customer (plan_id);
create index dim_customer_channel_id_idx on dim_customer (channel_id);

-- The "orders": what each customer was charged. Starter and Pro: one card charge a month while active, paid on the
-- day. Clinic: one invoice per contract year, net 30. Issued up to company.data_as_of only, and `status` is the state
-- on that date: paid | open (unpaid, not past due) | overdue (unpaid, past due).
-- One invoice per customer per day, so that pair is the key and its index serves every per-customer lookup.
create table fact_customer_invoice (
    customer_id   integer not null references dim_customer,
    invoice_date  date not null,
    due_date      date not null check (due_date >= invoice_date),
    paid_date     date check (paid_date >= invoice_date),
    amount_eur    numeric(10,2) not null check (amount_eur > 0),
    status        text not null check (status in ('paid', 'open', 'overdue')),
    primary key (customer_id, invoice_date),
    check ((status = 'paid') = (paid_date is not null))
);

-- Unpaid invoices are a few dozen rows out of ~120,000: "who is overdue" never reads the rest.
create index fact_customer_invoice_unpaid_idx on fact_customer_invoice (customer_id) where status <> 'paid';
