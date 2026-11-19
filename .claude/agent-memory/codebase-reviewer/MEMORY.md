# Codebase reviewer memory: vosk.dev site

## Stack
- [Stack and conventions](stack-and-conventions.md): Next 16.2 App Router + Turbopack, Zod 4, vitest, `@/` alias, deliberate per-report folders and vendored files

## Conventions
- [Stack and conventions](stack-and-conventions.md): deliberate choices (vendored parquet-columns, Tremor, glass fork, data-ga), shared report-data plumbing, lazy wrappers, parked files, acceptable dups

## Waivers
- 2026-11-18, owner's session: `src/lib/marketing/engine/tokens.ts` kept as the vendored pack's token table (no importer). Do not raise.
- Deferred, not waived (owner's session 11-18): L3 (docs cite the paths), B1-B3 (next time those files change). Still report them as open.

## Baseline
- [Baselines](baseline.md): 11-19 HEAD 375 files / 67,029 lines, dup 2.3 %, 0 cycles, tsc 12.6 s, home 194 kB gz, showcase 264 kB; 11-18 for comparison; scorecards

## Open findings
- [Open findings](open-findings.md): S3 P1 Zod + chat panel on showcase pages; B1, B2 P1; L3, L5, B3, B4, D7-D9 P2

## Hot spots
- [Hot spots](hot-spots.md): showcase page (grows every feature), chat-tools factories, report apps, client env imports

## Tools
- [Tools here](tools-here.md): review HEAD via git archive -o export, scan on a tsconfig root, tsc timing, chunk sizing from .next, client-import walk
