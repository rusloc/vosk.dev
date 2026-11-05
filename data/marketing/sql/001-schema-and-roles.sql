-- marketing_demo — the ACME Marketing report's data (vosk.dev, Track C custom JS report), and its two roles.
-- Pattern: data/mirelo/sql/001-schema-and-roles.sql (after data/sales/004-cube-role.sql and docs/08 §5), 2026-11-05.
-- Applied via MCP execute_sql (NOT a migration:
-- schema_migrations stays qbo's). Idempotent; safe to re-run.
--
--   * marketing_loader — fills the tables from the owner's machine (scripts/marketing-load.ts). Created NOLOGIN here; the owner
--     enables login once, in the Supabase SQL editor:
--         alter role marketing_loader login password '<generated, 32+ chars>';
--   * marketing_reader — the ONLY credential the site holds (Vercel env MARKETING_DATABASE_URL, Session
--     pooler, port 5432: the Transaction pooler stalls the site's concurrent reads, src/lib/marketing/server.ts).
--     Reads marketing_demo and nothing else. Same owner step:
--         alter role marketing_reader login password '<generated, 32+ chars>';
--
-- Tables are created by `postgres` from 002-schema.sql; the default privileges below carry the grants to
-- them. No RLS, like qbo: the schema is not on the Data API (anon / authenticated get no USAGE) and the
-- grants are the boundary. Never grant either role anything in qbo, demo_sales or public.

create schema if not exists marketing_demo authorization postgres;
revoke all on schema marketing_demo from public;
comment on schema marketing_demo is
    'Synthetic paid-acquisition data (ACME, a fictional SaaS product) for the ACME Marketing custom JS report on vosk.dev. Read by marketing_reader only; loaded by marketing_loader; not on the Data API.';

do $$
begin
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'marketing_loader') then
        create role marketing_loader nologin nobypassrls noinherit;
    end if;
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'marketing_reader') then
        create role marketing_reader nologin nobypassrls noinherit;
    end if;
end
$$;

comment on role marketing_loader is
    'Loads schema marketing_demo from the owner machine (vosk.dev ACME Marketing report). NOLOGIN until the owner sets a password. Must never be granted anything outside marketing_demo.';
comment on role marketing_reader is
    'Read-only reader of schema marketing_demo for the vosk.dev server routes. NOLOGIN until the owner sets a password. Must never be granted anything outside marketing_demo.';

-- Loader: few connections, long statements (inserts in batches).
alter role marketing_loader connection limit 4;
alter role marketing_loader set statement_timeout = '10min';
alter role marketing_loader set search_path = marketing_demo;
-- The server runs extra_float_digits = 0 (15 significant digits): a double like 3220153.1100000003 would come
-- back as 3220153.11. 3 = shortest round-trip output, so the route's JSON carries exactly the loaded values.
alter role marketing_loader set extra_float_digits = 3;

-- Reader: hardened like cube_reader. default_transaction_read_only is a guard rail, not a boundary
-- (applies at LOGIN only; `set role` in the tests does not exercise it).
alter role marketing_reader connection limit 10;
alter role marketing_reader set statement_timeout = '15s';
alter role marketing_reader set search_path = marketing_demo;
alter role marketing_reader set default_transaction_read_only = on;
alter role marketing_reader set extra_float_digits = 3;

grant usage on schema marketing_demo to marketing_loader, marketing_reader;

-- Existing relations (none on first run; everything after a 002 rebuild).
grant select, insert, update, delete, truncate on all tables    in schema marketing_demo to marketing_loader;
grant usage, select                            on all sequences in schema marketing_demo to marketing_loader;
grant select                                   on all tables    in schema marketing_demo to marketing_reader;

-- Future relations created by postgres in this schema (002-schema.sql and its rebuilds).
alter default privileges for role postgres in schema marketing_demo
    grant select, insert, update, delete, truncate on tables to marketing_loader;
alter default privileges for role postgres in schema marketing_demo
    grant usage, select on sequences to marketing_loader;
alter default privileges for role postgres in schema marketing_demo
    grant select on tables to marketing_reader;

-- Lets `postgres` run `set role …` for the acceptance tests. Both roles are NOINHERIT and hold nothing
-- postgres lacks, so membership grants postgres nothing.
grant marketing_loader to postgres;
grant marketing_reader to postgres;

-- ---------------------------------------------------------------------------
-- Acceptance — run AS each role, against REAL rows, one block per MCP call.
-- `set local` inside a transaction: the role resets on commit AND on the expected failure.
-- ---------------------------------------------------------------------------
-- A. Denials on real rows (expected: 42501 permission denied for schema, for BOTH roles):
--      begin; set local role marketing_reader; select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role marketing_reader; select count(*) from qbo.dim_account;        commit;
--      begin; set local role marketing_loader; select count(*) from demo_sales.dim_channel; commit;
--      begin; set local role marketing_loader; select count(*) from qbo.dim_account;        commit;
-- B. The sweep — every schema either role has USAGE on, with selectable / writable counts.
--    Expected: marketing_demo and public only; public 0/0 (it is empty).
--      select n.nspname, r.rolname
--           , count(*) filter (where has_table_privilege(r.rolname, c.oid, 'select')) _selectable
--           , count(*) filter (where has_table_privilege(r.rolname, c.oid, 'insert')
--                                 or has_table_privilege(r.rolname, c.oid, 'update')
--                                 or has_table_privilege(r.rolname, c.oid, 'delete')) _writable
--      from pg_roles r cross join pg_namespace n
--      left join pg_class c on c.relnamespace = n.oid and c.relkind in ('r','v','m','p')
--      where r.rolname in ('marketing_loader','marketing_reader')
--        and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg\_toast%'
--        and has_schema_privilege(r.rolname, n.oid, 'usage')
--      group by 1, 2 order by 1, 2;
-- C. anon / authenticated have no USAGE on marketing_demo (has_schema_privilege → false).
-- D. MCP get_advisors(security) → zero lints.
