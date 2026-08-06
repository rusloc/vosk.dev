---
name: perf-hotspots
description: VOSK RSC-payload and bundle findings — full-dictionary client props, not-found boundary serialization
metadata:
  type: project
---

<!-- next-id: PERF-002 -->

# Perf Hotspots (PERF-NNN)

### PERF-001 · Whole `Dictionary` passed as a prop to a `"use client"` component · 2026-08-01

**Symptom:** Strings that appear nowhere on the page are present in every page's HTML.
Grepping `/ru`'s served HTML finds `Страница не найдена` (404 copy), `Заглушка условий`
(services modal placeholder), and form error strings like `Слишком много сообщений` — on
the homepage.
**Cause:** `src/components/nav.tsx` is `"use client"` and `[locale]/layout.tsx` passes
`dict={dict}` — the entire catalog. Props crossing the server→client boundary are serialized
into the RSC flight payload, so the full dictionary (`notFound`, `form`, `services.conditions`,
`work`, `blog`, …) ships on every route, even though `SiteNav` reads only `dict.nav` /
`dict.langSwitcher` / `dict.sendDialog`.
**Fix:** Pass only the slices the client component uses, e.g.
`<SiteNav locale={locale} nav={dict.nav} langSwitcher={dict.langSwitcher} sendDialog={dict.sendDialog} />`,
and narrow the prop type accordingly. `SiteFooter` is a Server Component so it is unaffected.
**Seen:** measured on served HTML of `/ru` (Next 16.2.10 production build).
**Confidence:** high — reproduced.
**Last-verified:** 2026-08-01
**Related:** PERF-002, PG-001
**Status:** active

---

### PERF-002 · Segment `not-found.tsx` is serialized into every route's payload · 2026-08-01

**Symptom:** English 404 copy ("Page not found", "Back home") appeared in the HTML of the
Russian homepage.
**Cause:** A segment-level `not-found.tsx` is part of the segment's loader tree, so its
rendered output ships in the flight payload of every route under that segment — even though
(per PG-001) it can never actually render.
**Fix:** Deleting `src/app/[locale]/not-found.tsx` removed both strings and shrank `/ru`'s
HTML from 32,327 → 31,986 bytes (~341 B on every page, pre-compression).
**Seen:** measured before/after in an isolated build of this repo.
**Confidence:** high — reproduced.
**Last-verified:** 2026-08-01
**Related:** PERF-001, PG-001, PG-002
**Status:** active
