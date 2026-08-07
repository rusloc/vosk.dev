# VOSK.DEV — AI Coding Instructions

> For AI coding assistants working on the VOSK.DEV codebase.
> Pointers, communication rules, conventions. Keep it lean.

## Project identity

- **Project**: VOSK.DEV — personal website of a freelance **BI (Business Intelligence) analyst / developer**.
- **Goal**: win freelance clients — establish credibility, showcase dashboard/data work, convert visitors to leads.
- **Domain**: `vosk.dev`.
- **Canonical site URL at runtime**: `NEXT_PUBLIC_SITE_URL` env var — never hard-code the domain in code.

## Stack

- **Next.js (App Router)** + **TypeScript strict** + **Tailwind CSS**, deployed on **Vercel**.
- **Single app at repo root** — NOT a monorepo. No `apps/*`, no `packages/*`.
- **Content**: local **MDX** files in `content/` (no CMS, no database).
- **Contact form**: Server Action + **Resend** (transactional email). No DB persistence at v1.
- **No** Supabase / auth / ORM / component library unless a new need is explicitly agreed.

## Structure

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

## Available agents & skills

Sub-agents (`.claude/agents/`) are reusable helpers — route to them when useful, don't force it on a solo static site:
- **archi** (web-app-architect) — architecture / stack / security decisions.
- **nerd** (nextjs-react-nerd-reviewer) — React/Next.js implementation, review, perf.
- **hunter** (qa-test-hunter) — tests, security, edge cases.
- **papa** (product-manager) — scope / prioritization.
- **chef** (db-chef) — dormant; only wake if a database is ever added.

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
```bash
git add "<paths>"
git commit -m "<type>: <message>"
git push
```
- Wrap file paths in double quotes.

### Branching / deploy
- `main` → production on Vercel; PRs → preview deploys.
- Runtime env: `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` — validated in `src/lib/env.ts` (build fails if missing).

### Testing / verification
- Run `pnpm typecheck && pnpm lint && pnpm build` before considering a change done.
- Manual / browser verification on the Vercel preview deploy (parity with production), not just `localhost`.

## Logging (lightweight)

- `.log/coms/coms {yyyy-mm-dd}.md` — append a one-line entry per user request + brief response to today's file (create it if absent; one file per day, sibling to `.log/plan/` and `.log/daily/`). Tag `#decision` / `#idea` / `#bug` inline for grep. That's the whole routine — no daily/weekly/day-close ceremony unless the user asks to expand it.
- **Derive counters, never increment them.** Ages and tallies ("Nth day untracked", "Nth board survived") must be computed from a stated origin date/commit each time they're written. A restated number is never re-derived and always drifts — it has three times in this trail.
- **A session that crosses midnight logs each commit to its own date, and does not close the new day.** Closing a day that is 20 minutes old leaves the calendar day with a closed daily and no plan, and pushes every board counter a day ahead.

## Core coding rules

1. **Think before coding** — state assumptions, surface tradeoffs, ask when genuinely unclear. Don't pick silently between real alternatives.
2. **Simplicity first** — minimum code that solves the problem. No speculative abstractions, no unrequested config/flexibility, no error handling for impossible scenarios. If 200 lines could be 50, rewrite.
3. **Surgical changes** — touch only what the task requires. Match existing style. Don't refactor what isn't broken; remove only the orphans your own change created; mention pre-existing dead code, don't delete it.
4. **Goal-driven** — turn tasks into verifiable goals ("add validation" → "write tests for invalid input, make them pass") and loop until verified.
