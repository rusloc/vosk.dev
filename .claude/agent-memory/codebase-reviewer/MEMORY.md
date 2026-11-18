# Codebase reviewer memory: vosk.dev site

## Stack
- [Stack and conventions](stack-and-conventions.md): Next 16.2 App Router + Turbopack, Zod 4, vitest, `@/` alias, deliberate per-report folders and vendored files

## Conventions
- [Stack and conventions](stack-and-conventions.md): what is deliberate here (vendored parquet-columns, Tremor, glass fork, data-ga analytics), with the judged-acceptable dup list

## Waivers
- None yet (first run 2026-11-18). Record user rejections here with the date and reason.

## Baseline
- [Baseline 2026-11-18](baseline.md): 370 files / 68,305 lines, dup 3.5 %, 1 cycle, tsc 11.4 s, home JS 263 kB gz

## Open findings
- [Open findings](open-findings.md): S1 P0 Zod on every page via nav; D1-D4 per-report plumbing, prompts, modals, app chrome; L1 cycle; L2 chat list

## Hot spots
- [Hot spots](hot-spots.md): showcase page, per-report route/server/artifacts/loader/load scripts, chat-tools, nav/site/env

## Tools
- [Tools here](tools-here.md): scan on repo ROOT (alias trap), optima.py stores in .optima/, tsc timing, chunk sizing from .next
