# Superset embedded dashboards on vosk.dev — solution spec

> Audience: AI coding assistant. Architecture, contracts and invariants.
> **Read `docs/architecture/decisions/` first** — an ADR always wins over this file.
>
> **History (read this before trusting any older copy).** This document has been rewritten
> twice in one day. It originally specified self-hosted Superset; `ADR-0001` moved it to
> Preset.io managed; `ADR-0003` moved it back to self-hosted after Preset's embedded-viewer
> licensing ($500/month minimum) came to light. **Current architecture: self-hosted on a
> VPS.** Preset-specific material has been removed rather than marked superseded — it had
> flipped twice and the annotations were becoming harder to read than the spec.

## 1. Goal

Embed Apache Superset dashboards into `vosk.dev` for prospective clients, with no Superset
login, each dashboard presented as its own case-study post under `/work` (`ADR-0002`).

## 2. Architecture

```
[Visitor browser]
   │  loads vosk.dev/work/{slug}
   │  SDK mounts <iframe src=bi.vosk.dev/embedded/{embedId}>
   ▼
[Next.js on Vercel — vosk.dev]
   │  POST /api/superset/guest-token  { slug }
   ▼
[Superset on a VPS — bi.vosk.dev]        (Docker Compose behind Caddy)
   POST /api/v1/security/login           (service account, server-side only)
   GET  /api/v1/security/csrf_token/     (+ its session cookie)
   POST /api/v1/security/guest_token/    (scoped to one dashboard embedId)
   │
   └─ warehouse: `analytics` Postgres on the same compose network
```

Visitors never authenticate; the server vouches for them using a service account whose
credentials live only in Vercel's server environment. Guest tokens expire after 300 s and
the SDK refreshes them automatically, so a leaked token is worth little.

## 3. Fixed decisions (do not change without an ADR)

| Item | Value |
|---|---|
| Host app | Next.js 16 App Router, TypeScript, pnpm, on Vercel |
| Site origin (prod / dev) | `https://vosk.dev` / `http://localhost:3000` |
| Superset deployment | **Self-hosted, Docker Compose on a VPS** (`ADR-0003`) |
| Superset origin | `https://bi.vosk.dev` — read from env, never hard-coded |
| Embedding mechanism | `@superset-ui/embedded-sdk` + guest tokens |
| Token minting | Server-side only, Next.js Route Handler |
| Dashboard registry | `src/lib/work.ts` — the existing `Showcase` list (`ADR-0002`) |
| Guest token lifetime | 300 s; SDK auto-refresh via `fetchGuestToken` |
| Site surface | `https://vosk.dev/work/{slug}` — no `/dashboards` section |
| Demo data | synthetic Finance/P&L in the `analytics` database beside Superset |
| Row-level security | `rls: []` — everyone sees the same synthetic data for now |

Both origins are HTTPS in production, and this is a hard requirement rather than good
practice: cookies inside a cross-site iframe need `SameSite=None`, which browsers drop
without `Secure`. A plain-HTTP instance cannot be framed at all.

## 4. Components

| # | Component | Where | Status |
|---|---|---|---|
| 1 | VPS: Docker Compose, Caddy TLS, Superset config | `deploy/superset/` | ✅ authored, **not deployed** |
| 2 | Demo warehouse: star schema + deterministic seed | `data/` | ✅ authored, **not executed** |
| 3 | Guest role + service account | Superset UI | user-gated (`docs/03` §3) |
| 4 | Registry — `superset` variant on `Showcase` | `src/lib/work.ts` | ✅ shipped |
| 5 | API route — mints a guest token for one slug | `src/app/api/superset/guest-token/route.ts` | ✅ shipped |
| 6 | Server module — login + CSRF + mint, cached session | `src/lib/superset.ts` | ✅ shipped |
| 7 | Embed component — Client Component mounting the SDK | `src/components/superset-embed.tsx` | ✅ shipped |
| 8 | Branch in the showcase detail page | `src/app/[locale]/work/[slug]/page.tsx` | ✅ shipped |
| 9 | Handshake harness — proves credentials outside the app | `scripts/superset-handshake.mjs` | ✅ shipped |

## 5. Environment variables

Server-only (Vercel project settings — never `NEXT_PUBLIC_`, and **never** added to
`src/lib/env.ts`, which is import-reachable from client components):

```
SUPERSET_DOMAIN=https://bi.vosk.dev
SUPERSET_SVC_USERNAME=<service account username>
SUPERSET_SVC_PASSWORD=<service account password>
```

Client-visible (it is the iframe host, so the browser must have it):

```
NEXT_PUBLIC_SUPERSET_DOMAIN=https://bi.vosk.dev
```

All four are **optional** in validation. Required vars break the build before the instance
exists; instead, Superset showcases are filtered out of `/work` entirely until
`NEXT_PUBLIC_SUPERSET_DOMAIN` is set *and* the registry entry carries a real embed UUID.

VPS-side secrets (`SUPERSET_SECRET_KEY`, `SUPERSET_GUEST_TOKEN_JWT_SECRET`,
`POSTGRES_PASSWORD`, `SUPERSET_FRAME_ANCESTORS`) live in `deploy/superset/.env` on the
server — see `deploy/superset/.env.example`. They never reach Vercel.

## 6. External contracts

### Login

```
POST {SUPERSET_DOMAIN}/api/v1/security/login
{ "username": …, "password": …, "provider": "db", "refresh": true }
→ { "access_token": "…", "refresh_token": "…" }        (root, not nested)
```

### CSRF

```
GET {SUPERSET_DOMAIN}/api/v1/security/csrf_token/
Authorization: Bearer <access_token>
→ { "result": "<csrf>" }  +  Set-Cookie: session=…
```

> The CSRF token is valid **only alongside the session cookie issued with it**. Node's
> `fetch` keeps no cookie jar, so `lib/superset.ts` carries the cookie by hand. Sending the
> token without the cookie fails exactly like sending neither: a 400 that reads as a
> malformed request rather than a missing cookie.

### Guest token

```
POST {SUPERSET_DOMAIN}/api/v1/security/guest_token/
Authorization: Bearer <access_token>
X-CSRFToken: <csrf>
Cookie: session=…

{ "user": {...}, "resources": [{"type":"dashboard","id":"<embedId UUID>"}], "rls": [] }
→ { "token": "…" }                                      (root, not nested)
```

### Internal API

```
POST /api/superset/guest-token   { "slug": string }
```

| Response | When |
|---|---|
| `200 { "token": string }` | success |
| `400` | malformed body (fails Zod `.strict()`) |
| `403` | request origin not allowed |
| `404` | unknown slug, or a slug whose showcase is not a Superset dashboard |
| `429` | rate limit exceeded (20 / 10 min per IP) |
| `502` | Superset login, CSRF or mint failed |

> The origin check is a browser-only guard: a request with **no** `Origin` header is allowed
> through, because same-origin `fetch` may omit it. Non-browser callers (curl, scripts)
> therefore bypass it. Acceptable here — the token is scoped to a single dashboard of
> synthetic data, the route is rate-limited, and CSP `frame-ancestors` independently
> controls who may frame the dashboard. Read the DoD line below as "rejects a foreign
> *browser* origin", not as general access control.

## 7. Constraints & invariants

- Never call Superset auth endpoints from browser code.
- Never expose `SUPERSET_SVC_*` to the client bundle. They must not enter `src/lib/env.ts`;
  read them inside a `server-only` module.
- Each guest token is scoped to exactly one dashboard embed UUID.
- `embedId` is the **embed UUID** from the Embed dialog — not the numeric dashboard id in
  the URL. The numeric id fails silently.
- CSP `frame-ancestors` (`SUPERSET_FRAME_ANCESTORS` on the VPS) must list exact origins
  including protocol. No wildcards. This is instance-wide, not per dashboard.
- `GUEST_TOKEN_JWT_SECRET` must be identical across every process serving the API, or
  tokens mint fine and are rejected at the iframe, intermittently.
- `SESSION_TTL_MS` in `lib/superset.ts` must stay below `JWT_ACCESS_TOKEN_EXPIRES` in
  `superset_config.py`. Lower one, lower the other.
- iframe sizing is controlled by the mount container, not the iframe.
- The public showcase runs synthetic data only. Real client data requires an explicit
  decision plus RLS scoping in the token request — and RLS clauses accept Jinja, so
  untrusted input must never reach them.

## 8. Definition of done

- [x] Site code compiles, lints and builds with the instance absent
- [x] Route guards verified: 400 / 403 / 404 / 429 without any Superset reachable
- [x] No service-account credential in the client bundle (grep the built output)
- [ ] VPS deployed; `https://bi.vosk.dev` serves over a valid certificate
- [ ] `data/` applied; `select count(*) from demo.fact_gl;` returns rows from SQL Lab
- [ ] `scripts/superset-handshake.mjs <uuid>` returns a real guest token
- [ ] `vosk.dev/work` lists the Superset showcase alongside the Power BI ones
- [ ] `vosk.dev/work/{slug}` renders the live dashboard, no Superset login shown
- [ ] Dashboard survives >5 min of viewing (token refresh works) — on a real deploy
- [ ] Framing from a domain outside `frame-ancestors` is refused by the browser
