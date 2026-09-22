# 08 — Online-sales showcase: Supabase → Cube → Chart.js

> **Status 2026-09-21: PHASE 1 (data) built and verified · PHASE 2 (Cube) deployed by the owner at
> `accessible-bonobo.aws-eu-central-1.cubecloudapp.dev` — reachable, `/cubesql` routed, **not yet
> queried with a token** · PHASE 3 (site) built and verified end to end against a local mock of
> `/cubesql` fed with real `demo_sales` aggregates — **never yet against the live deployment**: the
> secret is in neither `.env.local` nor Vercel, so the entry is hidden everywhere · PHASE 4 (copy)
> drafted, `noindex` until signed off.** Supersedes the
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

**API.** `POST {CUBE_API_URL}/cubesql` — where **`CUBE_API_URL` is pasted exactly as Cube Cloud shows
it, already ending in `/cubejs-api/v1`** (a bare origin gives a loud 404, not a retry). SQL over HTTP,
newline-delimited JSON: one
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
| `vault`, `auth`, `storage` | nothing — no schema `USAGE`, no table grants | ✅ |
| `cron.job`, `cron.job_run_details`, `extensions.pg_stat_statements(_info)` | **nothing — but only because the schema is closed.** Each carries a `PUBLIC` select grant; the role has no `USAGE` on either schema, so every query dies at `42501 permission denied for schema`. **Cube's table picker lists them anyway** — it reads `information_schema`, which ignores schema-level access. Cosmetic, tested 09-21. ⚠️ One `grant usage on schema cron to public` from live: never issue it | ✅ |
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
| `margin_rate`, `return_rate` | ratios of the above, as fractions (0.48, not 48) | no |

Connection — Supavisor **session-mode pooler**, verified 2026-09-21:

| Field | Value |
|---|---|
| Host | **`aws-1-eu-west-1.pooler.supabase.com`** |
| Port | `5432` (session mode — not `6543`) |
| Database | `postgres` |
| Username | `cube_reader.howpxpdnjjzdwqrgxkee` |
| SSL | on |

**Not** `db.howpxpdnjjzdwqrgxkee.supabase.co` — the direct host has **no IPv4 record at all**
(`ENODATA`; one AAAA), and Cube Cloud connects over IPv4. **Not** `aws-0-…` either: the prefix is
per-project and `aws-0` answers `tenant/user not found`. Both were settled by a passwordless
Postgres startup handshake — the right pooler replies with a SCRAM-SHA-256 challenge, the wrong one
with an error — which also proved that Supavisor accepts a **custom role** as `role.project-ref`,
an assumption this plan had been carrying unverified. No MCP tool returns the host.

## 7. The dashboard

**Filters: year and channel — and only those, on purpose.** Both are *order-level* attributes, so
every measure including `orders` stays additive when the client re-sums a pre-aggregated payload.
**Category is a breakdown, never a filter**: an order spans categories, so summing `orders` across
them over-counts. A BI showcase that gets that wrong is advertising the opposite of its purpose.

| | Visual | Query grain |
|---|---|---|
| Tiles | Revenue · Orders · AOV · Gross margin % (each with vs-prior-year) | Q1 |
| 1 | Revenue by month — columns | **Q1** month × channel (~190 rows) |
| 2 | Orders by month — line | Q1 |
| 3 | Channel share of revenue — 100% stacked columns | Q1 |
| 4 | Revenue by category — horizontal bar | **Q2** category × year × channel (~110) |
| 5 | Top 10 products — horizontal bar | **Q3** product × year × channel (~1,100) |
| 6 | Revenue by country — horizontal bar, top 8 + Other | **Q4** country × year × channel (~300) |

**Two changes from the first draft of this table, both made at build time:**

- **The "revenue + orders bar/line combo" is two charts.** A combo needs two y-scales, and how two
  scales line up is arbitrary — so the chart manufactures a correlation the data does not contain.
  Two plots over one month axis say the same thing honestly. For a BI showcase this is the same
  class of mistake as filtering `orders` by category.
- **Channel mix is a 100% stack, and ignores the channel filter.** Stacked in absolute dollars its
  outline is chart 1 again; as shares it shows the mix moving, which is the planted story (the
  paid-search cut of 2025-06/07 is unmissable). Narrowed to one channel it would be a wall of 100%,
  so it always shows all six and **greys the other five** when the filter picks one.

Every chart has a table twin (one `Charts | Tables` switch in the filter row): three of the six
channel hues sit below 3:1 on the cream surface, which makes a non-colour route to every value a
requirement, not a nicety. Palette validated with the `dataviz` skill's script against `#fff8e7` —
worst adjacent pair ΔE 9.1 under simulated CVD, 19.6 normal vision. Colour is assigned per channel,
never per rank, so a filter cannot repaint a survivor.

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
| ~~`src/lib/env.ts`~~ | **Untouched — this row was wrong.** `env.ts` is bundled into client components and says itself that server credentials do not live there. `CUBE_API_URL` + `CUBE_API_SECRET` are validated inside `cube.ts`, as `SUPERSET_SVC_*` are inside `superset.ts`. Still optional: absent ⇒ entry hidden, build passes; `""` reads as unset |
| `src/lib/cube.ts` | new, `server-only` — mint JWT, `POST /v1/cubesql`, parse NDJSON, cast by `column_type` |
| `src/lib/sales-dashboard.ts` | new — the four named queries + a **Zod `.strict()` schema per result row**. Cube's response is external input; a renamed measure fails the build, not the chart |
| `src/lib/sales-dashboard-calc.ts` | + `channelShares` (2 tests) — the one piece of arithmetic the 100% stack needed |
| `src/lib/work.ts` | + `platform: "cube"` arm, **no `reportId`** — there is one Cube dashboard and the page renders it by name; an id earns its place with a second one. Hide-until-configured via `isCubeConfigured()`; `PLATFORM_LABEL`. Importing `cube.ts` makes `work.ts` server-only in effect — all five importers already are |
| `src/app/[locale]/work/[slug]/page.tsx` | + the `cube` branch; `revalidate = 86400`. **The one-screen lock does not apply to it**: a native dashboard has intrinsic height, so the page flows, and the caption moves *above* the dashboard |
| `src/components/chart-canvas.tsx` | new, `'use client'` — the Chart.js ↔ React seam: create, `update()` on config change, destroy. Registers only the controllers used |
| `src/components/sales-dashboard.tsx` | new, `'use client'` — filters, tiles, six canvases, table twins |
| `next.config.ts` | `staticPageGenerationTimeout: 130` |
| `src/lib/i18n/en.ts` (+ `ru.ts`, kept in step) | showcase copy |
| `CLAUDE.md` | D1 amendment; table names; this doc in the pointers |

**No `/api/cube` route.** The 08-27 note that a third in-memory rate-limit `Map` would trigger
extracting `lib/rate-limit.ts` does not fire. A proxy route — browser names a report, server runs
it — is phase 2, and only if drill-down outgrows a pre-aggregated payload.

**⚠️ The fetch must carry NO `cache` option.** This plan first said `cache: "no-store"`, "because ISR
does the caching". On Next 16.2.10 that is backwards: an explicit `no-store` sets the fetch's
revalidate to 0 and **de-opts the whole page from ISR to dynamic** — every visitor would run four
Cube queries, the exact outcome §3 exists to prevent. Reproduced by `nerd` in a two-page probe app
(`ƒ /explicit-no-store` vs `○ /no-cache-option  1d`). A POST with `Authorization` is already "auto
no cache", which Next exempts. A test asserts the init has no `cache` key; do not tidy it back.

**Build-time budget.** Worst case per query is 60 s + one 60 s retry, but Next's
`staticPageGenerationTimeout` defaults to **60 s** — a cold Cube would get the page attempt killed
before the retry runs. **Done: `staticPageGenerationTimeout: 130`.** `maxDuration` was **not**
exported: the plan's limit depends on whether the Vercel project runs Fluid compute, no MCP read
returns that, and a value above the limit fails the deploy outright. It is also not needed — a
background revalidation that times out on a sleeping Cube leaves the cached page in place, and that
same request is what wakes Cube for the next attempt.

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
| **2 · Cube** — deployed 09-21 | account, deployment, pooler connection, model, view | **owner** | ⏳ Playground figures not reported back · ⏳ `/v1/cubesql` answers `403 Authorization header isn't set` unauthenticated, so the route exists — **an authenticated query has not been run** |
| **3 · Site** — built 09-21 | §8 | build | ✅ `typecheck` · `lint` · 133 tests · `build` · ✅ env unset ⇒ entry hidden, build green · ✅ full pipeline against a local `/cubesql` mock: page prerenders as ISR (`● 1d`), all-years totals **$4.77M / 34,293 orders** match §4 · ✅ rendered and inspected over CDP — six states incl. hover, table view and 390 px; console clean, no hydration error · ⏳ **live Cube, Vercel preview, figures to the cent** — blocked on the secret |
| **4 · Copy** — drafted 09-21 | real write-up; `noindex` until it is | owner + build | the entry says what it is: synthetic data, real stack. **`noindex: true` stays until the owner signs the copy off** |

**To unblock the ⏳ rows — owner, ~5 min.** Create `.env.local` (the assistant is denied `.env*`, by
design) and add the same two variables in Vercel → vosk-dev → Settings → Environment Variables,
Production + Preview, the secret marked *Sensitive*:

```
CUBE_API_URL=https://accessible-bonobo.aws-eu-central-1.cubecloudapp.dev/cubejs-api/v1
CUBE_API_SECRET=<Cube Cloud → deployment → Settings → API secret>
```

⚠️ **`CUBE_API_SECRET` is the signing secret, not a token.** Cube Cloud's own "REST API" curl snippet
puts a ready-made **JWT** in the `Authorization` header; the site mints its own 5-minute JWTs and
needs the key they are signed with — `CUBEJS_API_SECRET`, under the deployment's Settings →
Environment variables (label from Cube's docs, not observed). A JWT pasted into `CUBE_API_SECRET`
gives `403 Invalid token` on every query.

Then `node scripts/cube-handshake.mjs` — one command, reads `.env.local` itself, mints a token the
way `lib/cube.ts` does, checks `/load` and `/cubesql` against the two seed figures and says which
half is wrong. Then `pnpm build`.

**Settled against the live deployment, 2026-09-22** (three read-only calls):

| Unknown | Answer |
|---|---|
| `/cubesql` on the Free tier | ✅ enabled — `200` in 3.2 s |
| `Authorization` form | ✅ raw JWT, no `Bearer` |
| `date_trunc(…)` on the time dimension, `date '…'` literal in the filter | ✅ both accepted |
| `column_type` strings | ✅ `Timestamp` · `String` · `Double` · `Int64`, numbers as strings, timestamps `2024-01-01T00:00:00.000` — all already handled |
| **Envelope shape** | ❌ **was wrong.** The schema line is `{"schema":[…],"lastRefreshTime":"…"}`; the parser's `.strict()` envelope rejected it and the first live build would have died on *"Unrecognised Cube response line"*. Envelope loosened, ~~column descriptors and~~ rows still strict; the verbatim line is now a test |
| **Descriptor shape** | ❌ **was wrong too — found by the third red build, 09-22 00:29** (`f24be02`, the envelope fix itself). A column descriptor gains **`format`** (and `currency`) whenever the member declares one — `SchemaColumn` in `cubejs-backend-native/src/node_export.rs`. `revenue` is `format: currency` in `cube/model/sales.yml`, so all four site queries send `{"name":"_revenue","column_type":"Double","format":"currency"}` and the still-strict descriptor refused it. The "verbatim" fixture above never met it: it came from a query on `_net_amount`, a member with no format — **a fixture is verbatim only for the query it came from.** Vercel's log cut the line at 200 chars, exactly at `_re`; the cause was read from Cube's source, not guessed. Descriptor loosened (`81a4c9d`): `name` + `column_type` stay required — all the parser reads — and the row contracts in `sales-dashboard.ts` stay strict. Not "strict + optional `format`": that is the same failure on Cube's next metadata key, and a Cube Cloud upgrade must not be able to block every site deploy |
| **First green build with Cube configured** | ✅ **09-22 00:37**, `81a4c9d`, `READY`. Owner confirmed the page visible and the data loaded |
| A deployment waking from suspension | ⏳ not observed — it was awake. `{"error":"Continue wait"}` is still not retried by `cube.ts` (the handshake script does poll for it) |
| **Figures to the cent** (§9 gate) | ✅ **09-22, after the owner merged `sales.yml` to `master`:** the site's four queries, verbatim, against live `/cubesql` — 192 / 108 / 1,080 / 180 rows, 0 NULLs, 0.8–3.4 s — each sums to **4,766,371.12**, both order-bearing ones to **34,293**. The model compiled as written |

⚠️ **First production build with the env vars set: `ERROR` — `Cube responded 403: {"error":"Invalid
token"}`.** Not the envelope bug: the request never reached the parser. The value in Vercel's
`CUBE_API_SECRET` is not the key Cube verifies with. Visitors were unaffected — the previous `READY`
deployment kept serving, entry hidden, which is the fail-loud design doing its job. Remedy is to
*set* the secret rather than find it: one fresh value into Cube's `CUBEJS_API_SECRET`, Vercel's
`CUBE_API_SECRET` and `.env.local`; prove it with `scripts/cube-handshake.mjs`; then push.

⚠️ **That same snippet queries `sales_view.count` — the wizard's generated view, not
`sales_overview`.** Cube builds its example from whatever the production model contains, so either
the generated files were never replaced with `cube/model/sales.yml`, or the replacement sits in
Dev Mode and was not merged to `master`. The site queries `sales_overview` only. **Confirmed
09-22 by `/meta`: production exposes exactly one object, `sales_view`.** The owner is on branch
`sales-model` in Dev Mode; what is left is *Save all → Commit & Sync → Merge*. Adding
`model/sales.yml` beside the generated files is enough — no name collides — and deleting the
generated ones is optional tidy-up.

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
