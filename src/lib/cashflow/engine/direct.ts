import { SECTIONS, type Section } from "../data/manifest";
import type { Period } from "./calendar";
import type { Dataset, LedgerRow, Line } from "./data";

// Direct lines, the heat grid and the ledger filter (handoff 02 § 3.4, CF-ENG-11 … CF-ENG-16; mock `lineTotals()`,
// `sectionFlows()`, `heat()`, `ledgerRows()`). Cents throughout.

export interface Flow {
  in: number;
  out: number;
  net: number;
  n: number;
}

const zero = (): Flow => ({ in: 0, out: 0, net: 0, n: 0 });

/** Per direct line, over the ledger rows dated in months a … b. */
export function lineTotals(ds: Dataset, a: number, b: number): Flow[] {
  const t = ds.lines.map(zero);
  for (const r of ds.ledger) {
    if (r.m < a || r.m > b) continue;
    const x = t[r.line]!;
    if (r.c > 0) x.in += r.c;
    else x.out += r.c;
    x.net += r.c;
    x.n++;
  }
  return t;
}

export function sectionFlows(
  ds: Dataset,
  a: number,
  b: number,
): Record<Section, Flow> {
  const lt = lineTotals(ds, a, b);
  const s = Object.fromEntries(SECTIONS.map((k) => [k, zero()])) as Record<
    Section,
    Flow
  >;
  ds.lines.forEach((l, i) => {
    const x = s[l.section];
    const y = lt[i]!;
    x.in += y.in;
    x.out += y.out;
    x.net += y.net;
    x.n += y.n;
  });
  return s;
}

export interface HeatCell {
  in: number;
  out: number;
  n: number;
}

export interface Heat {
  rows: Line[];
  /** grid[row][day of the window] */
  grid: HeatCell[][];
}

/** One row per line of the activity, one column per calendar date of the window, never aggregated (CF-ENG-12). */
export function heat(ds: Dataset, sec: Section, p: Period): Heat {
  const rows = ds.lines.filter((l) => l.section === sec);
  const pos = new Map(rows.map((l, j) => [l.i, j]));
  const grid = rows.map(() =>
    Array.from({ length: p.days }, (): HeatCell => ({ in: 0, out: 0, n: 0 })),
  );
  for (const r of ds.ledger) {
    if (r.d < p.d0 || r.d > p.d1) continue;
    const j = pos.get(r.line);
    if (j === undefined) continue;
    const c = grid[j]![r.d - p.d0]!;
    if (r.c > 0) c.in += r.c;
    else c.out += r.c;
    c.n++;
  }
  return { rows, grid };
}

/** Cash moved in a cell: in − out, absolute. */
export const cellValue = (c: HeatCell) => c.in - c.out;

export interface LedgerFilter {
  sec: Section;
  /** line index, or null for every line of the activity */
  line: number | null;
  d0: number;
  d1: number;
}

/** Rows of one activity or line, dated d0 … d1, by date, transaction, amount (CF-ENG-16). */
export function ledgerRows(ds: Dataset, f: LedgerFilter): LedgerRow[] {
  return ds.ledger
    .filter(
      (r) =>
        r.d >= f.d0 &&
        r.d <= f.d1 &&
        (f.line !== null
          ? r.line === f.line
          : ds.lines[r.line]!.section === f.sec),
    )
    .sort((x, y) => x.d - y.d || x.txn - y.txn || x.c - y.c);
}

export function ledgerSummary(rows: readonly LedgerRow[]): Flow {
  const s = zero();
  for (const r of rows) {
    if (r.c > 0) s.in += r.c;
    else s.out += r.c;
    s.net += r.c;
    s.n++;
  }
  return s;
}
