-- ceo_digest_demo — the data behind the Tidewell data chat and its "email me this" n8n workflow (vosk.dev automation
-- showcase; docs/ceo-digest/chat-and-email.md), and its three roles. Pattern: data/nordmark/sql/001-schema-and-roles.sql,
-- 2026-11-16. Applied via MCP execute_sql (NOT a migration: schema_migrations stays qbo's). Idempotent; safe to re-run.
--
--   * ceo_digest_loader — can refill the tables (005 is a SQL generator; a loader login is optional, the owner's call).
--     Created NOLOGIN here; the owner enables login once, in the Supabase SQL editor:
--         alter role ceo_digest_loader login password '<generated, 32+ chars>';
--   * ceo_digest_reader — held by the site's chat route (Vercel env CEO_DIGEST_DATABASE_URL, Session pooler port
--     5432). Reads ceo_digest_demo and nothing else. Same owner step:
--         alter role ceo_digest_reader login password '<generated, 32+ chars>';
--   * ceo_digest_n8n — held by the n8n email workflow (n8n.vosk.dev, a Postgres credential, Session pooler port
--     5432). The same rights as ceo_digest_reader under a login of its own: one credential per holder, so either can
--     be rotated or cut off without touching the other. Same owner step:
--         alter role ceo_digest_n8n login password '<generated, 32+ chars>';
--
-- Tables, views and functions are created by `postgres` from 002 / 003 / 006; the default privileges below carry the
-- grants to them. The readers get SELECT on the tables and views and EXECUTE on the functions (006, security invoker:
-- a function reads with its caller's grants).
-- No RLS, like qbo: the schema is not on the Data API (anon / authenticated get no USAGE) and the grants are the
-- boundary. Never grant any of these roles anything in qbo, demo_sales, another <report>_demo or public.

create schema if not exists ceo_digest_demo authorization postgres;
revoke all on schema ceo_digest_demo from public;
comment on schema ceo_digest_demo is
    'Synthetic SaaS figures (weekly MRR, marketing funnel, cash, receivables, payables; customers and their invoices) of a fictional company, for the data chat and its email workflow (n8n showcase on vosk.dev). Read by ceo_digest_reader (the site) and ceo_digest_n8n (n8n) only.';

do $$
begin
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'ceo_digest_loader') then
        create role ceo_digest_loader nologin nobypassrls noinherit;
    end if;
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'ceo_digest_reader') then
        create role ceo_digest_reader nologin nobypassrls noinherit;
    end if;
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'ceo_digest_n8n') then
        create role ceo_digest_n8n nologin nobypassrls noinherit;
    end if;
end
$$;

comment on role ceo_digest_loader is
    'Loads schema ceo_digest_demo from the owner machine (vosk.dev CEO weekly digest). NOLOGIN until the owner sets a password. Must never be granted anything outside ceo_digest_demo.';
comment on role ceo_digest_reader is
    'Read-only reader of schema ceo_digest_demo for the vosk.dev data chat route (Vercel env CEO_DIGEST_DATABASE_URL). NOLOGIN until the owner sets a password. Must never be granted anything outside ceo_digest_demo.';
comment on role ceo_digest_n8n is
    'Read-only reader of schema ceo_digest_demo for the n8n "email me this" workflow. NOLOGIN until the owner sets a password. Must never be granted anything outside ceo_digest_demo.';

-- Loader: few connections, long statements (inserts in batches).
alter role ceo_digest_loader connection limit 4;
alter role ceo_digest_loader set statement_timeout = '10min';
alter role ceo_digest_loader set search_path = ceo_digest_demo;

-- Readers: hardened like cube_reader. A chat route and one workflow, a few short queries per question: a low
-- connection limit. default_transaction_read_only is a guard rail, not a boundary (applies at LOGIN only).
alter role ceo_digest_reader connection limit 5;
alter role ceo_digest_reader set statement_timeout = '15s';
alter role ceo_digest_reader set search_path = ceo_digest_demo;
alter role ceo_digest_reader set default_transaction_read_only = on;

alter role ceo_digest_n8n connection limit 5;
alter role ceo_digest_n8n set statement_timeout = '15s';
alter role ceo_digest_n8n set search_path = ceo_digest_demo;
alter role ceo_digest_n8n set default_transaction_read_only = on;

grant usage on schema ceo_digest_demo to ceo_digest_loader, ceo_digest_reader, ceo_digest_n8n;

-- Existing relations and functions (none on first run; everything after a 002 / 003 / 006 rebuild).
grant select, insert, update, delete, truncate on all tables    in schema ceo_digest_demo to ceo_digest_loader;
grant usage, select                            on all sequences in schema ceo_digest_demo to ceo_digest_loader;
grant select                                   on all tables    in schema ceo_digest_demo to ceo_digest_reader, ceo_digest_n8n;

-- Functions: Postgres grants EXECUTE on every new function to PUBLIC. Nobody without USAGE on the schema can reach
-- them, but the grant is taken away all the same, here for what exists and at the end of 006 for what it creates.
-- (Default privileges set per schema can add grants, not remove the built-in PUBLIC one; a database-wide default
-- would also change qbo's functions, so 006 revokes by hand instead.)
revoke execute on all functions in schema ceo_digest_demo from public;
grant execute  on all functions in schema ceo_digest_demo to ceo_digest_reader, ceo_digest_n8n;

-- Future relations created by postgres in this schema (002 / 003 and their rebuilds). Views count as tables here.
alter default privileges for role postgres in schema ceo_digest_demo
    grant select, insert, update, delete, truncate on tables to ceo_digest_loader;
alter default privileges for role postgres in schema ceo_digest_demo
    grant usage, select on sequences to ceo_digest_loader;
alter default privileges for role postgres in schema ceo_digest_demo
    grant select on tables to ceo_digest_reader, ceo_digest_n8n;
alter default privileges for role postgres in schema ceo_digest_demo
    grant execute on functions to ceo_digest_reader, ceo_digest_n8n;

-- Lets `postgres` run `set role …` for the acceptance tests. The roles are NOINHERIT and hold nothing postgres lacks.
grant ceo_digest_loader to postgres;
grant ceo_digest_reader to postgres;
grant ceo_digest_n8n    to postgres;

-- ---------------------------------------------------------------------------
-- Acceptance — run AS each role, against REAL rows, one block per MCP call.
-- ---------------------------------------------------------------------------
-- A. Denials on real rows in other schemas (expected: 42501, for ALL THREE roles):
--      begin; set local role ceo_digest_reader; select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role ceo_digest_reader; select count(*) from qbo.dim_account;        commit;
--      begin; set local role ceo_digest_n8n;    select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role ceo_digest_n8n;    select count(*) from qbo.dim_account;        commit;
--      begin; set local role ceo_digest_loader; select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role ceo_digest_loader; select count(*) from qbo.dim_account;        commit;
-- B. The sweep (same query as data/nordmark/sql/001): every schema any of the three roles has USAGE on.
--    Expected: ceo_digest_demo and public only; public 0/0.
-- C. anon / authenticated have no USAGE on ceo_digest_demo (has_schema_privilege → false).
-- D. After the load (002–006), as ceo_digest_reader and again as ceo_digest_n8n:
--      reads every view; `select * from fn_meta()` and the other seven functions return rows;
--      insert into company … → 42501 (and "read-only transaction" at a real login).
-- E. Functions are not PUBLIC's (expected: 0 rows), and the loader, which has no grant, is refused:
--      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--      where 1=1 and n.nspname = 'ceo_digest_demo' and has_function_privilege('public', p.oid, 'execute');
--      begin; set local role ceo_digest_loader; select * from ceo_digest_demo.fn_meta(); commit;   → 42501
-- F. MCP get_advisors(security) → zero lints.
