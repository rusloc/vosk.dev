# ADR-0001 — Preset.io managed over self-hosted Superset

- **Status:** ⛔ **SUPERSEDED same day by [`ADR-0003`](ADR-0003-self-hosted-superset-over-preset.md)** — kept for the delta, not for guidance
- **Date:** 2026-07-31
- **Supersedes:** `docs/02-implementation-boilerplate.md` STEP 1–2 (original self-hosted version), `docs/01-solution-overview.md` §3/§5/§6 (original version)

> **Do not implement from this file.** The comparison below omitted Preset's **Embedded
> Dashboard Viewer Licenses — $500/month minimum**, which reversed the decision within
> hours. Superset is self-hosted on a VPS again. The API-contract table further down is
> still accurate about *Preset*, and is retained because `ADR-0003` cites it when
> explaining what had to change back.

## Context

The original hand-off docs specified Apache Superset self-hosted via Docker Compose on a VPS at
`bi.vosk.dev`, with a `superset_config.py` carrying the `EMBEDDED_SUPERSET` feature flag, a
`GUEST_TOKEN_JWT_SECRET`, a CORS block, a Talisman `frame-ancestors` list, plus a manually created
`embed_token_granter` role and an `embed-svc` service account.

That is a running service with an upgrade treadmill, a TLS certificate, and a security surface —
attached to a **marketing showcase** for a one-person freelance site. The recurring operational cost
is carried in perpetuity so that a prospect can click through a demo dashboard.

## Decision

Superset runs on **Preset.io managed** (Professional tier or above). No VPS, no Docker, no reverse
proxy, no TLS management, no Superset configuration file.

## Consequences

**Removed outright.** There is no config file to edit, so there is no feature flag to set, no JWT
secret to generate and keep in sync, no CORS block, and no Talisman CSP. Frame permission is the
per-dashboard **Allowed Domains** field in the Embed dialog. Three of the four classic embedding
failure modes cannot occur here.

**The API contract changed, not just the host.** This is the part that does not survive a
find-and-replace, and the reason the docs were rewritten rather than patched:

|               | Self-hosted                                                                     | Preset                                                                                                                |
| ------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Auth          | `POST {domain}/api/v1/security/login` `{username, password, provider, refresh}` | `POST https://api.app.preset.io/v1/auth/` `{name, secret}`                                                            |
| Auth response | `access_token` at the root                                                      | `payload.access_token` — nested                                                                                       |
| Mint          | `POST {domain}/api/v1/security/guest_token/`                                    | `POST https://api.app.preset.io/v1/teams/{team}/workspaces/{ws}/guest-token/`                                         |
| Mint response | `token` at the root                                                             | `data.payload.token` — nested two levels                                                                              |
| Identity      | service account, username + password                                            | API key, **name + secret**                                                                                            |
| Authorisation | custom `embed_token_granter` role                                               | Workspace Admin on the workspace                                                                                      |
| SDK           | `@superset-ui/embedded-sdk`                                                     | `@preset-sdk/embedded`                                                                                                |
| Referrer      | not required                                                                    | `referrerPolicy: "strict-origin-when-cross-origin"` **required** — Preset validates `Referer` against Allowed Domains |

The response-nesting difference is the dangerous one; see `CAND-003` in
[../anti-patterns.md](../anti-patterns.md).

**New gate.** Dashboard embedding requires the **Professional or Enterprise** plan. Below that the
**Embed dashboard** menu item is absent entirely — not disabled, absent — so no amount of
configuration reveals it. This converts a VPS bill into a subscription line item; it is not free.

**New constraint.** Preset is cloud-hosted and connects only to **publicly addressable** databases.
A local Postgres cannot back a demo dashboard. Hence Supabase Postgres for the synthetic warehouse,
with Preset's regional egress IPs allowlisted if the connection is refused.

## Recognising a regression

Any proposal touching `superset_config.py`, `frame-ancestors`, `EMBEDDED_SUPERSET`,
`GUEST_TOKEN_JWT_SECRET`, `embed_token_granter`, `bi.vosk.dev`, or `/api/v1/security/login` has
drifted back to the superseded architecture. None of those exist on Preset.

## Alternatives considered

- **Self-hosted on a VPS** — rejected: perpetual ops burden disproportionate to a showcase.
- **Screenshots + a live demo call** — still the honest fallback if the subscription stops earning
  its keep. Loses interactivity, which is the whole point of showing dashboard work.
- **"Publish to web"-style public links** — Superset has no equivalent that also gives per-dashboard
  access control or a path to per-client RLS later.
