# Nerd — Memory Index

## Hot findings (last 30 days)

- 2026-09-21 · PG-004: `cache: "no-store"` on a fetch flips an ISR page (`revalidate = N`) to fully dynamic `ƒ`. Omit the `cache` option instead. Reproduced on 16.2.10.
- 2026-09-21 · SEC-001: `lib/env.ts` is client-bundled — a server secret declared there leaks its NAME (not value). Convention is secrets live in their `server-only` module; `CUBE_*` deviates by instruction.

## Older, still active (see topic files)

- PG-001 · PG-002 · PG-003 — `[locale]` not-found boundary: unreachable, SSG-tainting, `globalNotFound` flag.
- PERF-001 · PERF-002 — RSC payload bloat: whole `Dictionary` prop to `nav.tsx`; segment `not-found.tsx` serialized everywhere.

## Topic files

- [Platform gotchas](platform-gotchas.md) — 4 entries · stalest 2026-08-01 · PG-NNN
- [Perf hotspots](perf-hotspots.md) — 2 entries · stalest 2026-08-01 · PERF-NNN
- [Security findings](security-findings.md) — 1 entry · stalest 2026-09-21 · SEC-NNN

## Open questions

- 2026-08-01: `experimental.globalNotFound` is still experimental (since v15.4.0). Re-check on each Next minor whether the flag or its behavior changes.
- 2026-09-21: `src/lib/cube.ts` parser + casts are written from Cube docs, never run against the live `/cubesql` endpoint. First live call decides: exact `column_type` strings, timestamp format, whether a sleeping deployment answers 5xx or a 200 `{"error":"Continue wait"}` (the latter is NOT retried today).
- 2026-09-21: Should `CUBE_API_URL` / `CUBE_API_SECRET` move out of `env.ts` into `lib/cube.ts` per SEC-001? Deferred to owner.
