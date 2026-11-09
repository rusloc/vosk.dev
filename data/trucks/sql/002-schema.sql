-- trucks_demo tables — one per artifact the ACME Trucks report reads (src/lib/trucks/data/manifest.ts FILES), so the server
-- route (src/lib/trucks/artifacts.ts) reproduces every Parquet file of the pack's public/data, in the same row order.
-- Drop-and-rebuild seed, applied via MCP execute_sql by postgres (NOT a migration). The grants come from
-- 001-schema-and-roles.sql's default privileges. Loaded by scripts/trucks-load.ts as trucks_loader.
--
-- Types: the FILES column kinds map int → integer, num? → double precision, nullable (NULL = the loader-week has no row of
-- that category). Each table keeps the file's row order in `seq`. Generated from FILES on 2026-11-09.

set search_path = trucks_demo;

drop table if exists document, time_week, plan_month, plan_week, rock_week cascade;

-- manifest.json, verbatim: the browser validates it with the same strict Zod schema as before.
create table if not exists document (
    name text primary key check (name = 'manifest.json'),
    doc  jsonb not null
);

-- loader × business week: seconds per time category
create table if not exists time_week (
    seq        integer primary key,
    loader_ix  integer not null,
    week_ix    integer not null,
    n_rows     integer not null,
    sec_01 double precision,
    sec_02 double precision,
    sec_03 double precision,
    sec_04 double precision,
    sec_05 double precision,
    sec_06 double precision,
    sec_07 double precision,
    sec_08 double precision,
    sec_09 double precision,
    sec_10 double precision,
    sec_11 double precision,
    sec_12 double precision,
    sec_14 double precision,
    sec_15 double precision,
    sec_21 double precision,
    sec_22 double precision,
    sec_24 double precision,
    sec_25 double precision,
    sec_27 double precision
);

-- loader × business week: month plan hours per time category
create table if not exists plan_month (
    seq        integer primary key,
    loader_ix  integer not null,
    week_ix    integer not null,
    n_rows     integer not null,
    hrs_01 double precision,
    hrs_02 double precision,
    hrs_03 double precision,
    hrs_04 double precision,
    hrs_05 double precision,
    hrs_06 double precision,
    hrs_07 double precision,
    hrs_08 double precision,
    hrs_09 double precision,
    hrs_10 double precision,
    hrs_11 double precision,
    hrs_12 double precision,
    hrs_14 double precision,
    hrs_15 double precision,
    hrs_21 double precision,
    hrs_22 double precision,
    hrs_24 double precision,
    hrs_25 double precision,
    hrs_27 double precision
);

-- loader × business week: week plan hours per time category
create table if not exists plan_week (
    seq        integer primary key,
    loader_ix  integer not null,
    week_ix    integer not null,
    n_rows     integer not null,
    hrs_01 double precision,
    hrs_02 double precision,
    hrs_03 double precision,
    hrs_04 double precision,
    hrs_05 double precision,
    hrs_06 double precision,
    hrs_07 double precision,
    hrs_08 double precision,
    hrs_09 double precision,
    hrs_10 double precision,
    hrs_11 double precision,
    hrs_12 double precision,
    hrs_14 double precision,
    hrs_15 double precision,
    hrs_21 double precision,
    hrs_22 double precision,
    hrs_24 double precision,
    hrs_25 double precision,
    hrs_27 double precision
);

create table if not exists rock_week (
    seq                        integer primary key,
    loader_ix                  integer not null,
    week_ix                    integer not null,
    n_rows                     integer not null,
    rock_mass_truck_plan       double precision,
    rock_mass_truck_fact       double precision,
    rock_mass_truck_plan_month double precision
);
