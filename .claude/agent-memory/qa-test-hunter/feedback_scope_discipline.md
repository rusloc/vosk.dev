---
name: scope-discipline
description: On test tasks — report bugs instead of fixing them, never run repo-wide prettier, and expect the user to be editing other files concurrently
metadata:
  type: feedback
---

Three standing rules for QA work in VOSK.DEV:

**1. On a tests-only task, do not fix application bugs you find. Write the test against CURRENT behavior and report the bug separately at the end.**
**Why:** the user wants to decide the fix themselves and keep the diff reviewable — a test PR that also changes `actions.ts` hides the behavioral change inside test noise.
**How to apply:** if a test would fail because the code is wrong, pin the current behavior (or `it.skip` with a comment) and put the finding in the final report, not in the code.

**2. Never run `pnpm format`.** It is repo-wide (`prettier --write .`) and rewrites unrelated files — a known trap here.
**Why:** the user works with a dirty tree and a repo-wide rewrite clobbers in-progress edits.
**How to apply:** format only the files you created: `npx prettier --write "<path>"`.

**3. Assume the working tree is dirty and the user is editing files right now.**
**Why:** the user has said explicitly they were mid-edit in `src/lib/i18n/*`, `src/components/*`, `src/app/[locale]/blog/*`; a concurrent write clobbers their work.
**How to apply:** touch only files in the stated scope. Reading a file the user is editing is fine; writing is not. Check `git status --porcelain` at the end and confirm your changes are the only ones you introduced.
