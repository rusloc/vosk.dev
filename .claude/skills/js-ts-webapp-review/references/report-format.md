# Report format

Keep the structure fixed so reports can be compared across runs. Scale length to scope: a folder review may have six
findings; a repo review should still stop at about 25 and say what was left out.

```markdown
# Code review: <target>

**Verdict:** <one sentence: the single biggest problem and how bad>
**Scope:** <paths> · <files> files, <lines> lines · <stack in one line> · axes: <which>

## Scorecard

| Axis | Grade | P0 | P1 | P2 | Worst offender |
|---|---|---|---|---|---|
| Speed | C | 2 | 4 | 3 | `src/features/orders/OrderTable.tsx` |
| Layout | B | 0 | 3 | 2 | `src/utils/` (41 files) |
| Logical blocks | D | 1 | 6 | 4 | `src/pages/checkout.tsx` (412-line component) |
| Duplication | C | 0 | 5 | 1 | 3 copies of `formatMoney` |

Numbers: <duplicated lines and share> · <cycles> import cycles · <largest file> · <longest function>

## Findings

### Speed

#### S1 · P0 · Quadratic lookup on every render
- **Where:** `src/features/orders/OrderTable.tsx:88-97`
- **What:** `orders.map` calls `customers.find` per row: 2,000 × 2,000 comparisons per render.
- **Cost:** blocks the main thread on each filter keystroke (unmeasured; confirm with React Profiler).
- **Fix:** build `customersById` once with `useMemo`, then `customersById.get(o.customerId)`.

(then S2…, then ### Layout L1…, ### Logical blocks B1…, ### Duplication D1…)

## Fix order

1. <finding ids> — <why first: unblocks others or biggest gain for least change> — <rough size: S/M/L>
2. …

## Solid
<one or two lines on what needs no change, so it is left alone>

## Not reviewed
<paths or axes skipped, and anything that could not be measured>
```

Rules:

- Grades: A (nothing above P2), B (P1s only, few), C (several P1s or one P0), D (several P0s), F (the axis blocks work).
- Ids are stable prefixes per axis: `S`, `L`, `B`, `D`. A finding that spans axes is filed under the one where the fix lives
  and mentioned by id in the other.
- Order findings by severity inside each axis, then by fan-in of the file.
- Code in a finding: at most about 12 lines, before and after. Longer rewrites are a follow-up, not part of the review.
- On a repeat review, add a "Since last review" line under the verdict: fixed, still open, new.
