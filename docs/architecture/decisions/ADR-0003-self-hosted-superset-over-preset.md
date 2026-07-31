# ADR-0003 — Self-hosted Superset on a VPS, reversing ADR-0001

- **Status:** accepted
- **Date:** 2026-07-31
- **Reverses:** [`ADR-0001`](ADR-0001-preset-managed-over-self-hosted.md) (now superseded)
- **Unchanged:** [`ADR-0002`](ADR-0002-work-showcase-post-per-dashboard.md) — still one `/work` post per dashboard

## Context

`ADR-0001`, taken earlier the same day, moved Superset from a self-hosted VPS to Preset.io
managed. Its reasoning was sound: a managed instance deletes the ops treadmill, the TLS
management, and three of the four classic embedding failure modes, in exchange for "a
Preset subscription instead of a VPS bill."

**That exchange was never priced.** The decision recorded the plan gate — Professional or
Enterprise — and stopped there. Investigating the vendor properly turned up a second,
much larger line item that neither the original hand-off docs nor `ADR-0001` mention:

> Embedded dashboards additionally require **Embedded Dashboard Viewer Licenses, starting
> at $500/month for 50 licenses** — separate from, and on top of, the Professional plan.
> — [preset.io/pricing](https://preset.io/pricing/), corroborated
> [here](https://embeddable.com/blog/preset-embedded-dashboards-alternatives)

$6,000/year to host a demo dashboard on a freelance marketing site whose purpose is to win
engagements. Meanwhile [Apache Superset's embedding](https://superset.apache.org/user-docs/using-superset/embedding/)
— the `EMBEDDED_SUPERSET` flag, `/api/v1/security/guest_token/`, and
[`@superset-ui/embedded-sdk`](https://github.com/apache/superset/tree/master/superset-embedded-sdk)
— is Apache-2.0 and free, on a VPS costing $12–24/month.

The managed instance is genuinely easier. It is not 25× easier.

## Decision

Superset runs **self-hosted on a VPS** at `bi.vosk.dev`, via Docker Compose. Deployment
artefacts live in [`deploy/superset/`](../../../deploy/superset/); the runbook is
[`docs/03-vps-deployment.md`](../../03-vps-deployment.md).

## Consequences

**The site-side code barely moved.** This is the part worth recording, because it is why
the reversal cost hours rather than days. The integration was built against a boundary, not
a vendor: the `Showcase` union, the guest-token route, the embed component, the middleware
fix, the registry filter, the i18n strings and the entire demo warehouse are all
vendor-neutral and were untouched. What changed:

| | Preset | Self-hosted |
|---|---|---|
| Server module | `lib/preset.ts` | `lib/superset.ts` — rewritten |
| Auth | `POST api.app.preset.io/v1/auth/` `{name, secret}` → `payload.access_token` | `POST {domain}/api/v1/security/login` `{username, password, provider, refresh}` → `access_token` (root) |
| Mint | `/v1/teams/{team}/workspaces/{ws}/guest-token/` → `data.payload.token` | `/api/v1/security/guest_token/` → `token` (root) |
| CSRF | none | **required** — `GET /api/v1/security/csrf_token/` plus its session cookie |
| SDK | `@preset-sdk/embedded` | `@superset-ui/embedded-sdk` (same API — the former is a fork) |
| Frame permission | per-dashboard Allowed Domains + `referrerPolicy` | instance-wide CSP `frame-ancestors` |
| Route | `/api/preset/guest-token` | `/api/superset/guest-token` |
| Env | 4 × `PRESET_*` + workspace domain | `SUPERSET_DOMAIN`, `SUPERSET_SVC_*`, `NEXT_PUBLIC_SUPERSET_DOMAIN` |

**CSRF is the new failure mode, and it is the awkward one.** Self-hosted Superset guards
its API with CSRF on top of the bearer token, and the CSRF token is only valid alongside
the session cookie issued with it. Node's `fetch` keeps no cookie jar, so `lib/superset.ts`
carries the cookie by hand. Sending the token without the cookie fails exactly like sending
neither — a 400 that reads as a malformed request.

**Three failure modes come back** that `ADR-0001` correctly celebrated deleting: CSP
`frame-ancestors`, the `EMBEDDED_SUPERSET` feature flag, and `GUEST_TOKEN_JWT_SECRET`
consistency. Plus the role setup — `EmbeddedGuest` and `embed_token_granter` — which has no
managed equivalent. All are documented in the runbook's troubleshooting table.

**Supabase is out of the stack.** It existed only because Preset is cloud-hosted and
reaches only publicly addressable databases. A self-hosted Superset talks to a warehouse on
the same compose network, so the demo warehouse is now an `analytics` database beside
Superset's own metadata Postgres. The `data/` SQL itself is unchanged — it was always plain
Postgres.

**The ops burden is real and it is now ours.** Superset ships CVEs; the image tag must be
bumped deliberately, the metadata database backed up, and upgrades run by hand. This is the
cost `ADR-0001` was right to want to avoid — it is simply cheaper than $500/month.

**HTTPS is non-negotiable, not merely advisable.** Cookies inside a cross-site iframe need
`SameSite=None`, which browsers drop without `Secure`. A plain-HTTP instance cannot be
framed at all. Hence Caddy in the compose file, for automatic certificates.

## What to watch for

The lesson generalises past this decision: **`ADR-0001` compared the two options on
operational burden, which was the visible axis, and never checked the cost axis at all.**
The vendor's own pricing page names the licence requirement plainly. A build-vs-buy ADR
that does not state a number for the "buy" side has not finished comparing.

Recorded as `CAND-004` in [`../anti-patterns.md`](../anti-patterns.md).

## Alternatives reconsidered

- **Preset.io managed** — rejected on cost, not capability. The 14-day Professional trial
  does allow embedding without viewer licences, so it remains a viable way to *evaluate*
  Superset embedding; it is not a viable way to run this showcase.
- **Screenshots plus a live demo call** — still the fallback if the VPS proves more
  maintenance than the showcase is worth. Loses the interactivity that is the point of
  showing dashboard work.
