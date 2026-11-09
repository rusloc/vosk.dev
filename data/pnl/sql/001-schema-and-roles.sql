-- pnl_demo — the management P&L report's data (vosk.dev, Track C custom JS report), and its two roles.
-- Pattern: data/mirelo/sql/001-schema-and-roles.sql (after data/sales/004-cube-role.sql and docs/08 §5), 2026-11-09.
-- Applied via MCP execute_sql (NOT a migration:
-- schema_migrations stays qbo's). Idempotent; safe to re-run.
--
--   * pnl_loader — fills the tables from the owner's machine (scripts/pnl-load.ts). Created NOLOGIN here; the owner
--     enables login once, in the Supabase SQL editor:
--         alter role pnl_loader login password '<generated, 32+ chars>';
--   * pnl_reader — the ONLY credential the site holds (Vercel env PNL_DATABASE_URL, Session
--     pooler, port 5432: the Transaction pooler stalls the site's concurrent reads, src/lib/pnl/server.ts).
--     Reads pnl_demo and nothing else. Same owner step:
--         alter role pnl_reader login password '<generated, 32+ chars>';
--
-- Tables are created by `postgres` from 002-schema.sql; the default privileges below carry the grants to
-- them. No RLS, like qbo: the schema is not on the Data API (anon / authenticated get no USAGE) and the
-- grants are the boundary. Never grant either role anything in qbo, demo_sales or public.

create schema if not exists pnl_demo authorization postgres;
revoke all on schema pnl_demo from public;
comment on schema pnl_demo is
    'Synthetic two-company management P&L (ACME Consumer Products, ACME Commerce Cloud) for the P&L custom JS report on vosk.dev. Read by pnl_reader only; loaded by pnl_loader; not on the Data API.';

do $$
begin
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'pnl_loader') then
        create role pnl_loader nologin nobypassrls noinherit;
    end if;
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'pnl_reader') then
        create role pnl_reader nologin nobypassrls noinherit;
    end if;
end
$$;

comment on role pnl_loader is
    'Loads schema pnl_demo from the owner machine (vosk.dev P&L report). NOLOGIN until the owner sets a password. Must never be granted anything outside pnl_demo.';
comment on role pnl_reader is
    'Read-only reader of schema pnl_demo for the vosk.dev server routes. NOLOGIN until the owner sets a password. Must never be granted anything outside pnl_demo.';

-- Loader: few connections, long statements (COPY in batches).
alter role pnl_loader connection limit 4;
alter role pnl_loader set statement_timeout = '10min';
alter role pnl_loader set search_path = pnl_demo;
-- The server runs extra_float_digits = 0 (15 significant digits): a double like 3220153.1100000003 would come
-- back as 3220153.11. 3 = shortest round-trip output, so the route's JSON carries exactly the loaded values.
alter role pnl_loader set extra_float_digits = 3;

-- Reader: hardened like cube_reader. default_transaction_read_only is a guard rail, not a boundary
-- (applies at LOGIN only; `set role` in the tests does not exercise it).
alter role pnl_reader connection limit 30; -- the lesson of mirelo_reader (2026-11-06): parallel chunk reads over several instances
alter role pnl_reader set statement_timeout = '15s';
alter role pnl_reader set search_path = pnl_demo;
alter role pnl_reader set default_transaction_read_only = on;
alter role pnl_reader set extra_float_digits = 3;

grant usage on schema pnl_demo to pnl_loader, pnl_reader;

-- Existing relations (none on first run; everything after a 002 rebuild).
grant select, insert, update, delete, truncate on all tables    in schema pnl_demo to pnl_loader;
grant usage, select                            on all sequences in schema pnl_demo to pnl_loader;
grant select                                   on all tables    in schema pnl_demo to pnl_reader;

-- Future relations created by postgres in this schema (002-schema.sql and its rebuilds).
alter default privileges for role postgres in schema pnl_demo
    grant select, insert, update, delete, truncate on tables to pnl_loader;
alter default privileges for role postgres in schema pnl_demo
    grant usage, select on sequences to pnl_loader;
alter default privileges for role postgres in schema pnl_demo
    grant select on tables to pnl_reader;

-- Lets `postgres` run `set role …` for the acceptance tests. Both roles are NOINHERIT and hold nothing
-- postgres lacks, so membership grants postgres nothing.
grant pnl_loader to postgres;
grant pnl_reader to postgres;

-- ---------------------------------------------------------------------------
-- Acceptance — run AS each role, against REAL rows, one block per MCP call.
-- `set local` inside a transaction: the role resets on commit AND on the expected failure.
-- ---------------------------------------------------------------------------
-- A. Denials on real rows (expected: 42501 permission denied for schema, for BOTH roles):
--      begin; set local role pnl_reader; select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role pnl_reader; select count(*) from qbo.dim_account;        commit;
--      begin; set local role pnl_loader; select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role pnl_loader; select count(*) from qbo.dim_account;        commit;
-- B. The sweep — every schema either role has USAGE on, with selectable / writable counts.
--    Expected: pnl_demo and public only; public 0/0 (it is empty).
--      select n.nspname, r.rolname
--           , count(*) filter (where has_table_privilege(r.rolname, c.oid, 'select')) _selectable
--           , count(*) filter (where has_table_privilege(r.rolname, c.oid, 'insert')
--                                 or has_table_privilege(r.rolname, c.oid, 'update')
--                                 or has_table_privilege(r.rolname, c.oid, 'delete')) _writable
--      from pg_roles r cross join pg_namespace n
--      left join pg_class c on c.relnamespace = n.oid and c.relkind in ('r','v','m','p')
--      where r.rolname in ('pnl_loader','pnl_reader')
--        and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg\_toast%'
--        and has_schema_privilege(r.rolname, n.oid, 'usage')
--      group by 1, 2 order by 1, 2;
-- C. anon / authenticated have no USAGE on pnl_demo (has_schema_privilege → false).
-- D. MCP get_advisors(security) → zero lints.
