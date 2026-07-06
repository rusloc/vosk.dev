# How to read health output

Reference for interpreting `check_health` and `check_runtime_coverage` results. Read this when the user asks about complexity, hotspots, refactoring priorities, or the health score.

## When to consult this file

- Interpreting any field in a health JSON response: cyclomatic, cognitive, MI, CRAP, fan-in/out, hotspot score, priority score.
- Translating a raw number into "should the user care?"
- Explaining why a function or file is flagged.

For tool _parameters_, see `tools.md`. This file is about the _output_.

---

## Complexity metrics (per-function)

### Cyclomatic complexity

Number of linearly independent paths. Counts decision points: `if`/`else`, `switch` cases, loops, ternaries, `&&`/`||`, `catch`.

| Range | Action                                |
| ----- | ------------------------------------- |
| 1–10  | No action — easy to test exhaustively |
| 11–20 | Review if growing                     |
| 21–50 | Split into smaller functions          |
| 50+   | Refactor urgently                     |

**Default flag threshold:** 20.

### Cognitive complexity

How hard the function is to _read_, not _test_. Penalizes nesting, label-targeted `break`/`continue`, recursion, and chains of logical operators.

| Range | Action                                 |
| ----- | -------------------------------------- |
| 0–7   | No action                              |
| 8–15  | Extract helpers if growing             |
| 15+   | Refactor: extract, simplify, decompose |

**Default flag threshold:** 15.

**The two are different on purpose.** A flat 6-case `switch` has cyclomatic 6 and cognitive 1 — many paths to test, easy to read. A 4-deep nested `if` has lower cyclomatic but higher cognitive. Report both; act on whichever is closer to the threshold.

### Complexity density

Total cyclomatic / lines of code. Normalizes for file size.

| Value   | Meaning                                         |
| ------- | ----------------------------------------------- |
| < 0.3   | Low — data files, configs, simple modules       |
| 0.3–1.0 | Normal application code                         |
| > 1.0   | Refactor: nearly every line is a decision point |

---

## File health scores

### Maintainability Index (MI), 0–100

```
fan_out_penalty = min(ln(fan_out + 1) × 4, 15)
MI = 100 - (complexity_density × 30) - (dead_code_ratio × 20) - fan_out_penalty
```

| Range  | Action                     |
| ------ | -------------------------- |
| 70–100 | Monitor                    |
| 40–70  | Review periodically        |
| 0–40   | Prioritize for refactoring |

**Not portable.** Fallow's MI differs from Visual Studio / SonarQube — don't compare scores across tools.

### Fan-in, fan-out, dead code ratio

| Metric            | Meaning                                | Flag when                                    |
| ----------------- | -------------------------------------- | -------------------------------------------- |
| `fan_in`          | Files that import this one             | > 20 → critical, extra review before changes |
| `fan_out`         | Files this one imports                 | > 15 → high coupling, consider splitting     |
| `dead_code_ratio` | Fraction of value exports unused (0–1) | > 0.3 → run `fix_apply`                      |

**Edge counting note:** `import { a, b, c } from './utils'` counts as one fan-in/out edge to `./utils`, not three.

### Coupling concentration (project-level vital sign)

| Field               | Meaning                                            |
| ------------------- | -------------------------------------------------- |
| `p95_fan_in`        | 95th percentile fan-in across all files            |
| `coupling_high_pct` | % of files with fan-in above `max(p95_fan_in, 10)` |

The floor of 10 prevents false positives in small projects.

---

## Risk profiles (project-level histograms)

Reported as `unit_size_profile` and `unit_interfacing_profile` in vital signs. Healthier = more mass in the low-risk bin.

**Unit size (function LOC):**

| Bin       | LOC   |
| --------- | ----- |
| Low       | 1–15  |
| Medium    | 16–30 |
| High      | 31–60 |
| Very high | > 60  |

**Unit interfacing (parameter count):**

| Bin       | Params |
| --------- | ------ |
| Low       | 0–2    |
| Medium    | 3–4    |
| High      | 5–6    |
| Very high | 7+     |

When ≥3% of functions are "very high risk" by LOC, the output includes a `large_functions` array — surface this to the user as a drill-down opportunity.

---

## Untested complexity risk (CRAP score)

```
score = CC^2 × (1 - cov/100)^3 + CC
```

`cov` source is reported as `coverage_model`:

| `coverage_model`   | Source                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `static_estimated` | Default. Graph-based: directly test-referenced = 85%, transitively reachable = 40%, unreachable = 0%. |
| `istanbul`         | Real per-function coverage from Jest/Vitest/c8/nyc (`coverage-final.json`).                           |
| `static_binary`    | Legacy. Whole-file 100% / 0%.                                                                         |

**Score thresholds:**

| Score   | Action                                               |
| ------- | ---------------------------------------------------- |
| < 30    | Acceptable                                           |
| 30–99   | Add tests OR reduce complexity                       |
| 100–999 | Add tests first, then simplify                       |
| > 999   | Capped to `>999` in human output. Refactor urgently. |

A fully tested function (cov=100) always scores exactly CC, regardless of complexity — coverage neutralizes the quadratic penalty.

**Per-file aggregations:**

| Field                  | Meaning                                |
| ---------------------- | -------------------------------------- |
| `crap_max`             | Highest per-function score in the file |
| `crap_above_threshold` | Count of functions scoring ≥ 30        |

**`AddTestCoverage` target fires when:** `crap_above_threshold ≥ 2` AND `complexity_density > 0.3`. Multiple risky functions in a genuinely complex file = highest leverage for adding tests.

---

## Hotspots (churn × complexity)

```
score = normalized_churn × normalized_complexity × 100
```

Multiplicative — needs _both_ high churn AND high complexity. Stable complex code or simple changing code score low.

| Score  | Action               |
| ------ | -------------------- |
| 70–100 | Refactor next sprint |
| 40–70  | Schedule review      |
| 0–40   | Monitor              |

**Score is project-relative.** A score of 80 means "worst in this project," not "objectively bad." A well-maintained repo may top out at 30.

### Weighted commits (recency-weighted)

90-day half-life exponential decay. A commit yesterday ≈ 1.0, 90 days ago ≈ 0.5, 180 days ago ≈ 0.25.

### Churn trend

| Trend          | Meaning                        | Priority impact                       |
| -------------- | ------------------------------ | ------------------------------------- |
| `accelerating` | Recent half > 1.5× older half  | High priority if complexity also high |
| `stable`       | Balanced                       | Normal                                |
| `cooling`      | Recent half < 0.67× older half | Lower priority                        |

---

## Refactoring targets (`check_health` with `targets: true`)

Targets are synthesized recommendations, not raw measurements. Use these for prioritization advice — they already incorporate everything above.

### Priority score formula

```
priority = min(complexity_density, 1) × 30
         + hotspot_boost × 25     (hotspot_score / 100 if file is a hotspot, else 0)
         + dead_code_ratio × 20
         + min(fan_in / 20, 1) × 15
         + min(fan_out / 30, 1) × 10
```

| Score  | Action                     |
| ------ | -------------------------- |
| 70–100 | Address this sprint        |
| 40–70  | Schedule for upcoming work |
| 0–40   | Opportunistic              |

### Categories (first-match wins, in this order)

| Category                    | Trigger                                               | Meaning                          |
| --------------------------- | ----------------------------------------------------- | -------------------------------- |
| `urgent_churn_complexity`   | Hotspot ≥ 50 + accelerating + density > 0.5           | Stabilize before adding features |
| `break_circular_dependency` | In an import cycle + fan-in ≥ 5                       | Changes cascade through cycle    |
| `split_high_impact_file`    | Fan-in ≥ 20 (or ≥ 10 + ≥ 5 functions) + density > 0.3 | High blast radius                |
| `remove_dead_code`          | Dead-code ratio ≥ 0.5 + ≥ 3 value exports             | Reduce surface area              |
| `extract_complex_functions` | Top cognitive ≥ 30                                    | Hard to understand               |
| `reduce_coupling`           | Fan-out ≥ 15 + MI < 60 (excluding entry points)       | Low testability                  |

### Effort estimation

| Effort   | Criteria                                                                    |
| -------- | --------------------------------------------------------------------------- |
| `low`    | < 100 LOC AND ≤ 3 functions AND < 5 importers (all three)                   |
| `high`   | ≥ 500 LOC OR ≥ 20 importers OR (≥ 15 functions AND density > 0.5) (any one) |
| `medium` | Everything else                                                             |

A 50-line file with 25 importers is `high` — changes ripple widely.

### Evidence fields (use these to act without a second tool call)

| Category                    | Field                                             | Use it for                         |
| --------------------------- | ------------------------------------------------- | ---------------------------------- |
| `remove_dead_code`          | `unused_exports[]`                                | Generate the removal list directly |
| `extract_complex_functions` | `complex_functions[]` (`{name, line, cognitive}`) | Point straight to the function     |
| `break_circular_dependency` | `cycle_path[]`                                    | The exact cycle to break           |
| Other categories            | Evidence omitted                                  | Use the recommendation text        |

---

## Project health score (0–100, letter grade)

```
score = 100 - sum(penalties)
```

Letter grades: A (≥85), B (70–84), C (55–69), D (40–54), F (<40).

| Penalty          | Max | Triggers                             |
| ---------------- | --- | ------------------------------------ |
| Dead files       | 15  | `dead_file_pct × 0.2`                |
| Dead exports     | 15  | `dead_export_pct × 0.2`              |
| Complexity (avg) | 20  | `(avg_cyclomatic − 1.5) × 5`         |
| P90 complexity   | 10  | `p90_cyclomatic − 10`                |
| Maintainability  | 15  | `(70 − maintainability_avg) × 0.5`   |
| Hotspots         | 10  | `hotspot_count / total_files × 200`  |
| Unused deps      | 10  | One per unused dep, capped           |
| Circular deps    | 10  | One per cycle, capped                |
| Unit size        | 10  | When > 5% of functions exceed 60 LOC |
| Coupling         | 5   | When p95 fan-in exceeds 30           |
| Duplication      | 10  | When > 5% of lines are duplicated    |

`null` penalty fields mean the underlying analysis didn't run.

---

## Don't refactor these (skip patterns)

- **Generated files** (GraphQL codegen, Prisma client, OpenAPI types): high density but shouldn't be touched. Should be in `health.ignore` config.
- **Test files**: high cyclomatic from many `it()` blocks is fine — tests _should_ cover paths.
- **Config files** (Webpack, ESLint): may appear as hotspots from setup churn; cools after initial config.

If the user asks "should I refactor X" and X is in one of these categories, surface the category caveat before quoting the metrics.

---

## Cross-analysis combinations to watch for

These patterns require the user to look at multiple analyses together — surface them when you see them:

- **Dead code + high complexity** → delete the file rather than refactor.
- **Hotspot + circular dependency** → every change cascades through the cycle. Highest urgency.
- **Duplication + high complexity** → extracting yields the most benefit (run `find_dupes` and `check_health` together).
