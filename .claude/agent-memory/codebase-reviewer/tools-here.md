---
name: tools-here
description: Where optima.py and scan.mjs live in this repo and the exact commands that work on this Windows machine (Git Bash), plus traps hit on review runs
metadata:
  type: reference
---

- Optima: `python .claude/skills/optima/scripts/optima.py <cmd>` from `c:/__VOSK__`; stores in `c:/__VOSK__/.optima/` (areas: arch, code, data, sql, api, ai, config, runtime, deps, test, perf, security, ui, delivery, ops, tooling, docs).
- Review HEAD only (tree holds uncommitted work): `git archive -o <scratch>/head.tar HEAD src scripts tsconfig.json package.json next.config.ts eslint.config.mjs`, then `tar -xf` into `<scratch>/head` and scan there. Piping `git archive | tar` fails in Git Bash.
- Scan: `node .claude/skills/js-ts-webapp-review/scripts/scan.mjs <dir-with-tsconfig> --json --min-dup 8 --top 400 > <scratch>/scan.json`. Never on `src/` alone (the `@/` alias goes unresolved). JSON: `duplication.{blocks,duplicatedLines,share,top[].copies}`.
- Type-check timing: `./node_modules/.bin/tsc --noEmit --extendedDiagnostics --incremental false` (~12-13 s; run in background).
- Bundle: no analyzer. Per-page chunk list from `.next/server/app/en/**/*.html`, gzip each `.next/static/chunks/*.js` (a .cjs script in the scratchpad; write it with the Write tool, since regex backslashes get mangled in heredocs and `node -e`). Production chunks carry no module paths: find a module by grepping a unique string from it. Check `.next/BUILD_ID` mtime; another agent's build can wipe `.next` mid-run, so measure first.
- Client-import check: walk static imports from every `'use client'` file and flag zod / env / server-only / postgres / node: (server actions ship only a reference, so ignore paths through `actions.ts`).
- Never run pnpm build/install; never touch `.env*`.

Related: [[baseline]]
