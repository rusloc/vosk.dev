---
name: platform-gotchas
description: Next.js 16 App Router / Vercel quirks hit in VOSK — not-found boundaries, dynamicParams, SSG tainting, proxy.ts
metadata:
  type: project
---

<!-- next-id: PG-004 -->

# Platform Gotchas (PG-NNN)

### PG-001 · Segment `not-found.tsx` is unreachable when `dynamicParams = false` · 2026-08-01

**Symptom:** `src/app/[locale]/not-found.tsx` never renders in production. Every 404 —
unmatched URL (`/ru/nope`) *and* `notFound()` from `blog/[slug]`, `work/[slug]`,
`blog/tag/[tag]` — serves Next's built-in `global-not-found` ("This page could not be
found.", bare `<html>` with no `lang`).
**Cause:** `[locale]/layout.tsx` exports `dynamicParams = false` + `generateStaticParams`.
Any param outside the prerendered set 404s at the *routing* layer, before the segment tree
is entered — so the segment's not-found boundary is never mounted. The in-page
`if (!post) notFound()` guards are likewise unreachable (generateStaticParams covers every
valid slug).
**Fix:** Localize via `app/global-not-found.tsx` (see PG-003), not the segment boundary.
**Seen:** verified empirically on Next 16.2.10 via `next build` + `next start` probes of
`/ru/nonexistent-page`, `/ru/blog/no-such-slug`, `/ru/work/bad`, `/blog/no-such-slug` — all
returned the built-in fallback, never the repo's custom boundary.
**Confidence:** high — reproduced.
**Last-verified:** 2026-08-01
**Related:** PG-002, PG-003, PERF-001
**Status:** active

---

### PG-002 · `headers()` in a segment `not-found.tsx` de-opts the ENTIRE segment from SSG · 2026-08-01

**Symptom:** Making `[locale]/not-found.tsx` an async RSC that reads a request header
flipped every route in the build output from `●` (SSG) to `ƒ` (dynamic) — `/[locale]`,
`/[locale]/blog`, `/[locale]/blog/[slug]`, `/[locale]/contact`, `/[locale]/services`,
`/[locale]/work`, `/[locale]/work/[slug]`.
**Cause:** A segment-level `not-found.tsx` is part of that segment's loader tree. Next's
dynamic-IO tracking is per-route-tree: a dynamic API anywhere in the tree taints the whole
prerender, not just the boundary.
**Fix:** Move the dynamic read to `app/global-not-found.tsx`, which is compiled into the
separate `/_not-found` entry (`next-app-loader` filters the root `layout` out and swaps in
`global-not-found`). Reading `headers()` there makes only `/_not-found` dynamic; all
`[locale]` routes stay `●`. Verified.
**Seen:** `next-app-loader/index.js:376-388` (`isNotFoundRoute && isGlobalNotFoundEnabled`
→ `definedFilePaths.filter(([type]) => type !== 'layout')`).
**Confidence:** high — reproduced both directions.
**Last-verified:** 2026-08-01
**Related:** PG-001, PG-003
**Status:** active

---

### PG-003 · `global-not-found.tsx` exists in 16.2.10 but is experimental + flag-gated · 2026-08-01

**Symptom:** `app/global-not-found.tsx` is silently ignored unless the flag is set.
**Cause:** `next-app-loader/index.js:507-510` literally `delete FILE_TYPES['global-not-found']`
when `isGlobalNotFoundEnabled` is false. Schema: `experimental.globalNotFound: z.boolean().optional()`
(`server/config-schema.js:399`). Landed v15.4.0, still experimental in 16.2.x.
**Fix:** `experimental: { globalNotFound: true }` in `next.config.ts`. Build logs `✓ globalNotFound`.
Constraints: receives **no props** (no `params`) — docs state "`not-found.js` or
`global-not-found.js` components do not accept any props"; must return a full document
(`<html>`/`<body>`); bypasses the layout so it must import its own `globals.css` + fonts;
**does** support `metadata`/`generateMetadata` (unlike `not-found.js`). Next auto-injects
`<meta name="robots" content="noindex">` and returns a real 404.
**Seen:** Next docs list this exact scenario as the intended use case — "Your root layout is
defined using top-level dynamic segments (e.g. `app/[country]/layout.tsx`), which makes
composing a consistent 404 page harder." Upstream discussion vercel/next.js#43179 (params in
not-found) is still OPEN with no maintainer commitment as of 2026-07.
**Confidence:** high — reproduced.
**Last-verified:** 2026-08-01
**Related:** PG-001, PG-002
**Status:** active
