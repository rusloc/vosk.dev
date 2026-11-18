# Duplication

The cost of duplication is a fix applied to one copy and not the others. The cost of the wrong abstraction is a shared
function with six flags that no one dares change. Report the first; do not cause the second.

## Kinds, from easiest to hardest to see

1. **Exact copies**: the scan reports them. Whole files, or blocks of 8+ lines.
2. **Near copies**: same shape, different names or literals. Open each scan hit and its neighbours; grep for a
   distinctive line from one copy.
3. **Parallel implementations**: two functions doing one job written apart: `formatDate` in three folders, two fetch
   wrappers, two debounce helpers, two modal components. Find them by name and by purpose: grep for `format`, `parse`,
   `debounce`, `fetch`, `request`, `storage`, `classNames`, `Modal`, `Button`, `Spinner`, `use*Query`.
4. **Reimplemented library or platform code**: hand-written deep clone, group-by, query-string parsing, date math or
   `uniqBy`, when the platform (`structuredClone`, `URLSearchParams`, `Intl`, `Object.groupBy`) or an installed
   dependency already does it.
5. **Structural repetition**: every route handler repeats auth, parse, validate, try/catch, respond; every form repeats
   the same state and submit wiring; every list page repeats fetch, loading, error, empty.
6. **Types and schemas**: one shape declared as a TS interface, a validation schema, an API type and a form type. Fix:
   one source, the rest derived.
7. **Constants and config**: the same URL, magic number, breakpoint, colour, regex or error string in several files.
8. **Styles and markup**: repeated long class lists or style blocks; the same card or row markup pasted across pages.
9. **Tests**: the same setup pasted into every file. Lower priority; report once with a fixture or factory suggestion.
10. **Dependencies**: two libraries for one job, or two versions of one library.

## Deciding whether to merge

Merge when the copies must change together: same rule, same reason to change. Three or more copies is the usual
threshold; two copies of a real business rule (a price calculation, a permission check) is already enough.

Leave alone when:
- the copies only look alike and belong to features that will diverge;
- merging needs a flag or mode parameter per caller;
- the block is under about five lines and reads clearly in place;
- it is test code where explicit repetition aids reading;
- the copies sit in separately deployed packages with no sensible shared home.

Say so in the report when duplication was found and judged acceptable, in one line, so it is not re-raised next time.

## Reporting

For each finding give: the copies (all paths and line ranges), the count of duplicated lines, what differs between
copies, where the single version should live (a path consistent with the layout), and its signature. If the copies
have already drifted, say which one is correct or that this needs deciding: drift is where the bugs are.

Give a total: duplicated lines found, and the share of the scanned code, with the scan settings used.
