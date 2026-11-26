import type { Section } from "../data/manifest";
import { span, type Dataset, type StatementAccount } from "./data";

// The indirect statement with the S01 override on (handoff 02 § 3.3, CF-ENG-06 … CF-ENG-10; mock `statement()`,
// `stmtRows()`, `niceMax()`). Values are cents; `op + iv + fn = net`.

export interface StatementLine extends StatementAccount {
  val: number;
}

export interface Statement {
  open: number;
  close: number;
  net: number;
  ni: number;
  dep: StatementLine[];
  wc: StatementLine[];
  inv: StatementLine[];
  fin: StatementLine[];
  adj: number;
  op: number;
  iv: number;
  fn: number;
}

export function statement(ds: Dataset, a: number, b: number): Statement {
  const ni = span(ds.series.netIncome, a, b);
  const pick = (g: StatementAccount["group"]) =>
    ds.accounts
      .filter((x) => x.group === g)
      .map((x) => ({ ...x, val: span(x.adj, a, b) }))
      .filter((x) => x.val !== 0);
  const dep = pick("DEP");
  const wc = pick("OP");
  const inv = pick("INV");
  const fin = pick("FIN");
  const tot = (rs: StatementLine[]) => rs.reduce((s, x) => s + x.val, 0);
  const adj = tot(dep) + tot(wc);
  const open = ds.series.cashOpen[a]!;
  const close = ds.series.cashClose[b]!;
  return {
    open,
    close,
    net: close - open,
    ni,
    dep,
    wc,
    inv,
    fin,
    adj,
    op: ni + adj,
    iv: tot(inv),
    fn: tot(fin),
  };
}

export type RowKind =
  "bal" | "gap" | "secx" | "data" | "sub" | "tot" | "sect" | "grand";

export interface StatementRow {
  k: RowKind;
  label: string;
  /** cents, or null when the row prints no value */
  val: number | null;
  /** indent level */
  d: number;
  sec?: Section;
  open?: boolean;
  override?: boolean;
  /** `open` / `end` on the two balance rows */
  edge?: "open" | "end";
}

export const SECTION_NAME: Record<Section, string> = {
  OP: "Operating",
  INV: "Investing",
  FIN: "Financing",
};

/** The row list of § 3.3 for the expanded sections `exp`. */
export function statementRows(
  st: Statement,
  exp: ReadonlySet<Section>,
): StatementRow[] {
  const R: StatementRow[] = [];
  const row = (r: Omit<StatementRow, "d"> & { d?: number }) =>
    R.push({ d: 0, ...r });
  const section = (sec: Section, total: number, kids: () => void) => {
    const label = `${SECTION_NAME[sec]} activities`;
    const open = exp.has(sec);
    row({ k: "secx", label, val: open ? null : total, sec, open });
    if (!open) return;
    kids();
    row({
      k: "sect",
      label: `Net cash from ${label.toLowerCase()}`,
      val: total,
      sec,
    });
  };
  row({
    k: "bal",
    label: "Cash at beginning of period",
    val: st.open,
    edge: "open",
  });
  row({ k: "gap", label: "", val: null });
  section("OP", st.op, () => {
    row({ k: "data", label: "Net income", val: st.ni, d: 1 });
    row({
      k: "sub",
      label: "Adjustments to reconcile net income",
      val: null,
      d: 1,
    });
    st.dep.forEach((x) => row({ k: "data", label: x.label, val: x.val, d: 2 }));
    if (st.wc.length)
      row({
        k: "sub",
        label: "Changes in operating assets and liabilities",
        val: null,
        d: 2,
      });
    st.wc.forEach((x) => row({ k: "data", label: x.label, val: x.val, d: 3 }));
    row({ k: "tot", label: "Total adjustments", val: st.adj, d: 1 });
  });
  section("INV", st.iv, () =>
    st.inv.forEach((x) => row({ k: "data", label: x.label, val: x.val, d: 1 })),
  );
  section("FIN", st.fn, () =>
    st.fin.forEach((x) =>
      row({
        k: "data",
        label: x.label,
        val: x.val,
        d: 1,
        override: x.override,
      }),
    ),
  );
  row({ k: "gap", label: "", val: null });
  row({ k: "grand", label: "Net increase (decrease) in cash", val: st.net });
  row({ k: "bal", label: "Cash at end of period", val: st.close, edge: "end" });
  return R;
}

const NICE = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** The smallest of NICE × 10^⌊log10 v⌋ that is ≥ v; 1 when v ≤ 0 (CF-ENG-10). */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const e = 10 ** Math.floor(Math.log10(v));
  for (const f of NICE) if (f * e >= v) return f * e;
  return 10 * e;
}

/** The bar axis maximum (cents) over the rows on screen that are not balance rows; at least one dollar. */
export function barAxisMax(rows: readonly StatementRow[]): number {
  let m = 100;
  for (const r of rows)
    if (r.k !== "bal" && r.val !== null) m = Math.max(m, Math.abs(r.val));
  return niceMax(m);
}
