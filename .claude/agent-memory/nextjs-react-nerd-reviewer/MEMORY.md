# Nerd — Memory Index

## Hot findings (last 30 days)

- 2026-11-27 · PERF-003: a vendored `parquet-columns.ts` with a top-level hyparquet import puts 18 kB gz in every API-reading report popup; import it inside `readRows`. Nordmark's copy still has it (held work).
- 2026-11-16 · CAND-002: an optional build input (a JSON that may not exist yet) is a template-literal `import()`, not a literal one and not an `fs` check.
- 2026-11-16 · CAND-003: chat tools may be async and take a request context (`chatRoute({ context })`); first user is `lib/ceo-digest/`.
- 2026-10-20 · AP-001: the blurred title bar (0.6em overhang + 7.5px blur) gets clipped by any `overflow-hidden` within ~45px (carousel slide on /services) — give it room inside the clip, never drop the clip.
- 2026-10-20 · CAND-001: Tailwind v4 utilities are layered, CSS modules are not — a utility can't override `title-bar.module.css`; inline `style` or a module modifier.
- 2026-09-21 · PG-004: `cache: "no-store"` on a fetch flips an ISR page (`revalidate = N`) to fully dynamic `ƒ`. Omit the `cache` option instead. Reproduced on 16.2.10.
- 2026-09-21 · SEC-001: `lib/env.ts` is client-bundled — a server secret declared there leaks its NAME (not value). Convention is secrets live in their `server-only` module; `CUBE_*` deviates by instruction.

## Older, still active (see topic files)

- PG-001 · PG-002 · PG-003 — `[locale]` not-found boundary: unreachable, SSG-tainting, `globalNotFound` flag.
- PERF-001 · PERF-002 — RSC payload bloat: whole `Dictionary` prop to `nav.tsx`; segment `not-found.tsx` serialized everywhere.

## Topic files

- [Anti-patterns](anti-patterns.md) — 1 entry · stalest 2026-10-20 · AP-NNN
- [Platform gotchas](platform-gotchas.md) — 4 entries · stalest 2026-08-01 · PG-NNN
- [Perf hotspots](perf-hotspots.md) — 3 entries · stalest 2026-08-01 · PERF-NNN
- [Security findings](security-findings.md) — 1 entry · stalest 2026-09-21 · SEC-NNN
- [Candidates](candidates.md) — 3 awaiting second hit · CAND-NNN

## Open questions

- 2026-08-01: `experimental.globalNotFound` is still experimental (since v15.4.0). Re-check on each Next minor whether the flag or its behavior changes.
- 2026-09-21: `src/lib/cube.ts` parser + casts are written from Cube docs, never run against the live `/cubesql` endpoint. First live call decides: exact `column_type` strings, timestamp format, whether a sleeping deployment answers 5xx or a 200 `{"error":"Continue wait"}` (the latter is NOT retried today).
- 2026-09-21: Should `CUBE_API_URL` / `CUBE_API_SECRET` move out of `env.ts` into `lib/cube.ts` per SEC-001? Deferred to owner.
- 2026-10-20: The site is English-only (`locales = ["en"]`, `/ru/*` 308s to `/`) — any "check ru" ask is moot until the locale returns.
