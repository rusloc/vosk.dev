-- cube_reader — the one role that reads demo_sales, and the only credential Cube ever holds.
--
-- Split in two on purpose:
--   * THIS FILE creates the role NOLOGIN — no password, no credential, nothing exposed — and
--     gives it grants and policies. Safe to run from the MCP, and re-run after every 001.
--   * THE OWNER enables login, once, in the Supabase SQL editor, so the password never passes
--     through chat, MCP logs or this repo:
--
--         alter role cube_reader login password '<generated, 32+ chars>';
--
--     Running that line is also the acceptance of the residue documented below.
--
-- ⚠️  RESIDUE THAT CANNOT BE CLOSED FROM INSIDE THIS PROJECT (docs/08 §5, proven 2026-09-21):
--     pg_net grants PUBLIC all privileges on net._http_response and net.http_request_queue,
--     and EXECUTE on net.http_get/post/delete. `postgres` is neither their owner nor holds
--     grant option, so it cannot revoke — and must not want to: the lead engine's three crons
--     run as `postgres` and reach net.http_post ONLY through that PUBLIC grant. A revoke that
--     worked would stop the engine.
--     So whoever holds this role's password can read ~6 h of cron response bodies and make
--     outbound HTTP calls from the database. It captures no secret: the bearer the crons send
--     is the anon/publishable key (vault: edge_invoke_key), public by design.
--     DO NOT "fix" this with `revoke ... on schema net from public`.

do $$
begin
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'cube_reader') then
        create role cube_reader nologin nobypassrls noinherit;
    end if;
end
$$;

comment on role cube_reader is
    'Read-only reader of schema demo_sales for the Cube semantic layer (vosk.dev showcase). NOLOGIN until the owner sets a password. Must never be granted anything in public.';

-- A public demo shares a free-tier instance with three production crons. At ~3 queries a day
-- none of this matters; if the design ever changes, it will.
alter role cube_reader connection limit 5;
alter role cube_reader set statement_timeout = '15s';
alter role cube_reader set search_path = demo_sales;
-- A guard rail, not a boundary — a session can switch it off. It makes the default outcome of
-- net.http_post an error (the call INSERTs into the queue), which is worth one line.
-- Applies at LOGIN only, so `set role` in the tests below does not exercise it.
alter role cube_reader set default_transaction_read_only = on;

grant usage on schema demo_sales to cube_reader;
grant select on all tables in schema demo_sales to cube_reader;

drop policy if exists dim_product_cube_select     on demo_sales.dim_product;
drop policy if exists dim_customer_cube_select    on demo_sales.dim_customer;
drop policy if exists dim_channel_cube_select     on demo_sales.dim_channel;
drop policy if exists fact_order_line_cube_select on demo_sales.fact_order_line;

create policy dim_product_cube_select     on demo_sales.dim_product     for select to cube_reader using (true);
create policy dim_customer_cube_select    on demo_sales.dim_customer    for select to cube_reader using (true);
create policy dim_channel_cube_select     on demo_sales.dim_channel     for select to cube_reader using (true);
create policy fact_order_line_cube_select on demo_sales.fact_order_line for select to cube_reader using (true);

-- Lets `postgres` run `set role cube_reader` for the tests below. The role is NOINHERIT and
-- holds nothing `postgres` lacks, so membership grants `postgres` nothing.
grant cube_reader to postgres;

-- ---------------------------------------------------------------------------
-- Acceptance — run AS the role, against real rows, one block per call. An empty table
-- returns the same thing whether isolation works or not.
-- `set local` inside a transaction: the role resets on commit AND on the expected failure.
-- ---------------------------------------------------------------------------

-- A. MUST SUCCEED — 59,507 completed lines, revenue 4,766,371.12.
begin;
set local role cube_reader;
select
     current_user                       _running_as
    ,count(*)                           _completed_lines
    ,round(sum(f.net_amount), 2)        _revenue
from demo_sales.fact_order_line f
where 1=1
    and f.order_status = 'completed';
commit;

-- B. MUST FAIL with `42501 permission denied for table leads`.
begin;
set local role cube_reader;
select
     count(*)                           _must_fail_permission_denied
from public.leads l
where 1=1;
commit;

-- C. The sweep — everything the role can reach, anywhere. Expected, and the whole of it:
--      demo_sales  4 selectable, 0 writable
--      public      0 selectable, 0 writable
--      net         2 selectable, 2 writable   ← the documented residue
--    Any other row, or any non-zero figure under `public`, is a defect.
select
     n.nspname                                                                       _schema
    ,count(*) filter (where has_table_privilege('cube_reader', c.oid, 'select'))     _selectable
    ,count(*) filter (where has_table_privilege('cube_reader', c.oid, 'insert')
                         or has_table_privilege('cube_reader', c.oid, 'update')
                         or has_table_privilege('cube_reader', c.oid, 'delete'))     _writable
    ,count(*)                                                                        _relations
from pg_class c
join pg_namespace n
    on n.oid = c.relnamespace
where 1=1
    and c.relkind in ('r', 'v', 'm', 'p')
    and n.nspname not in ('pg_catalog', 'information_schema')
    and n.nspname not like 'pg\_toast%'
    and has_schema_privilege('cube_reader', n.oid, 'usage')
group by n.nspname
order by 1;

-- Then: MCP get_advisors(security) → zero lints.
