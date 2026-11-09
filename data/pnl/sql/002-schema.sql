-- pnl_demo tables — the P&L report's rows as the Parquet files carried them (data/pnl/parquet, built in rusloc/pnl),
-- so the server route (src/lib/pnl/artifacts.ts) reproduces every chunk the browser reads
-- (src/lib/pnl/data/columns-loader.ts), in the same row order. Drop-and-rebuild seed, applied via MCP execute_sql by
-- postgres (NOT a migration). The grants come from 001-schema-and-roles.sql's default privileges. Loaded by
-- scripts/pnl-load.ts as pnl_loader.
--
-- The fact tables keep the Parquet's integer codes (indexes into manifest.dict and dim_month) and local-currency cents
-- (double precision, as the Parquet's DOUBLE), so the route's JSON carries exactly the loaded values. The lookup
-- tables below them are the manifest's dictionaries and dimensions in relational form, for SQL over the facts
-- (the chat's answer key, data/pnl/checks); the report itself reads the manifest document.

set search_path = pnl_demo;

drop table if exists document, pl_p, pl_s, ops, dict_code, dim_month, dim_account, dim_region, fact_fx_rate cascade;

-- manifest.json, verbatim: the browser validates it with the same strict Zod schema as before.
create table if not exists document (
    name text primary key check (name = 'manifest.json'),
    doc  jsonb not null
);

-- pl-P.parquet: ACME Consumer Products, every version × month × slice × account row (334,700 rows, 2026-10-28 build).
create table if not exists pl_p (
    seq          integer primary key,
    month_idx    integer not null,
    version      integer not null,
    region       integer not null,
    channel      integer not null,
    line         integer not null,
    segment      integer not null,
    account      integer not null,
    counterparty integer not null,
    cents        double precision not null
);
create index if not exists pl_p_chunk on pl_p (version, month_idx, seq);

-- pl-S.parquet: ACME Commerce Cloud (88,012 rows).
create table if not exists pl_s (
    seq          integer primary key,
    month_idx    integer not null,
    version      integer not null,
    region       integer not null,
    channel      integer not null,
    line         integer not null,
    segment      integer not null,
    account      integer not null,
    counterparty integer not null,
    cents        double precision not null
);
create index if not exists pl_s_chunk on pl_s (version, month_idx, seq);

-- ops.parquet: both entities' operational facts (units, GMV, month-end active merchants; 26,784 rows).
create table if not exists ops (
    seq       integer primary key,
    entity    integer not null,
    month_idx integer not null,
    version   integer not null,
    region    integer not null,
    channel   integer not null,
    line      integer not null,
    segment   integer not null,
    units     integer not null,
    gmv_cents double precision not null,
    merchants integer not null
);

-- manifest.dict: the code of each integer index, per dictionary (entity, version, region, channel, line, segment,
-- account, counterparty).
create table if not exists dict_code (
    dict text not null,
    idx  integer not null,
    code text not null,
    primary key (dict, idx)
);

-- manifest.tables.dim_month: month_idx → calendar.
create table if not exists dim_month (
    month_index  integer primary key,
    month_key    text not null unique,
    fiscal_year  integer not null,
    quarter      text not null,
    month_number integer not null,
    is_closed    boolean not null
);

-- manifest.tables.dim_account: what each account is and where it sits in the statement.
create table if not exists dim_account (
    account_code    text primary key,
    account_name    text not null,
    block_code      text not null,
    is_below_cm     boolean not null,
    is_intercompany boolean not null,
    natural_sign    integer not null
);

-- manifest.tables.dim_region: the functional currency each region books in.
create table if not exists dim_region (
    region_code         text primary key,
    region_name         text not null,
    functional_currency text not null
);

-- manifest.tables.fact_fx_rate: local currency per USD, by month and rate type (ACTUAL_AVG, BUDGET).
create table if not exists fact_fx_rate (
    currency_code text not null,
    month_key     text not null,
    rate_type     text not null,
    local_per_usd double precision not null,
    primary key (currency_code, month_key, rate_type)
);
