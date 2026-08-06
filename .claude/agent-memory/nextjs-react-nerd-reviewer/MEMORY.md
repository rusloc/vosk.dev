# Nerd — Memory Index

## Hot findings (last 30 days)

- 2026-08-01 · PG-002: `headers()` in a segment `not-found.tsx` de-opts the WHOLE `[locale]` segment from SSG (`●`→`ƒ`). Use `global-not-found.tsx` instead.
- 2026-08-01 · PG-001: `[locale]/not-found.tsx` is unreachable in prod — `dynamicParams = false` 404s at the routing layer, before the segment boundary mounts.
- 2026-08-01 · PG-003: `experimental.globalNotFound` is real in 16.2.10 (flag-gated, no props, must render its own `<html>`/`<body>` + styles/fonts).
- 2026-08-01 · PERF-001: full `Dictionary` passed as a prop to `"use client"` `nav.tsx` → entire catalog in every route's RSC payload.

## Topic files

- [Platform gotchas](platform-gotchas.md) — 3 entries · stalest 2026-08-01 · PG-NNN
- [Perf hotspots](perf-hotspots.md) — 2 entries · stalest 2026-08-01 · PERF-NNN

## Open questions

- 2026-08-01: `experimental.globalNotFound` is still experimental (since v15.4.0). Re-check on each Next minor whether the flag or its behavior changes.
