---
name: baseline
description: Numbers from the full scan of src/ + scripts/ on 2026-11-18 (files, lines, dup share, cycles, largest file/function, tsc, page JS) to diff the next run against
metadata:
  type: project
---

## 2026-11-18 (first run; working tree had uncommitted Nordmark-to-Supabase + SEO-pass edits)
- Scope src/ + scripts/: 370 files, 68,305 non-blank lines (79 test files, 13,971 lines).
- Duplication (min block 8): 94 blocks, 2,399 redundant lines = 3.5 % (2,118 outside tests).
- Import cycles: 1 (`lib/mirelo/clients.ts` <-> `lib/mirelo/loans.ts`). Barrels: 0. Deep relative imports: 0.
- Largest file: `src/lib/nordmark/engine/view.ts` 1,326 lines. 72 files > 300 lines.
- Longest function: `createChatTools` in `src/lib/marketing/chat-tools.ts:119`, ~845 lines (scan names it `nonEmpty`, wrong). 94 functions > 100 lines (approx).
- tsc --noEmit --incremental false: 11.4 s total, check 9.65 s, 1,698 files, 567k instantiations, 844 MB, 0 errors.
- Page JS (build of 2026-11-18 12:47, gzip): home 263 kB across 12 chunks; `/work/executive-dashboard` 270 kB. Zod chunk 64 kB gz on every page (via nav.tsx -> site.ts -> env.ts). Lazy recharts chunk 521 kB raw / 148 kB gz (work/[slug] only).

Related: [[open-findings]], [[stack-and-conventions]]
