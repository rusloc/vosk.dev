---
name: js-ts-webapp-review
description: >
  Picky whole-codebase review for JavaScript and TypeScript web apps (React, Next.js, Vue, Svelte, Node/Express back ends,
  monorepos), judged on four axes: speed (runtime, network, bundle, build), file and folder layout, logical blocks
  (function and module boundaries, cohesion, control flow), and duplication. Use this whenever the user asks to review,
  audit, critique or clean up a JS/TS web repo, folder, module or PR: "review the codebase", "audit src/", "why is this app
  slow", "is our structure sane", "find duplicated code", "what should we refactor first", "tech debt pass", or shares a
  repo and asks for thoughts. Use it even when only one axis is named. Not for non-web JS (CLIs, React Native, Electron
  internals), not for security audits or test writing, and not for a single pasted React component, which a
  component-level review skill covers better.
---

# JS/TS web app codebase review

Review a web app codebase the way a pedantic senior engineer would: measure first, read second, and report only
findings that carry a file, a line, a cost and a fix. The four axes are speed, layout, logical blocks and
duplication. Everything else (naming taste, formatting, style a linter enforces) is out of scope unless it causes one of
those four problems.

This file is the core loop. The detail for each axis lives in `references/` and is read only when that axis is in play,
so a dedup-only request never loads the speed checklist.

## Flow

### 1. Scope

Settle three things before reading code, from the request or by looking at the repo:

- **Target**: whole repo, a package, a folder, or a diff. For a diff, review the changed files plus the modules they
  import and the modules that import them, because layout and duplication problems live at the edges.
- **Axes**: all four by default; fewer when the user names them.
- **Stack**: read `package.json` (and workspace files), `tsconfig*.json`, the bundler or framework config and the
  top two folder levels. Note framework and version, rendering model (SPA, SSR, RSC, static), bundler, state and
  data-fetching libraries, and test runner. Findings depend on these: a barrel file is harmless under one bundler setup
  and a tree-shaking leak under another.

### 2. Measure

Run the inventory script before forming opinions. It needs only Node and reads files without executing project code:

```
node <skill-dir>/scripts/scan.mjs <target-dir> [--json] [--min-dup 8] [--top 20]
```

It prints: file and line counts by extension, the largest files, the longest functions, duplicated blocks across
files, import fan-in and fan-out, import cycles, deep relative imports, and barrel files. Treat the output as leads,
not findings: open every lead and confirm it before it goes in the report. If Node is missing, collect the same
numbers with `wc`, `grep` and `find`, and say so in the report.

Use the project's own tools when they exist and are cheap: `tsc --noEmit --extendedDiagnostics` for type-check time, the
bundle analyzer or build output for chunk sizes, the lint config for rules already enforced. Do not install
dependencies or run builds that take minutes without asking.

### 3. Read by axis

Read the reference for each axis in scope, then read code against it:

| Axis | Read | Covers |
|---|---|---|
| Speed | `references/speed.md` | Render and re-render cost, data fetching and waterfalls, bundle and code splitting, server and API hot paths, algorithmic complexity, build and type-check time |
| Layout | `references/layout.md` | Folder structure, module boundaries, import direction, barrels, colocation, naming, monorepo package edges |
| Logical blocks | `references/logical-blocks.md` | Function and component size, single purpose, control flow, state placement, side-effect isolation, type modelling |
| Duplication | `references/dedup.md` | Copy-paste, near-duplicates, parallel implementations, repeated types and constants, and when duplication is the right call |

Read the hot paths and the largest, most-imported files first. A problem in a file imported by 60 others outranks a
worse problem in a leaf.

### 4. Judge

Every finding needs four parts. Drop any finding that is missing one:

1. **Where**: `path/to/file.ts:120-164`, or a list of paths for cross-file findings.
2. **What**: the fact, stated plainly, with the number when there is one (lines, call count, kB, ms, copies).
3. **Cost**: what it costs today: slower page, bigger bundle, a bug class, time lost on every change.
4. **Fix**: the concrete change, small enough to act on. Show a short before and after when the fix is not obvious.

Severity:

| Level | Meaning |
|---|---|
| **P0** | Measurable user-facing slowness, or a structure that makes a common change unsafe. Fix now. |
| **P1** | Real cost, clear fix, not urgent. Schedule it. |
| **P2** | Nitpick. Correct, and worth doing while already in the file. |

Be picky and be honest about it: label nitpicks P2 so they do not dilute the P0s. Mark a speed claim that was not
measured as "unmeasured" and say how to measure it. Do not report what a formatter or an enabled lint rule already
handles; if a missing rule would catch a whole class, report the missing rule once instead of every instance.

Check each finding against the project's own conventions before reporting it. A deliberate, consistent choice that
differs from the reference is not a finding; an inconsistent one is.

### 5. Report

Use the template in `references/report-format.md`. In short: a verdict line, a scorecard for the four axes, findings
grouped by axis and ordered by severity, then a fix order that says what to do first and why. Lead with the worst
problem. Do not pad with praise; one line on what is solid is enough.

Write the report as a reply by default. Write it to a file only when asked. Do not change source code during a review
unless the user asks for the fixes.

## Tone

Nerdy, exact, dry. Numbers over adjectives: "412-line component with 9 `useState` calls", not "this component is too
big". No insults and no lectures; the code is being judged, not its author.
