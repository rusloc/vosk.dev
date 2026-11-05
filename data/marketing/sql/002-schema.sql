-- marketing_demo tables — one per artifact the ACME Marketing report reads (src/lib/marketing/data/manifest.ts FILES),
-- so the server route (src/lib/marketing/artifacts.ts) reproduces every Parquet file of the pack's public/data, in
-- the same row order. Drop-and-rebuild seed, applied via MCP execute_sql by postgres (NOT a migration). The grants
-- come from 001-schema-and-roles.sql's default privileges. Loaded by scripts/marketing-load.ts as marketing_loader.
--
-- Types: the FILES column kinds map int → integer, num → double precision (JSON carries JS numbers, as Parquet
-- did). Each table keeps the file's row order in `seq`. Generated from FILES on 2026-11-05; regenerate if a spec
-- changes (the loader's verify fails loudly when they disagree).

set search_path = marketing_demo;

drop table if exists document, campaign_day, cohort_month, retention, journey_day, traffic_page_day, segment_day, term_day cascade;
-- manifest.json, verbatim: the browser validates it with the same strict Zod schema as before.
create table if not exists document (
    name text primary key check (name = 'manifest.json'),
    doc  jsonb not null
);

create table if not exists campaign_day (
    seq                    integer primary key,
    day_ix                 integer not null,
    camp_ix                integer not null,
    impressions            integer not null,
    clicks                 integer not null,
    spend_usd              double precision not null,
    reach_7d               integer not null,
    sessions               integer not null,
    store_views            integer not null,
    installs               integer not null,
    signups                integer not null,
    activated              integer not null,
    trials                 integer not null,
    act_lt1h               integer not null,
    act_1_6h               integer not null,
    act_6_24h              integer not null,
    act_1_2d               integer not null,
    act_2_4d               integer not null,
    act_4_7d               integer not null,
    act_7_30d              integer not null,
    paid_dda               double precision not null,
    paid_last_click        double precision not null,
    paid_first_touch       double precision not null,
    paid_platform          double precision not null,
    mrr_dda                double precision not null,
    mrr_last_click         double precision not null,
    mrr_first_touch        double precision not null,
    mrr_platform           double precision not null
);

create table if not exists cohort_month (
    seq                    integer primary key,
    cohort_month_ix        integer not null,
    camp_ix                integer not null,
    month_offset           integer not null,
    customers_start        double precision not null,
    churned                double precision not null,
    customers_end          double precision not null,
    revenue_usd            double precision not null,
    refunds_usd            double precision not null,
    refund_count           double precision not null
);

create table if not exists retention (
    seq                    integer primary key,
    cohort_month_ix        integer not null,
    camp_ix                integer not null,
    day_n                  integer not null,
    users_matured          integer not null,
    users_active           integer not null
);

create table if not exists journey_day (
    seq                    integer primary key,
    day_ix                 integer not null,
    camp_ix                integer not null,
    step_verified          integer not null,
    step_workspace         integer not null,
    step_connected         integer not null,
    step_invited           integer not null,
    first_opens            integer not null
);

create table if not exists traffic_page_day (
    seq                    integer primary key,
    day_ix                 integer not null,
    camp_ix                integer not null,
    page_ix                integer not null,
    sessions               integer not null,
    bounces                integer not null,
    lcp_x_sessions         double precision not null,
    store_views            integer not null,
    installs               integer not null,
    signups                integer not null
);

create table if not exists segment_day (
    seq                    integer primary key,
    day_ix                 integer not null,
    camp_ix                integer not null,
    seg_ix                 integer not null,
    signups                integer not null,
    activated_7d           integer not null
);

create table if not exists term_day (
    seq                    integer primary key,
    day_ix                 integer not null,
    term_ix                integer not null,
    impressions            integer not null,
    clicks                 integer not null,
    spend_usd              double precision not null,
    signups                integer not null
);
