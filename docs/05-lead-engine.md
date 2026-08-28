# Lead Engine — the design doc

> **This is the single source of truth for the lead pipeline.** It supersedes
> [`bi-lead-engine-spec.md`](bi-lead-engine-spec.md) (08-25) and `LEADS.md` (08-28); both are reduced to
> pointers at this file. The source catalog lives beside it in
> [`06-lead-sources.md`](06-lead-sources.md) — that is *data*, not design, so it cannot contradict this.
>
> Written 2026-08-28, merging both specs against one new hard constraint: **no Docker, no local PC, no
> expensive services.**
>
> **✅ Approved by the owner 2026-08-28.** Orchestrator decided: **Supabase Cron + Edge Functions**,
> not n8n. Build order in §8 is live; step 1 is the Supabase project and migration 001.
>
> **✅ Phase 0 built 2026-08-28.** Project `howpxpdnjjzdwqrgxkee`, schema and RLS live, advisors clean,
> the `sources` seed row in place. Implementation repo: **`d:\__VOSK_LEADS__\`**. §3's migration has
> **three corrections as built** — read the box in §3 before trusting the SQL there. Phase 1
> (`fetch-hh-kz`) is next.

## What this delivers

One system that **finds leads automatically, tracks them, helps you contact them, and records where
each one stands** — `contacted` / `agreed` / `canceled` and the stages between.

---

## 1. The constraint decides the architecture

You asked how to run n8n without Docker, without your PC, and without paying much. The honest answer
is that **those three cannot all be true with n8n**, and it is better to say so than to design around it.

### The n8n reality check — verified

**n8n is a long-running Node server.** It has no serverless mode, so it always lives *somewhere*. The
question is only who runs that somewhere and what it costs.

**Two numbers govern everything below.** n8n needs **~2 GB RAM** — it is Node.js and holds whole
datasets in memory as JS objects. (Third-party sizing converges on 2 GB dev / 4–8 GB production;
⚠️ **n8n itself publishes no minimum**, so treat 2 GB as a strong convention, not a spec.) And a
**15-minute cron is 2,880 runs/month**, which is a hard ceiling on metered plans.

| Route | Cost | You touch Docker? | Verdict |
|---|---|---|---|
| **n8n Cloud Starter** ([pricing](https://n8n.io/pricing/)) | **€20/mo** annual, €24 monthly — 2,500 exec/mo | No — fully managed | ⚠️ **2,500 executions cannot sustain a 15-min cron.** Fine at 30–60 min. 15-min forces **Pro at €50/mo**. No free tier — the trial is 14 days, capped at 1,000 executions, and the workspace is deleted after. |
| n8n on **Koyeb free** | $0 | No | ⚠️ **Scales to zero after 1 h of no traffic** ([docs](https://www.koyeb.com/docs/reference/instances)) — silently kills cron. Also 512 MB. **Not viable.** |
| n8n on **Render free** | $0 | No | ⚠️ **Doubly fatal**: spins down after 15 min idle, *and* free services get no persistent disk, so n8n's SQLite is wiped on redeploy. |
| n8n on **Northflank Sandbox** | $0 (card required) | No | The only free tier that **explicitly promises always-on**. ⚠️ RAM per free service is unpublished — verify it clears 2 GB before trusting it. |
| n8n on **Sliplane** | **€9/mo** | No — purpose-built one-click n8n | 1 GB, below the practical floor. Cheapest credible managed-ish option. |
| n8n on **Koyeb eco-medium** | **$10.71/mo** | No | **2 GB — the cheapest tier that actually meets the memory requirement.** |
| n8n on Railway / Fly | ~$10–15/mo for 1 GB | No | **Neither is always-free in 2026.** Railway's free plan is a $1 credit. |
| n8n on Oracle Cloud Always Free | $0 | **Yes** — a VM you run Docker on | Genuinely free 24/7, but it is a VPS you administer. Fails the constraint. |

**So: there is no free, always-on, adequately-sized n8n.** Every free tier either sleeps (Koyeb,
Render), is too small (512 MB against a 2 GB need), or is an unpublished unknown (Northflank). The
honest floor for self-hosted n8n is **€9–11/mo**, and for managed n8n **€20/mo — but only if your cron
is 30–60 minutes.**

**Licence is not a problem.** n8n is under the [Sustainable Use License](https://github.com/n8n-io/n8n/blob/master/LICENSE.md):
free for *"your own internal business purposes."* A solo consultant running their own lead pipeline is
squarely inside that. The line is reselling access to your instance — irrelevant here.

€240/year for a personal lead tool is a real decision, not a rounding error — the same shape as the
question `ADR-0001`/`ADR-0003` already got wrong once by not pricing a vendor before designing around it.

### What replaces it, at $0 and with no container

**Postgres can run the schedule itself.** Supabase ships `pg_cron` and `pg_net`, so a cron job living
*inside your database* can call an Edge Function or make an HTTP request on a schedule — down to
per-minute, with no server, no container and nothing on your PC
([Supabase Cron](https://supabase.com/docs/guides/cron)).

That collapses the whole "worker box" problem the 08-25 pass spent its effort deleting:

```
┌─ SUPABASE (free) ──────────────────────────────────────────────┐
│                                                                │
│  pg_cron ──*/30──▶ Edge Function: fetch    ──▶ raw_postings    │
│  pg_cron ──*/15──▶ Edge Function: enrich   ──▶ leads           │
│  pg_cron ──*/15──▶ Edge Function: replies  ──▶ activities      │
│  pg_cron ──08:00─▶ Edge Function: digest   ──▶ Telegram        │
│                                                                │
│  Postgres · Auth · RLS · Realtime                              │
└───────────────────────────┬────────────────────────────────────┘
                            │ anon key + RLS
                            ▼
┌─ VERCEL (Hobby, separate project) ─────────────────────────────┐
│  Next.js admin UI — inbox · board · list · lead drawer         │
└────────────────────────────────────────────────────────────────┘
```

**Everything above is free.** The only variable cost is Claude Haiku on a few hundred postings a day,
which is cents.

### Choose one

| | **Supabase Cron + Edge Functions** ✅ | n8n Cloud Starter | Activepieces Plus |
|---|---|---|---|
| Cost | **$0** + cents of Claude | €20/mo annual = **€240/yr** | $16/mo annual = **$192/yr** |
| Docker / local PC | **None** | None | None |
| 15-minute cron | **Yes — unmetered** | ⚠️ **No** — 2,500 exec/mo cap. Needs €50/mo Pro | 10k credits/mo — workable |
| Who administers it | Nobody | Vendor | Vendor |
| You author jobs in | TypeScript | Visual builder | Visual builder |
| Fits existing skills | Yes — already a TS + Postgres shop | New tool | New tool |
| Moving parts | **One** (Supabase) | Two | Two |
| Licence if self-hosted later | n/a | Fair-code (Sustainable Use) | **MIT** — no strings |
| Vendor lock | Low — plain Postgres + Deno | Workflow JSON | Workflow JSON |

**Recommendation: Supabase Cron + Edge Functions.** It is the only option with *one* moving part, it
costs nothing, nothing sleeps, nobody administers it, there is no execution cap to breach, and it is
written in the language this project already uses. The jobs in §4 are small — fetch JSON, call a
model, write rows — which is exactly the work a visual builder adds the least value to.

**The deciding argument is not price, it is fit.** n8n's value is *avoiding code*; you write SQL daily
and TypeScript is a short hop. What it would cost you is €240/yr **plus an execution ceiling that a
15-minute schedule breaches on day one.**

**If you do want a GUI, Activepieces beats n8n on this workload** — cheaper, no execution-cap cliff at
15 minutes, and MIT-licensed if you ever self-host.

**This decision is reversible and blocks nothing.** The schema, job boundaries and UI are identical
under all three, so start with step 1 of the build order regardless — every option needs the Supabase
project anyway.

### ⚠️ The DNS blocker does not apply, and this is worth knowing

A separate Vercel project gets a free `*.vercel.app` URL immediately. **`lead.vosk.dev` is cosmetic for
a private admin tool nobody links to** — so this ships today without touching the GoDaddy DNS that has
blocked Goal A for 28 days. Add the custom domain later, or never.

### Why the UI is a separate project, not `/leads` in this site

Both prior specs put the UI inside `vosk.dev`. Three concrete costs, one of them newly verified:

- **It inherits the locale proxy.** `src/proxy.ts:68` rewrites every extensionless path — `/leads`
  would become `/en/leads` and pick up the locale machinery, sitemap and metadata pipeline built for
  public marketing pages. This is the `CAND-001` surface.
- **It puts `SUPABASE_SERVICE_ROLE_KEY` and scraped person-data in the same deployment as a public
  marketing site.**
- **`CLAUDE.md` forbids adding Supabase/auth to this repo** without explicit agreement, and forbids an
  `apps/*` split.

`bi.vosk.dev` already makes subdomain-per-tool the pattern. Cost of a second Vercel project: **$0**.

---

## 2. The funnel

```
inbox → qualified → contacted → replied → meeting → proposal → won
                                                             ↘ lost
        ↘ dead (you rejected it, or it scored too low)
```

Mapped to what you asked for:

| You said | Stage | Set by |
|---|---|---|
| *"automatically get leads"* | `inbox` | The fetch + enrich jobs, scored, awaiting you |
| *"agreed"* (worth pursuing) | `qualified` | You, one keystroke in the inbox |
| *"contact them"* | `contacted` | Outreach job, after your approval |
| — | `replied` → `meeting` → `proposal` | You, as the lead moves |
| *"agreed"* (deal won) | `won` | You |
| *"canceled"* | `lost` (they declined) or `dead` (you declined) | You |

`dead` and `lost` both keep the company in memory so re-fetches don't resurrect it. A company can
re-enter later with a **new** lead — a new posting is a new signal.

---

## 3. Schema — one migration

Reconciled from both specs. Base is `bi-lead-engine-spec.md` §3 (uuid PKs, soft delete,
`metadata jsonb` on every entity, RLS from the first migration) because it is the more considered
design and matches this project's schema conventions. Three changes merged in:

- **`pgvector` dropped for v1** — the 08-25 finding stands: `(source_id, external_id)` unique plus the
  company domain catches ~95% of duplicates. Add embeddings when a real duplicate problem appears.
- **`touches` (LEADS.md) and `activities` (spec) are the same table.** Kept as `activities`; it carries
  stage transitions as well as messages, which `touches` does not.
- **Score is 0–100 with `score_breakdown jsonb`**, not 1–10. Scoring criteria change often; a jsonb
  breakdown avoids a column per criterion.

> ### ⚠️ As built — three corrections to the SQL below _(applied 2026-08-28)_
>
> The migration below is **not** what is running. Read this first; the live version is in
> `d:\__VOSK_LEADS__\supabase\migrations\`.
>
> **1. `v_funnel_summary` needs `with (security_invoker = on)`.** As written it is the one statement
> here that undoes the RLS everything above it sets up. Postgres runs a view with the **definer's**
> privileges by default, so a view owned by `postgres` over an RLS-protected `leads` reads every row —
> and it sits in `public`, so PostgREST hands it to `anon`. Supabase's advisor rates this an ERROR.
> Verified both ways: with a score-99 lead in the table, an anonymous client gets `[]`.
>
> **2. `is_app_admin()` must not live in `public`.** Every policy calls it, and PostgREST exposes
> anything in `public` — so it was reachable at `/rest/v1/rpc/is_app_admin`. **Revoking `EXECUTE` is
> not the fix, and this was tested rather than assumed:** revoking from `anon` alone changes nothing
> (the default `PUBLIC` grant still applies), and revoking from `PUBLIC` turns every anonymous read
> into `42501 permission denied for function is_app_admin` — HTTP 401 instead of zero rows. RLS policy
> expressions are evaluated with the **caller's** privileges and genuinely need that grant. The
> function therefore moves to a `private` schema, which PostgREST does not serve; the policies
> reference it by OID and are unaffected. RPC now returns `PGRST202` / 404.
>
> **3. `set_updated_at()` needs its `search_path` pinned too.** §3 pins it on `is_app_admin` but not
> here, and the advisor flags the omission.
>
> With all three applied, `get_advisors(security)` returns **zero lints**.

```sql
-- migration 001 — lead engine. Idempotent per Supabase migration conventions.
-- No `vector` extension: v1 dedups on (source_id, external_id) + company domain.

create table app_admins (
     user_id uuid primary key references auth.users (id)
    ,created_at timestamptz not null default now()
);
alter table app_admins enable row level security;
create policy app_admins_self on app_admins for select using (user_id = auth.uid());

create or replace function is_app_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from app_admins a where a.user_id = auth.uid()); $$;

create or replace function set_updated_at()
returns trigger language plpgsql
as $$ begin new.updated_at := now(); return new; end; $$;

create type lead_stage as enum (
    'inbox','qualified','contacted','replied','meeting','proposal','won','lost','dead'
);
create type activity_type as enum (
    'note','stage_change','email_sent','dm_sent','reply_received','call','proposal_sent'
);

create table sources (
     id uuid primary key default gen_random_uuid()
    ,slug text not null unique                  -- 'hh_kz', 'greenhouse', 'remoteok', ...
    ,display_name text not null
    ,region text                                -- 'KZ','US_CA','EU','AU_NZ','GLOBAL'
    ,access_type text not null                  -- 'api','rss','crawler','manual'
    ,is_enabled boolean not null default true
    ,last_run_at timestamptz
    ,last_error text
    ,error_count int not null default 0
    ,metadata jsonb not null default '{}'::jsonb
    ,created_at timestamptz not null default now()
    ,updated_at timestamptz not null default now()
);

create table companies (
     id uuid primary key default gen_random_uuid()
    ,name text not null
    ,domain text unique                         -- dedup anchor; null until known
    ,country text                               -- ISO-3166 alpha-2
    ,region text
    ,size_estimate text
    ,industry text
    ,linkedin_url text
    ,website_url text
    ,is_blacklisted boolean not null default false
    ,notes text
    ,metadata jsonb not null default '{}'::jsonb
    ,created_at timestamptz not null default now()
    ,updated_at timestamptz not null default now()
    ,deleted_at timestamptz
);
create index companies_region_idx on companies (region) where deleted_at is null;

create table raw_postings (
     id uuid primary key default gen_random_uuid()
    ,source_id uuid not null references sources (id)
    ,external_id text                           -- id on the source → idempotent upserts
    ,url text
    ,raw_text text not null
    ,raw_payload jsonb
    ,posted_at timestamptz
    ,fetched_at timestamptz not null default now()
    ,processed_at timestamptz                   -- null = awaiting enrichment
    ,lead_id uuid
    ,created_at timestamptz not null default now()
);
create unique index raw_postings_source_external_key
    on raw_postings (source_id, external_id) where external_id is not null;
create index raw_postings_unprocessed_idx
    on raw_postings (fetched_at) where processed_at is null;

create table leads (
     id uuid primary key default gen_random_uuid()
    ,company_id uuid not null references companies (id)
    ,source_id uuid references sources (id)
    ,stage lead_stage not null default 'inbox'
    ,title text not null
    ,url text
    ,summary text                               -- 2-sentence English summary from the model
    ,original_language text
    ,score int check (score between 0 and 100)
    ,score_breakdown jsonb
    ,stack text[]
    ,employment_type text
    ,hires_international boolean
    ,region text                                -- denormalized for fast filtering
    ,posted_at timestamptz
    ,rejected_reason text
    ,next_action_at timestamptz
    ,metadata jsonb not null default '{}'::jsonb
    ,created_at timestamptz not null default now()
    ,updated_at timestamptz not null default now()
    ,deleted_at timestamptz
);
create index leads_stage_idx on leads (stage) where deleted_at is null;
create index leads_score_idx on leads (score desc) where deleted_at is null;
create index leads_company_id_idx on leads (company_id);
create index leads_next_action_idx on leads (next_action_at)
    where next_action_at is not null and deleted_at is null;

alter table raw_postings
    add constraint raw_postings_lead_id_fkey foreign key (lead_id) references leads (id);

create table contacts (
     id uuid primary key default gen_random_uuid()
    ,company_id uuid not null references companies (id)
    ,full_name text
    ,role_title text
    ,email text
    ,linkedin_url text
    ,telegram_handle text
    ,source_note text                           -- provenance, for the GDPR audit trail
    ,metadata jsonb not null default '{}'::jsonb
    ,created_at timestamptz not null default now()
    ,updated_at timestamptz not null default now()
    ,deleted_at timestamptz
);
create index contacts_company_id_idx on contacts (company_id);

create table activities (
     id uuid primary key default gen_random_uuid()
    ,lead_id uuid not null references leads (id)
    ,contact_id uuid references contacts (id)
    ,activity_type activity_type not null
    ,body text
    ,stage_from lead_stage
    ,stage_to lead_stage
    ,occurred_at timestamptz not null default now()
    ,metadata jsonb not null default '{}'::jsonb
    ,created_at timestamptz not null default now()
);
create index activities_lead_id_idx on activities (lead_id, occurred_at desc);

create trigger sources_updated_at   before update on sources   for each row execute function set_updated_at();
create trigger companies_updated_at before update on companies for each row execute function set_updated_at();
create trigger leads_updated_at     before update on leads     for each row execute function set_updated_at();
create trigger contacts_updated_at  before update on contacts  for each row execute function set_updated_at();

alter table sources      enable row level security;
alter table companies    enable row level security;
alter table raw_postings enable row level security;
alter table leads        enable row level security;
alter table contacts     enable row level security;
alter table activities   enable row level security;

create policy sources_admin_all      on sources      for all using (is_app_admin()) with check (is_app_admin());
create policy companies_admin_all    on companies    for all using (is_app_admin()) with check (is_app_admin());
create policy raw_postings_admin_all on raw_postings for all using (is_app_admin()) with check (is_app_admin());
create policy leads_admin_all        on leads        for all using (is_app_admin()) with check (is_app_admin());
create policy contacts_admin_all     on contacts     for all using (is_app_admin()) with check (is_app_admin());
create policy activities_admin_all   on activities   for all using (is_app_admin()) with check (is_app_admin());

create view v_funnel_summary as
select
     l.stage                _stage
    ,count(*)               _leads_cnt
    ,round(avg(l.score), 1) _avg_score
    ,max(l.updated_at)      _last_movement_at
from leads l
where l.deleted_at is null
group by l.stage;
```

**Flex points, deliberately designed in:** `metadata jsonb` on every entity absorbs per-source quirks
without a migration; `score_breakdown jsonb` absorbs scoring changes without a column per criterion.
When you start invoicing won leads, add a typed `deals` table rather than overloading `leads`.

**Access rules, unchanged and load-bearing:**

- Edge Functions use the **service role key** — server-side only, never in a client bundle.
- The browser uses the **anon key + Supabase Auth**, gated by `app_admins` through RLS.
- RLS is the real authorization; middleware is only UX.

---

## 4. The jobs

Five, each one thing. Identical boundaries whether you build them as Edge Functions or n8n workflows.

| Job | Schedule | Does |
|---|---|---|
| **`fetch-<source>`** | `*/30` | Pull one source → normalize → upsert `companies` → insert `raw_postings` `on conflict do nothing`. Errors → Telegram. |
| **`enrich`** | `*/15` | Take N unprocessed `raw_postings` → Claude Haiku translates, extracts and scores → upsert `leads`. Score < 40 → `dead`. |
| **`draft-outreach`** | on demand | For `qualified` leads, Claude drafts a short personalized message. **Stores a draft. Sends nothing.** |
| **`track-replies`** | `*/15` | Poll Gmail → match sender to `contacts` → insert inbound `activity` → `leads.stage = 'replied'` → Telegram ping. |
| **`digest`** | daily 08:00 | Top new leads + `next_action_at` due → Telegram. |

**Hard rule, carried from both specs: nothing is ever sent without your explicit approval.** The
outreach job produces a draft and a Telegram approve/skip; approval flips the stage and writes the
`activity`.

**Batching is the reliability trick.** Each run processes N rows and exits. That makes every job
timeout-proof and idempotent on retry, which matters because a missed cron then costs nothing — the
next run picks up the same backlog.

### Sending: Gmail, not Resend

`LEADS.md` moved sending to Gmail OAuth and that is the right call, kept here. Cold email from
`vosk.dev` via Resend would put spam complaints against the domain reputation that carries the contact
form — the site's only inbound conversion route. **This design never sends from `vosk.dev`,** which
also means the standing Resend-verification blocker no longer gates this project.

For BI contract work, replying to the posting itself still has the best reply rate and needs no email
infrastructure at all.

---

## 5. The UI

Separate Next.js app on Vercel Hobby. Four views:

- **Inbox** — new scored leads; accept → `qualified`, reject → `dead` with a reason. One keystroke each.
- **Board** — kanban by stage; drag writes `stage` **and** inserts a `stage_change` activity.
- **List** — sortable, filterable: score, region, stack, next action.
- **Lead drawer** — summary, posting link, contacts, activity timeline, "draft outreach" button.

Supabase Realtime on `leads` gives a live inbox badge without polling.

---

## 6. Cost

| Item | Monthly |
|---|---|
| Supabase (Postgres, Auth, Edge Functions, pg_cron) | **$0** free tier |
| Vercel Hobby, separate project | **$0** |
| Claude Haiku, a few hundred postings/day | **cents** |
| Telegram bot | **$0** |
| Gmail | **$0** |
| **Total** | **≈ $0** |

Free-tier headroom: **500 MB database**, **500k Edge Function invocations/month**, 5 GB egress, and a
**maximum of 2 active projects** — worth knowing before you spend one on something else.

> ⚠️ **That cap is already reached.** Verified 2026-08-28: org `sudo.opc` is on the free plan, and
> `yaga` + `vosk.dev` are both `ACTIVE_HEALTHY` — 2 of 2. `fabrigate` and `newsmate` are paused and
> **cannot be restored without pausing one of the two live projects.** There is no headroom for a
> third project on this plan.

### ⚠️ The one real risk, and the design already mitigates it

**Supabase free projects pause after one week with no API requests** — and Supabase's wording is
specifically *"API requests"*. **`pg_cron` running inside Postgres never touches the REST gateway, so
in-database cron activity plausibly does not count.** This is unverified either way, and it is the
single assumption that could silently kill an unattended pipeline.

**This is why §1's diagram has every cron job invoke an Edge Function rather than doing the work in
pure SQL.** An Edge Function call *is* an API request, so the schedule keeps the project alive as a
side effect of doing its job. Keep it that way even where inline SQL would be simpler.

Verify on the real project before trusting it unattended. If you want the risk gone entirely, Pro is
$25/mo — but at that price n8n Cloud Starter (€20) is competitive again, so decide deliberately.

---

## 7. Compliance — non-negotiable

Carried from `bi-lead-engine-spec.md` §5 and `LEADS.md` §7, which agree:

- **Company-level data is unproblematic. Person-level data is the GDPR line.** Store only
  business-context fields, record provenance in `contacts.source_note`, and **prune contacts when a
  lead goes `lost`/`dead`.**
- **Never scrape LinkedIn or Facebook.** `06-lead-sources.md` Tier 3 marks them 🔴 — enrichment and
  manual paste-in only. There is lawsuit precedent, and a directory listing carries no hiring signal
  anyway.
- **Cold email into the EU is strictly regulated** (DE/AT especially). Prefer replying to the posting,
  Telegram, or LinkedIn DM. Include an opt-out in anything you do send.
- **Crawl politely** where you crawl at all: identify your UA, honor `robots.txt`, low rates, cache.
- **A privacy policy is now overdue** — open since 08-06. A site running a scraping-backed outreach
  operation has a stronger obligation than one that merely sets a cookie.

---

## 8. Implementation plan

Source order comes from [`06-lead-sources.md`](06-lead-sources.md): **all four regions, hh.kz first.**

### Tooling — and the Docker question, answered

**Nothing in this plan needs Docker.** The one Supabase command that does — `supabase start`, which
runs the whole stack locally — is not used. Everything targets the hosted project:

| Task | How, without Docker |
|---|---|
| Apply the migration | **Supabase MCP `apply_migration`**, or the Dashboard SQL Editor |
| Inspect schema / run SQL | **MCP `list_tables` / `execute_sql`**, or the SQL Editor |
| Generate TS types | **MCP `generate_typescript_types`** |
| Deploy an Edge Function | `npx supabase functions deploy <name>` — recent CLI bundles natively. ⚠️ If it asks for Docker, use the Dashboard's function editor instead |
| Schedule jobs | SQL — `cron.schedule(...)`, no tooling at all |

### Plan: start Free, upgrade before go-live

⚠️ **Supabase Pro is $25/mo, not $20** — worth knowing before you click.

**Do not buy it yet.** Free covers phases 0–2 completely, and while you are working daily the project
cannot pause. **Upgrade at phase 3, when it first runs unattended** — that is exactly when Pro's value
(no pausing, daily backups, 8 GB, headroom) starts to matter and not one day sooner. It is a one-click
change. That saves a month or two of subscription and, more importantly, deletes the one unverified
assumption in §6 at the moment it would otherwise start to bite.

---

### Phase 0 — Foundations _(~half a day)_

1. ~~**Create the Supabase project.** Region: `eu-central-1` — closest to both KZ and EU sources.~~
   **✅ Done 2026-08-28.** Project `vosk.dev`, ref `howpxpdnjjzdwqrgxkee`, region **`eu-west-1`** —
   not the `eu-central-1` planned here. Region is fixed at creation and this is a batch pipeline
   with no latency budget, so it stands as built.
2. ~~**Enable extensions:** `pg_cron`, `pg_net` (Dashboard → Database → Extensions).~~
   **✅ Done** — as a migration, not a Dashboard toggle, so Phase 0 is one reproducible artifact.
   `pg_cron` → `pg_catalog`, `pg_net` → `extensions` (the bare `create extension` puts `pg_net` in
   `public`, which the security advisor flags; it is non-relocatable, so the correction is a
   drop/recreate — cheap before any job is scheduled, awkward after).
3. ~~**Apply migration 001** — the SQL in §3, verbatim.~~ **✅ Done**, with the three §3 corrections
   noted there.
4. **Create your auth user** (magic link), then `insert into app_admins (user_id) values ('<your-uuid>')`.
   ⏸ **Deferred — needs you.** No MCP tool creates auth users: Dashboard → Authentication → Users →
   *Add user*. `app_admins` has no INSERT policy by design, so the row can only be written as
   `postgres`. Nothing before the Phase 4 UI login depends on it.
5. ~~**Store secrets in Vault**, not in code: …~~ ⏸ **Deferred — needs your values.** And this step
   conflates two different stores. Correctly split:
   - **Edge Function secrets:** `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
     `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **auto-injected** — do not set them.
   - **Vault** (only what SQL itself reads): `project_url`, and the key `pg_cron` puts in the
     `Authorization` header. Supabase's own scheduling guide uses the **publishable** key there, not
     `service_role` — the function authenticates itself internally, so the cron header never needs
     the powerful key.
6. ~~**Seed `sources`** with one row: `('hh_kz', 'hh.kz', 'KZ', 'api')`.~~ **✅ Done.**

**Done when:** every table exists, RLS is on, and **an anonymous client selecting from `leads` returns
zero rows** — not an error, zero rows. That is the RLS check that actually matters; test it before
building anything on top.

> **✅ Met, 2026-08-28.** All 7 tables + `v_funnel_summary` return `[]` / HTTP 200 to an anonymous
> client holding the publishable key. Proven against **real rows, not an empty database** — a
> score-99 lead and its company were inserted as `postgres`, re-queried anonymously (still `[]`), then
> deleted. `sources` holds its seed row and also returns `[]`. Security advisors: **zero lints.**

### Phase 1 — First collector _(~1 day)_

Edge Function `fetch-hh-kz`: query `https://api.hh.ru/vacancies?text=…&area=40`, page through results,
upsert `companies` on domain, insert `raw_postings` with `external_id = <hh id>`.

Wire the schedule in SQL:

```sql
select cron.schedule(
  'fetch-hh-kz', '*/30 * * * *',
  $$
  select net.http_post(
      url     := 'https://<project-ref>.supabase.co/functions/v1/fetch-hh-kz'
     ,headers := jsonb_build_object(
          'Content-Type' , 'application/json'
         ,'Authorization', 'Bearer ' || (select decrypted_secret
                                         from vault.decrypted_secrets
                                         where name = 'service_role_key')
      )
     ,body    := '{}'::jsonb
     ,timeout_milliseconds := 55000       -- see the warning below; the default is 2000
  );
  $$
);
```

> ⚠️ **`net.http_post`'s `timeout_milliseconds` defaults to 2000 — two seconds.** Left unset (as this
> snippet originally was), `pg_net` abandons the call long before any real fetch-normalize-upsert run
> finishes, and the cron history will show requests that look like failures. Set it explicitly, as
> above. The alternative — and the better shape once the jobs get heavier — is to have the function
> acknowledge immediately and do its work inside `EdgeRuntime.waitUntil()`, so the HTTP round-trip is
> never the thing being timed.
>
> Note also that the header below uses the **`service_role`** key. Supabase's own scheduling guide
> uses the **publishable** key here: the Edge Function authenticates itself internally from its
> auto-injected `SUPABASE_SERVICE_ROLE_KEY`, so the cron header only has to get past JWT verification
> and never needs the powerful key sitting in a `cron.job` row.

**Done when three consecutive runs insert only genuinely new rows.** Check with
`select count(*) from raw_postings;` before and after — the unique index on
`(source_id, external_id)` is what makes the job safe to retry, so prove it works rather than assuming.

Inspect run history in `cron.job_run_details` — this is your job log, and it is the thing people forget
exists when they miss n8n's execution UI.

### Phase 2 — Enrichment _(~1 day)_

Edge Function `enrich`, scheduled `*/15`. Takes N rows where `processed_at is null`, sends each to
**`claude-haiku-4-5-20251001`** with one prompt that translates, extracts and scores in a single call
— Russian text goes straight in, no separate translation step. Writes `leads`, sets `processed_at`.

- Force JSON out and validate it before writing. A model returning prose into a `numeric` column is
  the most likely runtime failure here.
- `score < 40` → `stage = 'dead'` with a `rejected_reason`.
- **Batch and exit.** N rows per invocation keeps it timeout-proof and idempotent on retry.

**Done when new postings are scored within 15 minutes with nobody watching.**

> **This is the minimum useful system.** Leads arrive, get scored, and are readable in the Supabase
> table editor. Everything after this is convenience. **Stop here if you want to test the idea before
> investing more** — and upgrade to Pro now, because from here it runs unattended.

### Phase 3 — Telegram digest _(~half a day)_

Edge Function `digest`, `cron.schedule('digest', '0 6 * * *', …)`. Queries the top new leads plus any
`next_action_at` that is due, posts one message. Also add an error branch to the fetch job: a failed
run should notify, because **a silent scraper is worse than no scraper.**

**Done when you get a message every morning without touching anything.**

### Phase 4 — The UI _(~2 days)_

Separate Next.js app, separate Vercel project, free `*.vercel.app` URL.

Layout as built — the repo is `rusloc/vosk_leads` at `D:\__VOSK_LEADS__`, **managed from
`D:\__VOSK__`** (it carries no `CLAUDE.md`, `.claude/`, `.log/` or `docs/` of its own):

```
D:\__VOSK_LEADS__\
  supabase/
    config.toml                 ← project link, hand-written
    migrations/*.sql            ← filenames match the versions Supabase assigned
    functions/{fetch-hh-kz,enrich,digest}/index.ts
    functions/_shared/{supabase.ts,claude.ts}
  app/                          ← Next.js App Router
  .env.local
```

Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **The service-role key never appears
in this app** — the browser uses the anon key and RLS does the authorization.

Build read-only first: list + inbox. Then accept/reject writes, then the board.

**Done when you can triage leads behind a login from a phone.**

### Phase 5 — Outreach and replies _(~2 days)_

`draft-outreach` (Claude drafts, stores, asks for approval) and `track-replies` (polls Gmail, matches
sender to `contacts`, writes an inbound activity, moves the stage).

**Done when one test lead goes `inbox → won` end to end.**

### Phase 6 — More sources

The shared ATS sweep (Greenhouse + Lever + Ashby — one connector, three fetchers), then the remote
feeds (RemoteOK, WWR, Remotive, Himalayas), then Adzuna for AU/NZ/CA. **All reuse the same
normalize → upsert path; only the fetcher changes.** That is the payoff for `raw_postings` existing.

### What to build first, in one line

**Phase 0 today, phase 1 tomorrow.** If hh.kz is flowing into `raw_postings` by the end of day two,
the architecture is proven and everything else is repetition.

---

## 9. Decisions still open

### ✅ Decided 2026-08-28 — this design is approved

**Orchestrator: Supabase Cron + Edge Functions.** n8n is not used. The full comparison stays in §1 as
the record of why, and the decision is reversible — the schema, job boundaries and UI are unchanged
under any orchestrator. The cron-interval pricing question disappears with it: under `pg_cron` the
interval is free.

### Still open


- **Telegram as a lead source.** `06-lead-sources.md` lists it Tier 1 🟢; the 08-25 pass deferred it
  because a Telethon listener needs an always-on process — which this architecture deliberately does
  not have. **It is the one source that does not fit.** Build order puts it late; decide then.
- **Enrichment vendor** — Hunter/Apollo for decision-maker emails is in `LEADS.md` but unpriced. Not
  needed before step 6.
- **Custom domain** — `lead.vosk.dev` or stay on `*.vercel.app`. Cosmetic; pairs with the Goal A DNS
  visit if you want it.
