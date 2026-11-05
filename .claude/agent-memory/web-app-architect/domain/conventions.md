<!-- next-id: CNV-002 -->

# Conventions

Inductive class: observed ≥2 times in this repo. Two-hit promotion bar; recency decay applies.

### CNV-001 · Public report routes: best-effort per-instance rate limiter, CDN does the real work · 2026-11-05

**Pattern:** every anonymous Route Handler keeps a `Map<ip, timestamps[]>` limiter in module scope (per Vercel instance, resets on cold start), returns 429 above N per 10 min, and relies on `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800` so the database sees a handful of reads per artifact. Errors log a message that may name a host or table but never a credential; the body stays generic.
**Where seen:** `src/app/api/mirelo/[...path]/route.ts` (600/10 min), `src/app/api/marketing/[...path]/route.ts` (200/10 min), both at `03f1e79`; the superset guest-token route carries the same shape (noted in the routes' own comments as "the other routes").
**Why it works:** the data is a frozen synthetic snapshot and the readers are hardened `<report>_reader` roles with `statement_timeout = 15s` and a connection limit, so the limiter only has to blunt casual abuse. **Limit of the pattern:** it is not a spend control. A route that calls a paid API (the planned chat relay) needs a provider-side hard cap and a kill switch on top; a shared counter (Upstash / a writer role) would be a new vendor or a new credential class under the 11-02 rule.
**Hits:** 2
**Tags:** route-handler, rate-limit, cdn-cache, anonymous, supabase-reader
**Confidence:** medium
**Last-verified:** 2026-11-05
**Related:** —
**Status:** active
