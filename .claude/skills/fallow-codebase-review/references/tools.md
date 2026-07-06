# Fallow MCP tools — full reference

Complete reference for every tool exposed by the Fallow MCP server. Read this file when SKILL.md doesn't give you enough detail on a specific tool — exact parameters, output fields, gotchas, when to pick one tool over a similar one.

## Table of contents

**Analysis (run something)**

- [analyze](#analyze) — full dead-code analysis
- [check_changed](#check_changed) — incremental on changed files
- [find_dupes](#find_dupes) — code duplication
- [check_health](#check_health) — complexity, hotspots, targets
- [fix_preview](#fix_preview) — dry-run auto-fix
- [fix_apply](#fix_apply) — apply auto-fix

**Trace (verify before destructive action)**

- [trace_export](#trace_export) — why is this export (un)used
- [trace_file](#trace_file) — all graph edges for a file
- [trace_dependency](#trace_dependency) — where is this package imported
- [trace_clone](#trace_clone) — what other code matches this location

**Audit (PR verdict)**

- [audit](#audit) — pass/warn/fail on changed files

**Runtime coverage (when a coverage dump is provided)**

- [check_runtime_coverage](#check_runtime_coverage) — merge runtime data into health
- [get_hot_paths](#get_hot_paths) — production hot paths
- [get_blast_radius](#get_blast_radius) — what depends on this code
- [get_importance](#get_importance) — production-weighted importance
- [get_cleanup_candidates](#get_cleanup_candidates) — runtime-backed deletion verdicts

**Meta (project introspection)**

- [project_info](#project_info) — plugins, entries, files, boundaries
- [list_boundaries](#list_boundaries) — architecture zones
- [feature_flags](#feature_flags) — flags and env gates
- [fallow_explain](#fallow_explain) — what does this rule mean

**Common to all tools**

- [Common parameters](#common-parameters)
- [Output structure (`actions[]`)](#output-structure-actions)

---

## Analysis

### analyze

Full dead-code analysis. Wraps `fallow dead-code --format json`.

**Detects:** unused files, unused exports, unused types, unused dependencies, unused enum/class members, unresolved imports, unlisted dependencies, duplicate exports, circular dependencies, boundary violations, stale suppressions.

**Key parameters:**

- `production: bool` — only analyze paths reachable in production builds (excludes dev-only entries like Storybook).
- `issue_types: string[]` — restrict to specific findings (e.g. `["unused-exports", "unused-files"]`).
- `boundary_violations: bool` — convenience alias for `issue_types: ["boundary-violations"]`.
- `include_entry_exports: bool` — also report unused exports in entry files. Catches typos in framework-convention exports (e.g. `meatdata` vs `metadata`). ORs with the `includeEntryExports` config value.
- `group_by: string` — group output by `owner` (CODEOWNERS), `directory` (first path component), `package` (workspace), or `section` (CODEOWNERS section headers, with `owners` metadata per group).

**Note:** private type leaks are opt-in via `issue_types: ["private-type-leaks"]`.

**Use when:** the user wants a broad picture of dead code and architectural issues. Default first call for codebase review.

**Don't use when:** the user only asked about complexity (use `check_health`), only about duplication (use `find_dupes`), or only about changed files (use `check_changed`).

---

### check_changed

Incremental dead-code analysis on files changed since a git ref. Wraps `fallow dead-code --changed-since <ref>`.

**Key parameters:**

- `base: string` — git ref to compare against (default `main`).
- `include_entry_exports: bool` — same semantics as `analyze`.

**Use when:** the user wants to know what dead code their current branch introduced, but doesn't need a verdict. (If they want a verdict, use `audit`.)

---

### find_dupes

Code duplication detection. Wraps `fallow dupes --format json`.

**Key parameters:**

- `mode: string` — detection sensitivity:
  - `strict` — exact tokens.
  - `mild` — default, AST-based.
  - `weak` — different string literals OK.
  - `semantic` — catches renamed variables and literals.
- `min_tokens`, `min_lines`, `threshold` — sensitivity knobs.
- `skip_local: bool` — only report cross-directory clones (skips intra-file duplication).
- `cross_language: bool` — include matches across languages.
- `ignore_imports: bool` — ignore import-statement duplication.
- `changed_since: string` — only report duplication in files changed since a git ref.

**Output:** clone families (groups of similar clone groups) with sibling locations. Bigger families = higher consolidation value.

**Use when:** the user asks about duplication, copy-pasted logic, or code that should be extracted to a shared utility.

---

### check_health

Complexity metrics, file health scores, hotspots, and refactoring targets. Wraps `fallow health --format json`.

**Key parameters:**

- `file_scores: bool` — include the maintainability index per file.
- `hotspots: bool` — include churn analysis (files that change a lot AND are complex).
- `targets: bool` — include ranked refactoring recommendations sorted by efficiency (highest leverage first).
- `trend: bool` — include per-metric deltas against the most recent snapshot.
- `group_by: string` — `owner` / `directory` / `package` / `section`. Each group gets its own `vital_signs` and `health_score` recomputed from that group's files (top-level metrics stay project-wide). SARIF results gain `properties.group`; CodeClimate issues gain a top-level `group` field.
- `top: int` — limit results.

**Output structure to read:**

- `vital_signs` — project-wide complexity profile.
- `health_score` — 0–100 with penalty breakdown.
- `targets[]` — ranked refactor recommendations. Each has an `actions[]` array; the primary entry is keyed off the `coverage_tier` field:
  - `coverage_tier: "none"` + cyclomatic < maxCrap → primary action = `add-tests`.
  - `coverage_tier: "partial"` + cyclomatic < maxCrap → primary action = `increase-coverage`.
  - cyclomatic >= maxCrap → primary action = `refactor-function` (coverage can't save it).
- `coverage_tier` — bucketed `none` / `partial` / `high` for CRAP-triggered entries.

**Use when:** the user wants to know what's complex and worth refactoring, where to spend cleanup effort, or whether complexity is trending up.

**Note on suppression hints:** when called with `--baseline` / `--save-baseline` or when `health.suggestInlineSuppression: false` in config, `suppress-line` actions are omitted and a top-level `actions_meta: { suppression_hints_omitted: true, reason }` breadcrumb is added (under `health.actions_meta` in combined-mode and audit output).

---

### fix_preview

Dry-run preview of auto-fixable removals. Wraps `fallow fix --dry-run --format json`.

**Use when:** the user wants to clean up dead code. ALWAYS call this before `fix_apply`.

**What it can fix:** unused exports, unused enum members, unused dependencies, unused class members. Whole `export enum Foo {}` blocks are removed cleanly (no zombie un-exported enums left behind).

**What it can't fix:** file deletions, refactors. Surface those as separate suggestions for the agent to handle with edit tools.

---

### fix_apply

Apply auto-fixes. Wraps `fallow fix --yes --format json`.

**Critical rule:** never call this proactively. Always preview first, get explicit user approval, then apply.

**After applying:** suggest the user run their formatter (Prettier / Biome / dprint) — Fallow doesn't clean up whitespace.

---

## Trace tools (verify before destructive action)

The trace tools are how an agent earns the right to suggest deletion. Every "this is unused" claim from `analyze` should be confirmed with the matching trace before recommending removal.

### trace_export

Trace why an export is used or unused. Wraps `fallow dead-code --trace FILE:EXPORT_NAME`.

**Required parameters:** `file`, `export_name`.

**Output fields:**

- `is_reachable: bool` — does any entry point reach this?
- `is_entry_point: bool` — is the file itself an entry point?
- `direct_references[]` — files that import this export by name.
- `re_export_chains[]` — barrel/re-export paths that pass through this symbol.
- `reason: string` — human-readable explanation of the verdict.

**Use before:** suggesting an export deletion. If `is_reachable: true`, do not suggest deletion regardless of `analyze`'s verdict.

---

### trace_file

Trace all graph edges for a file. Wraps `fallow dead-code --trace-file PATH`.

**Required parameter:** `file`.

**Output fields:**

- `is_reachable: bool`
- `is_entry_point: bool`
- `exports[]` — exports defined in this file.
- `imports_from[]` — files this one imports from.
- `imported_by[]` — files that import this one.
- `re_exports[]` — barrels that re-export from this file.

**Use before:** suggesting file deletion. Also useful to decide whether a file is isolated, barrel-only, or part of a live import chain.

---

### trace_dependency

Trace where an npm dependency is imported. Wraps `fallow dead-code --trace-dependency PACKAGE`.

**Required parameter:** `package_name`.

**Output fields:**

- `importing_files[]` — files that import this package.
- `type_only_importers[]` — files that import it as type-only.
- `total_imports: int`.
- `used_in_scripts: bool` — true when invoked from `package.json` scripts or CI configs (`.github/workflows/*.yml`, `.gitlab-ci.yml`).
- `is_used: bool` — combined import + script signal, mirrors the unused-deps detector. Build tools like `microbundle` or `vitest` invoked only via scripts will have `importing_files: []` but `is_used: true`.

**Use before:** removing a dependency or moving it between `dependencies` and `devDependencies`. If `used_in_scripts: true` or `is_used: true`, don't remove.

---

### trace_clone

Trace duplicate-code groups at a specific location. Wraps `fallow dupes --trace FILE:LINE`.

**Required parameters:** `file`, `line`.

**Optional parameters:** `mode`, `min_tokens`, `min_lines`, `threshold`, `skip_local`, `cross_language`, `ignore_imports`.

**Output:** the matched clone instance plus every clone group containing it.

**Use when:** the user wants to consolidate duplication and needs the exact sibling locations to plan an extraction.

---

## Audit

### audit

Audit changed files for dead code, complexity, and duplication. Returns a verdict (pass / warn / fail). Wraps `fallow audit --format json`.

**Key parameters:**

- `base: string` — comparison ref (default `main`).
- `gate: string` — `new-only` (only fail on findings introduced by the change) or `all` (fail on every finding in changed files).
- `include_entry_exports: bool` — also report unused exports in entry files. Catches typos like `meatdata` vs `metadata`.

**Output:** a verdict plus findings. The verdict is what the user wants — the findings are secondary detail. Audit findings inherit `actions[]` arrays from all three sub-analyses (dead code, health, duplication).

**Use when:** PR review or pre-merge check.

---

## Runtime coverage tools

These tools merge real production execution data into the analysis. They require a coverage dump:

- A V8 coverage directory, OR
- A single V8 coverage JSON, OR
- An Istanbul `coverage-final.json`.

**Free vs paid:** a single local capture is free and runs without a license. Continuous or multi-capture runtime monitoring (a V8 directory containing multiple JSON files) requires an active Fallow Runtime license JWT.

All five tools below share the same input schema and free-vs-paid contract.

**Common timeout note:** can exceed the default 120s timeout on large dumps. Suggest the user raise `FALLOW_TIMEOUT_SECS` accordingly if a call times out.

### check_runtime_coverage

Merge runtime-coverage data into the health report.

**Required parameter:** `coverage` — path to V8 directory, V8 JSON, or Istanbul `coverage-final.json`.

**Tunable parameters:**

- `min_invocations_hot` (default `100`) — threshold for "hot" classification.
- `min_observation_volume` (default `5000`) — minimum function invocations for confidence.
- `low_traffic_threshold` (default `0.001`) — fraction below which a function is "low traffic".
- `max_crap` (default `30.0`) — CRAP score threshold.
- `top: int` — limit results.
- `group_by` — `owner` / `directory` / `package` / `section`.

**Output note:** Protocol-0.3+ sidecars emit a `summary.capture_quality` block flagging short-window captures (data may not be representative).

**Use when:** you have a coverage dump and want runtime-weighted health. Pick this over `check_health` whenever a coverage dump is available.

---

### get_hot_paths

Production hot paths sorted by percentile and invocation count.

**Output:** read `runtime_coverage.hot_paths`.

**Use when:** the user asks what code runs most in production, or wants to prioritize quality work on real hot paths.

---

### get_blast_radius

Blast-radius review — what would break if this code changed.

**Use when:** the user is considering changing or deleting code in the live graph and wants to know how much depends on it.

**Note:** until first-class `runtime_coverage.blast_radius` ships, combine `file_scores[].fan_in` with `runtime_coverage.hot_paths` and `runtime_coverage.findings` to estimate.

---

### get_importance

Production-importance review.

**Note:** until first-class `runtime_coverage.importance` ships, combine `runtime_coverage.hot_paths`, `file_scores`, `hotspots`, and `targets` to score importance.

---

### get_cleanup_candidates

Runtime-backed deletion verdicts.

**Output:** read `runtime_coverage.findings` for verdicts:

- `safe_to_delete` — never invoked, no static usage.
- `review_required` — ambiguous, needs human judgment.
- `low_traffic` — invoked but below threshold.
- `coverage_unavailable` — not present in the capture.

**Use when:** the user wants to delete code with confidence backed by real execution data, not just static analysis.

**Important:** even with a `safe_to_delete` verdict, still run the matching `trace_*` tool before suggesting removal. Runtime + static evidence together is the gold standard.

---

## Meta tools

### project_info

Project metadata. Wraps `fallow list --format json`.

**Optional flags (each is bool, set `true` to request the section):**

- `entry_points` — return detected entry points.
- `files` — return all discovered source files.
- `plugins` — return active framework plugins.
- `boundaries` — return architecture boundary zones and rules.

**Use when:** starting a session (sanity-check that the right framework was detected), or when the user reports surprising findings (often the cause is wrong framework detection).

---

### list_boundaries

Architecture boundary zones and access rules. Wraps `fallow list --boundaries --format json`.

**Output:** zone definitions, access rules, per-zone file counts. Returns `{"configured": false}` if no boundaries are configured.

**Use when:** the user wants to see the current architecture rules, or before suggesting boundary-violation fixes.

---

### feature_flags

Detect feature flag patterns. Wraps `fallow flags --format json`.

**Detects:**

- Boolean flags — `if (FEATURE_X)`, `enabled && <expr>`.
- Environment checks — `process.env.NODE_ENV`, `import.meta.env.VITE_*`.
- Config-key guards — `config.featureX`, `settings.enableNewUI`.
- SDK calls — LaunchDarkly, Statsig, Unleash, GrowthBook.

**Optional parameter:** `top: int` — limit results.

**Use when:** the user wants to audit feature flag usage, find stale flags, or cross-reference flags with dead code.

---

### fallow_explain

Explain a single issue type without running analysis. Wraps `fallow explain <issue-type> --format json`.

**Required parameter:** `issue_type` — issue token or rule id.

**Output:** rationale, example, fix guidance, docs URL.

**Use when:** the user pushes back on a finding and wants to understand the rule, or you need to give a precise explanation of why a finding is flagged.

---

## Common parameters

Most tools accept these in addition to their tool-specific parameters:

- `root` — analysis root directory (defaults to current working directory).
- `config` — path to a fallow config file.
- `no_cache` — skip the analysis cache.
- `threads` — limit parallelism.

---

## Output structure (`actions[]`)

Every finding from every analysis tool includes a structured `actions[]` array. Possible action types:

**Dead code (from `analyze`, `check_changed`):**

- `remove-export`, `remove-file`, `remove-dependency` — high-confidence safe removals. Often `auto_fixable: true`.
- `move-dependency` — cross-workspace findings.
- `suppress-line` — last-resort exception.

**Health (from `check_health`, `audit`):**

- `refactor-function` — cyclomatic complexity exceeds threshold; coverage can't save it.
- `add-tests` — CRAP triggered, no coverage, coverage can still clear CRAP.
- `increase-coverage` — CRAP triggered, partial coverage exists, more coverage can clear it.
- `apply-refactoring` — for ranked targets with evidence.
- `refactor-file` — for hotspots.
- `suppress-line` — last-resort exception.

**Duplication (from `find_dupes`, `audit`):**

- `extract-shared` — for clone families and groups.
- `suppress-line` — last-resort exception.

**Audit:** inherits actions from all three sub-analyses.

**Picking the primary action:** the first non-`suppress-line` entry is the primary suggestion. Suppression is always offered as a fallback but should never be the recommended path unless the user has explicitly chosen to suppress.

**`auto_fixable` flag:** dead-code findings with `auto_fixable: true` will be removed by `fix_apply`. Surface this to the user when planning a cleanup so they know which items they can auto-fix vs. need to handle by hand.
