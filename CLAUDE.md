# VOSK.DEV — AI Coding Instructions

> For AI coding assistants working on VOSK.DEV. Pointers, communication rules, conventions. Keep it lean.
>
> _Amended 2026-10-20: the lead engine (`vosk_leads`) is **terminated**. Its Supabase objects, crons,
> Edge Functions, extensions and migration history were removed, and its docs left this repo (git
> history keeps them). Its companies list survives in `.log/report/2026-10-20-lead-engine-companies-export.html`.
> Leads are tracked by hand now; there is no second project driven from this folder._

## The job flow — #1 priority, every day (owner, 2026-11-09)

Paying clients or a high-paid job come before all site work. **`docs/job/README.md`** is the routine, the
`recruiter` skill (`.claude/skills/recruiter/`) the method, `.log/job/job-<date>.md` the day sheet. A day's first work
is its job steps; site tasks rank by what they do for the funnel. The agent prepares, the owner sends. Never invent a
fact or a posting. The owner's Excel is the tracker.

## Scope — this repo and its agent are a pair (decided 2026-10-22)

- **The agent's duty is the job flow (above), vosk.dev and help with client acquisition** (profiles, outreach copy,
  the funnel). Nothing else is driven from here.
- **Don't read, check or log other repos** (`C:\__PBI\QBO`, `C:\__PBI\Rayfin`, anything else) unless
  the owner names a specific folder. Their work, agents, skills and trails stay there.
- **Artifacts arrive through a `.sync` folder** the owner points to: report embeds, screenshots,
  data snapshots, instruction `.md` files. Take what's there and apply it in this repo; never write
  back into it or into the repo that produced it.
- Agents and skills for other repos' work (e.g. Rayfin / Fabric Apps) don't live in this repo's `.claude/`.

### Supabase — one project, separate tenants by schema and role (site showcase, `qbo`, site report data)

One project, ref **`howpxpdnjjzdwqrgxkee`**, region `eu-west-1`, org `sudo.opc` (free plan),
**named `vosk.dev` in the dashboard**. ~~The site itself never connects to it.~~ Since 2026-11-02 the
site connects only as the per-report read-only logins below.
_Amended 2026-10-20: the lead engine's `public` tables are gone; `qbo` is the second tenant._

| Schema | Owner | What | Reached by |
|---|---|---|---|
| `demo_sales` | **site showcase** | synthetic online-sales star schema — `docs/08-cube-sales-showcase.md` | **only** role `cube_reader`, **only** from Cube |
| `qbo` | **QBO P&L** — repo `rusloc/qbo`, `C:\__PBI\QBO` | QuickBooks P&L warehouse; that repo's `CLAUDE.md` and ADR-0008 | roles `qbo_etl` (ETL, dbt) and `qbo_reader` (Power BI) |
| `mirelo_demo` _(live 2026-11-03)_ | **site report data** — the Mirelo custom JS report | synthetic neobank / microlender sales; schema SQL in `data/mirelo/sql/`, loader `scripts/mirelo-load.ts`, read by `/api/mirelo/*` (`docs/mirelo/README.md`, 11-03) | `mirelo_loader` (load, from the owner's machine) and `mirelo_reader` (the site's server routes) |
| `marketing_demo` _(loaded 2026-11-05)_ | **site report data** — the ACME Marketing custom JS report | synthetic SaaS paid-acquisition data; schema SQL in `data/marketing/sql/`, loader `scripts/marketing-load.ts`, read by `/api/marketing/*` as columns (`docs/marketing/README.md`) | `marketing_loader` (load, from the owner's machine) and `marketing_reader` (the site's server routes) |
| `pnl_demo` _(loaded 2026-11-09)_ | **site report data** — the management P&L custom JS report | synthetic two-company P&L (334,700 + 88,012 fact rows, ops, the manifest's lookups); schema SQL in `data/pnl/sql/`, loader `scripts/pnl-load.ts`, read by `/api/pnl/*` as JSON columns in chunks of one version × 12 months (`docs/pnl/README.md`, 11-09) | `pnl_loader` (load, from the owner's machine) and `pnl_reader` (the site's server routes) |
| `trucks_demo` _(loaded 2026-11-09)_ | **site report data** — the ACME Trucks custom JS report | **real aggregated operating figures** under anonymised names (9,414 rows + manifest); schema SQL in `data/trucks/sql/`, loader `scripts/trucks-load.ts`, read by `/api/trucks/*` as columns (`docs/trucks/README.md`) | `trucks_loader` (load, from the owner's machine) and `trucks_reader` (the site's server routes) |
| `ceo_digest_demo` _(schema + roles created 2026-11-16, tables pending the owner's apply)_ | **site + n8n showcase data** — the Tidewell data chat with reports by email (11-16 evening; was the Monday KPI email) | synthetic SaaS SME (Tidewell): weekly MRR, marketing with clicks, cash, receivables, payables, plus customers and their invoices; SQL in `data/ceo-digest/sql/` 001–006, read through the `fn_*` functions of 006 (`docs/ceo-digest/chat-and-email.md`) | `ceo_digest_loader` (optional refill), `ceo_digest_reader` (the site's chat route, `CEO_DIGEST_DATABASE_URL`) and `ceo_digest_n8n` (the n8n email workflow's Postgres credential) |
| `cashflow_demo` _(schema + tables + roles created 2026-11-26, load pending)_ | **site report data** — the ACME Cash Flow custom JS report ("Cash flow demo") | synthetic QuickBooks Online services firm, Jan 2024 – Oct 2026 (34 + 578 + 2,838 + 777 rows + manifest, money in integer cents); schema SQL in `data/cashflow/sql/`, build `scripts/cashflow-build.ts`, loader `scripts/cashflow-load.ts`, read by `/api/cashflow/*` as columns (`docs/cashflow/README.md`) | `cashflow_loader` (load, from the owner's machine) and `cashflow_reader` (the site's server routes) |
| `nordmark_demo` _(created 2026-11-15, load pending)_ | **site report data** — the Nordmark retail executive dashboard custom JS report | synthetic retail cubes (4,599 + 1,029 + 95 + 190 rows + manifest); schema SQL in `data/nordmark/sql/`, loader `scripts/nordmark-load.ts`, read by `/api/nordmark/*` as columns (`docs/nordmark/README.md`, 11-15) | `nordmark_loader` (load, from the owner's machine) and `nordmark_reader` (the site's server routes) |

_Amended 2026-11-02: **the site is a shopfront for reports, and report data lives in this project.**_
Each custom JS report (Track C) gets a schema of its own (`<report>_demo`: Mirelo first, then the
executive dashboard and the P&L) and reads it at runtime through the site's own server routes.
Report data does not ship in the Vercel build. **Neon** (hosted Postgres, a project per report) is
the agreed alternative when the 500 MB free plan runs out or `qbo` needs the room; the seeds, loaders
and roles are plain Postgres, so a move is a connection-string change.
_Exception (owner, 2026-11-24):_ the **freight forwarding sales report** (`/work/freight-sales-report`) keeps its custom
JS version's **Parquet in the repo build**, read in the browser (`hyparquet`, as the P&L did before 11-09): no
`<report>_demo` schema, no reader login, no `<REPORT>_DATABASE_URL`. Anyone can download those files, as anyone can
open its Power BI publish-to-web link. Built 11-24: `docs/freight/README.md`.

- **The site holds one credential per report: a `<report>_reader` login that can read its own
  `<report>_demo` schema and nothing else.** It never holds a credential that reaches `qbo`,
  `demo_sales` or any other schema; prove each new reader's denials on real rows (`42501`).
  Readers are hardened like `cube_reader` (`nobypassrls`, `noinherit`, low connection limit,
  `statement_timeout`, `search_path` = its schema, `default_transaction_read_only = on`), created
  `NOLOGIN`, and the owner sets the password. Their connection strings live only in Vercel env
  (`<REPORT>_DATABASE_URL`, server-only, **Session pooler, port 5432**: through the Transaction pooler the site's
  concurrent reads stall and can get another request's rows, found 2026-11-03; `server.ts` refuses a 6543 URL).
- The site does not talk to `demo_sales` directly: Cube does, as `cube_reader`, and `cube_reader` can
  read `demo_sales` and nothing else. **Never grant `cube_reader` anything outside `demo_sales`.
  Never expose `demo_sales`, `qbo` or any `<report>_demo` schema to the Data API** (`anon` /
  `authenticated` have no `USAGE` on any of them — keep it that way). `public` is empty.
- **Space:** the free plan's 500 MB is shared by every schema here. Measure the database before each
  report load; past ~70 % that report goes to Neon instead.
- **`qbo` is driven from its own repo and its own VS Code window, not from here.** Its migrations live
  in `C:\__PBI\QBO\supabase\migrations\`, and the project's migration history is `qbo`'s alone.
  Before a real client's books go in, `qbo` moves to a project of its own (`.log/report/2026-10-18-client-data-privacy-flows.html`).
- **`.mcp.json` is here**, scoped to this project — for the `demo_sales` seed and read-only checks.
- ⚠️ **Free plan allows 2 active projects and both slots are used** (`yaga` + this one). `fabrigate`
  and `newsmate` are paused and can't be restored without pausing one.
- **`demo_sales` is deliberately *not* a migration.** It is a drop-and-rebuild seed in
  `data/sales/*.sql` (site repo), applied via MCP `execute_sql` — so `schema_migrations` stays
  `qbo`'s. Re-run `004` after `001`; details in `data/README.md`.
- **`pg_net` and `pg_cron` were dropped on 2026-10-20** (only the lead engine used them), and with
  `pg_net` went the `PUBLIC` grant on `net` that `docs/08` §5 documents. Re-enabling `pg_net` brings
  that grant back — re-read §5 first.
- After any DDL here, run MCP `get_advisors(security)` — it must come back **zero lints**.

## Project identity — the site

- **Project**: VOSK.DEV — personal website of a **BI (Business Intelligence) consultant** (never "freelance/freelancer" in copy, owner 11-19).
- **Goal**: win clients — establish credibility, showcase dashboard/data work, convert visitors to leads.
- **Domain**: `vosk.dev`.
- **Canonical site URL at runtime**: `NEXT_PUBLIC_SITE_URL` env var — never hard-code the domain in code.

## Landing page — clean, no scroll (owner, 2026-11-19)

- **The home page is the hero and nothing else**: the topical H1 line, the headline, the lede, the two buttons
  (Work, Services); no proof bar since 11-19 (DP-600 lives on /about; working hours are not stated anywhere on the site). It fits the screen with **no scrolling** on desktop, laptop and phone.
- **No sections below the hero.** Case studies, prices, posts, service cards and contact blocks belong on their own pages
  (/work, /services, /blog, /contact), even when an SEO spec asks for them on the home page (spec T-03 was rolled back
  on 11-19). Anything added to the hero must still fit the screen; check it in a headless browser at 1440×900,
  1366×768 and 390×844 before shipping.

## No site footer (owner, 2026-11-22)

- **No footer on any page.** The site is nav + page; `components/footer.tsx` was removed. Privacy stays reachable from the
  consent card and the ad landing pages; "Change cookie choice" lives on /privacy.

## Ad landing pages — `/lp/*` (owner, 2026-11-20)

- **One page per ad campaign, built from the owner's design** (`.log/report/engineer-landing/` for `/lp/fab`,
  `.log/report/n8n-landing/` for `/lp/ai`, 11-22; `/lp/fabric` and `/lp/ai-automation` until 11-23).
  They live in `src/app/lp/` with a layout of their own (no site nav or footer; the proxy skips `lp/`); the page code is
  in `src/components/landing/` (one CSS module per page; the section dock is shared, `landing-dock.tsx`).
- **One way only:** a landing page links into the site (brand, /contact, /services, /privacy, a /work demo); nothing on the site links
  to a landing page. `noindex, follow`, no canonical, not in the sitemap, and **never disallowed in robots.txt** (Google
  must crawl a page to see its noindex, and the Ads crawler must reach it). The consent card and the lead source (R-07)
  run there as on the site.
- No invented proof: the design's "Clients" logo strip stays out until the owner supplies real logos.
- **Four colours only (owner, 11-23):** blue `#4F46E5`, orange `#FFA63D`, white `#FFF8E7`, black `#2A0C0F`. A tint or
  shade is one of them at an opacity (`rgba`) or a `color-mix` of two of them (muted text, paper shades, the Fabric
  stack layers); no other hex, no greens or greys. Shadows and masks alone use neutral black (`rgba(0, 0, 0, …)`, `#000`).

## Stack — the site

- **Next.js (App Router)** + **TypeScript strict** + **Tailwind CSS**, deployed on **Vercel**.
- **Single app at repo root** — NOT a monorepo. No `apps/*`, no `packages/*`.
- **Content**: local **MDX** files in `content/` (no CMS, no database).
- **Contact form**: Server Action + **Resend** (transactional email). No DB persistence at v1.
- **No** Supabase client / auth / ORM / component library **in this app** unless a new need is
  explicitly agreed. _Amended 2026-11-02:_ **the only database credentials in this deployment's env
  are the per-report read-only Postgres logins** (`<REPORT>_DATABASE_URL`, see the Supabase section).
  No Supabase API URL, anon / publishable / service key, or any login that can reach `qbo` (a
  client product's warehouse) may appear here. The Cube showcase still holds only a Cube URL + secret.
  _Amended 2026-11-06:_ plus **one LLM API key** (`CHAT_LLM_API_KEY`, server-only) for the report AI chat (ADR-0005).
- **Agreed addition (2026-11-02):** a plain Postgres driver (`postgres`, exact version pinned at the
  build) for the report routes, chosen over a vendor driver so Supabase and Neon stay interchangeable.
- **Agreed additions (2026-09-27):** **Tremor** for the Cube showcase — the copy-paste components
  from tremor.so, vendored and modified in `src/components/tremor/` (Apache-2.0, `LICENSE` kept there),
  on `recharts` 3 + Radix (`tabs`, `toggle-group`, `toggle`, `slot`), `tailwind-variants`,
  `clsx` + `tailwind-merge`, `@remixicon/react`. They replaced `chart.js` (agreed 2026-09-21, removed).
  Not `@tremor/react` (React 18 / Tailwind 3 only, unmaintained), not `@cubejs-client/*` — native
  `fetch` covers the data. The vendored files are ours now: upstream stopped development in 2025.
- **Agreed addition (2026-10-22):** `hyparquet` (exact 1.31.5) for the P&L showcase, which reads static Parquet
  in the browser; IBM Plex Sans (+ Condensed) via `next/font`, scoped to that report only. Its own design
  system (Ledger tokens, CSS Modules) stays inside `components/pnl/`; the site keeps Tailwind and Geist.
- **Agreed addition (2026-11-05):** Manrope via `next/font` (`components/marketing/manrope-font.ts`), scoped to the ACME
  Marketing report's root, like IBM Plex for the P&L.
- **Agreed additions (2026-11-26):** `hyparquet-writer` (exact 0.18.0, **devDependency**, only `scripts/cashflow-build.ts`
  writes the cash flow pack with it); Space Grotesk + JetBrains Mono self-hosted via `next/font/local`
  (`components/cashflow/cashflow-fonts.ts`, `preload: false`), scoped to the ACME Cash Flow report's root.
- **Agreed addition (2026-11-20):** Host Grotesk (+ Geist Mono) self-hosted via `next/font/local`
  (`components/landing/landing-fonts.ts`), scoped to the `/lp/*` landing layout, from the owner's design.
- **Agreed addition (2026-11-06):** `@anthropic-ai/sdk` (exact 1.5.0), the LLM SDK for the report AI chat: a closed set of
  tools over the report engine, run server-side in `/api/chat/<report>` (ADR-0005; `src/lib/chat/`,
  `src/lib/mirelo/chat-tools.ts`, `src/lib/marketing/chat-tools.ts`, `src/lib/pnl/chat-tools.ts`, `src/lib/trucks/chat-tools.ts`, `src/lib/nordmark/chat-tools.ts`, `src/components/chat/`).
  Mirelo and ACME Marketing (11-06), the P&L and ACME Trucks (11-09), Nordmark (11-15). Each report has a **metric catalogue** (`<report>/chat-metrics.ts`,
  a `get_metric` tool) and an **answer key** (`data/<report>/checks/chat-golden.csv`, checked in `pnpm test`; the
  chat-level eval `scripts/chat-eval.ts <report>` runs by hand). No text-to-SQL, no report data in the build.
- **Agreed addition (2026-11-16):** `@n8n_io/n8n-demo-component` (exact 1.0.20, on `lit`), n8n's `<n8n-demo>` web
  component for the n8n workflow showcases: it draws a workflow's canvas through n8n's hosted preview service, from a
  sanitized copy of the JSON in `data/n8n/` (`scripts/n8n-export.ts`: no credentials, ids or private host). Loaded only
  when the popup opens (`components/n8n-workflow.tsx`). Our n8n server is never linked from the site.
  _Amended 2026-11-16:_ the site's server may call **one** n8n webhook, server to server: the Tidewell chat's
  `send_email_report` tool POSTs to `N8N_DIGEST_WEBHOOK_URL` with `N8N_DIGEST_WEBHOOK_SECRET` (both server-only, never
  in client code or page copy). That is the only n8n URL the deployment holds.

## Structure — the site

```
src/
  app/            → routes under [locale]/ (home, work, services, contact, blog) + layout, sitemap, robots
  app/api/        → superset/guest-token; mirelo/[...path], marketing/[...path], pnl/[...path], trucks/[...path], nordmark/[...path] and cashflow/[...path] (the JS reports' data from Supabase); chat/mirelo, chat/marketing, chat/pnl, chat/trucks and chat/nordmark (the AI chat, ADR-0005) — the Route Handlers
  proxy.ts        → locale rewriting middleware; excludes /api/*
  components/     → shared UI (nav, cards, contact-form, mdx-components, primitives)
  lib/            → content.ts (MDX seam), work.ts (showcase registry), schema.ts (Zod), env.ts, site.ts, metadata.ts
  lib/pnl/        → the P&L showcase's engine, loader and state (framework-free); components/pnl/ its UI
  fonts/          → self-hosted woff2 for next/font/local, built by scripts/fonts-build.py (OFL). Never next/font/google:
                    its build-time download failed 3 of 5 production builds on 11-18
content/
  blog/*.mdx      → articles
data/             → synthetic demo warehouses as plain SQL: P&L (Superset), sales/ (Cube); <report>/parquet + checks + sql for the JS reports
public/images/    → work/<slug>/… and blog/<slug>/… assets
public/data/freight/ → the freight sales report's Parquet, shipped as delivered (11-24); engine lib/freight/, UI components/freight/
data/pnl/parquet/ → the P&L showcase's frozen data (Parquet + manifest; was public/data/pnl until 11-09, now loaded into pnl_demo); spec and decisions in docs/pnl/
```

- **`src/lib/content.ts`** is the single seam for reading/listing/validating MDX — pages consume it, never touch the filesystem directly (keeps a future CMS swap cheap).
- **`/work` is not MDX.** Showcases are entries in **`src/lib/work.ts`** — a discriminated union by
  `platform` (`power-bi` | `superset` | `cube` | `js` | `automation`), per `ADR-0002`. There is no `content/work/`.
  Every showcase page is text plus one button, "Power BI" (a Power BI report) or "Web report" (drawn on
  the site: JS, Cube, Superset); the report opens in a popup. No platform pill on the page or the card (11-04).
  A showcase with two formats of one report (a `js` entry with `powerBi`) has two such buttons side by
  side, "Power BI" and "Web report", each opening its report in the popup.
  The `cube` entry is not an embed: the page queries Cube server-side and draws the dashboard
  itself (`components/sales-dashboard.tsx`); it is hidden until `CUBE_API_URL` + `CUBE_API_SECRET` are set.
  An `automation` entry (11-16) is an n8n workflow: its text, then "How to test" on the live demo inbox, then one
  "n8n workflow" button that opens the canvas in the popup.
- **A showcase page fits one screen, no scroll, on desktop (owner, 11-25):** two columns from `lg` (title, buttons and
  "About" on the left; "Try it yourself", the contact box and the related titles on the right). `details` is **three
  bullets of one sentence each**: what the report is about, its metrics, the tech under the hood (`work.test.ts` checks
  it). Measure at 1440×900 and 1366×768 after any change to a showcase's text.
- **Buttons (owner, 11-25):** one look, `components/cta-button.module.css`: black (`.cta`), orange (`.cta .accent`, which
  replaced every blue button) and white with a border (`.cta .outline`, the secondary, e.g. "See pricing"); each one
  hovers with the same blue slide. No `bg-primary` buttons on the site pages.
- All pages are Server Components / statically rendered. `[slug]` routes use `generateStaticParams()`. Client components are the exception (contact form, theme toggle, mobile menu) — mark them `'use client'`.

## Available agents & skills

Sub-agents (`.claude/agents/`) are reusable helpers — route to them when useful, don't force it on a solo static site:
- **archi** (web-app-architect) — architecture / stack / security decisions.
- **nerd** (nextjs-react-nerd-reviewer) — React/Next.js implementation, review, perf.
- **hunter** (qa-test-hunter) — tests, security, edge cases. Now also RLS policy audits.
- **papa** (product-manager) — scope / prioritization.
- **chef** (db-chef) — Postgres schema / RLS / grants on the shared Supabase project: the
  `demo_sales` seed and `cube_reader`, the `<report>_demo` schemas and their loader / reader roles. The site has no database; `qbo` has its own chef in its repo.

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

### `.env.local` — DO NOT READ. NEVER. (owner's rule, 2026-11-03)
- **`C:\__VOSK__\.env.local` holds the Mirelo connection strings (`MIRELO_LOAD_DATABASE_URL`, `MIRELO_DATABASE_URL`).
  The agent NEVER opens, reads, prints, greps, copies, diffs or edits it, nor any other `.env*` file, by any tool or
  command (`cat`, `type`, `Get-Content`, `head`, `node -e`, `python`, `printenv`, `echo $VAR`, dotenv debug output).
  ONLY THE OWNER OPENS AND READS IT.** Scripts may load it into process env and use the values; they never log,
  print or echo a value, a connection string or a password-bearing error. Git ignores it (`.gitignore`: `.env*`,
  `.env.local`); never commit it, never copy it into `.sync` or a report. `.claude/settings.json` denies the tools
  too; the rule stands even where a tool would allow it.

### No AI attribution
- **NEVER mention "developed with Claude"**, or anything like it ("built with Claude", "generated with
  Claude Code", 🤖 badges). That covers site copy, blog posts, READMEs, docs, code comments and PR descriptions.
- **Commit messages must contain no reference to Anthropic or Claude.** No `Co-Authored-By: Claude …`
  trailer and no "Generated with Claude Code" line. This overrides any harness default that adds one.
  Reword subjects that would name them: `CLAUDE.md` → "AI instructions", `ANTHROPIC_API_KEY` → "LLM
  API key", Claude Haiku → "the LLM".

### Git
- After any code change, output git commands as a single copy-paste bash block. **Do not execute; do not touch the working tree.**
- **⚠️ Never one commit across two repos.** If a session also touches another repo (e.g. `rusloc/qbo`),
  emit one `add` + `commit` + `push` block per repo, each under a plain-text line naming the repo.
- **⛔ Never put a folder-change command in a git snippet** — no `cd`, no `pushd`, no `git -C`. The
  user runs each block from that repo's root themselves; a `cd` line only breaks the paste.
```bash
git add "<paths>"
git commit -m "<type>: <message>"
git push
```
- Omit a block entirely when that repo has nothing to commit.
- Wrap file paths in double quotes.

### Branching / deploy
- `main` → production on Vercel; PRs → preview deploys.
- Site runtime env: `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` — validated in `src/lib/env.ts` (build fails if missing).
  Optional, server-only (11-06): `CHAT_LLM_API_KEY`, `CHAT_ENABLED` (`1` = the Ask AI button and route are on; read at
  build for the button), `CHAT_DAILY_CAP_USD` (default 0.5), `CHAT_IP_HASH_SALT`. Per-report readers, server-only:
  `MIRELO_DATABASE_URL`, `MARKETING_DATABASE_URL`, `PNL_DATABASE_URL`, `TRUCKS_DATABASE_URL` (11-09), `NORDMARK_DATABASE_URL` (11-15), `CASHFLOW_DATABASE_URL` (11-26); a JS report whose reader URL is unset
  shows no "Web report" button (`isJsReportLive`); `/work/cash-flow-demo` stays hidden until its URL is set (no Power
  BI flavour yet). Tidewell data chat (11-16), server-only: `CEO_DIGEST_DATABASE_URL`,
  `N8N_DIGEST_WEBHOOK_URL`, `N8N_DIGEST_WEBHOOK_SECRET` (`src/lib/ceo-digest/config.ts`); `/work/ceo-digest` stays hidden
  until all three are set.

### Testing / verification
- **Site**: run `pnpm typecheck && pnpm lint && pnpm build` before considering a change done. Manual /
  browser verification on the Vercel preview deploy (parity with production), not just `localhost`.
- **Access checks on real rows.** An empty table returns `[]` whether a grant or RLS works or not —
  prove a denial against data (`set role …` → `42501`), never against an empty relation.
- **"Succeeded" is not health.** A scheduler's `succeeded` can mean only "the call was queued": on
  2026-09-20 the lead engine's enrichment failed for 36 hours behind green runs. Check the rows that
  should exist, not the job status.

## Logging (lightweight)

**The trail lives in `.log/` at this repo's root.** Work in another repo (e.g. QBO) is logged in that
repo's own trail; it appears here only when it touches the shared Supabase project.

- `.log/coms/coms {yyyy-mm-dd}.md` — append a one-line entry per user request + brief response to today's file (create it if absent; one file per day, sibling to `.log/plan/` and `.log/daily/`). Tag `#decision` / `#idea` / `#bug` inline for grep. That's the whole routine — no daily/weekly/day-close ceremony unless the user asks to expand it.
- **Derive counters, never increment them.** Ages and tallies ("Nth day untracked", "Nth board survived") must be computed from a stated origin date/commit each time they're written. A restated number is never re-derived and always drifts — it has three times in this trail.
- **A session that crosses midnight logs each commit to its own date, and does not close the new day.** Closing a day that is 20 minutes old leaves the calendar day with a closed daily and no plan, and pushes every board counter a day ahead.

## Writing voice (owner, 2026-11-17)

- **Keep analyzing the owner's writing style** from `.log/coms/` and their chat prompts, and keep picking samples into
  the `text-writer` skill: `.claude/skills/text-writer/references/owner-voice.md`. Add a dated sample whenever the owner
  rewrites a draft, rejects a phrasing, or gives format feedback ("too long", "unhuman", "punchy"): the original line,
  their version verbatim, and one line on what it teaches. Update "What the samples teach" when a pattern repeats.
- Anything published under the owner's name (LinkedIn, blog, outreach) goes through the `text-writer` skill and that file.

## Core coding rules

1. **Think before coding** — state assumptions, surface tradeoffs, ask when genuinely unclear. Don't pick silently between real alternatives.
2. **Simplicity first** — minimum code that solves the problem. No speculative abstractions, no unrequested config/flexibility, no error handling for impossible scenarios. If 200 lines could be 50, rewrite.
3. **Surgical changes** — touch only what the task requires. Match existing style. Don't refactor what isn't broken; remove only the orphans your own change created; mention pre-existing dead code, don't delete it.
4. **Goal-driven** — turn tasks into verifiable goals ("add validation" → "write tests for invalid input, make them pass") and loop until verified.
