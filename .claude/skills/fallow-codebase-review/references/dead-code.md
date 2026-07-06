# How to read dead-code output

Reference for interpreting `analyze` and `check_changed` results. Read this when the user asks about unused code, dependencies, circular deps, or boundary violations.

## When to consult this file

- Translating an issue type into "is this safe to fix?"
- Deciding which findings to address first.
- Distinguishing real issues from framework-convention false positives.
- Explaining severity (error vs warning) to the user.

For tool _parameters_, see `tools.md`. This file is about _interpreting findings_.

---

## The 16 issue types — at a glance

| Issue type                    | Default severity | What it is                                             |
| ----------------------------- | ---------------- | ------------------------------------------------------ |
| `unused-files`                | error            | File not reachable from any entry point                |
| `unused-exports`              | error            | Exported symbol never imported elsewhere               |
| `unused-types`                | warning          | Type alias / interface never referenced                |
| `private-type-leaks`          | off (opt-in)     | Public signature references a private same-file type   |
| `unused-dependencies`         | error            | `dependencies` package never imported                  |
| `unused-devdependencies`      | warning          | `devDependencies` package never imported               |
| `unused-optionaldependencies` | warning (opt-in) | `optionalDependencies` package never imported          |
| `unused-enum-members`         | warning          | Enum value never referenced                            |
| `unused-class-members`        | warning          | Class method/property never accessed externally        |
| `unresolved-imports`          | error            | Import path doesn't resolve to a file or package       |
| `unlisted-dependencies`       | error            | Imported package not declared in `package.json`        |
| `duplicate-exports`           | warning          | Same symbol exported from multiple modules             |
| `circular-dependencies`       | warning          | Modules importing each other transitively              |
| `boundary-violations`         | error            | Import crosses a forbidden zone boundary               |
| `type-only-dependencies`      | warning          | `dependencies` package only ever `import type`'d       |
| `test-only-dependencies`      | warning          | `dependencies` package only used in test files         |
| `stale-suppressions`          | warning          | `// fallow-ignore` comment no longer matches a finding |

**Severity meaning:** `error` causes non-zero exit with `--fail-on-issues`. `warning` is reported but doesn't fail. `off` requires explicit opt-in.

---

## Priority order for fixing (top-down)

When summarizing findings to the user, group and rank in this order. The first three are correctness issues — code may already be broken. Everything else is hygiene.

1. **`unresolved-imports`** — potential runtime failures. Always investigate.
2. **`unlisted-dependencies`** — works by accident in npm, breaks in pnpm / Yarn PnP / strict node_modules.
3. **`boundary-violations`** — architecture is being broken right now.
4. **`unused-files`** — entire modules to delete. High leverage.
5. **`unused-dependencies`** — security & install-time wins.
6. **`unused-exports`** — API surface cleanup.
7. **`circular-dependencies`** — initialization-order bugs lurking.
8. **`type-only-dependencies`** — install-size optimization.
9. **`test-only-dependencies`** — install-size optimization.
10. **`duplicate-exports`** — DX (ambiguous auto-imports).
11. **`stale-suppressions`** — suppression hygiene.
12. **`unused-types` / `-enum-members` / `-class-members`** — code hygiene.

---

## Per-issue interpretation guide

### `unused-files`

**Almost always act.** Adds to IDE indexing time and confuses search.

**False positives to check:**

- Scripts run directly (`node scripts/seed.ts`) — should be in `entry` config or referenced by a `package.json` script.
- Files loaded by tools Fallow doesn't recognize — add to `entry` or use the right plugin config.

**Before deletion:** call `trace_file` to confirm `is_entry_point: false` AND `imported_by` is empty.

---

### `unused-exports`

**Most should be removed or unexported.**

**Keep when:**

- It's part of a library's public API that external consumers see. Mark with `/** @public */` JSDoc tag (also `@internal`, `@beta`, `@alpha`), add the package entry to `entry`, or use `ignoreExports`.
- A framework consumes it via naming convention (e.g., Next.js `getStaticProps`). Most are auto-handled by plugins — if missed, configure the plugin or ignore pattern.

**Before deletion:** call `trace_export`. If `is_reachable: true` or there's a re-export chain, do not delete.

---

### `unused-types`

Same logic as `unused-exports` but for types only. Lower priority — types don't ship to runtime, just inflate auto-import suggestions.

---

### `private-type-leaks` (opt-in)

A public signature references a same-file type that _isn't_ exported. Consumers see the type name in `.d.ts` but can't import it.

**Off by default.** Enable for libraries / publishable packages, not app-internal code.

**Auto-skipped:**

- ES `#field` private members and TypeScript `private` accessibility.
- Storybook stories.
- Framework route conventions (Next.js App/Pages Router, Gatsby, Remix v2, TanStack Router, Expo Router).

**Fix by:** exporting the backing type, or restructuring the public signature so it doesn't reference the private type.

---

### `unused-dependencies` / `-devdependencies` / `-optionaldependencies`

**Removal saves install time, node_modules size, supply-chain attack surface.**

**Critical:** before suggesting removal, call `trace_dependency`. Build tools like `microbundle`, `vitest`, `tsx` are invoked from `package.json` scripts and have `importing_files: []` but `is_used: true`. Don't remove anything where `is_used: true` or `used_in_scripts: true`.

**Monorepo gotcha:** internal workspace packages (`@repo/ui` listed in another workspace's deps) count too. If the workspace declares but never imports it, fix by removing the dep or moving the import.

**Other false positives:**

- Uninstalled peer dependencies of installed packages — Fallow credits these only when `node_modules` proves they're needed.
- Runtime-only packages (polyfills, CSS frameworks loaded via `@import`) — add to `ignoreDependencies`.

---

### `unused-enum-members`

Remove. Unused values inflate serialized payloads and confuse consumers about what's valid.

---

### `unused-class-members`

**Detects:** public methods/properties never accessed _outside_ their own class body.

**What's already excluded** (you don't need to flag these):

- **Decorated members** (`@Get()`, `@Column()`, `@Input()`, `@Inject()`) — runtime wiring is opaque to static analysis, so decorated members are auto-skipped.
- **Lifecycle methods** — React (`componentDidMount`, `render`, `shouldComponentUpdate`, etc.) and Angular (`ngOnInit`, `canActivate`, etc.) are allowlisted.
- **Inheritance**: parent-class `this.method()` calls credit child class overrides, so abstract-pattern methods aren't false-flagged.
- **Whole-object use**: `Object.values(instance)`, `Object.keys(instance)`, rest destructuring, `for..in` — all conservatively mark members as used.

**Fix:** remove or mark `private`. An unreferenced public method is either dead or runtime-wired. Both worth investigating.

**Custom convention methods** (DI frameworks, third-party libraries calling reflectively): add to `usedClassMembers` config.

---

### `unresolved-imports`

**Always investigate — code may fail at runtime.** Causes:

- Typo in path.
- Missing dependency (not installed or not in `package.json`).
- Path alias not configured in `tsconfig.json` `paths`.

This is one of two issue types where you should never just "ignore" — the code is broken.

---

### `unlisted-dependencies`

The other "always investigate" type. Code imports a package not in `package.json`. Works in npm via hoisting, breaks in pnpm and Yarn PnP.

**Fix:** add to `dependencies` or `devDependencies`.

**Monorepo:** importing `@repo/utils` from a workspace whose `package.json` doesn't list it is unlisted. Add to that workspace's deps or move the import. Self-references are fine.

---

### `duplicate-exports`

Same symbol name exported from multiple modules → ambiguous auto-imports. Consolidate to one canonical source; re-export from a barrel if multiple consumers need it.

---

### `circular-dependencies`

Detection is built into graph construction (Tarjan's SCC algorithm, O(V+E)) — zero analysis cost. **No depth limit.** Cycles of any length are reported.

**Type-only cycles are auto-filtered.** If every edge is `import type`, the cycle is erased at compile time and reported as safe (not flagged).

**Risk by length:**

| Cycle length | Risk                    | Action                                  |
| ------------ | ----------------------- | --------------------------------------- |
| 2 (A↔B)      | Moderate, design issue  | Extract shared code into a third module |
| 3–5          | Higher, harder to trace | Break the weakest edge                  |
| 5+           | Architectural problem   | Refactor module boundaries              |

**Why it matters:** module evaluation is depth-first. A cycle forces at least one module to receive an incomplete namespace object — accessing exports before evaluation finishes returns `undefined`. Bundlers may also produce larger or incorrect output.

**The output gives you the cycle path**, e.g. `src/auth.ts → src/user.ts → src/permissions.ts → src/auth.ts`. Identify the weakest edge from this directly.

---

### `boundary-violations`

User-defined zones (in `boundaries` config) are being crossed against the rules. Always act — either restructure the import or update the boundary config if it's a legitimate exception.

**Common false positives:**

- Shared utility zones that should be reachable from multiple zones — adjust rules.
- New boundaries on an existing codebase — start with `warn` severity.

---

### `type-only-dependencies` / `test-only-dependencies`

**Move to `devDependencies`.** Reduces production install size and clarifies intent.

- `type-only`: every import is `import type`.
- `test-only`: every import is from a file matching test patterns (`*.test.ts`, `*.spec.ts`, test directories).

---

### `stale-suppressions`

Two origins:

| Origin                                 | When stale                                          |
| -------------------------------------- | --------------------------------------------------- |
| `// fallow-ignore-next-line` / `-file` | Target line/file no longer has a matching issue     |
| `/** @expected-unused */` JSDoc tag    | The tagged export is now imported by another module |

**`@expected-unused` is the preferred mechanism for intentionally-dead exports** because it self-cleans — if the export becomes used again, you get told.

**Fix:** remove the comment or tag. Stale suppressions add noise and may hide future issues.

---

## Common false-positive patterns (quick lookup)

| Pattern                                       | Why Fallow flagged it                     | Fix                                                    |
| --------------------------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| Scripts run directly (`node scripts/seed.ts`) | Not imported by any module                | Add to `entry`, or reference via `package.json` script |
| DI / runtime wiring                           | Registered via DI container, not `import` | Add to `entry` or use `/** @public */`                 |
| Dynamic `require(variable)`                   | Path not statically resolvable            | Add directory to `entry`                               |
| Environment-specific files                    | Imported behind `process.env` checks      | Add to `entry` if always needed                        |
| Unsupported framework convention              | No plugin for this framework              | Add entries manually or write a custom plugin          |

**Verification step:** before acting on any flagged finding, use `--trace` (via `trace_export`, `trace_file`, or `trace_dependency`) to confirm. The trace output is the source of truth.

---

## Reading the summary line

```
Found 401 issues (17 errors, 384 warnings) in 0.16s
```

- **Total** spans all enabled issue types.
- **Errors** are the only ones that fail with `--fail-on-issues`.
- **Warnings** report but don't fail.

Filter with `--unused-files`, `--unused-exports`, etc. (or `issue_types: [...]` via MCP) to focus.

---

## Limitations to flag if the user pushes back

- **Fully runtime-computed paths** — `import(variable)` where `variable` has no static structure can't be resolved. Template literals like `import(\`./locales/${name}.json\`)`*are* resolved.`import.meta.glob`*is* resolved. Only fully opaque cases are a limitation. Fix by adding the directory to`entry`.
- **Syntactic only** — Fallow doesn't run `tsc`. Conditional types, dead code behind generic constraints, etc., need type resolution and may slip through.
- **Side-effect imports** — `import './polyfill'` is tracked as a file-level edge; the file isn't flagged unused, but its individual exports are still analyzed normally.

---

## Quick decision flow when reviewing findings

1. Sort by priority order (above).
2. For each finding, check the false-positive table.
3. If unsure, run the matching `trace_*` tool. Trust the trace.
4. For removals, propose to the user with the exact change. Wait for approval. Then `fix_apply` (for auto-fixable items) or write the edits yourself (for files / refactors).
5. Never skip the trace step on `unused-exports`, `unused-files`, or `unused-dependencies` — those are the three categories with the highest false-positive rate from dynamic patterns.
