// Shared by the clients, loans and portfolio views; its own module so loans.ts and clients.ts do not import each other.

/**
 * Heat level 0 … 1 of each cell over every shown cell, all rows and columns together (2026-11-01, owner: one gradient
 * for the whole grid, grey → yellow → orange → red; it was four grey steps). Blank cells stay null.
 */
export function heatLevels(
  values: readonly (number | null)[],
): (number | null)[] {
  const v = values.filter((x): x is number => x !== null);
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  return values.map((x) =>
    x === null ? null : hi > lo ? (x - lo) / (hi - lo) : 0,
  );
}
