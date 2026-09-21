# 08 — Online-sales showcase: Supabase → Cube → Chart.js

> **Status: PHASE 1 (data) BUILT AND VERIFIED 2026-09-21 · phases 2–4 not started.** Supersedes the
> unexecuted research of 08-27 (`coms 2026-08-27.md`; its plan file lived outside the repo on
> another machine — this document is the in-repo record that one never had).
>
> **Decisions:** D1 ✅ amend `CLAUDE.md` to fit reality · D2 ✅ `data/sales/` · D3, D4 — proceeding on
> the recommendation unless told otherwise · **D5 — answered by evidence, not by choice: the `net`
> exposure cannot be closed (§5).** It is accepted, or not, by the owner enabling login on
> `cube_reader`.
>
> ⚠️ **§5 was wrong as first written and has been corrected.** It proposed
> `revoke … on schema net from public`. Had that worked it would have stopped the lead engine.

## 1. What is being built

One new entry on `/work`: an **online-sales dashboard** — four KPI tiles and five Chart.js charts —
over a synthetic e-commerce star schema in Supabase, queried through a Cube semantic layer.

```
Supabase Postgres ──(cube_reader, pooler, read-only)──▶ Cube Cloud ──(HTTPS, server-side only)──▶ Next.js ISR page ──(props)──▶ Chart.js
   schema demo_sales                                     data model                                  src/lib/cube.ts                 'use client'
```

**The browser never talks to Cube, and the site never talks to Supabase.** The page is a Server
Component that runs four small aggregate queries at revalidation time and hands the rows to one
client component. That single choice removes a public API route, its rate limiter, the token-exposure
problem, and every visitor-facing consequence of the free tier (§3).

Where it lives was settled by `ADR-0002` and is not reopened: a `platform: "cube"` arm on the
`Showcase` union in `src/lib/work.ts`. No `/dashboards`, no `/demo`.

## 2. Decisions needed before building

| # | Decision | Recommendation |
|---|---|---|
| **D1** | **`CLAUDE.md` says "Supabase — leads only … must never leak into this deployment."** This request puts showcase data in that project. Amend the rule? | **Yes, narrowly.** The rule's purpose — lead data can never surface through the public site — survives intact: the site holds *no* Supabase credential, and Cube's credential can read one schema. Amend to "leads + `demo_sales`, the latter reachable only by `cube_reader`". A third free project is not an option (both slots used). |
| **D2** | Where does the SQL live, and is it a tracked migration? `apply_migration` writes `schema_migrations`, which the **leads repo** must mirror or a future `supabase db push` breaks — and that repo is not on this machine. | **`data/sales/*.sql` in the site repo**, idempotent drop-and-rebuild, applied via MCP `execute_sql`, *not* recorded as a migration. Same convention as the existing `data/` P&L warehouse. It is a reproducible seed, not an evolving schema, and it keeps the leads repo pure. Bends "applied via `apply_migration`, never by hand" — hence a decision. |
| **D3** | Accept Cube Cloud **Free** for a public page, against Cube's own "strongly advise not using a Shared deployment in production"? | **Yes, because of the ISR design** — see §3. Exit path is Cube Core on the Goal A VPS: same model files, different env. |
| **D4** | New dependency: `chart.js` (MIT). `CLAUDE.md`: none unless agreed. | **Yes** — it is the request. **Not** `react-chartjs-2`, **not** `@cubejs-client/*`: a ~30-line canvas wrapper and native `fetch` cover both. One dependency, not five. |
| **D5** | ⚠️ **The `net` schema is open to every Postgres role in this project** (§5). A new login credential held by a third party makes that live. | ~~Try the revoke.~~ **Resolved by evidence 09-21: it cannot be revoked, and must not be** — the crons depend on that same grant. Residue is low (no secret is exposed) and documented. **Accept by enabling login on `cube_reader`**, or host `demo_sales` elsewhere. |

## 3. Is Cube free? — yes, two ways, both with a catch

Verified 2026-09-21 at `cube.dev/pricing` and `docs.cube.dev/admin/deployment/deployment-types`;
unchanged from the 08-27 read.

| | Cost | The catch |
|---|---|---|
| **Cube Cloud — Free** | "Free forever", no card | **1,000 requests/day** account-wide · 2 Shared deployments · **auto-suspends after 30 min idle**, first request after wake is slow · **no scheduled pre-aggregation refresh** · 1 day query history · docs: *"for testing and learning about Cube only"* |
| **Cube Core** (self-hosted) | Apache-2.0, free | Needs an **always-on host**. None exists: the Goal A VPS has been blocked since 07-31, and the 08-28 n8n research already established there is no free, always-on, adequately sized host. |
| Cube Cloud — Starter / Premium | $40 / $80 per developer/month | "Embedded dashboards" are Premium-only — that means embedding *Cube's own UI*, which this design does not use. Same trap shape as `ADR-0001`; it does not bite here. |

**→ Cube Cloud Free for the MVP.** Every catch in that row is a *runtime* catch, and the ISR design
has no runtime: with `revalidate = 86400` Cube sees **~4 queries a day**, regardless of traffic. The
1,000/day cap is unreachable by visitors, the cold start lands on a background revalidation (the
visitor is served the cached page), and the data is static so there is nothing to pre-aggregate.

**API.** `POST {CUBE_API_URL}/cubejs-api/v1/cubesql` — SQL over HTTP, newline-delimited JSON: one
`{"schema":[…]}` line, then `{"data":[[…]]}` chunks. The 08-27 research chose it over `/v1/load`
because Cube's CEO called the JSON REST API feature-frozen (2026-05-14); today's docs mark neither
as deprecated. ⚠️ **Unverified: that `/v1/cubesql` is enabled on the Free tier.** Phase 2's gate
tests it with `curl`; the fallback is `/v1/load`, same `fetch`, plain JSON.

**Auth.** A Cube JWT grants the **whole data model** — unlike a Superset guest token, scoped to one
dashboard. So `/api/superset/guest-token` is the wrong pattern to copy: the token is minted
server-side (HS256 via `node:crypto`, 5-minute expiry, no JWT library) and never leaves the server.

## 4. Backend schema — `demo_sales`

**Domain.** A synthetic online shop: customers place orders through a marketing channel; each order
has one or more product lines; some orders are returned or cancelled. Every figure is generated
from SQL in this repo — no client data, and **no names or emails even synthetic**: customers are a
code, a country and a segment.

**Shape.** Star schema, **grain = one order line**. 32 months (2024-01 → 2026-08). **As built:
65,117 lines · 37,524 orders · 11,389 customers · 60 products in 6 categories · 6 channels · 14 MB**
against a 500 MB plan. Completed revenue $4,766,371.12. _(The plan guessed ~5k customers; the
generator settled on a 3.3-orders-per-customer repeat rate, which is the more believable figure.)_

- `dim_product` · `dim_customer` · `dim_channel` — conformed dimensions, integer keys.
- `fact_order_line` — measures at line grain; `order_id` rides as a degenerate dimension.
- **No `dim_date`, deliberately.** Cube's `time` dimension derives day/week/month/quarter/year from
  a timestamp. A date table would be modelled twice and used once.
- **No order-level amounts on the fact** (shipping, order discount). Stored at line grain they fan
  out and double-count on the first `SUM` — the classic trap. Order count is `count_distinct(order_id)`.

**Deliberate departures from the house entity conventions** (uuid PK, `deleted_at`, `metadata jsonb`,
`updated_at` trigger, plural names): those serve mutable OLTP entities. This is a read-only
warehouse whose only lifecycle is `drop schema … cascade` and re-seed; names follow the existing
`data/` warehouse (`dim_*` / `fact_*`, singular).

```sql
-- data/sales/001-create-schema.sql (excerpt — the file also enables RLS on all four tables).
-- Idempotent: drops and rebuilds. Dropping takes cube_reader's grants with it — re-run 004 after.

drop schema if exists demo_sales cascade;
create schema demo_sales;

comment on schema demo_sales is
    'SYNTHETIC online-sales warehouse for the public vosk.dev showcase. Read by Cube via cube_reader. Not part of the lead engine.';

create table demo_sales.dim_product (
    product_key     smallint        primary key,
    sku             text            not null unique,
    product_name    text            not null,
    category        text            not null,
    subcategory     text            not null,
    list_price      numeric(10, 2)  not null,
    unit_cost       numeric(10, 2)  not null,
    constraint dim_product_price_ck check (list_price > 0 and unit_cost > 0)
);

create table demo_sales.dim_customer (
    customer_key        integer     primary key,
    customer_code       text        not null unique,
    country_code        char(2)     not null,
    country_name        text        not null,
    region              text        not null,
    segment             text        not null,
    first_order_date    date        not null,
    constraint dim_customer_segment_ck check (segment in ('consumer', 'business'))
);

create table demo_sales.dim_channel (
    channel_key     smallint    primary key,
    channel_name    text        not null unique,
    -- paid / owned / earned: the grouping a marketing lead actually asks for.
    channel_group   text        not null,
    constraint dim_channel_group_ck check (channel_group in ('paid', 'owned', 'earned'))
);

create table demo_sales.fact_order_line (
    order_line_key  bigint          generated always as identity primary key,
    -- Degenerate dimension: no dim_order exists, the id itself is the order.
    order_id        integer         not null,
    line_number     smallint        not null,
    ordered_at      timestamptz     not null,
    customer_key    integer         not null references demo_sales.dim_customer (customer_key),
    product_key     smallint        not null references demo_sales.dim_product (product_key),
    channel_key     smallint        not null references demo_sales.dim_channel (channel_key),
    order_status    text            not null,
    -- True on every line of a customer's first order: new-vs-returning without a self-join.
    is_first_order  boolean         not null,
    quantity        smallint        not null,
    -- Price actually charged — list_price drifts, history must not.
    unit_price      numeric(10, 2)  not null,
    discount_amount numeric(10, 2)  not null default 0,
    net_amount      numeric(12, 2)  not null,
    cost_amount     numeric(12, 2)  not null,
    constraint fact_order_line_grain_uq   unique (order_id, line_number),
    constraint fact_order_line_status_ck  check (order_status in ('completed', 'returned', 'cancelled')),
    constraint fact_order_line_qty_ck     check (quantity > 0),
    constraint fact_order_line_net_ck     check (net_amount = quantity * unit_price - discount_amount)
);

-- Every dashboard query filters by period first. The FK indexes keep the performance
-- advisor quiet; at 70k rows the planner will mostly ignore them, which is fine.
create index fact_order_line_ordered_at_idx   on demo_sales.fact_order_line (ordered_at);
create index fact_order_line_customer_key_idx on demo_sales.fact_order_line (customer_key);
create index fact_order_line_product_key_idx  on demo_sales.fact_order_line (product_key);
create index fact_order_line_channel_key_idx  on demo_sales.fact_order_line (channel_key);
```

**Seed** (`002-seed.sql`) — deterministic, **no `random()`**: the same `md5()`-hash helper the P&L
seed uses, so a rebuild reproduces every figure and the write-up can quote them. Shape worth
designing rather than generating: growth trend, Nov–Dec peak, weekday effect, a channel mix that
shifts from paid toward owned, and **one or two planted story beats** (a paid-search budget cut, a
category stock-out) so the dashboard has something to find. `003-verify.sql`: row counts, the
`net_amount` identity, no orphan keys, and that the planted beats are visible.

**`numeric` arrives as a JSON string.** `src/lib/cube.ts` casts by the `column_type` in the cubesql
`schema` line. Amounts here are nowhere near `Number.MAX_SAFE_INTEGER`; the cast is explicit, not
Cube's `castNumerics`.

## 5. Isolation — proven by test, with one residue that cannot be closed

The sales data is public by design. **What needs protecting is the lead engine, from a credential
that will live in a third-party SaaS.** Everything below was run on 2026-09-21, as the role, against
real rows — not read off an ACL.

| Surface | What `cube_reader` can do | |
|---|---|---|
| `demo_sales.*` | `select` all 4 tables · **write nothing** | ✅ by design |
| `public.*` — the lead engine, 8 relations | **nothing.** `select … from public.leads` → `42501 permission denied`. No `PUBLIC` select on any table, and RLS on all seven behind that | ✅ |
| `cron`, `vault`, `auth`, `storage`, `extensions` | nothing — no schema `USAGE` | ✅ |
| **`net._http_response`, `net.http_request_queue`** | **`select` *and* write** — `PUBLIC` holds **all** privileges, no RLS. 36 rows readable at test time | ⚠️ residue |
| **`net.http_get` / `http_post` / `http_delete`** | **execute** — outbound HTTP from the database's address | ⚠️ residue |

### Why the residue cannot be closed — and must not be

This is how `pg_net` ships on Supabase, and two facts pin it in place:

1. **`postgres` cannot revoke it.** The `net` objects are owned by `supabase_admin`; `postgres` is
   not a superuser, not a member of that role, and holds `USAGE` on the schema *without* grant
   option. A `revoke` from `postgres` is a no-op with a warning.
2. **The lead engine depends on the same grant.** All three crons run as `postgres`, and
   `postgres` has **no explicit grant** on `net.http_post` or the `net` tables — it reaches them
   *only* through `PUBLIC`. A revoke that somehow worked would stop `fetch-himalayas`, `enrich` and
   `digest` at once.

> ⚠️ **The first draft of this section proposed `revoke usage on schema net from public`.** It was
> written from the ACL listing before anyone asked who else was standing on that grant. Checked
> before it was run. **Do not "fix" the residue that way** — `004-cube-role.sql` carries the same
> warning at the top.

### What the residue is actually worth

A holder of `cube_reader`'s password can:

- **read ~6 hours of cron response bodies** — run counts, posting UUIDs, error strings, Anthropic
  request IDs. Operational detail; no lead content, no credentials.
- **read in-flight request headers** — and the only secret in them is the bearer the crons send,
  which is the **anon/publishable key** (Vault `edge_invoke_key`, whose own description reads *"NOT
  service_role"*). Public by design. **Nothing is captured that is not already meant to be public.**
- **make outbound HTTP calls from the database**, and tamper with the two `net` tables, which only
  feed monitoring.

Low, bounded, and it touches no lead data. It is a real coupling nonetheless, and the exit if it
ever stops being acceptable is the same as the free-tier exit: move `demo_sales` to a database of
its own; the four SQL files run unchanged on any Postgres.

_Separate finding, for the lead-engine backlog, not this build: since the Edge Functions accept
the publishable key, anyone holding it can invoke `enrich` / `digest` directly. Bounded — `enrich`
only works an existing queue — but `digest` would post to Telegram on demand._

### The role — split so the secret never transits chat

`004-cube-role.sql` creates `cube_reader` **`NOLOGIN`**: no password, no credential, nothing exposed.
That let the grants, the policies and every test below run from the MCP today. **The owner enables
login, once, in the Supabase SQL editor:**

```sql
alter role cube_reader login password '<generated, 32+ chars>';
```

Running that line *is* the acceptance of the residue above. Hardening already applied:
`nobypassrls`, `noinherit`, connection limit 5, `statement_timeout = 15s`,
`search_path = demo_sales`, `default_transaction_read_only = on` (a guard rail — it makes the
default outcome of `net.http_post` an error — not a boundary; a session can switch it off).

### Acceptance — as run

```sql
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
```

| Test | Expected | Got |
|---|---|---|
| A — read `demo_sales` as the role | rows | ✅ `cube_reader` · 59,507 lines · 4,766,371.12 |
| B — read `public.leads` as the role | `permission denied` | ✅ `42501 permission denied for table leads` |
| C — privilege sweep, every schema | `demo_sales` 4/0 · `public` 0/0 · `net` 2/2, nothing else | ✅ exactly that |
| D — `get_advisors(security)` | zero lints | ✅ zero (was 4 × *RLS enabled, no policy* before `004`) |

⚠️ Not exercised: the `default_transaction_read_only` guard. Role-level settings apply at login,
and `set role` is not a login. First real connection from Cube tests it.

## 6. Cube data model

Four cubes mirroring the four tables, and **one view, `sales_overview` — the only object the site
queries.** The view is the contract; cubes can change shape behind it. Lives in `cube/model/` in the
site repo as the source of record, deployed with `npx cubejs-cli deploy`
(⚠️ unverified on the Free tier — fallback is pasting into the Cloud IDE, repo copy still canonical).

| Measure | Definition | Additive? |
|---|---|---|
| `revenue` | `sum(net_amount)` where `order_status = 'completed'` | yes |
| `units` | `sum(quantity)`, completed | yes |
| `gross_margin` | `sum(net_amount - cost_amount)`, completed | yes |
| `orders` | `count_distinct(order_id)`, completed | **only across order-level attributes** |
| `aov` | `revenue / nullif(orders, 0)` | no — recomputed, never summed |
| `margin_pct`, `return_rate` | ratios of the above | no |

Connection: Supavisor **session-mode pooler** (the direct host is IPv6-only on the free plan), user
`cube_reader.howpxpdnjjzdwqrgxkee`, database `postgres`, SSL on. Host string is copied from the
Supabase dashboard → Connect; no MCP tool returns it.

## 7. The dashboard

**Filters: year and channel — and only those, on purpose.** Both are *order-level* attributes, so
every measure including `orders` stays additive when the client re-sums a pre-aggregated payload.
**Category is a breakdown, never a filter**: an order spans categories, so summing `orders` across
them over-counts. A BI showcase that gets that wrong is advertising the opposite of its purpose.

| | Visual | Query grain |
|---|---|---|
| Tiles | Revenue · Orders · AOV · Gross margin % (each with vs-prior-year) | Q1 |
| 1 | Revenue + orders by month — bar/line combo | **Q1** month × channel (~190 rows) |
| 2 | Channel mix over time — stacked bar | Q1 |
| 3 | Revenue by category — horizontal bar | **Q2** category × year × channel (~110) |
| 4 | Top 10 products — horizontal bar | **Q3** product × year × channel (~1,100) |
| 5 | Revenue by country — horizontal bar | **Q4** country × year × channel (~300) |

Four queries, < 60 KB raw. One of them, as the site will send it:

```sql
select
     date_trunc('month', s.ordered_at)    _month
    ,s.channel_name                       _channel
    ,measure(s.revenue)                   _revenue
    ,measure(s.orders)                    _orders
    ,measure(s.units)                     _units
    ,measure(s.gross_margin)              _gross_margin
from sales_overview s
where 1=1
    and s.ordered_at >= date '2024-01-01'
group by 1, 2
order by 1, 2
```

## 8. Site changes — `vosk.dev` repo only

| File | Change |
|---|---|
| `package.json` | + `chart.js` |
| `src/lib/env.ts` | + `CUBE_API_URL`, `CUBE_API_SECRET` — **optional**, as `NEXT_PUBLIC_SUPERSET_DOMAIN` is: absent ⇒ the entry is hidden and the build passes |
| `src/lib/cube.ts` | new, `server-only` — mint JWT, `POST /v1/cubesql`, parse NDJSON, cast by `column_type` |
| `src/lib/sales-dashboard.ts` | new — the four named queries + a **Zod `.strict()` schema per result row**. Cube's response is external input; a renamed measure fails the build, not the chart |
| `src/lib/work.ts` | + `platform: "cube"` arm with `reportId`; extend the hide-until-configured filter; `PLATFORM_LABEL` |
| `src/app/[locale]/work/[slug]/page.tsx` | + the `cube` branch; `revalidate = 86400` |
| `src/components/sales-dashboard.tsx` | new, `'use client'` — filters, tiles, five canvases; registers only the Chart.js controllers it uses |
| `src/lib/i18n/en.ts` (+ `ru.ts`, kept in step) | showcase copy |
| `CLAUDE.md` | D1 amendment; table names; this doc in the pointers |

**No `/api/cube` route.** The 08-27 note that a third in-memory rate-limit `Map` would trigger
extracting `lib/rate-limit.ts` does not fire. A proxy route — browser names a report, server runs
it — is phase 2, and only if drill-down outgrows a pre-aggregated payload.

**One open design question.** A build while Cube is asleep eats the cold start; a build while Cube
is *down* fails. Recommendation: 60 s timeout, one retry, then **fail loudly** — production keeps its
last good deployment, so visitors are unaffected. The Ignored Build Step for `.log/**` + `docs/**`
(board §5) removes most of the exposure, since 12 of the last 20 deploys were docs-only. Add a
committed snapshot fallback only if it actually bites.

## 9. Build order, with gates

| Phase | Work | Who | Gate |
|---|---|---|---|
| **0** | D1–D5 answered | owner | — |
| **1 · Data** ✅ **done 09-21** | `data/sales/001`–`004`, applied via MCP | build | ✅ `003-verify` clean, fingerprint `b7e0006d…` · ✅ §5 acceptance A–D · ✅ advisors zero lints. **Owner still to run** `alter role cube_reader login password …` |
| **2 · Cube** ~1 h | account, deployment, pooler connection, model, view | **owner signs up (~15 min)** + build | Playground returns revenue by month · `curl /v1/cubesql` returns NDJSON, else switch to `/v1/load` |
| **3 · Site** ~3 h | §8 | build (nerd reviews) | `pnpm typecheck && pnpm lint && pnpm build` · env unset ⇒ entry hidden, build green · Vercel preview renders · figures match `003-verify` to the cent |
| **4 · Copy** ~0.5 h | real write-up; `noindex` until it is | owner + build | the entry says what it is: synthetic data, real stack |

**Today is feasible through phase 3** if the two owner steps land early: the `create role` line and
the Cube signup. Both are gated on a person, not on code. Load the `dataviz` and `ui-ux-designer`
skills before the first chart — the detail page is a one-screen layout (`8.625rem`, board §7 item 9).

## 10. Risks

- **`net` exposure (D5)** — cannot be closed; low, bounded, exposes no secret (§5). Accepted by the
  act of enabling login on `cube_reader`. **Never "fix" it with a revoke on `net` — the crons stand
  on that grant.**
- **Free-tier ToS drift.** "Testing and learning only" is advice today. If it becomes enforcement,
  the exit is Cube Core on the VPS; the model files move unchanged.
- **Shared instance.** The demo and the lead engine share one free-tier Postgres. Mitigated by
  ~4 queries/day, the statement timeout and the connection limit — but it is a coupling `CLAUDE.md`
  was written to prevent, accepted here with eyes open (D1).
- **The engine is currently down** (board fourteen §T.2). Unrelated to this build, same database:
  phase 1 touches the project while 101 abandoned rows wait for a re-queue. Do not mix the two in
  one session's writes.
- **A cached page is not a live query.** True, and the write-up should say so rather than imply
  otherwise: the claim is *semantic layer → governed measures → custom viz*, not real-time.
