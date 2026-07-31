# Superset embedding — implementation map

> Audience: AI coding assistant. **The site-side implementation is done and lives in code.**
> This file says what each piece is for and why it looks the way it does. It deliberately
> does **not** reproduce the code — this document used to be a 500-line paste-ready dump,
> which is precisely the two-sources-of-truth failure catalogued as `CAND-002`. Read the
> files; they are commented.
>
> Manual, one-time and ops work → [`03-vps-deployment.md`](03-vps-deployment.md).
> Architecture and contracts → [`01-solution-overview.md`](01-solution-overview.md).

## The one-line summary

Superset can't be iframed like a video — it's an authenticated app. The site's server logs
into Superset, mints a guest token scoped to one dashboard, hands it to the visitor's
browser, and the SDK renders the dashboard with no login screen. Everything else is
plumbing to make that handshake secure and repeatable.

## Site-side files

| File | Role | Why it's like that |
|---|---|---|
| [`src/middleware.ts`](../src/middleware.ts) | Locale routing | Matcher **must** exclude `api/`. Before the fix it swallowed every API route (no dot in the path → rewritten under `/en` → 404). `feed.xml` survived only by accident of its name. `CAND-001` |
| [`src/lib/work.ts`](../src/lib/work.ts) | Dashboard registry | `Showcase` is a discriminated union: `power-bi` carries `embedUrl` + `href`, `superset` carries `embedId`. Forces the detail page to branch instead of rendering an empty iframe. Superset entries are filtered out unless the instance is configured **and** the UUID is real |
| [`src/lib/superset.ts`](../src/lib/superset.ts) | Login → CSRF → mint | `server-only`. Caches the whole session (JWT + CSRF token + its cookie) for 45 min; one retry with a fresh session on any failure of a cached one. Asserts each token is a non-empty string, naming the field. `CAND-003` |
| [`src/app/api/superset/guest-token/route.ts`](../src/app/api/superset/guest-token/route.ts) | Public endpoint | Deliberately narrow: known Superset slug only, own origin only, 20 requests / 10 min per IP, token scoped to one dashboard |
| [`src/components/superset-embed.tsx`](../src/components/superset-embed.tsx) | Client Component | Mounts the SDK, renders a visible loading/error state, passes locale copy in as props so it stays locale-agnostic |
| [`src/app/[locale]/work/[slug]/page.tsx`](../src/app/%5Blocale%5D/work/%5Bslug%5D/page.tsx) | Detail page | Branches on `platform`. No "open live dashboard" link for Superset — a guest-token dashboard has no public URL to open (`ADR-0002`) |
| [`scripts/superset-handshake.mjs`](../scripts/superset-handshake.mjs) | Debug harness | Runs the whole handshake with no Next.js and no browser. **Use this first** when an embed fails — it separates "credentials wrong" from "code wrong" |

Supporting: `src/lib/env.ts` (only `NEXT_PUBLIC_SUPERSET_DOMAIN`, optional — the secrets
must never enter this schema), `src/lib/i18n/{en,ru}.ts` (`dashboardLoading` /
`dashboardError`), `src/app/globals.css` (`.superset-container iframe` — the SDK injects a
bare iframe that must be sized from its container).

## Decisions worth not re-litigating

**Why the whole session is cached, not just the JWT.** The CSRF token is bound to the
session cookie issued with it. Caching them separately means they can drift apart, and the
resulting 400 says nothing useful. They are acquired together and expire together.

**Why retry on *any* failure of a cached session.** A stale session fails as 401, 400 or
403 depending on which half went stale (JWT expired / CSRF rotated / Superset restarted).
Enumerating those statuses is a losing game; retrying once with a fresh session and
surfacing the second failure is both shorter and more robust.

**Why Superset showcases hide themselves.** An unconfigured embed renders a dead frame on a
page whose entire job is to demonstrate competence. Filtering in the registry — rather than
at the call site — keeps the list page, `generateStaticParams`, the sitemap and the 404
path in sync automatically.

**Why the rate limiter is duplicated from the contact action.** Eight lines, matching the
codebase's existing per-file style. Extracting it would mean editing a working Server
Action this task had no reason to touch. Worth extracting if a third caller appears.

**Why no `referrerPolicy`.** Preset validated the `Referer` against a per-dashboard
allow-list, so it was mandatory there. Self-hosted Superset decides framing with CSP
`frame-ancestors` instead, and does not read `Referer` at all.

## Adding a dashboard later

1. Build it in Superset → **Published** → `⋯` → **Embed dashboard** → copy the UUID
2. Add a `superset` entry to `src/lib/work.ts` with that UUID and the case-study copy
3. Deploy; verify **on the deploy**, not localhost

Export dashboards periodically and commit the archive for versioning. Embed UUIDs are
per-instance — if a staging Superset ever exists, the registry must be env-aware or
production will silently render the wrong dashboard.

## When something breaks

The troubleshooting table lives in [`03-vps-deployment.md`](03-vps-deployment.md). Two
rules before touching config:

1. **Run the handshake harness.** It answers "is this Superset or is this the site?" in one
   command, and that halves the search space immediately.
2. **The first render proves almost nothing.** Guest tokens live 300 s. An embed that works
   for four minutes and dies has a broken refresh, and you will not see it unless you leave
   the page open past six minutes.
