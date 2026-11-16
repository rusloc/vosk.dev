-- ceo_digest_demo — the data behind the weekly CEO KPI email (an n8n workflow, vosk.dev automation showcase), and its
-- two roles. Pattern: data/nordmark/sql/001-schema-and-roles.sql, 2026-11-16. Applied via MCP execute_sql (NOT a
-- migration: schema_migrations stays qbo's). Idempotent; safe to re-run.
--
--   * ceo_digest_loader — fills the tables from the owner's machine (loader script, after the data design is accepted).
--     Created NOLOGIN here; the owner enables login once, in the Supabase SQL editor:
--         alter role ceo_digest_loader login password '<generated, 32+ chars>';
--   * ceo_digest_reader — held by n8n (n8n.vosk.dev, a Postgres credential, Session pooler port 5432), NOT by the
--     site. Reads ceo_digest_demo and nothing else. Same owner step:
--         alter role ceo_digest_reader login password '<generated, 32+ chars>';
--
-- Tables and views are created by `postgres` from 002 / 003; the default privileges below carry the grants to them.
-- No RLS, like qbo: the schema is not on the Data API (anon / authenticated get no USAGE) and the grants are the
-- boundary. Never grant either role anything in qbo, demo_sales, another <report>_demo or public.

create schema if not exists ceo_digest_demo authorization postgres;
revoke all on schema ceo_digest_demo from public;
comment on schema ceo_digest_demo is
    'Synthetic weekly sales, cash, working capital and pipeline figures of a fictional company, for the weekly CEO KPI email (n8n showcase on vosk.dev). Read by ceo_digest_reader only.';

do $$
begin
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'ceo_digest_loader') then
        create role ceo_digest_loader nologin nobypassrls noinherit;
    end if;
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'ceo_digest_reader') then
        create role ceo_digest_reader nologin nobypassrls noinherit;
    end if;
end
$$;

comment on role ceo_digest_loader is
    'Loads schema ceo_digest_demo from the owner machine (vosk.dev CEO weekly digest). NOLOGIN until the owner sets a password. Must never be granted anything outside ceo_digest_demo.';
comment on role ceo_digest_reader is
    'Read-only reader of schema ceo_digest_demo for the n8n CEO weekly digest workflow. NOLOGIN until the owner sets a password. Must never be granted anything outside ceo_digest_demo.';

-- Loader: few connections, long statements (inserts in batches).
alter role ceo_digest_loader connection limit 4;
alter role ceo_digest_loader set statement_timeout = '10min';
alter role ceo_digest_loader set search_path = ceo_digest_demo;

-- Reader: hardened like cube_reader. One n8n workflow, a handful of queries a week: a low connection limit.
-- default_transaction_read_only is a guard rail, not a boundary (applies at LOGIN only).
alter role ceo_digest_reader connection limit 5;
alter role ceo_digest_reader set statement_timeout = '15s';
alter role ceo_digest_reader set search_path = ceo_digest_demo;
alter role ceo_digest_reader set default_transaction_read_only = on;

grant usage on schema ceo_digest_demo to ceo_digest_loader, ceo_digest_reader;

-- Existing relations (none on first run; everything after a 002 / 003 rebuild).
grant select, insert, update, delete, truncate on all tables    in schema ceo_digest_demo to ceo_digest_loader;
grant usage, select                            on all sequences in schema ceo_digest_demo to ceo_digest_loader;
grant select                                   on all tables    in schema ceo_digest_demo to ceo_digest_reader;

-- Future relations created by postgres in this schema (002 / 003 and their rebuilds). Views count as tables here.
alter default privileges for role postgres in schema ceo_digest_demo
    grant select, insert, update, delete, truncate on tables to ceo_digest_loader;
alter default privileges for role postgres in schema ceo_digest_demo
    grant usage, select on sequences to ceo_digest_loader;
alter default privileges for role postgres in schema ceo_digest_demo
    grant select on tables to ceo_digest_reader;

-- Lets `postgres` run `set role …` for the acceptance tests. Both roles are NOINHERIT and hold nothing postgres lacks.
grant ceo_digest_loader to postgres;
grant ceo_digest_reader to postgres;

-- ---------------------------------------------------------------------------
-- Acceptance — run AS each role, against REAL rows, one block per MCP call.
-- ---------------------------------------------------------------------------
-- A. Denials on real rows in other schemas (expected: 42501, for BOTH roles):
--      begin; set local role ceo_digest_reader; select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role ceo_digest_reader; select count(*) from qbo.dim_account;        commit;
--      begin; set local role ceo_digest_loader; select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role ceo_digest_loader; select count(*) from qbo.dim_account;        commit;
-- B. The sweep (same query as data/nordmark/sql/001): every schema either role has USAGE on.
--    Expected: ceo_digest_demo and public only; public 0/0.
-- C. anon / authenticated have no USAGE on ceo_digest_demo (has_schema_privilege → false).
-- D. After the load: reader reads every view; reader insert → 42501.
-- E. MCP get_advisors(security) → zero lints.
