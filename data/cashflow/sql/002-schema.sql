-- cashflow_demo tables — one per artifact the ACME Cash Flow report reads (src/lib/cashflow/data/manifest.ts FILES), so
-- the server route (src/lib/cashflow/artifacts.ts) reproduces every Parquet file of data/cashflow/parquet, in the same
-- row order. Drop-and-rebuild seed, applied via MCP execute_sql by postgres (NOT a migration). The grants come from
-- 001-schema-and-roles.sql's default privileges. Loaded by scripts/cashflow-load.ts as cashflow_loader.
--
-- Types: the FILES column kinds map int → integer (money is integer cents), num → double precision, str → text. Each
-- table keeps the file's row order in `seq`. Written from FILES on 2026-11-26.

set search_path = cashflow_demo;

drop table if exists document, month, statement_month, ledger, control cascade;

-- manifest.json, verbatim: the browser validates it with the same strict Zod schema.
create table if not exists document (
    name text primary key check (name = 'manifest.json'),
    doc  jsonb not null
);

-- month (34): cash, P&L and balance inputs of the KPIs, cents
create table if not exists month (
    seq                  integer primary key,
    month_key            text    not null,
    cash_open            integer not null,
    cash_close           integer not null,
    net_income           integer not null,
    revenue              integer not null,
    interest_expense     integer not null,
    depreciation_expense integer not null,
    ar_close             integer not null,
    ap_close             integer not null,
    spend                integer not null,
    debt_close           integer not null,
    term_principal       integer not null
);

-- statement account × month (dense): the indirect adjustment, cents
create table if not exists statement_month (
    seq              integer primary key,
    account_id       integer not null,
    month_key        text    not null,
    adjustment_cents integer not null
);

-- transaction × direct line × counterparty × sign: the cash movements, cents (in +, out −)
create table if not exists ledger (
    seq             integer primary key,
    txn_date        text    not null,
    line_code       text    not null,
    counterparty_id integer not null,
    txn_id          integer not null,
    txn_type        text    not null,
    doc_number      text    not null,
    amount_cents    integer not null,
    cleared         text    not null,
    memo            text    not null
);

-- the control totals the Reconciliation pop-up shows (months and years)
create table if not exists control (
    seq         integer primary key,
    period_key  text             not null,
    metric_code text             not null,
    scope       text             not null,
    value       double precision not null
);
