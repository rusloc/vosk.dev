-- trucks_demo — the ACME Trucks report's data (vosk.dev, Track C custom JS report), and its two roles.
-- Pattern: data/mirelo/sql/001-schema-and-roles.sql (after data/sales/004-cube-role.sql and docs/08 §5), 2026-11-09.
-- Applied via MCP execute_sql (NOT a migration:
-- schema_migrations stays qbo's). Idempotent; safe to re-run.
--
--   * trucks_loader — fills the tables from the owner's machine (scripts/trucks-load.ts). Created NOLOGIN here; the owner
--     enables login once, in the Supabase SQL editor:
--         alter role trucks_loader login password '<generated, 32+ chars>';
--   * trucks_reader — the ONLY credential the site holds (Vercel env TRUCKS_DATABASE_URL, Session
--     pooler, port 5432: the Transaction pooler stalls the site's concurrent reads, src/lib/trucks/server.ts).
--     Reads trucks_demo and nothing else. Same owner step:
--         alter role trucks_reader login password '<generated, 32+ chars>';
--
-- Tables are created by `postgres` from 002-schema.sql; the default privileges below carry the grants to
-- them. No RLS, like qbo: the schema is not on the Data API (anon / authenticated get no USAGE) and the
-- grants are the boundary. Never grant either role anything in qbo, demo_sales or public.

create schema if not exists trucks_demo authorization postgres;
revoke all on schema trucks_demo from public;
comment on schema trucks_demo is
    'Pre-aggregated haul-fleet time and plan figures (anonymised offices and loaders) for the ACME Trucks custom JS report on vosk.dev. Read by trucks_reader only.';

do $$
begin
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'trucks_loader') then
        create role trucks_loader nologin nobypassrls noinherit;
    end if;
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'trucks_reader') then
        create role trucks_reader nologin nobypassrls noinherit;
    end if;
end
$$;

comment on role trucks_loader is
    'Loads schema trucks_demo from the owner machine (vosk.dev ACME Trucks report). NOLOGIN until the owner sets a password. Must never be granted anything outside trucks_demo.';
comment on role trucks_reader is
    'Read-only reader of schema trucks_demo for the vosk.dev server routes. NOLOGIN until the owner sets a password. Must never be granted anything outside trucks_demo.';

-- Loader: few connections, long statements (inserts in batches).
alter role trucks_loader connection limit 4;
alter role trucks_loader set statement_timeout = '10min';
alter role trucks_loader set search_path = trucks_demo;
-- The server runs extra_float_digits = 0 (15 significant digits): a double like 3220153.1100000003 would come
-- back as 3220153.11. 3 = shortest round-trip output, so the route's JSON carries exactly the loaded values.
alter role trucks_loader set extra_float_digits = 3;

-- Reader: hardened like cube_reader. default_transaction_read_only is a guard rail, not a boundary
-- (applies at LOGIN only; `set role` in the tests does not exercise it).
alter role trucks_reader connection limit 30;
alter role trucks_reader set statement_timeout = '15s';
alter role trucks_reader set search_path = trucks_demo;
alter role trucks_reader set default_transaction_read_only = on;
alter role trucks_reader set extra_float_digits = 3;

grant usage on schema trucks_demo to trucks_loader, trucks_reader;

-- Existing relations (none on first run; everything after a 002 rebuild).
grant select, insert, update, delete, truncate on all tables    in schema trucks_demo to trucks_loader;
grant usage, select                            on all sequences in schema trucks_demo to trucks_loader;
grant select                                   on all tables    in schema trucks_demo to trucks_reader;

-- Future relations created by postgres in this schema (002-schema.sql and its rebuilds).
alter default privileges for role postgres in schema trucks_demo
    grant select, insert, update, delete, truncate on tables to trucks_loader;
alter default privileges for role postgres in schema trucks_demo
    grant usage, select on sequences to trucks_loader;
alter default privileges for role postgres in schema trucks_demo
    grant select on tables to trucks_reader;

-- Lets `postgres` run `set role …` for the acceptance tests. Both roles are NOINHERIT and hold nothing
-- postgres lacks, so membership grants postgres nothing.
grant trucks_loader to postgres;
grant trucks_reader to postgres;

-- ---------------------------------------------------------------------------
-- Acceptance — run AS each role, against REAL rows, one block per MCP call.
-- `set local` inside a transaction: the role resets on commit AND on the expected failure.
-- ---------------------------------------------------------------------------
-- A. Denials on real rows (expected: 42501 permission denied for schema, for BOTH roles):
--      begin; set local role trucks_reader; select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role trucks_reader; select count(*) from qbo.dim_account;        commit;
--      begin; set local role trucks_loader; select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role trucks_loader; select count(*) from qbo.dim_account;        commit;
-- B. The sweep — every schema either role has USAGE on, with selectable / writable counts.
--    Expected: trucks_demo and public only; public 0/0 (it is empty).
--      select n.nspname, r.rolname
--           , count(*) filter (where has_table_privilege(r.rolname, c.oid, 'select')) _selectable
--           , count(*) filter (where has_table_privilege(r.rolname, c.oid, 'insert')
--                                 or has_table_privilege(r.rolname, c.oid, 'update')
--                                 or has_table_privilege(r.rolname, c.oid, 'delete')) _writable
--      from pg_roles r cross join pg_namespace n
--      left join pg_class c on c.relnamespace = n.oid and c.relkind in ('r','v','m','p')
--      where r.rolname in ('trucks_loader','trucks_reader')
--        and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg\_toast%'
--        and has_schema_privilege(r.rolname, n.oid, 'usage')
--      group by 1, 2 order by 1, 2;
-- C. anon / authenticated have no USAGE on trucks_demo (has_schema_privilege → false).
-- D. MCP get_advisors(security) → zero lints.
