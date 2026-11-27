---
name: perf-hotspots
description: VOSK RSC-payload and bundle findings — full-dictionary client props, not-found boundary serialization
metadata:
  type: project
---

<!-- next-id: PERF-004 -->

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

### PERF-003 · A report's vendored `parquet-columns.ts` drags hyparquet into popups that read columns over the API · 2026-11-27

**Symptom:** the Mirelo / Marketing / Trucks / Cash flow popup chunk groups each listed the shared hyparquet chunk
(58 kB raw, 18 kB gz) though the browser only calls `checkRows`.
**Cause:** `readRows` and `checkRows` share one module with a top-level `import … from "hyparquet"`; the loader's codec
(`artifactSources({ readRows, checkRows })`) keeps `readRows` reachable, so tree shaking can't drop it.
**Fix:** `const { parquetMetadata, parquetRead } = await import("hyparquet")` inside `readRows` (4 files). A new
report's vendored copy must carry the same line; the upstream js-report source still has the static import.
**Seen:** `.next/server/app/[locale]/work/[slug]/page/react-loadable-manifest.json`: 6 entries with the chunk before,
2 after (freight, which reads Parquet, and nordmark, left untouched as held work); each fixed popup −58 kB raw.
**Confidence:** high — measured before/after in a production build.
**Last-verified:** 2026-11-27
**Related:** —
**Status:** active
