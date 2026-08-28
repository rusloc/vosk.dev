# VOSK.DEV — AI Coding Instructions

> For AI coding assistants working on VOSK.DEV **and** the lead engine it manages.
> Pointers, communication rules, conventions. Keep it lean.
>
> **This folder is the control root and the knowledge base.** `CLAUDE.md`, `.claude/`, `.log/`,
> `docs/` and `.mcp.json` live here and govern **both** projects. Read the next section before
> touching either.

## Two projects, one control root

Two codebases, two GitHub repos, two deployments — **one place they are driven from: this folder.**

| | **`vosk.dev`** — the site | **`vosk_leads`** — the lead engine |
|---|---|---|
| Local root | **`D:\__VOSK__`** ← you are here | `D:\__VOSK_LEADS__` |
| GitHub | `rusloc/vosk.dev` | `rusloc/vosk_leads` |
| What it is | Public marketing site | Private lead gen + funnel tracker |
| Database | **none** — MDX + Resend | Supabase `howpxpdnjjzdwqrgxkee` |
| Deploy | Vercel, `vosk.dev` | Vercel, separate project |
| Design doc | — | `docs/05-lead-engine.md` (**here**) |

- **Sessions run from `D:\__VOSK__`.** Don't open a second instance in the leads folder — edit its
  files by absolute path from here.
- **The knowledge base is here and is not duplicated.** `CLAUDE.md`, `.claude/agents/`,
  `.claude/skills/`, `.claude/agent-memory/`. **`D:\__VOSK_LEADS__` gets no `CLAUDE.md` and no
  `.claude/`** — one source of truth. Two would be `CAND-002` again.
- **`.log/` and `docs/` also stay here**, covering both projects. One trail, not two.
- **`.mcp.json` is here**, scoped to the lead engine's Supabase project — see *Supabase* below.
- **⚠️ Commits never span the two repos.** Every change belongs to exactly one. Emit a separate
  `git add` / `commit` block per repo; `.log/` and `docs/` updates always ride with `d:/__VOSK__`.

### Supabase — leads only

One project, ref **`howpxpdnjjzdwqrgxkee`**, region `eu-west-1`, org `sudo.opc` (free plan).

- **⚠️ It is *named* `vosk.dev` in the dashboard but contains only lead-engine tables.** The site
  stores nothing there. Don't infer from the name that it backs the website — it doesn't. Its GitHub
  integration points at `rusloc/vosk_leads`.
- ⚠️ **Free plan allows 2 active projects and both slots are used** (`yaga` + this one). `fabrigate`
  and `newsmate` are paused and can't be restored without pausing one.
- Migrations live in `D:\__VOSK_LEADS__\supabase\migrations\` and are applied via the Supabase MCP
  (`apply_migration`), never by hand. No CLI, no Docker.

## Project identity — the site

- **Project**: VOSK.DEV — personal website of a freelance **BI (Business Intelligence) analyst / developer**.
- **Goal**: win freelance clients — establish credibility, showcase dashboard/data work, convert visitors to leads.
- **Domain**: `vosk.dev`.
- **Canonical site URL at runtime**: `NEXT_PUBLIC_SITE_URL` env var — never hard-code the domain in code.

## Stack — the site

- **Next.js (App Router)** + **TypeScript strict** + **Tailwind CSS**, deployed on **Vercel**.
- **Single app at repo root** — NOT a monorepo. No `apps/*`, no `packages/*`.
- **Content**: local **MDX** files in `content/` (no CMS, no database).
- **Contact form**: Server Action + **Resend** (transactional email). No DB persistence at v1.
- **No** Supabase / auth / ORM / component library **in this app** unless a new need is explicitly
  agreed. The lead engine's Supabase belongs to `vosk_leads`; it must never leak into this deployment
  — that separation is the whole reason the two are split.

## Stack — the lead engine

- **Supabase** as the entire backend: Postgres + RLS + Auth, `pg_cron` for scheduling, Edge Functions
  (Deno/TypeScript) for the jobs. No worker box, no container, no always-on host.
- **Next.js admin UI** on its own Vercel project (phase 4, not built yet) — browser uses the
  publishable key, RLS does authorization. The service-role key never reaches a client bundle.
- **Claude Haiku** for translate/extract/score. Nothing is ever sent to a lead without explicit approval.
- Full design, schema and phased build order: `docs/05-lead-engine.md`.

## Structure — the site

```
src/
  app/            → routes (home, work, services, contact, blog) + layout, sitemap, robots
  components/     → shared UI (nav, footer, cards, contact-form, mdx-components, primitives)
  lib/            → content.ts (MDX seam), schema.ts (Zod), env.ts, site.ts, metadata.ts
content/
  work/*.mdx      → case studies
  blog/*.mdx      → articles
public/images/    → work/<slug>/… and blog/<slug>/… assets
```

- **`src/lib/content.ts`** is the single seam for reading/listing/validating MDX — pages consume it, never touch the filesystem directly (keeps a future CMS swap cheap).
- All pages are Server Components / statically rendered. `[slug]` routes use `generateStaticParams()`. Client components are the exception (contact form, theme toggle, mobile menu) — mark them `'use client'`.

## Structure — the lead engine (`D:\__VOSK_LEADS__`)

```
supabase/
  config.toml              → project link (hand-written; no CLI needed)
  migrations/*.sql         → applied via MCP; filenames match the versions Supabase assigned
  functions/               → Edge Functions (phase 1+)
README.md                  → points back here for the design
```

- **No `CLAUDE.md`, no `.claude/`, no `.log/`, no `docs/` in that folder** — they live here.
- Migration filenames are kept in sync with `supabase_migrations.schema_migrations` so a future
  `supabase db push` doesn't re-apply them.

## Available agents & skills

Sub-agents (`.claude/agents/`) are reusable helpers — route to them when useful, don't force it on a solo static site:
- **archi** (web-app-architect) — architecture / stack / security decisions.
- **nerd** (nextjs-react-nerd-reviewer) — React/Next.js implementation, review, perf.
- **hunter** (qa-test-hunter) — tests, security, edge cases. Now also RLS policy audits.
- **papa** (product-manager) — scope / prioritization.
- **chef** (db-chef) — **awake since 2026-08-28**: the lead engine has a real Postgres schema. Use for
  schema/RLS/migration work on `vosk_leads`. Still irrelevant to the site, which has no database.

Skills in `.claude/skills/` (design, front-end, QA, SEO, PM, etc.) are stack-agnostic — use them freely.

## Conventions

### Code style
- TypeScript strict mode everywhere.
- **Zod** for all external input (contact form, MDX frontmatter) with `.strict()` — reject unknown fields; fail the build loudly on invalid content.
- ESLint + Prettier (with `prettier-plugin-tailwindcss`).
- No business/data logic scattered in components — keep parsing/data in `src/lib/`.

### Naming
- Files: `kebab-case.ts` / `kebab-case.tsx`.
- Components: `PascalCase`.
- Env vars: `SCREAMING_SNAKE_CASE`; `NEXT_PUBLIC_` prefix ONLY for client-safe values.

### Git
- After any code change, output git commands as a single copy-paste bash block. **Do not execute; do not touch the working tree.**
- **⚠️ Two repos — never one commit across both.** Decide which repo each changed file belongs to,
  then emit one `cd` + `add` + `commit` group per repo, in one block. `.log/` and `docs/` always ride
  with `d:/__VOSK__`, even when the work itself was in the leads folder.
```bash
cd "d:/__VOSK__"
git add "<paths>"
git commit -m "<type>: <message>"
git push

cd "d:/__VOSK_LEADS__"
git add "<paths>"
git commit -m "<type>: <message>"
git push
```
- Omit a group entirely when that repo has nothing to commit.
- Wrap file paths in double quotes.

### Branching / deploy
- `main` → production on Vercel; PRs → preview deploys. **Both repos**, two separate Vercel projects.
- Site runtime env: `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` — validated in `src/lib/env.ts` (build fails if missing).
- Lead engine env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the UI only.
  `ANTHROPIC_API_KEY` and the Telegram pair are **Edge Function secrets**, not repo env;
  `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — never set them.

### Testing / verification
- **Site**: run `pnpm typecheck && pnpm lint && pnpm build` before considering a change done. Manual /
  browser verification on the Vercel preview deploy (parity with production), not just `localhost`.
- **Lead engine**: after any DDL, run MCP `get_advisors(security)` — it must come back **zero lints**.
  Verify RLS by querying the REST API anonymously with the publishable key: **zero rows, not an error.**
  **Do that against real rows** — an empty table returns `[]` whether RLS works or not, so insert a row
  as `postgres`, re-query anonymously, then delete it.
- Cron job history is `cron.job_run_details`. It is the only job log there is.

## Logging (lightweight)

**One trail for both projects, and it lives here in `D:\__VOSK__\.log\`.** The leads folder gets no
log of its own — which repo a change landed in is a detail of the entry, not a reason to split the trail.

- `.log/coms/coms {yyyy-mm-dd}.md` — append a one-line entry per user request + brief response to today's file (create it if absent; one file per day, sibling to `.log/plan/` and `.log/daily/`). Tag `#decision` / `#idea` / `#bug` inline for grep. That's the whole routine — no daily/weekly/day-close ceremony unless the user asks to expand it.
- **Derive counters, never increment them.** Ages and tallies ("Nth day untracked", "Nth board survived") must be computed from a stated origin date/commit each time they're written. A restated number is never re-derived and always drifts — it has three times in this trail.
- **A session that crosses midnight logs each commit to its own date, and does not close the new day.** Closing a day that is 20 minutes old leaves the calendar day with a closed daily and no plan, and pushes every board counter a day ahead.

## Core coding rules

1. **Think before coding** — state assumptions, surface tradeoffs, ask when genuinely unclear. Don't pick silently between real alternatives.
2. **Simplicity first** — minimum code that solves the problem. No speculative abstractions, no unrequested config/flexibility, no error handling for impossible scenarios. If 200 lines could be 50, rewrite.
3. **Surgical changes** — touch only what the task requires. Match existing style. Don't refactor what isn't broken; remove only the orphans your own change created; mention pre-existing dead code, don't delete it.
4. **Goal-driven** — turn tasks into verifiable goals ("add validation" → "write tests for invalid input, make them pass") and loop until verified.
