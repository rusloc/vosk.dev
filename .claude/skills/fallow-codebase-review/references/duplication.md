# How to read duplication output

Reference for interpreting `find_dupes` and `trace_clone` results. Read this when the user asks about duplicated code, copy-pasted logic, or whether to extract a shared module.

## When to consult this file

- Choosing a detection mode (`strict` / `mild` / `weak` / `semantic`).
- Translating a duplication % or clone count into a recommendation.
- Distinguishing a clone group from a clone family.
- Deciding whether to extract or leave duplication alone.

For tool _parameters_, see `tools.md`. This file is about the _output_.

---

## Clone types Fallow detects

Fallow handles **Type-1** and **Type-2** clones from the standard clone-detection taxonomy:

| Type       | What matches                                                                    | Detected in modes  |
| ---------- | ------------------------------------------------------------------------------- | ------------------ |
| **Type-1** | Exact token sequence (whitespace/comments already stripped by AST tokenization) | `strict`, `mild`   |
| **Type-2** | Same structure, identifiers and/or literals differ                              | `weak`, `semantic` |

**Not detected:**

- **Type-3** (gapped clones — copy-pasted with a few lines added in the middle): Fallow reports these as multiple smaller adjacent clones rather than one near-miss. If the user expects "near matches," explain this.
- **Type-4** (semantically equivalent but syntactically different): out of scope. Two functions doing the same thing written differently won't be flagged.

---

## Detection modes — what each one normalizes

| Mode       | Normalizes                                                                  | Trade-off                                             |
| ---------- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| `strict`   | Nothing — exact token match                                                 | Highest precision, lowest recall                      |
| `mild`     | Equivalent to strict (AST already strips whitespace/comments). **Default.** | Good starting point                                   |
| `weak`     | + string literal _values_ abstracted                                        | Catches copies with different messages/URLs           |
| `semantic` | + identifiers + numeric literals + type annotations                         | Catches renamed-variable clones, more false positives |

**Picking a mode:**

- User asks generally about duplication → start with `mild` (default).
- User says "find renamed copies" or "the same logic with different variable names" → `semantic`.
- User says "find exact copies" or wants a strict CI gate → `strict`.

**Critical caveat for users:** duplication % is **mode-dependent**. `semantic` will always report a higher percentage than `strict`. Never compare percentages across modes — only across runs in the same mode.

---

## Duplication percentage (project-level)

Fraction of total source tokens appearing in at least one clone group. Computed over the full file set, not just the top-N shown.

| Range  | Action                                                                          |
| ------ | ------------------------------------------------------------------------------- |
| 0–5%   | No action — low duplication                                                     |
| 5–15%  | Review the largest clone families                                               |
| 15–30% | Prioritize extraction of shared modules                                         |
| 30%+   | Likely a structural issue — look for copy-pasted modules or template-based code |

---

## Reading a clone group

Each group reports two sizes:

| Field    | What it measures                                                  | Use for                       |
| -------- | ----------------------------------------------------------------- | ----------------------------- |
| `tokens` | Language-aware units (keywords, identifiers, operators, literals) | What the engine matches on    |
| `lines`  | Source lines spanned                                              | Estimating refactoring effort |

**Refactoring value rule of thumb:** large clones are worth extracting; tiny ones aren't. Below 10 lines is usually idiomatic boilerplate (error handling, guard clauses) that shouldn't be DRYed out.

### Instance count (key signal)

The number of locations where the duplicate appears.

| Instances | Risk                               | Action                                       |
| --------- | ---------------------------------- | -------------------------------------------- |
| 2         | Often acceptable                   | Extract only if complex or actively changing |
| 3–5       | Bug risk increasing                | Extract into a shared function/module        |
| 5+        | Divergence likely already happened | Extract urgently                             |

---

## Clone groups vs clone families — the key concept

Confusing these two leads to the wrong refactoring strategy. Be precise.

### Clone group

A **single** duplicated code block found at 2+ locations. One block, multiple instances.

```
Clone group (8 lines, 2 instances)
  src/validators/userValidator.ts:12-19
  src/validators/orderValidator.ts:8-15
```

### Clone family

**Multiple clone groups sharing the same files.** The same two (or more) files have several distinct duplicated blocks between them — strong signal those files were copy-pasted from each other.

```
Family: userValidator.ts ↔ orderValidator.ts
  3 clone groups, 19 duplicated lines
```

### Refactoring strategy by pattern

| Pattern                   | What it tells you           | Action                                          |
| ------------------------- | --------------------------- | ----------------------------------------------- |
| Single clone group        | One block was copied        | Extract that block into a shared function       |
| Family within one file    | Repeated self-clone pattern | Extract pattern into a helper                   |
| Family across 2 files     | Files were copy-pasted      | Merge into a shared module with configuration   |
| Family across a directory | Template-based duplication  | Replace template with a parameterized generator |

**When the user asks "what should I extract?"** — sort by clone family size (groups × duplicated lines), not by individual clone group size. A family of 3 small groups beats a single mid-size standalone clone for refactoring leverage.

---

## When duplication is acceptable — don't always extract

Premature abstraction is worse than duplication. Skip these:

- **Test files** — repeating setup code intentionally makes tests easier to read. Use `--production` flag or `dupes.ignore` patterns.
- **Generated code** — codegen output (GraphQL, Prisma, OpenAPI) is inherently duplicative. Should be in `dupes.ignore`.
- **Small clones (< 10 lines)** — usually idiomatic patterns, not meaningful duplication.
- **Cross-language ports** — if the user maintains parallel `.ts` and `.js` deliberately, suggest `--skip-local`.

**The litmus test for whether to extract:**

1. Is the clone large (≥ 10 lines, ideally 20+)?
2. Is the clone in actively-changing files (cross-reference with `check_health --hotspots`)?

If both are yes → extract. If neither → leave it. If one of two, surface the trade-off and let the user decide.

---

## How to interpret a `--threshold` failure

`--threshold N` fails the build when duplication % exceeds N.

```
Duplication: 19.4% (27,255 duplicated lines across 398 files, exceeds 15% threshold)
Found 1,184 clone groups, 2,959 instances
```

**Strategy for adopting a threshold on an existing repo:** start with a threshold _above_ the current level (e.g. set 25% if currently 19%), then ratchet down as the user fixes things. Combine with `--baseline` for incremental adoption.

---

## How the detection works (one-line answer for skeptical users)

Fallow concatenates all token streams, builds a suffix array with LCP array, scans for repeated subsequences above the minimum length. **O(n log n)**, no pairwise file comparison. This is why it's fast on large codebases.

---

## Limitations to flag if the user pushes back

- **Type-3 gaps**: copy with a few inserted lines reports as multiple small clones, not one near-match.
- **Type-4 (semantic equivalence)**: not detected at all.
- **Cross-language**: only `.ts` ↔ `.js`. Other language pairs not supported.
- **Minimum size**: anything below `min_tokens` / `min_lines` is invisible. Intentional — small clones are usually idiomatic.
- **Semantic-mode false positives**: aggressive normalization can match structurally similar but semantically unrelated code. Always review semantic-mode results before recommending extraction.

If the user asks "why didn't Fallow catch this duplication?" check these limitations first.

---

## Quick decision flow

User asks about duplication → `find_dupes` (mode: `mild` default).

For each top finding:

1. Check instance count → if 5+, extract urgently.
2. Check size → if < 10 lines, skip.
3. Check `find_dupes` for patterns of clone families across the same file pairs → suggest module merge, not function extraction.
4. Cross-reference with `check_health --hotspots` — duplicates in hot files have higher leverage.
5. If user names a specific location, use `trace_clone` (file + line) to get all sibling clone groups.
