# BI Lead Engine — Source Catalog & Solution Spec

Remote BI/analytics leads from Europe, US + Canada, Australia + NZ, and Kazakhstan, feeding an interactive lead-funnel app embedded in your existing Vercel + Supabase site.

---

## 1. Solution Overview

### What you're building

A private `/leads` section inside your current Next.js site. It renders an interactive lead list backed by your existing Supabase project: filter and sort leads, drag them through funnel stages, log calls/messages, and see a daily inflow of freshly scraped + AI-scored opportunities. Ingestion workers run separately on a schedule and write into the same database.

```
┌──────────────── CONNECTORS (Python, cron) ────────────────┐
│ hh.kz API │ Greenhouse/Lever/Ashby │ Remote boards (RSS)  │
│ Telegram listener │ Career-page crawler │ Seek crawler    │
└──────────────┬────────────────────────────────────────────┘
               ▼  normalized postings
┌──────────────── ENGINE (same worker process) ─────────────┐
│ dedup (domain + pgvector) → Claude: translate + extract   │
│ + score → upsert into Supabase                            │
└──────────────┬────────────────────────────────────────────┘
               ▼
┌──────────────── SUPABASE (your existing project) ─────────┐
│ Postgres: companies, leads, contacts, activities, sources │
│ pgvector │ RLS (only you) │ Realtime → live UI updates    │
└──────────────┬────────────────────────────────────────────┘
               ▼
┌──────────────── YOUR SITE (Next.js on Vercel) ────────────┐
│ /leads — funnel board + list + lead detail drawer         │
│ /leads/inbox — new AI-scored leads to accept/reject       │
│ Telegram bot digest (top-5 daily, via Vercel cron)        │
└───────────────────────────────────────────────────────────┘
```

### The funnel

`inbox → qualified → contacted → replied → call_booked → proposal → won / lost / dead`

- **inbox** — scraper output awaiting your accept/reject (one keystroke each)
- **qualified** — accepted; visible on the main board
- Everything after that is manual stage changes as you work the lead
- `lost` keeps the company in memory so re-scrapes don't resurrect it; a company can re-enter later with a *new* lead (new posting = new signal)

### Key product decisions

| Decision | Choice | Why |
|---|---|---|
| Where the UI lives | Route group in your existing Next.js app | You already have Vercel + Supabase Auth wired; no new deployment |
| Who can see it | Only your Supabase user (RLS-enforced) | It's a personal tool sitting on a public site |
| Where workers run | Separate Python process on cron (Railway / Fly.io / cheap VPS), *not* Vercel functions | Scraping needs long runtimes, retries, Playwright — bad fit for serverless limits |
| AI calls | Claude Haiku for extract/score, Sonnet for outreach drafts | ~100–300 postings/day at Haiku prices is cents |
| Live updates | Supabase Realtime subscription on `leads` | New scored leads appear in the inbox without refresh |
| Outreach | AI drafts, **you** send manually | Deliverability + compliance (esp. EU cold email) |

### Build order

1. Schema + RLS migration (section 3) into your existing Supabase project
2. `/leads` UI: list + funnel board + inbox (read/write via Supabase client, RLS does authz)
3. Connector #1: **hh.kz** (real documented API — validates the whole pipeline in a day)
4. Claude enrichment step + dedup
5. Connectors #2–3: Greenhouse/Lever + remote-board RSS
6. Telegram digest + Telegram listener connector
7. Seek/career-page crawlers last (fiddliest)

---

## 2. Source Catalog

Ranked within each tier by effort-to-value. **Access difficulty:** 🟢 official API / feed · 🟡 structured but unofficial · 🔴 crawler with care required.

### Tier 1 — official APIs & feeds (build first)

| # | Source | Region | What it gives you | How to access |
|---|---|---|---|---|
| 1 | **hh.kz (HeadHunter)** 🟢 | Kazakhstan + CIS | Full postings: company, salary ranges, description, employer contacts. Very active BI/analytics market. | Public REST API, `api.hh.ru` docs. Register an app, OAuth for extended access; anonymous search works for basics. Search `text=business intelligence OR power bi&area=40` (40 = KZ). JSON out. |
| 2 | **Greenhouse job boards** 🟢 | US, EU, AU — thousands of companies | Company-hosted postings incl. remote flags, departments, full description HTML. | Public JSON, no key: `https://boards-api.greenhouse.io/v1/boards/{company_slug}/jobs?content=true`. Maintain a slug list (seed from Google: `site:boards.greenhouse.io "business intelligence"`). |
| 3 | **Lever job boards** 🟢 | Same as Greenhouse | Same shape, different ATS. | Public JSON, no key: `https://api.lever.co/v0/postings/{company_slug}?mode=json`. |
| 4 | **Ashby job boards** 🟢 | US/EU startups (newer companies) | Postings incl. compensation ranges more often than others. | Public GraphQL/JSON: `https://api.ashbyhq.com/posting-api/job-board/{company_slug}`. |
| 5 | **RemoteOK** 🟢 | Global remote, US-heavy | Remote-only postings, tags, salary estimates. Zero location noise. | Official JSON feed: `https://remoteok.com/api` (respect their attribution requirement). Filter tags `bi`, `analytics`, `data`. |
| 6 | **WeWorkRemotely** 🟢 | Global remote | Curated, higher-quality postings than aggregators. | RSS per category: `https://weworkremotely.com/categories/remote-data-jobs.rss`. |
| 7 | **Remotive** 🟢 | Global remote, EU-friendly | Remote postings with explicit "location restriction" field — maps directly to your `hires_international` score. | Official API: `https://remotive.com/api/remote-jobs?category=data`. |
| 8 | **Himalayas** 🟢 | Global remote | Postings + structured company profiles (size, funding). | Public API: `https://himalayas.app/jobs/api`. |
| 9 | **Adzuna** 🟢 | US, CA, AU, NZ, DE, NL, FR, PL… | Aggregated postings across countries with salary data — one connector, many countries. | Free API key at developer.adzuna.com: `https://api.adzuna.com/v1/api/jobs/{country}/search/1?what=business%20intelligence`. Rate-limited free tier. |
| 10 | **Arbeitsagentur (DE)** 🟢 | Germany | Official federal job board; Mittelstand postings that never hit LinkedIn. | Free public API (`jobsuche` API, docs on GitHub `bundesAPI/jobsuche-api`). Filter `arbeitszeit=ho` won't exist — filter description for "remote/homeoffice". |
| 11 | **Telegram channels** 🟢 | KZ/CIS primarily, some EU freelancer channels | Real-time freelance/contract gigs, often direct-to-decision-maker. Russian-language for CIS. | Official Telegram API via **Telethon** (user session) for public channels, or Bot API if the bot is added to groups. Stream messages, regex prefilter (`BI|Power BI|аналитик|дашборд`), pass hits to the LLM. Legal for public channels. |

### Tier 2 — structured crawling (build second)

| # | Source | Region | What it gives you | How to access |
|---|---|---|---|---|
| 12 | **Seek** 🟡 | Australia + NZ | Dominant AU/NZ board; strong day-rates for BI contractors; your timezone overlap is a selling point. | No public API. Server-rendered structured HTML + embedded JSON (`window.SEEK_REDUX_DATA`). Crawl politely (low rate, off-peak, respect robots.txt), search URL params for keyword + "remote". |
| 13 | **Company career pages** 🟡 | Any | Postings from companies you've already identified — cleanest legal ground (their own public site). | Sitemap discovery → fetch `/careers`, `/jobs`, `/karriere` → Playwright for JS-rendered pages → LLM extracts postings from raw HTML (no per-site parsers needed). |
| 14 | **Y Combinator – Work at a Startup** 🟡 | US | Startup roles; founders answer DMs; contractor-friendly. | Public site, structured; also Hacker News "Who is hiring?" monthly thread via the official **HN Firebase API** (`hacker-news.firebaseio.com`) — parse the thread, filter for BI/data + remote. |
| 15 | **Wellfound (AngelList)** 🟡 | US/EU startups | Salary/equity ranges shown; remote filters. | No public API; logged-in crawling breaks ToS — use logged-out public listings only, or manual-assist. |
| 16 | **Upwork** 🟡 | Global | Signal source: companies repeatedly hiring BI freelancers (they also hire off-platform). | Official API + RSS for saved searches (requires account/plan). Use as *signal*, not as your main channel. |

### Tier 3 — manual-assist only (agent enriches, never scrapes)

| # | Source | Why not automated | Workflow instead |
|---|---|---|---|
| 17 | **LinkedIn** | ToS prohibits scraping; aggressive detection; lawsuits precedent. | Set LinkedIn job alerts to email → a small parser reads that mailbox (IMAP) and feeds postings into the same pipeline. You paste interesting profiles/posts into the app; Claude enriches + scores them. |
| 18 | **Facebook groups** | Same ToS problem; groups are login-walled. | Manual paste-in via a "quick add" box in your UI → normal enrichment path. |
| 19 | **Yellow pages / registries** | No hiring signal by itself. | Enrichment only: once a company is a lead, worker looks up size/industry/site. |

### Cross-cutting keyword set

`business intelligence, BI analyst, BI developer, Power BI, Tableau, Qlik, Looker, data analyst, analytics engineer, dbt, Snowflake, DWH, data warehouse` · Russian: `аналитик, дашборд, хранилище данных` · German: `Datenanalyst, Berichtswesen`.

---

## 3. Supabase Backend

Runs in your **existing** Supabase project — one migration. Conventions: uuid PKs, `created_at/updated_at`, soft delete, `metadata jsonb` flex column on every entity, RLS on from the first migration.

### Entities

- **companies** — one row per real-world company; dedup anchor (domain); memory across leads
- **leads** — one opportunity (usually one job posting) moving through the funnel
- **contacts** — people at a company (GDPR: store only business-context data, delete on `lost`)
- **activities** — timeline: messages sent, replies, calls, notes, stage changes
- **sources** — connector registry + health (last run, error count)
- **raw_postings** — landing zone for scraped items pre-enrichment (keeps workers dumb and re-processable)

### Migration

```sql
-- 0. prerequisites
create extension if not exists vector;

-- who may use the app (add your auth.users id here once)
create table app_admins (
     user_id uuid primary key references auth.users (id)
    ,created_at timestamptz not null default now()
);
alter table app_admins enable row level security;
create policy app_admins_self on app_admins
    for select using (user_id = auth.uid());

create or replace function is_app_admin()
returns boolean language sql stable security definer set search_path = public
as $$
    select exists (select 1 from app_admins a where a.user_id = auth.uid());
$$;

-- shared updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- 1. enums
create type lead_stage as enum (
    'inbox','qualified','contacted','replied','call_booked','proposal','won','lost','dead'
);
create type activity_type as enum (
    'note','stage_change','email_sent','dm_sent','reply_received','call','proposal_sent'
);

-- 2. sources (connector registry)
create table sources (
     id uuid primary key default gen_random_uuid()
    ,slug text not null unique              -- 'hh_kz', 'greenhouse', 'remoteok', ...
    ,display_name text not null
    ,region text                            -- 'KZ', 'US', 'EU', 'AU_NZ', 'GLOBAL'
    ,access_type text not null              -- 'api', 'rss', 'crawler', 'manual'
    ,is_enabled boolean not null default true
    ,last_run_at timestamptz
    ,last_error text
    ,error_count int not null default 0
    ,metadata jsonb not null default '{}'::jsonb
    ,created_at timestamptz not null default now()
    ,updated_at timestamptz not null default now()
);

-- 3. companies
create table companies (
     id uuid primary key default gen_random_uuid()
    ,name text not null
    ,domain text unique                     -- dedup anchor; null until known
    ,country text                           -- ISO-3166 alpha-2
    ,region text                            -- your market buckets: 'US_CA','EU','AU_NZ','KZ'
    ,size_estimate text                     -- '1-10','11-50','51-200','201-1000','1000+'
    ,industry text
    ,linkedin_url text
    ,website_url text
    ,is_blacklisted boolean not null default false   -- never show me again
    ,notes text
    ,metadata jsonb not null default '{}'::jsonb
    ,created_at timestamptz not null default now()
    ,updated_at timestamptz not null default now()
    ,deleted_at timestamptz
);
create index companies_region_idx on companies (region) where deleted_at is null;

-- 4. raw_postings (scraper landing zone)
create table raw_postings (
     id uuid primary key default gen_random_uuid()
    ,source_id uuid not null references sources (id)
    ,external_id text                       -- id on the source, for idempotent upserts
    ,url text
    ,raw_text text not null
    ,raw_payload jsonb                      -- full original JSON when the source is an API
    ,posted_at timestamptz
    ,fetched_at timestamptz not null default now()
    ,processed_at timestamptz               -- null = awaiting enrichment
    ,lead_id uuid                           -- set after enrichment (fk added below)
    ,embedding vector(1536)                 -- for near-duplicate detection
    ,created_at timestamptz not null default now()
);
create unique index raw_postings_source_external_key
    on raw_postings (source_id, external_id) where external_id is not null;
create index raw_postings_unprocessed_idx
    on raw_postings (fetched_at) where processed_at is null;

-- 5. leads
create table leads (
     id uuid primary key default gen_random_uuid()
    ,company_id uuid not null references companies (id)
    ,source_id uuid references sources (id)
    ,stage lead_stage not null default 'inbox'
    ,title text not null                    -- 'Senior BI Developer (remote)'
    ,url text
    ,summary text                           -- Claude's 2-sentence summary (English)
    ,original_language text                 -- 'en','ru','de',...
    ,score int check (score between 0 and 100)
    ,score_breakdown jsonb                  -- {'hires_international':30,'rate_tier':25,...}
    ,stack text[]                           -- {'power_bi','snowflake','dbt'}
    ,employment_type text                   -- 'full_time','contract','freelance','unknown'
    ,hires_international boolean
    ,region text                            -- denormalized from company for fast filtering
    ,posted_at timestamptz
    ,rejected_reason text                   -- when stage = 'dead'/'lost'
    ,next_action_at timestamptz             -- follow-up reminder
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
    add constraint raw_postings_lead_id_fkey
    foreign key (lead_id) references leads (id);

-- 6. contacts (GDPR-sensitive: business data only, prune on lost)
create table contacts (
     id uuid primary key default gen_random_uuid()
    ,company_id uuid not null references companies (id)
    ,full_name text
    ,role_title text
    ,email text
    ,linkedin_url text
    ,telegram_handle text
    ,source_note text                       -- where this contact data came from (GDPR audit)
    ,metadata jsonb not null default '{}'::jsonb
    ,created_at timestamptz not null default now()
    ,updated_at timestamptz not null default now()
    ,deleted_at timestamptz
);
create index contacts_company_id_idx on contacts (company_id);

-- 7. activities (funnel timeline)
create table activities (
     id uuid primary key default gen_random_uuid()
    ,lead_id uuid not null references leads (id)
    ,contact_id uuid references contacts (id)
    ,activity_type activity_type not null
    ,body text                              -- note text / message content / call summary
    ,stage_from lead_stage
    ,stage_to lead_stage
    ,occurred_at timestamptz not null default now()
    ,metadata jsonb not null default '{}'::jsonb
    ,created_at timestamptz not null default now()
);
create index activities_lead_id_idx on activities (lead_id, occurred_at desc);

-- 8. updated_at triggers
create trigger sources_updated_at   before update on sources   for each row execute function set_updated_at();
create trigger companies_updated_at before update on companies for each row execute function set_updated_at();
create trigger leads_updated_at     before update on leads     for each row execute function set_updated_at();
create trigger contacts_updated_at  before update on contacts  for each row execute function set_updated_at();

-- 9. RLS — same migration, every table; only you (browser) + service_role (workers)
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
```

Workers connect with the `service_role` key (bypasses RLS — keep it server-side only, never in the Next.js client bundle). Your browser session goes through the anon key + your logged-in user, gated by `app_admins`.

### Funnel analytics view

```sql
create view v_funnel_summary as
select
     l.stage                       _stage
    ,count(*)                      _leads_cnt
    ,round(avg(l.score), 1)        _avg_score
    ,max(l.updated_at)             _last_movement_at
from leads l
where 1=1
    and l.deleted_at is null
group by l.stage;
```

### Flex points (predesigned evolution)

- `metadata jsonb` everywhere — e.g. per-source quirks on `raw_postings.raw_payload`, proposal amounts on `leads.metadata` until money fields stabilize into typed columns
- `score_breakdown jsonb` — scoring criteria will change often; don't hard-code columns per criterion
- When you start invoicing won leads, add a typed `deals` table rather than overloading `leads`

---

## 4. Frontend (in your existing site)

- **Route group** `app/(private)/leads/` behind your Supabase Auth middleware; RLS is the real gate, middleware is UX
- **Views:** *Inbox* (new AI-scored leads, accept → `qualified` / reject → `dead` with reason), *Board* (kanban by stage, drag = update `stage` + insert `stage_change` activity), *List* (sortable/filterable table: score, region, stack, next action), *Lead drawer* (summary, posting link, contacts, activity timeline, "draft outreach" button → Claude via a route handler)
- **Realtime:** subscribe to `leads` inserts where `stage = 'inbox'` → live inbox badge
- **Vercel cron** (`vercel.json`): daily route handler that queries top-5 new leads + due `next_action_at` follow-ups → sends your Telegram digest

## 5. Compliance quick-notes

- Company-level data: unproblematic. **Person-level contact data:** GDPR applies to EU data subjects regardless of where you sit — store only business-relevant fields, record provenance (`source_note`), and prune contacts on lost/dead leads
- Cold **email** to EU: consent rules are strict (esp. DE/AT); prefer LinkedIn DMs, Telegram, or replying to the posting itself
- Never automate LinkedIn/Facebook scraping; use the alert-email parser + manual paste-in paths instead
- Crawl third-party sites politely: identify your UA, honor robots.txt, low request rates, cache aggressively
