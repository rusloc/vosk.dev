// Five equal-count blocks (handoff 02 § 3.4, CF-ENG-13, CF-ENG-14; mock `quint()`): the block of a value is
// clamp(ceil((index of its last occurrence + 1) × 5 ÷ n), 1, 5) over the values sorted ascending, so equal values share
// a block and ties go up; block 5 is the top 20 %. Per block the smallest and largest value (legend tooltips).

export interface Quintiles {
  /** block 1–5 of a value in the set; 0 for a value not in it (or an empty set) */
  block(v: number): number;
  /** per block (index 0 = block 1): smallest and largest value, null when the block is empty */
  bounds: ({ min: number; max: number } | null)[];
}

export function quintiles(values: readonly number[]): Quintiles {
  const a = [...values].sort((x, y) => x - y);
  const n = a.length;
  const last = new Map<number, number>();
  a.forEach((v, i) => last.set(v, i));
  const block = (v: number) => {
    const i = last.get(v);
    return n && i !== undefined
      ? Math.min(5, Math.max(1, Math.ceil(((i + 1) * 5) / n)))
      : 0;
  };
  const bounds: Quintiles["bounds"] = [null, null, null, null, null];
  for (const v of a) {
    const k = block(v) - 1;
    const b = bounds[k];
    bounds[k] = b
      ? { min: b.min, max: Math.max(b.max, v) }
      : { min: v, max: v };
  }
  return { block, bounds };
}
