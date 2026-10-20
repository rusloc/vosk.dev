# Demo warehouse — synthetic Finance / P&L

Backs the Superset showcase on `/work`. **Every figure here is synthetic**, generated from the
SQL in this directory. No client data reaches the public showcase — that is the point of it
existing (`docs/01-solution-overview.md` §7).

The target is the `analytics` database on the Superset VPS — a separate database in the same
Postgres instance that holds Superset's metadata (see
[`deploy/superset/init-analytics-db.sql`](../deploy/superset/init-analytics-db.sql) for why
they are separate). Nothing here needs to be publicly addressable: a self-hosted Superset
reaches its warehouse over the Docker network.

> Earlier revisions of this file targeted Supabase. That existed only because Preset.io is
> cloud-hosted and reaches only publicly addressable databases; `ADR-0003` removed Preset,
> and Supabase with it. **The SQL itself is unchanged** — it was always plain Postgres.

## Layout

```
data/
  schema/001-create-warehouse.sql   → schema `demo`: star schema + v_pl_monthly view
  seed/001-seed-dimensions.sql      → 36 months, 14 accounts, 8 cost centres, 3 scenarios
  seed/002-seed-facts.sql           → ~13k signed GL rows, deterministic
  seed/003-verify.sql               → row counts, sign check, P&L totals, anomaly check
```

## Rebuild in one command

On the VPS, from `/opt/superset`:

```bash
for f in data/schema/001-create-warehouse.sql \
         data/seed/001-seed-dimensions.sql \
         data/seed/002-seed-facts.sql \
         data/seed/003-verify.sql; do
  docker compose exec -T db psql -U superset -d analytics -f /dev/stdin < "$f"
done
```

Or against any Postgres reachable directly:

```bash
psql "$ANALYTICS_DB_URL" \
  -f data/schema/001-create-warehouse.sql \
  -f data/seed/001-seed-dimensions.sql \
  -f data/seed/002-seed-facts.sql \
  -f data/seed/003-verify.sql
```

The schema file drops and recreates `demo`, so the whole thing is re-runnable from scratch;
the seeds are independently idempotent via `on conflict do nothing`. `003-verify.sql` uses
psql `\echo` meta-commands, so run it through `psql`, not a SQL console.

## Model

Star schema at **month × account × cost centre × scenario** grain. A real general ledger is
transactional, but a P&L dashboard reads it monthly, and generating at the grain you report at
keeps the seed honest about which questions it can answer.

- `dim_date` — 36 months, FY2023–FY2025. Fiscal year = calendar year.
- `dim_account` — P&L hierarchy: Revenue → COGS → Opex → Other, with `sort_order` driving the
  waterfall and `account_group` driving the cost breakdown.
- `dim_cost_center` — 8 centres across Commercial / Product / Delivery / G&A and four regions.
- `dim_scenario` — Actual, Budget, Forecast.
- `fact_gl` — **signed** amounts: revenue positive, costs negative, so `SUM(amount)` down the
  hierarchy is net profit and the waterfall needs no per-section `CASE`.

Not every account exists in every cost centre (revenue only in revenue-owning centres,
depreciation only in G&A, and so on). A fully dense cube is the tell-tale sign of generated
data; the gaps are what make the cost-centre breakdown read as real.

## Determinism

All noise comes from `demo.rnd(seed)` — an md5 hash of a stable key, not `random()`. The same
SQL always produces the same warehouse. This is deliberate: a demo whose numbers move between
rebuilds cannot be screenshotted, written about, or pointed at during a call. `003-verify.sql`
prints a fingerprint checksum; if it changes across a rebuild, something stopped being
deterministic.

Shape: annual actual revenue lands near **$18.4M** with a low-teens net margin — the figures the
case-study copy in `src/lib/work.ts` quotes. Change the bases in `002-seed-facts.sql` and the
copy needs changing with them.

## Narrative anomalies

Four deliberate outliers, applied to **actuals only** (a plan that already contains the surprise
explains nothing) — these are the months worth talking through on a demo call:

| Period  | Account              | Effect | Story                               |
| ------- | -------------------- | ------ | ----------------------------------- |
| 2023-07 | Product revenue      | −22%   | a slipped release                   |
| 2024-09 | Marketing            | ×2.1   | a campaign that ran past its budget |
| 2025-03 | Direct materials     | +38%   | supplier price shock                |
| 2025-11 | Subscription revenue | +15%   | an unusually large renewal cohort   |

## Connecting it to Superset

1. Superset → **Settings → Database Connections** → add Postgres:
   `postgresql://superset_ro:<password>@db:5432/analytics`
   — `db` is the Docker Compose service name. From inside the Superset container that is the
   correct host; `localhost` there resolves to the container itself, not Postgres.
2. Use the **read-only** `superset_ro` role, not the `superset` superuser. The dashboards
   only ever SELECT, so the credentials sitting in Superset's connection store have no
   reason to be able to do anything else.
3. Register **`demo.v_pl_monthly`** as the dataset, not `fact_gl`. Superset's chart builder is
   far easier to work in against a flat labelled table, and it leaves the star schema free to
   change shape without editing every chart.
4. Grant the **`EmbeddedGuest`** role datasource access to that dataset, or the embed will
   load with every chart in an error state (`docs/03-vps-deployment.md` §3).

---

# Demo warehouse 2 — synthetic online sales (`data/sales/`)

Backs the **Cube** showcase on `/work`. Design, decisions and the isolation finding:
[`docs/08-cube-sales-showcase.md`](../docs/08-cube-sales-showcase.md). **Every figure is synthetic**,
and there is **no personal data even synthetic** — a customer is a code, a country and a segment.

Unlike the P&L warehouse above, this one **is deployed**: schema `demo_sales` in Supabase project
`howpxpdnjjzdwqrgxkee`, shared with the QBO P&L warehouse (schema `qbo`), because the free plan has no
spare slot. It is isolated by schema and by role, not by project. Nothing here touches another schema.

```
data/sales/
  001-create-schema.sql   → drops + rebuilds `demo_sales`: 3 dims, 1 fact, RLS on, no policy yet
  002-seed.sql            → deterministic seed, 2024-01-01 → 2026-08-31, truncates first
  003-verify.sql          → integrity, KPIs, story beats, channel drift, fingerprint
  004-cube-role.sql       → `cube_reader` (NOLOGIN), grants, policies, acceptance tests
```

## Rebuild

**Applied through the Supabase MCP `execute_sql`, in file order — not psql, and not
`apply_migration`.** It is deliberately *not* a tracked migration: `schema_migrations` in that
project belongs to the `rusloc/qbo` repo, and a reproducible seed is not an evolving schema.

`001` drops the schema, which takes `cube_reader`'s grants and policies with it — **always re-run
`004` after `001`.** `execute_sql` returns only the last statement's rows, so `003` and the tests
in `004` are run one block at a time. After any rebuild: `get_advisors(security)` → zero lints.

The role's password is **never** in this repo or in chat. `004` creates the role `NOLOGIN`; the
owner enables it once in the Supabase SQL editor (`alter role cube_reader login password '…'`).

## Model

Star schema, **grain = one order line**. 65,117 lines · 37,524 orders · 11,389 customers · 60
products · 6 channels · ~14 MB. Completed revenue **$4,766,371.12**.

- `dim_product` — 6 categories × 2 subcategories × 5 products; `list_price` is *today's* price.
- `dim_customer` — numbered in acquisition order; country, region, segment, `first_order_date`.
- `dim_channel` — 6 channels grouped paid / owned / earned.
- `fact_order_line` — `order_id` as a degenerate dimension; `unit_price` is what was *charged*;
  a `check` enforces `net_amount = quantity * unit_price - discount_amount`.

**No `dim_date`** — Cube's `time` dimension derives every grain from `ordered_at`.
**No order-level amounts on the fact** — at line grain they fan out and double-count.
**Status, channel and customer are order-level facts** stored per line; `003` proves they never
disagree within an order, which is what lets `count(distinct order_id)` stay additive across them.

## Story beats

| Period | What happens | What the dashboard shows |
| --- | --- | --- |
| 2025-06-01 → 07-31 | paid-search budget cut | that channel's orders 302 → **99 → 92** → 304; total volume dips with it |
| 2025-11-20 → 12-10 | best-seller out of stock | **zero** units through Black Friday week, rebound to 61 the week after |
| whole period | mix drifts paid → owned | email 11.9% → 16.0%, paid search 27.7% → 21.5% |
| whole period | paid social returns at 2× | overall return rate eases 6.1% → 5.3% as its share shrinks |

Determinism works as above: `demo_sales.rnd(seed)`, created and dropped inside `002`.
Fingerprint `b7e0006d6eeff87791ee0a70ed17e371` — change the generator and the copy that quotes
these figures changes with it.
