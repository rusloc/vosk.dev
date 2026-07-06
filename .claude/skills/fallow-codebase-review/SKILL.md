---
name: fallow-codebase-review
description: Use this skill whenever the user wants to review, audit, clean up, or analyze a TypeScript or JavaScript codebase using Fallow. Triggers include phrases like "review the codebase", "review this repo", "find dead code", "what's unused", "clean up imports", "find duplication", "find clones", "is this safe to delete", "audit this PR", "audit my branch", "what should I refactor", "find complexity hotspots", "find unused dependencies", "is package X used", "is export Y used", "check code health", "find circular dependencies", "find architecture violations", "find feature flags". Also trigger when the user mentions Fallow or fallow-mcp by name. Use this skill INSTEAD of reading files manually to look for unused code — Fallow does it deterministically across the whole module graph in milliseconds and will catch what manual reading misses. The Fallow MCP server is configured and exposes these tools: analyze, audit, check_changed, find_dupes, fix_preview, fix_apply, check_health, trace_export, trace_file, trace_dependency, trace_clone, project_info, feature_flags, list_boundaries, fallow_explain, plus runtime-coverage tools (check_runtime_coverage, get_hot_paths, get_blast_radius, get_importance, get_cleanup_candidates) when the user has a coverage dump.
---

# Fallow codebase review

Fallow is a deterministic static analyzer for TypeScript/JavaScript codebases. It builds a complete module graph and finds unused code, duplication, circular dependencies, complexity hotspots, and architecture-boundary violations across the entire repo. The MCP server exposes these analyses as typed tools — prefer them over manual file reading.

## Reference files

The skill ships four reference files in `references/`. Load the one that matches the kind of question you're answering — they're focused, scannable, and meant to be consulted on demand rather than memorized.

- **`references/tools.md`** — full tool catalog. Read when you need exact parameters, output fields, or to pick between similar tools (e.g. `analyze` vs `check_changed`).
- **`references/dead-code.md`** — how to interpret `analyze` / `check_changed` output. Read when reporting on the 16 dead-code issue types, deciding what's safe to remove, or explaining false-positive patterns.
- **`references/duplication.md`** — how to interpret `find_dupes` / `trace_clone` output. Read when explaining clone groups vs clone families, picking a detection mode, or deciding whether to extract.
- **`references/health.md`** — how to interpret `check_health` / `check_runtime_coverage` output. Read when explaining complexity (cyclomatic, cognitive, density), maintainability index, CRAP scores, hotspots, refactoring targets, or the 0–100 health score.

When in doubt, load the relevant reference rather than guessing — the thresholds and interpretation tables are precise and not worth approximating.

## Core principle: trace before delete

Before suggesting deletion of ANY export, file, or dependency, ALWAYS call the matching trace tool first:

- Deleting an export → `trace_export` with `file` and `export_name`. If the trace shows it's reachable from a re-export chain or framework entry point, do not suggest deletion.
- Deleting a file → `trace_file` with the file path. If `is_entry_point: true` or `imported_by` is non-empty, do not suggest deletion.
- Removing a dependency → `trace_dependency` with `package_name`. If `used_in_scripts: true` (build tools like `microbundle`, `vitest`, `tsx` invoked from `package.json` scripts or CI configs), do not suggest removal.

Fallow's findings are usually right, but the trace step catches edge cases where a symbol is used in a way that looks dead at the call site (dynamic imports, framework conventions, build scripts).

## Tool selection guide

| User intent                       | Tool                     | Key parameters                                            |
| --------------------------------- | ------------------------ | --------------------------------------------------------- |
| Full repo review, "what's unused" | `analyze`                | `production: true` for prod-only paths                    |
| Dead code in changed files only   | `check_changed`          | `base` (default `main`)                                   |
| PR/branch audit with verdict      | `audit`                  | `base`, `gate: "new-only"`, `include_entry_exports: true` |
| Find duplicate code               | `find_dupes`             | `mode: "semantic"` for renamed-variable clones            |
| Complexity & maintainability      | `check_health`           | `targets: true, hotspots: true`                           |
| "Is export X actually unused?"    | `trace_export`           | `file`, `export_name`                                     |
| "Where is file F used?"           | `trace_file`             | `file`                                                    |
| "Is package P used?"              | `trace_dependency`       | `package_name`                                            |
| "What clones share this code?"    | `trace_clone`            | `file`, `line`                                            |
| Preview auto-fixable removals     | `fix_preview`            | (always before `fix_apply`)                               |
| Apply auto-fixes                  | `fix_apply`              | Only after user approval                                  |
| What does this rule mean?         | `fallow_explain`         | `issue_type`                                              |
| What did Fallow detect?           | `project_info`           | `plugins: true, entry_points: true, boundaries: true`     |
| Architecture boundaries           | `list_boundaries`        | —                                                         |
| Find feature flags                | `feature_flags`          | `top` to limit results                                    |
| Merge a coverage dump into health | `check_runtime_coverage` | `coverage: <path>`                                        |
| Production hot paths              | `get_hot_paths`          | `coverage: <path>`                                        |
| What would break if X changes     | `get_blast_radius`       | `coverage: <path>`                                        |
| Production importance ranking     | `get_importance`         | `coverage: <path>`                                        |
| Runtime-backed deletion verdicts  | `get_cleanup_candidates` | `coverage: <path>`                                        |

## Standard workflows

### First-time codebase review

When the user asks for a full review of the repo:

1. Call `project_info` with `plugins: true, entry_points: true, boundaries: true`. Confirm the framework was detected. If a major framework (Next.js, Vite, Remix, etc.) wasn't recognized, surface that immediately — findings can be unreliable without correct framework awareness.
2. Call `analyze` for dead code, dependency, and circular-dependency findings.
3. Call `find_dupes` for duplication.
4. Call `check_health` with `targets: true, hotspots: true` for complexity.
5. Synthesize. Group findings by category and rank by impact:
   - **Unresolved imports & unlisted dependencies** (highest — these are bugs)
   - **Unused dependencies** (high value, low risk to remove)
   - **Unused files**
   - **Unused exports**
   - **Circular dependencies**
   - **Duplication** (clone families with most siblings first)
   - **Complexity hotspots** (use the order from `targets`)
6. Present the **top 5–10 issues** with proposed actions, not the full dump. Offer to dig deeper on any category the user picks.

### PR / branch audit

When the user is on a feature branch and wants to know if it's safe to merge:

1. Call `audit` with `base: <main-branch>, gate: "new-only", include_entry_exports: true`.
2. Report the verdict (pass / warn / fail) prominently at the top.
3. Walk through findings the audit introduced. Do not lecture about pre-existing debt — `gate: "new-only"` filters that out for a reason.

### Dead-code cleanup

When the user wants to clean up unused code:

1. Call `analyze` to enumerate findings.
2. For each candidate to remove, call the matching `trace_*` tool. Skip anything the traces show is actually used.
3. Call `fix_preview` to see what auto-fix would do.
4. Show the user the proposed changes. **Wait for approval.**
5. On approval, call `fix_apply`.
6. For things `fix_apply` can't handle (file deletions, manual refactors), surface them as a numbered list for the user to approve, then write the edits yourself.

### Investigating a pushback

When the user disagrees with a specific finding ("but I'm sure `formatCurrency` is used"):

1. Call `trace_export` with `file` and `export_name`.
2. Read `direct_references`, `re_export_chains`, `is_entry_point`, and the `reason` string.
3. If the trace confirms it's unused, explain the chain (or lack thereof) plainly — show the user what Fallow checked.
4. If the trace shows it's used somewhere unexpected, that's the answer. Fallow was right; the user just didn't know about the usage.

### Runtime-backed cleanup (when a coverage dump is available)

When the user has a V8 coverage directory, V8 JSON, or Istanbul `coverage-final.json`, runtime data dramatically increases deletion confidence — static "unused" plus runtime "never invoked" is much stronger evidence than either alone.

1. Confirm the coverage path with the user. A single local capture is free; multi-capture monitoring requires a Fallow Runtime license.
2. Call `check_runtime_coverage` with `coverage: <path>` for the merged health view, OR jump straight to `get_cleanup_candidates` if the user only wants deletion verdicts.
3. Read `runtime_coverage.findings` for verdicts: `safe_to_delete` (never invoked, no static usage), `review_required` (ambiguous), `low_traffic`, `coverage_unavailable`.
4. For `safe_to_delete` items, still run the matching `trace_*` tool before suggesting removal — the trace-before-delete rule applies even with runtime evidence.
5. If the user's broader question is "what should I refactor", call `get_hot_paths` to focus refactoring effort on code that actually runs in production, not cold paths.
6. Note: large coverage dumps can exceed the default 120s MCP timeout. If a runtime call times out, suggest the user raise `FALLOW_TIMEOUT_SECS` in their `.mcp.json` env block.

## Output interpretation

Each finding includes a structured `actions` array. The first non-`suppress-line` entry is the **primary suggestion**. Action types:

- `remove-export`, `remove-file`, `remove-dependency` — high-confidence safe removals (often `auto_fixable: true`).
- `refactor-function`, `refactor-file` — complexity hotspots, requires human work.
- `add-tests`, `increase-coverage` — when CRAP score can be reduced by raising test coverage rather than refactoring.
- `extract-shared` — duplication groups.
- `suppress-line` — last resort, for legitimate exceptions.

**Prefer fixes in code over suppressions.** If suppressing is genuinely the right call, explain why in the same commit message.

## Common false-positive patterns

Double-check before reporting these as real problems:

- **Framework-convention exports** (Next.js `metadata`, `generateMetadata`, default page exports, route handlers, layout files): if flagged as unused, set `include_entry_exports: true` and verify the framework plugin is active via `project_info`.
- **Type-only `@types/*` packages** flagged as unused dependencies: usually intentional. Check if the package adds types to a JS-only dependency.
- **Test fixtures, seed scripts, config helpers**: may show as "unused files" because they're tooling entry points, not app graph nodes. Check `project_info` to see if they should be declared as entries.
- **Re-export barrels** (`index.ts`): an "unused export" warning here often means the barrel is the only thing using the symbol — `trace_export` shows whether the barrel itself is reachable.

## Auto-fix safety rules

- Never call `fix_apply` proactively. Always preview first, get explicit user approval, then apply.
- `fix_apply` only handles safe removals (unused exports, enum members, dependencies). It does not delete files or refactor.
- After `fix_apply`, suggest the user run their formatter (Prettier / Biome / dprint) — Fallow doesn't clean whitespace.

## What this skill does not do

- **Architecture redesign decisions** — `list_boundaries` surfaces violations, but the user owns the architecture.
- **Generating a coverage dump** — runtime-coverage tools require the user to provide a V8 directory, V8 JSON, or Istanbul `coverage-final.json`. This skill consumes those dumps but doesn't produce them.
- **Type-level analysis** — Fallow is syntactic. Type-only dead code may slip through.
- **Editing source files** — that's the agent's job using normal edit tools. This skill tells you what to fix; you write the edits.

## Environment notes

- Path strings in tool params should use forward slashes (`src/utils/money.ts`) on any OS — Fallow normalizes them.
- The MCP server has a 120s default timeout. For very large codebases, the user may need to set `FALLOW_TIMEOUT_SECS=300` (or higher) in the `.mcp.json` env block.
- A single `analyze` call returns the full picture (dead code + duplication + health) in one pass — more efficient than calling each separately when the user wants a broad review. Use `check_health` separately when they want depth on complexity specifically.
