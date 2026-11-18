# Logical blocks

A block is a function, a component, a hook, a class or a module. A good block does one job, says so in its name,
shows its inputs and outputs in its signature, and can be read top to bottom without scrolling back.

## Function and component level

- **Length**: the scan lists the longest functions. Past ~50 lines for a function or ~150 for a component, look for
  the seams: comment headers like `// validate`, `// build payload`, blank-line paragraphs and reused local names mark
  the blocks that want to be separate functions.
- **More than one job**: fetch and transform and render; validate and persist and notify. The name gives it away
  (`handleSubmitAndRedirect`, `processData`, `useEverything`).
- **Mixed levels**: business rules next to string formatting and DOM calls in one body.
- **Nesting**: more than three levels of `if`, loop or callback. Fix: guard clauses and early returns, extract the inner block.
- **Parameters**: more than four positional arguments; boolean flags that switch behaviour (`render(true, false)`). Fix: an
  options object, or two functions.
- **Order inside a block**: declarations far from first use; inputs mutated; a result built in three separate places.
- **Hidden inputs and outputs**: reads module state, `window`, time or randomness with no parameter for it; writes
  to something outside itself as a surprise.
- **Conditionals**: long `if/else if` or `switch` on a type string repeated in several files. Fix: a lookup table or
  a discriminated union handled in one place.
- **Error handling**: `try` wrapped around a whole function; empty `catch`; errors caught, logged and swallowed; the same
  try/catch boilerplate in every handler.
- **Async**: mixed `.then` and `await` in one function; unawaited promises; `async` on functions that never await.

## Component and hook level

- JSX with inline logic: long ternary chains, `.filter().map()` pipelines and handlers of ten lines inside the markup.
- A component past ~5 `useState` calls or ~3 `useEffect` calls. Fix: a reducer, a custom hook, or a split.
- Effects doing more than one thing, or used for derivation or event handling rather than synchronisation.
- Hooks that return a dozen values, or that hide a fetch, a subscription and a navigation side effect together.
- Prop drilling through three or more layers; props passed whole (`user`) where one field is used; over 8 to 10 props.
- Container and presentation fused: data access inside a component that is otherwise pure markup and is reused elsewhere.
- Components defined inside other components (remounts every render: a speed finding too).

## Module level

- **Cohesion**: exports of a module that are never used together by any importer belong in different modules.
- **Coupling**: a module with very high fan-out knows too much; one with very high fan-in and frequent edits is a risk.
- **Layer leaks**: SQL or ORM calls in route handlers and components; HTTP details (`req`, `res`, status codes) in
  domain functions; UI strings in services.
- **Side effects at import**: top-level code that connects, registers, fetches or reads env beyond constants.
- **State**: module-level mutable singletons; one fact stored in two places (URL and store, server cache and local state).
- **Dead and speculative code**: unused exports, unreachable branches, options no caller passes, abstractions with one
  implementation and one caller.

## Type modelling (TypeScript)

Types are blocks too, and loose ones push logic into every caller.

- `any`, non-null `!` and `as` casts on hot or shared paths: count them and list the worst files.
- Bags of optional fields where a discriminated union would make illegal states unrepresentable.
- Boolean pairs encoding one state (`isLoading`, `isError`, `isSuccess`). Fix: one `status` union.
- Stringly-typed ids, statuses and routes with no union or branded type.
- Types that restate what could be inferred from a schema or function (`z.infer`, `ReturnType`, `typeof`).
- Enormous inline object types repeated at call sites.

## Reporting

Name the seam. "Split this" is not a fix; "lines 40-78 validate the form, 80-131 build the payload, 133-170 call the API:
three functions, the first two pure" is.
