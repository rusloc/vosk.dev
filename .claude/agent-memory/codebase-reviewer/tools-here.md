---
name: tools-here
description: Where optima.py and scan.mjs live in this repo and the exact commands that work on this Windows machine (Git Bash), plus traps hit on the first run
metadata:
  type: reference
---

- Optima: `python .claude/skills/optima/scripts/optima.py <cmd>` from `c:/__VOSK__`; stores in `c:/__VOSK__/.optima/` (moved from `.aid/` on 2026-11-18 when the skill was made stack-neutral; areas: arch, code, data, sql, api, ai, config, runtime, deps, test, perf, security, ui, delivery, ops, tooling, docs).
- Scan: `node .claude/skills/js-ts-webapp-review/scripts/scan.mjs . --json --min-dup 8 --top 400 > <scratch>/scan.json`. Run on the REPO ROOT, not `src/`: it reads tsconfig paths only from the target dir, and on `src/` the `@/` alias is unresolved (57 false orphans). Then filter JSON to `src/|scripts/` paths (root scan also picks up .claude/ and docs/).
- Type-check timing: `./node_modules/.bin/tsc --noEmit --extendedDiagnostics --incremental false` (~12 s).
- Bundle: no analyzer; use `.next/static/chunks/*.js` with `gzip -c | wc -c`, and per-page chunk lists from `.next/server/app/en/**/*.html` (grep `static/chunks/...js`). Lazy chunks are in `.next/server/app/[locale]/work/[slug]/page/react-loadable-manifest.json`. Check `.next/BUILD_ID` mtime against the source edit times.
- `node -e` with backslash regex in Git Bash breaks quoting: write a .cjs file to the scratchpad instead.
- Never run pnpm build/install; never touch `.env*`.

Related: [[baseline]]
