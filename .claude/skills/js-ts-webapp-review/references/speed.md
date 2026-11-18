# Speed

Speed means four different things in a web app. Say which one a finding is about.

## Contents
1. Algorithmic and data-structure cost
2. Client rendering
3. Data fetching and network
4. Bundle and loading
5. Server and API paths
6. Build, type-check and test time
7. How to measure

## 1. Algorithmic and data-structure cost

Look in loops, list transforms, selectors and anything that runs per request or per render.

- Nested lookup: `.find`, `.filter`, `.includes` or `.indexOf` inside `.map`, `.forEach` or a loop over a list of the same
  order. Fix: build a `Map` or `Set` once.
- Chained passes over large arrays (`.filter().map().filter().reduce()`) on hot paths; several chains over the same
  source that could be one pass.
- Spread in a reducer or loop: `acc = [...acc, x]` or `{...acc, [k]: v}` inside `reduce` is quadratic.
- Sorting or deep cloning (`structuredClone`, `JSON.parse(JSON.stringify())`) on every call or render.
- Regular expressions compiled inside loops; `new Intl.*Format` or `new Date` parsing per row.
- `await` in a `for` loop over independent work. Fix: `Promise.all`, with a concurrency cap for large sets.
- Repeated work with no cache: the same derivation, parse or fetch computed in several places per request.
- Sync file, crypto or compression calls (`*Sync`) on a request path.

## 2. Client rendering

React is named here; the same ideas apply to Vue and Svelte with their own primitives.

- State placed too high, so a keystroke re-renders a page. Fix: move state down or split the component.
- New object, array or function props created per render and passed to memoized or large children.
- Context holding a value that changes often and is read by many components. Fix: split contexts or use a selector store.
- Derived state stored in `useState` and synced with `useEffect`. Fix: compute during render; memoize only if measured.
- Effects that fetch, then set state, then trigger another effect.
- Long lists rendered whole (hundreds of rows) with no virtualization or pagination.
- Missing or unstable `key` (array index on a reorderable list).
- `useMemo` and `useCallback` wrapped around cheap work, or with dependencies that change every render: cost with no gain.
- Layout thrash: reading layout (`offsetHeight`, `getBoundingClientRect`) and writing styles in the same loop.
- Unthrottled `scroll`, `resize`, `mousemove` or input handlers doing real work.
- Hydration cost: large client components that could render on the server; `"use client"` at the top of a tree.

## 3. Data fetching and network

- Waterfalls: sequential awaits for independent data; parent fetches, then child fetches on mount.
- N+1: a request or query per list item.
- Over-fetching: whole records for a list view, no pagination, no field selection.
- No caching or dedup layer: the same endpoint called from several components per page.
- Client fetch for data known at request or build time.
- No abort or stale-response guard on search-as-you-type.
- Polling where a push or a longer interval would do.

## 4. Bundle and loading

- Heavy dependency for a small job (`moment`, full `lodash`, a UI kit for one component). Check the import form:
  `import _ from "lodash"` pulls everything.
- Barrel files (`index.ts` re-exporting a folder) imported from client code, which can defeat tree shaking and slow
  dev servers. Confirm with the bundler in use before reporting.
- No route-level or component-level code splitting for heavy, rarely used screens (editors, charts, maps, admin).
- Server-only code or large JSON imported into client modules.
- Duplicate copies of one library in the lockfile; two libraries doing the same job (two date libraries, two fetch wrappers).
- Unoptimized images and fonts: no dimensions, no lazy loading below the fold, many font weights, render-blocking CSS.
- Third-party scripts loaded synchronously in the head.
- Polyfills and build targets older than the supported browsers need.

## 5. Server and API paths

- Work done per request that belongs at startup: config parsing, client construction, schema compilation.
- Missing indexes implied by query shape; unbounded queries; `SELECT *` into a mapper that uses three fields.
- Serial awaits across independent I/O; no timeouts on outbound calls.
- Large JSON bodies built in memory where a stream fits; no compression; no cache headers on static or stable responses.
- Middleware that runs on every route but is needed by a few.
- Cold-start weight in serverless or edge functions: large imports at module top level.

## 6. Build, type-check and test time

Developer speed is speed.

- `tsc` cost: very large unions, deep conditional or recursive types, missing `skipLibCheck`, no `incremental`, no
  project references in a large monorepo, `include` globs that pull in build output.
- Import cycles and giant barrels that force the type checker and bundler to load the world.
- Tests that boot the whole app for a unit check; no test isolation, so runs cannot be parallel.
- Lint or format steps that run over generated files.

## 7. How to measure

State the method with every number. Useful ones, cheapest first:

- Static: scan output, import form, lockfile, build output sizes already on disk.
- `tsc --noEmit --extendedDiagnostics` for check time and type counts.
- The framework's build output or a bundle analyzer for chunk sizes.
- For runtime claims without a profiler: count the work. "2,000 rows × 2,000 lookups per render" is a measurement of a kind.
- When nothing can be measured in the session, mark the finding "unmeasured" and name the tool the user should run
  (React Profiler, Lighthouse, `EXPLAIN ANALYZE`, `--cpu-prof`).
