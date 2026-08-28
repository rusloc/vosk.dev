> # ⛔ SUPERSEDED — 2026-08-28
>
> **Do not build from this file, and do not feed it to an AI assistant.** It has been merged into
> **[`05-lead-engine.md`](05-lead-engine.md)**, which is the single design doc. Its source catalog moved
> to [`06-lead-sources.md`](06-lead-sources.md).
>
> **What changed in the merge, and why:**
> - **n8n was dropped as the orchestrator.** n8n Cloud has no free tier (**€20/mo**), and self-hosting
>   it needs a container that must stay awake — which contradicts the no-Docker / no-PC / low-cost
>   constraint. Supabase `pg_cron` + Edge Functions do the same jobs for **$0** and no container.
> - **The UI moved out of `vosk.dev`** into a separate Vercel project. A `/pipeline` route here would be
>   rewritten to `/en/pipeline` by `src/proxy.ts`, and would put the service-role key in the same
>   deployment as a public marketing site.
> - **The schema was reconciled** with `bi-lead-engine-spec.md`: uuid PKs, soft delete, `metadata jsonb`,
>   `activities` instead of `touches`, score 0–100 with a jsonb breakdown.
> - **Kept from this file, because it was the better call:** Gmail OAuth for sending (protects the
>   `vosk.dev` domain reputation that carries the contact form), and the §7 guardrails.
>
> Moved from the repo root and preserved below _(as written, for the record)_.

---

# PROJECT MANUAL: BI Leads Acquisition Pipeline
> AI-ready specification. Feed this file to your AI assistant (Claude Code / Cursor).
> Role for the assistant: senior full-stack + automation engineer. Follow phases in order. Ask before deviating from schema or security rules.

---

## 1. GOAL

Build a lead-generation system for selling BI/analytics services (owner: solo consultant, site `vosk.dev`).

The system must:
1. Collect leads automatically from job boards, freelance platforms, and company-signal APIs.
2. Enrich leads with contact data and score them with an LLM.
3. Support semi-automated outreach (human approves every send).
4. Track the funnel in Supabase: total → contacted → responded → won/lost.
5. Be manageable from `vosk.dev` (dashboard, lead table, outreach approval queue, workflow controls).

Non-goals: mass unsolicited spam, auto-sending without approval, scraping behind logins.

---

## 2. TECH STACK (fixed — do not substitute)

| Layer | Tech |
|---|---|
| Orchestration | n8n, self-hosted (Docker), v2.18.4+ |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Scraping | Apify actors (job boards); RSS where available |
| Enrichment | Hunter.io or Apollo API |
| LLM | Local model via Ollama (Qwen family) OR Anthropic API — configurable |
| Site | Next.js (App Router) on Vercel, domain vosk.dev |
| Notifications | Telegram bot |
| Email | Gmail OAuth via n8n node |

---

## 3. DATABASE SCHEMA (Supabase / PostgreSQL)

Apply as migration 001. All tables in schema `public`. Enable RLS on every table.

```sql
create table sources (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  type        text not null check (type in ('api','scrape','rss','manual')),
  created_at  timestamptz not null default now()
);

create table companies (
  id          bigint generated always as identity primary key,
  name        text not null,
  domain      text unique,
  industry    text,
  size        text,
  country     text,
  signals     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table contacts (
  id          bigint generated always as identity primary key,
  company_id  bigint not null references companies(id) on delete cascade,
  full_name   text,
  role        text,
  email       text,
  linkedin    text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table leads (
  id            bigint generated always as identity primary key,
  company_id    bigint not null references companies(id) on delete cascade,
  source_id     bigint not null references sources(id),
  status        text not null default 'new'
                check (status in ('new','enriched','contacted','responded','meeting','won','lost','parked')),
  score         int check (score between 1 and 10),
  score_reason  text,
  discovered_at timestamptz not null default now(),
  last_touch_at timestamptz,
  notes         text,
  unique (company_id, source_id)
);

create table touches (
  id         bigint generated always as identity primary key,
  lead_id    bigint not null references leads(id) on delete cascade,
  channel    text not null check (channel in ('email','call','telegram','linkedin')),
  direction  text not null default 'out' check (direction in ('out','in')),
  sent_at    timestamptz not null default now(),
  replied    boolean not null default false,
  summary    text
);

create view funnel_stats as
select
  count(*)                                              as total,
  count(*) filter (where status = 'contacted')          as contacted,
  count(*) filter (where status = 'responded')          as responded,
  count(*) filter (where status in ('meeting'))         as meetings,
  count(*) filter (where status = 'won')                as won,
  count(*) filter (where status = 'lost')               as lost
from leads;
```

Rules:
- n8n connects with the **service role key** (server-side only).
- vosk.dev browser client uses **anon key + Supabase Auth + RLS** (policy: only authenticated owner UID can select/update).
- Never expose service key to the browser.

---

## 4. N8N WORKFLOWS (one job = one workflow)

Naming convention: `NN-verb-noun` (e.g. `01-collect-jobboard`).

### 01-collect-<source> (one per source; start with ONE)
- Trigger: Schedule (daily).
- Steps: fetch (Apify actor / RSS / API) → normalize to `{company_name, domain, country, signal}` → upsert `companies` (match on domain) → insert `leads` (`on conflict do nothing`).
- Error branch → Telegram alert.

### 02-enrich-and-score (hourly)
- Select leads where status='new' and no contact exists.
- Hunter/Apollo: domain → decision-maker email → insert `contacts`.
- LLM prompt: "Rate 1-10 how likely this company needs external BI help. Signals: {signals}. Reply JSON {score, reason}." → update `leads.score`, `score_reason`, status='enriched'.
- score < 7 → status='parked'.

### 03-outreach-queue
- Select status='enriched', score>=7.
- LLM drafts a short personalized email (template + signals).
- Store draft; request approval (Telegram buttons in v1, vosk.dev queue in v2).
- On approve: send via Gmail → insert `touches` → status='contacted', set `last_touch_at`.
- HARD RULE: no send without explicit human approval.

### 04-track-replies
- Trigger: Gmail (new reply).
- Match sender email → contact → lead; insert `touches` (direction='in', replied=true); status='responded'; Telegram notify.

### 05-weekly-digest
- Cron Monday 08:00 → query `funnel_stats` → Telegram summary.

### Webhooks (for vosk.dev)
- `POST /webhook/approve-outreach` {draft_id, action: approve|skip}
- `POST /webhook/run-collector` {source}
- Auth: shared secret header `X-Pipeline-Secret`.

Follow-up rule: one reminder max after 5–7 days of silence, then park.

---

## 5. VOSK.DEV INTEGRATION (Next.js)

### Pages
1. `/pipeline` — dashboard: funnel_stats numbers + trend.
2. `/pipeline/leads` — table (filter by status/score/source), inline status edit, notes.
3. `/pipeline/leads/[id]` — lead detail + touches timeline.
4. `/pipeline/outreach` — approval queue: draft preview, Approve / Edit / Skip.
5. `/pipeline/workflows` — n8n workflow toggles, "run now", last 10 executions.

### Backend rules
- All n8n API and webhook calls go through Next.js route handlers (`/api/n8n/*`). n8n API key lives in server env only.
- Every route handler verifies the Supabase session before proxying.
- Supabase reads/writes from the browser only through RLS-protected anon client.

### Env vars
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only
N8N_BASE_URL=
N8N_API_KEY=                    # server only
PIPELINE_WEBHOOK_SECRET=
```

---

## 6. IMPLEMENTATION PLAN (execute in order)

### Phase 0 — Foundations
- [ ] Deploy n8n via Docker; create Supabase project.
- [ ] Apply migration 001; enable RLS; write owner-only policies.
- [ ] Create keys: Apify, Hunter/Apollo, Telegram bot, Gmail OAuth.
- **Done when:** schema visible in Supabase, n8n reachable, creds stored in n8n.

### Phase 1 — First collector
- [ ] Build `01-collect-jobboard` for ONE source.
- [ ] Verify dedup on repeated runs; add Telegram error alert.
- **Done when:** 3 consecutive daily runs insert only new leads.

### Phase 2 — Enrichment + scoring
- [ ] Build `02-enrich-and-score`; validate LLM returns strict JSON.
- **Done when:** new leads get contact + score within 1h automatically.

### Phase 3 — Outreach loop
- [ ] Build `03-outreach-queue` with Telegram approval; `04-track-replies`.
- **Done when:** full cycle new→contacted→responded works on a test lead.

### Phase 4 — Visibility
- [ ] Build `05-weekly-digest`.
- [ ] vosk.dev: auth + `/pipeline` dashboard + leads table (read-only first).
- **Done when:** funnel numbers visible on site behind login.

### Phase 5 — Site control
- [ ] Route handlers proxying n8n API; workflow toggles + run-now.
- [ ] Outreach approval queue page replacing Telegram buttons.
- **Done when:** approve/skip works from the site end-to-end.

### Phase 6 — Scale & harden
- [ ] Add collectors 2–4 (reuse normalize→upsert sub-workflow).
- [ ] Git-export n8n workflow JSONs; backup Supabase; rotate keys quarterly.
- [ ] Monthly: review score accuracy, tune LLM prompt.

---

## 7. GUARDRAILS FOR THE AI ASSISTANT

1. Never auto-send outreach; approval step is mandatory.
2. Never put service keys or n8n API key in client-side code.
3. Respect source ToS; prefer official APIs/RSS over scraping; B2B role addresses over personal emails; include opt-out in emails (GDPR).
4. One workflow per job; small composable flows; export JSON to git after changes.
5. On schema changes: write a new numbered migration, never edit migration 001.
6. If a step is ambiguous, ask the owner instead of guessing.
