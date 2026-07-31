-- Runs once, on the metadata Postgres's first boot.
--
-- The demo warehouse is a SEPARATE database in the same Postgres instance, never a schema
-- inside Superset's own `superset` database. Superset writes its metadata there and
-- migrates it on upgrade; sharing a database with warehouse data means a Superset upgrade
-- and a data reload can collide.
--
-- A read-only role for the Superset connection: the dashboards only ever SELECT, so
-- there is no reason for the credentials sitting in Superset's connection store to be
-- able to do anything else.

create database analytics;

\connect analytics

create role superset_ro with login password 'CHANGE_ME_IN_ENV';
comment on role superset_ro is 'Read-only warehouse account used by the Superset database connection.';

grant connect on database analytics to superset_ro;
-- The `demo` schema is created by data/schema/001-create-warehouse.sql; these defaults
-- apply to whatever it creates later, so ordering does not matter.
alter default privileges in schema demo grant select on tables to superset_ro;
