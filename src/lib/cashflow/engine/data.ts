import type { RowOf } from "@/lib/cashflow/data/parquet-columns";
import {
  CLEARED,
  type AccountGroup,
  type Cleared,
  type FILES,
  type Manifest,
  type Section,
} from "../data/manifest";

// The engine's one input (CF-ARC-04): a Dataset built once from the manifest and the four tables. Pure: no fetch, no
// DOM, no clock. Days are integers counted from the manifest's start_date (UTC); money is integer cents (D-2).

const DAY_MS = 86_400_000;

export type Files = {
  [K in keyof typeof FILES]: RowOf<(typeof FILES)[K]["columns"]>[];
};

export interface Line {
  i: number;
  code: string;
  section: Section;
  label: string;
  direction: string;
}

export interface StatementAccount {
  id: number;
  label: string;
  group: AccountGroup;
  override: boolean;
  /** monthly adjustment, cents (−net change, so an asset increase is an outflow) */
  adj: number[];
}

export interface LedgerRow {
  /** day index from start_date */
  d: number;
  /** month index */
  m: number;
  line: number;
  cp: number;
  txn: number;
  type: string;
  doc: string;
  /** cents, in +, out − */
  c: number;
  cl: Cleared;
  memo: string;
}

export interface MonthSeries {
  cashOpen: number[];
  cashClose: number[];
  netIncome: number[];
  revenue: number[];
  interest: number[];
  depreciation: number[];
  arClose: number[];
  apClose: number[];
  spend: number[];
  debtClose: number[];
  termPrincipal: number[];
}

export interface Dataset {
  company: string;
  currency: string;
  /** UTC ms of start_date: day 0 */
  day0: number;
  asOf: string;
  months: string[];
  /** first day of each month, as a day index */
  mStart: number[];
  /** last day of each month, as a day index */
  mEnd: number[];
  lines: Line[];
  lineByCode: Map<string, Line>;
  accounts: StatementAccount[];
  counterparties: Map<number, string>;
  series: MonthSeries;
  ledger: LedgerRow[];
  /** `${period_key}|${metric_code}|${scope}` → value (USD) */
  control: Map<string, number>;
}

export const utcOf = (iso: string) =>
  Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

export function buildDataset(manifest: Manifest, files: Files): Dataset {
  const day0 = utcOf(manifest.start_date);
  const months = manifest.months;
  const N = months.length;
  const monthIx = new Map(months.map((k, i) => [k, i]));
  const mStart = months.map((k) => (utcOf(`${k}-01`) - day0) / DAY_MS);
  const after = (k: string) => {
    const y = +k.slice(0, 4);
    const m = +k.slice(5, 7);
    return m === 12 ? Date.UTC(y + 1, 0, 1) : Date.UTC(y, m, 1);
  };
  const mEnd = months.map((k) => (after(k) - day0) / DAY_MS - 1);

  if (files.month.length !== N)
    throw new Error(`month.parquet: ${files.month.length} rows, ${N} months`);
  const ordered = files.month.map((r, i) => {
    if (r.month_key !== months[i])
      throw new Error(
        `month.parquet row ${i}: ${r.month_key}, expected ${months[i]}`,
      );
    return r;
  });
  const col = (f: (r: Files["month"][number]) => number) => ordered.map(f);
  const series: MonthSeries = {
    cashOpen: col((r) => r.cash_open),
    cashClose: col((r) => r.cash_close),
    netIncome: col((r) => r.net_income),
    revenue: col((r) => r.revenue),
    interest: col((r) => r.interest_expense),
    depreciation: col((r) => r.depreciation_expense),
    arClose: col((r) => r.ar_close),
    apClose: col((r) => r.ap_close),
    spend: col((r) => r.spend),
    debtClose: col((r) => r.debt_close),
    termPrincipal: col((r) => r.term_principal),
  };

  const adj = new Map<number, number[]>();
  for (const r of files.statementMonth) {
    const mi = monthIx.get(r.month_key);
    if (mi === undefined)
      throw new Error(`statement-month: month ${r.month_key}`);
    let a = adj.get(r.account_id);
    if (!a) adj.set(r.account_id, (a = new Array<number>(N).fill(0)));
    a[mi] = r.adjustment_cents;
  }
  const accounts = manifest.accounts.map((a) => ({
    ...a,
    adj: adj.get(a.id) ?? new Array<number>(N).fill(0),
  }));

  const lines: Line[] = manifest.lines.map((l, i) => ({ i, ...l }));
  const lineByCode = new Map(lines.map((l) => [l.code, l]));
  const last = mEnd[N - 1]!;
  const ledger: LedgerRow[] = files.ledger.map((r, k) => {
    const d = (utcOf(r.txn_date) - day0) / DAY_MS;
    const m = monthIx.get(r.txn_date.slice(0, 7));
    const line = lineByCode.get(r.line_code);
    if (m === undefined || d < 0 || d > last || !line)
      throw new Error(`ledger row ${k}: ${r.txn_date} ${r.line_code}`);
    if (!(CLEARED as readonly string[]).includes(r.cleared))
      throw new Error(`ledger row ${k}: cleared ${r.cleared}`);
    return {
      d,
      m,
      line: line.i,
      cp: r.counterparty_id,
      txn: r.txn_id,
      type: r.txn_type,
      doc: r.doc_number,
      c: r.amount_cents,
      cl: r.cleared as Cleared,
      memo: r.memo,
    };
  });

  return {
    company: manifest.company,
    currency: manifest.currency,
    day0,
    asOf: manifest.as_of,
    months,
    mStart,
    mEnd,
    lines,
    lineByCode,
    accounts,
    counterparties: new Map(manifest.counterparties.map((c) => [c.id, c.name])),
    series,
    ledger,
    control: new Map(
      files.control.map((r) => [
        `${r.period_key}|${r.metric_code}|${r.scope}`,
        r.value,
      ]),
    ),
  };
}

/** Σ arr[a..b] */
export function span(arr: readonly number[], a: number, b: number): number {
  let s = 0;
  for (let i = a; i <= b; i++) s += arr[i]!;
  return s;
}
