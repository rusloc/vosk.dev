---
name: baseline
description: Scan numbers and scorecards per review run of vosk.dev (files, lines, dup share, cycles, largest file/function, tsc, page JS, grades) to diff the next run against
metadata:
  type: project
---

## 2026-11-26 (diff review: Cash flow demo, working tree; scan run on repo root, NOT comparable to the HEAD src+scripts baseline)
- Root scan: 452 files, 80,168 lines, dup 2.2 % (83 blocks), 0 cycles; no dup block touches cashflow. Cashflow: ~6,050 non-blank TS/TSX lines in 26 files + cashflow.css 1,974 (38 kB raw, all selectors under .acme-cf).
- tsc --noEmit --incremental false (working tree): 14.3 s total, check 12.2 s, 1,822 files, 602k inst, 900 MB, 0 errors. ESLint on cashflow files: clean.
- Build 11-26 19:24 (someone else's): showcase pages 186.3 kB gz, home 183.7, /work 183.0 (10 chunks, no Zod in any).
- Cashflow popup (loadable manifest, gz): 80.0 kB = own JS 22.6 + CSS 6.5 + shared Zod 31.4 + hyparquet 18.3 (unused in browser). Fonts on open: Space Grotesk 38.8 kB + JetBrains Mono 35.0 kB woff2, preload false.
- Cashflow data: 4 Parquet 65.7 kB, ledger 2,838 rows, 16 lines; engine per call (prod React, scratch bench): heatView year 0.41 ms, ledgerView year 1.1 ms, cellTip 0.01 ms, statementView 0.03 ms.
- Scorecard (cashflow only): Correctness B (X1, X2 P1), Speed A- (S5 ext, S6, S7 P2), Layout B (L6 P1), Blocks B (P2s), Dup A- (D10-D12 P2).

## 2026-11-25 (third run; HEAD 1fce91e, `git archive` export; held Nordmark move excluded)
- Scope src/ + scripts/ + root configs: 393 files, 70,883 non-blank lines (+18 files, +3,854 lines vs 11-19; freight report, /lp pages, fonts).
- Duplication (min 8): 77 blocks, 1,609 redundant lines = 2.3 % (flat). Cycles 0, barrels 0, deep relatives 0. Orphans unchanged (ascii-portrait parked, tokens.ts waived, proxy entry).
- Largest file `src/lib/nordmark/engine/view.ts` 1,326. Longest function marketing `createChatTools` 845 (scan credits `nonEmpty` 850).
- tsc --noEmit --incremental false (working tree): 11.9 s total, check 10.0 s, 1,767 files, 581k instantiations, 875 MB.
- Page JS (build 11-25 10:33, working tree, gzip, my script counts every script tag): non-showcase 193-196 kB; 8 prerendered `/work/[slug]` pages 265 kB (65 kB chunk = Zod all locales + JSON Schema gen + ReportDialog + ChatPanel). A 39 kB all-page chunk looks like Next's nomodule polyfills (fetch/Symbol strings): suspected, not checked.
- Popup JS (loadable manifest, gz): Cube 145, Marketing 59, Mirelo 57, Nordmark 44 (held tree), P&L 40, Trucks 35, Freight 29. hyparquet 18 kB chunk in Mirelo/Marketing/Trucks/Nordmark plus a second identical copy for freight.
- Freight data per open (Parquet metadata): shipments 4.90 MB + postings 9.81 MB of column chunks (Snappy), refetched each page load (`cache: "no-store"`).
- Scorecard: Speed C (S4 P0; S3 P1; S5 P2), Layout A (L3, L5 P2), Blocks B (B1, B2 P1; B3, B4, B5 P2), Dup A (D7-D9 P2).

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
