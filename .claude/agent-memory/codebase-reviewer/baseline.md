---
name: baseline
description: Scan numbers and scorecards per review run of vosk.dev (files, lines, dup share, cycles, largest file/function, tsc, page JS, grades) to diff the next run against
metadata:
  type: project
---

## 2026-11-19 (second run; HEAD 3bde271, scanned from a `git archive` export, held working-tree changes excluded)
- Scope src/ + scripts/ + root configs: 375 files, 67,029 non-blank lines (69 test files).
- Duplication (min block 8): 73 blocks, 1,543 redundant lines = 2.3 % (1,330 outside tests; ~860 of those are the judged-acceptable vendored/fork copies).
- Import cycles: 0. Barrels: 0. Deep relative imports: 0. Orphans: ascii-portrait (parked on purpose), marketing tokens.ts (waived), proxy.ts (entry).
- Largest file: `src/lib/nordmark/engine/view.ts` 1,326. 71 files > 300 lines. 93 functions > 100 lines.
- Longest function: marketing `createChatTools` 845 lines (`chat-tools.ts:130`; scan credits `nonEmpty` again).
- tsc --noEmit --incremental false (working tree incl. held Nordmark changes): 12.6 s total, check 10.1 s, 1,712 files, 563k instantiations, 873 MB, 0 errors.
- Page JS (build 2026-11-18 17:00 = the cleanup, gzip): home / work / services / blog / contact / about 193-195 kB, no Zod. Every `/work/[slug]` page 264 kB: chunk with Zod + chat panel (66 kB gz) via `superset-embed.tsx` -> `lib/env.ts` and static `ChatPanel`.
- Scorecard: Speed B (S3 P1), Layout A (L3, L5 P2), Blocks B (B1, B2 P1; B3, B4 P2), Dup A (D7-D9 P2).

## 2026-11-18 (first run; working tree had uncommitted Nordmark-to-Supabase + SEO-pass edits)
- Scope src/ + scripts/: 370 files, 68,305 non-blank lines (79 test files, 13,971 lines).
- Duplication: 94 blocks, 2,399 redundant lines = 3.5 % (2,118 outside tests).
- Import cycles: 1 (mirelo clients <-> loans). Largest file view.ts 1,326. 72 files > 300 lines. ~94 functions > 100 lines.
- tsc: 11.4 s total, check 9.65 s, 1,698 files, 567k instantiations, 844 MB.
- Page JS: home 263 kB gz (12 chunks), `/work/executive-dashboard` 270 kB. Zod 64 kB gz on every page via nav.
- Scorecard (not stored at the time; rebuilt 11-19 from the findings): Speed C (S1 P0), Layout B (L1, L2 P1), Blocks B (B1, B2 P1), Dup C (D1-D4 P1).

Related: [[open-findings]], [[stack-and-conventions]]
