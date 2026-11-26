# Codebase reviewer memory: vosk.dev site

## Stack
- [Stack and conventions](stack-and-conventions.md): Next 16.2 App Router + Turbopack, Zod 4, vitest, `@/` alias, deliberate per-report folders and vendored files

## Conventions
- [Stack and conventions](stack-and-conventions.md): deliberate choices (vendored parquet-columns, Tremor, glass fork, data-ga), shared report-data plumbing, lazy wrappers, parked files, acceptable dups

## Waivers
- 2026-11-18, owner's session: `src/lib/marketing/engine/tokens.ts` kept as the vendored pack's token table (no importer). Do not raise.
- Deferred, not waived (owner's session 11-18): L3 (docs cite the paths), B1-B3 (next time those files change). Still report them as open.

## Baseline
- [Baselines](baseline.md): 11-25 HEAD 393 files / 70,883 lines, dup 2.3 %, tsc 11.9 s; 11-26 build: showcase 186 kB (S3 fixed in tree), cashflow popup 80 kB gz

## Open findings
- [Open findings](open-findings.md): S4 P0 freight; B1, B2 P1; cashflow 11-26: X1, X2, L6 P1 + P2s; S3 fixed in working tree (uncommitted)

## Hot spots
- [Hot spots](hot-spots.md): showcase page (grows every feature), chat-tools factories, report apps, client env imports, freight app + data

## Tools
- [Tools here](tools-here.md): HEAD export (tar relative paths), scan on a tsconfig root, tsc timing, chunk + popup sizing from .next manifests, Parquet bytes
