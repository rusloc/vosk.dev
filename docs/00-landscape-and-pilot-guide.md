# Superset on vosk.dev — landscape guide (for you, the human)

This file explains the terrain so you can steer an AI assistant confidently. The others are
for the assistant: [`01`](01-solution-overview.md) (spec), [`02`](02-implementation-map.md)
(what's built and why), [`03`](03-vps-deployment.md) (the runbook).

> **Rewritten 2026-07-31.** This guide has now described three architectures in one day:
> self-hosted → Preset.io managed (`ADR-0001`) → self-hosted again (`ADR-0003`, on cost).
> It has been rewritten rather than annotated, because layered "superseded" notes had become
> harder to read than the thing they annotated. **Current: self-hosted on a VPS.**

## The big picture in three sentences

Superset can't just be iframed like a YouTube video — it's an authenticated app, so
embedding works through a token handshake. Your site's server logs into your Superset
server, asks for a short-lived "guest token" scoped to one dashboard, and hands it to the
visitor's browser, where the official SDK renders the dashboard in an iframe with no login
screen. Everything else in this project is plumbing to make that handshake secure and
repeatable.

## The three moving parts

**Superset instance** — `bi.vosk.dev`, Docker Compose on a VPS. You build dashboards there
in the normal Superset UI; embedding changes nothing about how you build them. Most of the
one-time configuration lives here, and it is genuinely the fiddly part: a feature flag, two
secrets, a CSP directive, a guest role, and a service account. All of it is written down in
[`03`](03-vps-deployment.md) and pre-configured in [`deploy/superset/`](../deploy/superset/).

**Your site** (`vosk.dev`) — Next.js on Vercel. **Already done.** One API route, one React
component, one server module, one registry entry. Adding a dashboard later is one entry in
`work.ts`.

**The trust chain** — a service account (`embed-svc`) whose password lives only in Vercel's
server environment. Visitors never authenticate; your server vouches for them. Tokens
expire every 5 minutes and refresh automatically, so a leaked one is nearly worthless.

## Decisions already made

- **Guest-token embedding via the official SDK** — not public links, not screenshots. Gives
  per-dashboard access control and, later, per-client data filtering (RLS) without
  duplicating dashboards.
- **Self-hosted, not managed** (`ADR-0003`). See the cost section below — this is the one
  decision that reversed itself, and it's worth understanding why.
- **Static registry in code**, not a database — right-sized for "several dashboards".
- **Synthetic Finance/P&L data**, generated from versioned SQL in [`data/`](../data/). Real
  data behind a login stays a later phase.
- **Everyone sees the same data for now** (`rls: []`). When a prospect should see only their
  slice, that's a one-line change per token request, not a re-architecture.
- **One `/work` post per dashboard** (`ADR-0002`) — no separate `/dashboards` section.

## How to run the rest of the build

The site is finished. What's left is your side, in this order — each step has a
verification, so don't move on until it passes:

1. **Provision the VPS** (2 vCPU / 4 GB minimum) and point `bi.vosk.dev` at it → verify DNS
   resolves *before* you start the containers, or Caddy can't get a certificate.
2. **`docker compose up -d`** from [`deploy/superset/`](../deploy/superset/) → verify
   `https://bi.vosk.dev` shows a login page over a valid certificate.
3. **Load the warehouse** ([`03`](03-vps-deployment.md) §2) → verify with a row count from
   SQL Lab.
4. **Create the guest role and service account** ([`03`](03-vps-deployment.md) §3) → verify
   with `node scripts/superset-handshake.mjs <uuid>` once you have a dashboard.
5. **Build the dashboard**, publish it, enable embedding, send me the embed UUID.
6. I set the env vars, paste the UUID, deploy → verify on the **deploy**, not localhost,
   and leave it open 6+ minutes to prove the token refresh.

Useful steering phrases: "follow the spec in `01`, don't redesign"; "check the
troubleshooting table in `03` before proposing config changes"; "show me exactly which env
var or Superset setting you're changing and why".

**One phrase to retire:** anything about Preset, workspaces, teams, API keys or Allowed
Domains. If the assistant proposes `@preset-sdk/embedded`, `api.app.preset.io`, or a
per-dashboard Allowed Domains field, it has drifted to the superseded architecture — point
it at `ADR-0003`.

## What typically goes wrong (so you recognise it)

- **Blank white iframe, no error** — CSP `frame-ancestors` doesn't list your exact origin,
  protocol included. The single most common failure, and the one you'll hit first.
- **Blank iframe, but different** — you pasted the numeric dashboard id from the URL instead
  of the embed UUID from the dialog. They look equally plausible; only one works.
- **The embed loads and every chart inside it errors** — the `EmbeddedGuest` role can't read
  the datasets. Looks like a broken dashboard, is actually permissions.
- **A 400 that says the CSRF token is missing when you're clearly sending one** — the token
  is only valid with the session cookie issued alongside it. Handled in code; suspect a
  proxy stripping headers.
- **Everything works for five minutes, then dies** — token refresh is failing. The first
  render proves almost nothing; leave it open past the six-minute mark.
- **Certificate never issues** — DNS wasn't resolving when Caddy started.

The troubleshooting table in [`03`](03-vps-deployment.md) maps each symptom to its fix.
Point your assistant there before letting it "creatively" rewrite config.

## Cost/effort reality check

**One-time:** roughly a day. VPS provisioning, DNS, TLS, the Superset config and the role
setup are the bulk of it — plus building the demo dashboards themselves, which is the part
a prospect actually judges you on and therefore deserves the time.

**Recurring:** **$12–24/month** for the VPS, plus a security-patch treadmill you now own —
Superset ships CVEs, and the image tag has to be bumped deliberately.

**Why not managed:** Preset.io removes almost all of that, and `ADR-0001` chose it for
exactly that reason. Then the pricing turned out to include **Embedded Dashboard Viewer
Licenses at $500/month minimum**, on top of the plan — $6,000/year to host a demo on a
marketing site. That reversed the decision (`ADR-0003`). The managed instance is genuinely
easier; it is not 25× easier.

**Per new dashboard:** minutes, once the pipeline exists.

**The remaining honest alternative**, if the VPS turns out to be more maintenance than the
showcase is worth: screenshots plus a live demo call. Loses the interactivity, which is
most of the point — but it costs nothing and never breaks at 3am.
