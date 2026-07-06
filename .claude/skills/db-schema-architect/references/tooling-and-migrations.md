# Tooling & Migrations

How to make schema changes safely, repeatably, and at speed — from a one-person side project to a team shipping multiple migrations a day.

The first principle: **every schema change is code.** It lives in version control, gets reviewed in a PR, runs in CI, and ships through the same promotion path as application code. If you find yourself opening a SQL console and typing `ALTER TABLE` against production, your tooling has failed you and you need to fix the tooling, not the table.

---

## Migration tool comparison

| Tool               | Style                                 | Best for                                          | Notes                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase CLI**   | Versioned, plain SQL                  | Anything on Supabase                              | First-party. Handles migrations, branching, type generation, edge functions, seed data. Migrations are timestamped `.sql` files in `supabase/migrations/`. Tracks state in `supabase_migrations.schema_migrations`. Use it. |
| **Atlas**          | Declarative or versioned              | Modern non-Supabase PG, polyglot teams            | You write the desired schema (HCL or SQL) and Atlas generates the diff. Excellent linting, drift detection, CI integration. Works for PG, MySQL, SQLite, MSSQL. The most "modern" choice for greenfield.                    |
| **dbmate**         | Versioned, plain SQL                  | Simple, language-agnostic, single binary          | Two files per migration (`up`/`down`), zero magic. Great when you want migrations to be transparent SQL with no DSL. Pairs well with any backend stack.                                                                     |
| **Flyway**         | Versioned, SQL or Java                | JVM shops, enterprise PG                          | Mature, battle-tested. Community edition is fine for most projects. Ubiquitous in Java/Kotlin/Scala teams.                                                                                                                  |
| **sqitch**         | Versioned, with declared dependencies | Complex schemas with cross-migration dependencies | Each change declares what it depends on, what it reverts, and how to verify. More ceremony, more safety. Worth it for regulated/financial schemas.                                                                          |
| **Drizzle Kit**    | Code-first, generated migrations      | TypeScript teams using Drizzle ORM                | Define the schema in TS, `drizzle-kit generate` produces SQL migrations. Migrations are real SQL files you can edit. The cleanest code-first option for TS.                                                                 |
| **Prisma Migrate** | Code-first, generated migrations      | TypeScript/Node teams using Prisma                | Like Drizzle Kit but for Prisma. Migrations are SQL files. Caveat: Prisma's schema language abstracts away PG features (partial indexes, exclusion constraints, RLS, etc.) — you'll need raw SQL escape hatches.            |
| **Alembic**        | Versioned, Python-generated           | Python shops using SQLAlchemy                     | The standard for Python. Auto-generation from SQLAlchemy models works well for CRUD shapes; review every generated migration before committing.                                                                             |
| **goose**          | Versioned, plain SQL or Go            | Go shops                                          | Single binary, plain SQL or Go-driven. Similar to dbmate in spirit.                                                                                                                                                         |

### Defaults by stack

- **Supabase project (any language)** → Supabase CLI. No exceptions worth discussing.
- **Greenfield non-Supabase PG, language-agnostic team** → Atlas (declarative) or dbmate (plain SQL). Pick Atlas if you want diff-based workflows; pick dbmate if you want the SQL to be the source of truth.
- **TypeScript-first team, no Supabase** → Drizzle + Drizzle Kit. Best PG feature coverage among code-first options.
- **Python team** → Alembic.
- **Java/Kotlin team** → Flyway.
- **Go team** → goose.
- **Schema with strict compliance requirements (financial, healthcare)** → sqitch or Atlas with strict review gates.

### Anti-pattern: ORM auto-sync in production

Tools like Django's `migrate --run-syncdb`, Sequelize `sync()`, TypeORM `synchronize: true`, or Prisma `db push` mutate the database to match the model with no migration file. **They are dev-only.** They will drop columns, lose data, and leave production in a state nobody can reproduce. Disable them in any environment that matters.

---

## Migration file conventions

Whatever tool you pick, follow these:

1. **Timestamped, ordered filenames** — `20260424143000_add_orders_table.sql`. Lexicographic sort = chronological order.
2. **One logical change per migration** — adding a table is one migration; backfilling its data is another; adding the FK is a third. Keeps rollback narrow and review focused.
3. **Migrations are immutable once merged** — never edit a migration that's been applied to a shared environment. Add a new one to fix it. Editing breaks anyone who already ran it.
4. **Descriptive names** — `add_orders_table` not `update_schema_v3`. Names show up in logs, audits, and `git blame`.
5. **`up` and `down` both written** — even if you never run `down` in prod, writing it forces you to think about reversibility. For Supabase CLI (no built-in down), keep a `down/` folder of paired manual rollback scripts.
6. **DDL in transactions where supported** — PG supports transactional DDL for almost everything. Wrap the migration in `BEGIN;...COMMIT;` so a failure rolls back cleanly. Exceptions: `CREATE INDEX CONCURRENTLY`, `CREATE DATABASE`, etc., which can't run in a transaction.

---

## Expand-contract: the universal pattern for safe migrations

Any change to a column or table that's read or written by running code must be done in three deploys:

1. **Expand** — add the new shape _alongside_ the old. New column nullable, new table empty, new index built CONCURRENTLY. Code still reads/writes the old shape. **Zero risk to running app.**
2. **Migrate** — backfill the new shape from the old. Update application code to write to _both_ shapes (dual-write) and read from the new shape (with fallback to old if new is null). Deploy. **App is now resilient to either shape being authoritative.**
3. **Contract** — once the new shape is fully populated and stable in production, drop the old column/table/index. Remove dual-write code. **Cleanup deploy.**

This is slow. It's also the only way to do a rename, type change, or restructuring on a live system without downtime. Skipping it is how you take outages.

### Concrete example: renaming `users.email_address` to `users.email`

```sql
-- Migration 1: EXPAND
ALTER TABLE users ADD COLUMN email citext;

-- Migration 2 (deploy after app code dual-writes): MIGRATE / BACKFILL
UPDATE users SET email = email_address WHERE email IS NULL;
ALTER TABLE users ADD CONSTRAINT users_email_not_null CHECK (email IS NOT NULL) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT users_email_not_null;
CREATE UNIQUE INDEX CONCURRENTLY users_email_unique ON users(email);

-- Migration 3 (deploy after app reads only `email`): CONTRACT
ALTER TABLE users DROP COLUMN email_address;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT users_email_not_null;
```

For greenfield/pre-launch projects, you can skip expand-contract and just `ALTER COLUMN`. Once you have users, you can't.

---

## Locks: the migrations that take down production

PG's MVCC is generous, but DDL takes locks. The locks that matter:

| Operation                                                                 | Lock taken                               | Blocks                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| `ALTER TABLE ... ADD COLUMN` (no default, nullable)                       | `ACCESS EXCLUSIVE` (brief)               | Everything, briefly                                                      |
| `ALTER TABLE ... ADD COLUMN ... DEFAULT <constant>` (PG 11+)              | `ACCESS EXCLUSIVE` (brief)               | Everything, briefly. **Old PGs rewrote the table — check your version.** |
| `ALTER TABLE ... ADD COLUMN ... DEFAULT <volatile expr>`                  | `ACCESS EXCLUSIVE` (long, table rewrite) | Everything, until done. **Avoid.**                                       |
| `ALTER TABLE ... ALTER COLUMN ... TYPE` (most type changes)               | `ACCESS EXCLUSIVE` (long, table rewrite) | Everything. Use expand-contract instead.                                 |
| `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` then `VALIDATE CONSTRAINT` | `SHARE UPDATE EXCLUSIVE` for validation  | Other DDL, but not reads/writes. **The safe way to add CHECK or FK.**    |
| `CREATE INDEX`                                                            | `SHARE`                                  | Writes (allows reads)                                                    |
| `CREATE INDEX CONCURRENTLY`                                               | None blocking                            | Nothing. **Always use this in production.**                              |
| `DROP INDEX`                                                              | `ACCESS EXCLUSIVE` (brief)               | Everything, briefly                                                      |
| `DROP INDEX CONCURRENTLY`                                                 | None blocking                            | Nothing                                                                  |
| `VACUUM FULL`                                                             | `ACCESS EXCLUSIVE` (long)                | Everything. Use `pg_repack` instead.                                     |

### Rules of thumb

- **`CREATE INDEX CONCURRENTLY` always** in production. The non-concurrent version blocks writes for the duration of the build, which on a large table is minutes to hours.
- **Add constraints `NOT VALID` first**, then `VALIDATE` separately. The validation acquires a much weaker lock and can run while the app is live.
- **Set `lock_timeout` and `statement_timeout`** at the start of every migration so a stuck lock fails fast instead of compounding.
  ```sql
  SET lock_timeout = '5s';
  SET statement_timeout = '10min';
  ```
- **Avoid table rewrites on big tables.** Anything that says "rewrite the table" in the docs (some `ALTER COLUMN TYPE`, certain `ADD COLUMN DEFAULT` on old PG, `CLUSTER`) will lock the table for the duration. Use expand-contract or `pg_repack`.

---

## Online schema change at scale

For tables that are too large or too hot to migrate even with the safe patterns above, use specialized tools.

| Tool                              | What it does                                                                                                          | When                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **pg_repack**                     | Online table reorganization without long locks. Builds a new copy in the background, syncs changes, swaps.            | Replace `VACUUM FULL`. Reclaim bloat from a hot table.                     |
| **pg-osc** (online-schema-change) | Inspired by `pt-osc` from MySQL world. Uses triggers + a shadow table for online ALTERs that would otherwise rewrite. | Type changes, complex restructuring on huge tables you can't take offline. |
| **pgroll** (Xata)                 | Declarative migrations with automatic expand-contract; runs both schemas side-by-side via views.                      | Greenfield teams that want zero-downtime by default.                       |
| **Reshape**                       | Similar to pgroll: zero-downtime migrations via shadow schemas.                                                       | Same niche as pgroll.                                                      |

For most projects, you do not need these. Reach for them when a normal `ALTER TABLE` would take an unacceptable amount of time and lock contention. A single-tenant SaaS at <10M rows on a well-tuned PG can usually do schema changes during a quiet hour with `lock_timeout` and not need any of this.

---

## Branching: schema previews per PR

The killer dev workflow: every PR gets its own database with the schema changes already applied, so reviewers can poke at it without affecting anyone else. Several products do this.

| Tool                                   | How it works                                                                                                  | Notes                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Supabase Branches**                  | First-party. Each branch = isolated PG + Storage + Auth, seeded from the main branch's schema. PR-driven.     | The reason to use Supabase. Use `create_branch` via MCP or the CLI.              |
| **Neon Branches**                      | Copy-on-write branching at the storage layer. Branches are instant and cheap. Works on any Postgres workload. | Best-in-class branching for non-Supabase PG.                                     |
| **PlanetScale (for PG, in beta)**      | Branch-per-PR with deploy requests. From the MySQL world, recently extended to PG.                            | Strong workflow if you need it cross-DB.                                         |
| **Postgres.ai DBLab**                  | Thin clones of full production-sized DBs for testing migrations and queries.                                  | Used for testing migrations against realistic data without copying the whole DB. |
| **Self-hosted: Docker + seed scripts** | Spin up a Postgres container, run migrations, run seeds.                                                      | The poor-person's option. Fine for small teams. CI-only.                         |

### Branching workflow

1. Engineer opens a PR with a new migration file.
2. CI creates a branch DB, applies all existing migrations, then applies the new one.
3. CI runs the test suite against the branch DB.
4. Reviewer can connect to the branch DB to manually verify.
5. On merge, CI applies the migration to staging, then production (gated by approval).
6. Branch DB is destroyed.

Without branching, you're either testing migrations on a shared dev DB (which collides between PRs) or only on local SQLite/Docker (which doesn't catch PG-specific issues). Branching makes schema review actually possible.

---

## CI/CD pipeline for migrations

A minimal but production-grade pipeline:

1. **Lint** — run `sqlfluff` or `atlas migrate lint` to catch syntax errors, dangerous operations (e.g. `DROP TABLE` without explicit override), and style issues.
2. **Diff** — show the schema diff in the PR comment. Atlas, Supabase CLI, and Prisma all do this.
3. **Apply to ephemeral branch DB** — full migration replay from scratch. Catches ordering bugs and missing dependencies.
4. **Run integration tests** — application tests against the branch DB.
5. **Plan production apply** — `atlas migrate apply --dry-run` or equivalent, posted to the PR.
6. **Manual approval gate for production** — even with full automation, schema changes deserve a human eye before they hit prod.
7. **Apply to staging** — automatic on merge to main.
8. **Apply to production** — gated, often with a "deploy window" for risky changes.
9. **Post-apply verification** — run a smoke test query that proves the new shape is in place.

### Drift detection

A nightly job that compares the live production schema against the migration history. If they differ, something was changed out-of-band (someone ran SQL in the console, an extension auto-installed, a backup restore left old objects). Alert on drift.

```bash
# Atlas example
atlas schema diff \
  --from "postgres://prod-readonly..." \
  --to "file://supabase/migrations" \
  --exclude "public.tmp_*"
```

---

## Seeds and fixtures

Three different needs, three different tools.

### 1. Reference data (production)

Lookup tables, default roles, system records. These are part of the schema and ship with migrations.

```sql
-- supabase/migrations/20260424000000_seed_roles.sql
INSERT INTO roles (id, name) VALUES
  (1, 'admin'),
  (2, 'member'),
  (3, 'viewer')
ON CONFLICT (id) DO NOTHING;
```

Always idempotent (`ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`). Migrations may run multiple times in some workflows (re-applies, branch creation).

### 2. Dev seed data

What you want when you `supabase db reset` locally: a few users, an org, some sample records, enough to make the UI look real. Lives in `supabase/seed.sql` (Supabase CLI) or equivalent.

```sql
-- supabase/seed.sql
INSERT INTO organizations (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Acme Inc', 'acme');

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000010', 'alice@example.com'),
  ('00000000-0000-0000-0000-000000000011', 'bob@example.com');

INSERT INTO memberships (organization_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'admin'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'member');
```

Use fixed UUIDs in dev seed so test code can reference records by ID without lookups.

### 3. Test fixtures (per-test isolation)

For application tests, generate fixtures in code with a factory library — `factory_boy` (Python), `@faker-js/faker` + factory functions (TS), `FactoryBot` (Ruby). Each test starts with an empty DB or a transaction that rolls back. Don't share fixtures between tests; flakiness will follow.

---

## Backups & point-in-time recovery

Schema migrations can break things. Backups are the parachute.

- **Supabase**: PITR is built-in on paid plans. Keep at least 7 days. Test restores quarterly.
- **Self-hosted PG**: use `pgbackrest` or `wal-g` for PITR. `pg_dump` alone is not a backup strategy — it's a snapshot, with no PITR and no incremental.
- **Before every risky migration**: take an ad-hoc backup or a branch. "Risky" means dropping anything, type changes on big tables, or any DML touching >10% of rows.
- **Test restores.** A backup you've never restored is a backup that doesn't exist. Quarterly is a reasonable cadence for small teams; monthly for anything regulated.

---

## Schema documentation

Auto-generated docs beat hand-maintained docs because they don't drift.

| Tool                | What it does                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **SchemaSpy**       | HTML schema docs with ER diagrams, FK relationships, comments. Run in CI, publish to a static URL.                                               |
| **dbdocs.io**       | Markdown-style schema definition (DBML) → hosted docs. Pairs well with `dbml-cli` or Drizzle's DBML export.                                      |
| **Atlas Cloud**     | Schema visualization, migration history, drift detection, hosted.                                                                                |
| **Supabase Studio** | The built-in Supabase dashboard shows tables, policies, indexes, etc. Adequate for small projects.                                               |
| **`COMMENT ON`**    | Native PG. Always add a `COMMENT ON COLUMN` or `COMMENT ON TABLE` for anything non-obvious — these surface in every docs tool and in `psql \d+`. |

### Always document in SQL itself

```sql
COMMENT ON TABLE orders IS 'Customer orders. Immutable once status=paid; line items snapshot product data at order time.';
COMMENT ON COLUMN orders.total_cents IS 'Order total in the smallest currency unit (cents/yen/etc). Currency in orders.currency.';
COMMENT ON COLUMN orders.metadata IS 'Flex JSONB. Promote frequently-queried keys to columns. Indexed via GIN.';
```

These comments are part of the schema, version-controlled with the migration that adds them, and visible to anyone using `psql`, Studio, or generated docs.

---

## When to bring in a DBA / when to hire one

For most startups, never. The tooling above carries you to ~$10M ARR or so. Bring in a specialist when:

- A single query optimization could save you a six-figure cloud bill (you're at the scale where this is true).
- Compliance requires it (SOC 2 controls, HIPAA, financial regulators want a named DBA).
- You're doing genuinely hard things: multi-region active-active, sharding, custom storage extensions, sub-millisecond p99 requirements.
- Migrations are now consuming >20% of engineering time and you need a specialist to own the platform.

Before that point, your application engineers — armed with Supabase CLI / Atlas, branching, expand-contract, and the patterns in these references — can run the database themselves.

---

## Quick reference: starting a new project

```bash
# Supabase project
supabase init                                     # creates supabase/ folder
supabase start                                    # local PG + Studio
supabase migration new create_initial_schema     # new migration file
# ... edit the .sql file ...
supabase db reset                                 # apply from scratch + seed.sql
supabase db push                                  # push to linked remote project
supabase gen types typescript --linked > types.ts # generate TS types from schema

# Branching (cloud)
supabase branches create my-feature
supabase branches list
supabase branches delete my-feature
```

```bash
# Atlas (non-Supabase)
atlas migrate new add_users_table
# ... edit the .sql file ...
atlas migrate apply --url "postgres://..."
atlas migrate lint --dev-url "docker://postgres/16/dev"
atlas schema inspect --url "postgres://..."     # current state
atlas schema diff --from "..." --to "..."        # show drift
```

```bash
# dbmate
dbmate new add_users_table
dbmate up
dbmate down
dbmate status
```

---

## Anti-patterns

| Anti-pattern                                                         | Why it hurts                                                      | What to do                                                         |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| ORM `sync()` / `db push` in production                               | Silent destructive changes, no audit trail                        | Versioned migration files, always                                  |
| Editing an applied migration                                         | Breaks every environment that already ran it                      | New migration that fixes the prior one                             |
| `CREATE INDEX` (non-concurrent) on a hot table                       | Locks writes for the duration                                     | `CREATE INDEX CONCURRENTLY`, always, in prod                       |
| `ALTER COLUMN TYPE` on a big table without expand-contract           | Long table rewrite, app downtime                                  | Add new column, dual-write, drop old                               |
| Migrations without `lock_timeout`                                    | One blocked statement holds locks indefinitely, cascading outages | `SET lock_timeout = '5s'` at the top of every migration            |
| Schema changes via the SQL console in production                     | Drift; no audit; no rollback path                                 | Always through migration files in version control                  |
| No backups, or backups never tested                                  | Discovering at 3am that the parachute doesn't open                | PITR + quarterly restore drills                                    |
| Hand-rolled SQL in app code instead of migrations for schema changes | Schema state is now spread across application code and the DB     | All schema lives in migrations; app reads schema, never mutates it |
| One huge migration that does five things                             | Hard to review, hard to roll back, hard to debug                  | One logical change per migration                                   |
| Treating `down` migrations as optional                               | When you need to roll back, you discover you can't                | Write `down` even if you never run it — the exercise is the value  |
