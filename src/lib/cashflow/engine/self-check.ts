import { SECTIONS } from "../data/manifest";
import { keyPeriod, period, ym, lastIx, type Period } from "./calendar";
import type { Dataset } from "./data";
import { heat, ledgerRows, lineTotals, sectionFlows } from "./direct";
import { metrics } from "./metrics";
import { statement } from "./statement";

// Ties to the control totals (handoff 02 § 3.7, CF-ENG-24, CF-ENG-25; mock `selfCheck()`). Per control period 44 checks:
// 12 head checks, then per direct line the heat row sum and the ledger sum against DIRECT_LINE. Without a key it runs
// every control period and adds the structural checks for Q3 of the last year and YTD of the last month.

export interface Check {
  period: string;
  metric: string;
  /** USD (M16: the raw ratio), null when the page has no value */
  page: number | null;
  control: number;
  ok: boolean;
}

const TOL = 0.005;

/** The control periods carried by control.parquet, in file order. */
export function controlKeys(ds: Dataset): string[] {
  const keys = new Set<string>();
  for (const k of ds.control.keys()) keys.add(k.split("|")[0]!);
  return [...keys];
}

export function selfCheck(
  ds: Dataset,
  only?: string,
): { pass: boolean; rows: Check[] } {
  const out: Check[] = [];
  const keys = controlKeys(ds).filter((k) => !only || k === only);
  for (const key of keys) {
    const p = keyPeriod(ds, key);
    const C = (metric: string, scope: string) =>
      ds.control.get(`${key}|${metric}|${scope}`) ?? 0;
    const st = statement(ds, p.a, p.b);
    const mt = metrics(ds, p);
    const add = (
      metric: string,
      page: number | null,
      control: number,
      tol = TOL,
    ) =>
      out.push({
        period: key,
        metric,
        page,
        control,
        ok: page !== null && Math.abs(page - control) <= tol,
      });
    const usd = (c: number) => c / 100;
    add("M01 opening (statement)", usd(st.open), C("M01", "ALL"));
    add("M02 closing (statement)", usd(st.close), C("M02", "ALL"));
    add("M03 net change (statement)", usd(st.net), C("M03", "ALL"));
    add("M06 operating (statement)", usd(st.op), C("M06", "OVERRIDES_ON"));
    add("M07 investing (statement)", usd(st.iv), C("M07", "OVERRIDES_ON"));
    add("M08 financing (statement)", usd(st.fn), C("M08", "OVERRIDES_ON"));
    add("M03 = sections", usd(st.op + st.iv + st.fn), C("M03", "ALL"));
    const fl = sectionFlows(ds, p.a, p.b);
    const cin = SECTIONS.reduce((s, k) => s + fl[k].in, 0);
    const cout = SECTIONS.reduce((s, k) => s + fl[k].out, 0);
    add("M09 cash in (cash balance card)", usd(cin), C("M09", "ALL"));
    add("M10 cash out (cash balance card)", usd(cout), C("M10", "ALL"));
    add(
      "M02 = opening + in + out (cash balance card)",
      usd(st.open + cin + cout),
      C("M02", "ALL"),
    );
    add("M15 free cash flow (KPI)", usd(mt.fcf), C("M15", "ALL"));
    const m16 = C("M16", "ALL");
    add(
      "M16 cash conversion (KPI)",
      mt.conv,
      m16,
      1e-6 * Math.max(1, Math.abs(m16)),
    );
    for (const sec of SECTIONS) {
      const h = heat(ds, sec, p);
      h.rows.forEach((l, j) => {
        const ctl = C("DIRECT_LINE", l.code);
        const rowSum = h.grid[j]!.reduce((s, c) => s + c.in + c.out, 0);
        add(`DIRECT_LINE ${l.code} (heatmap row)`, usd(rowSum), ctl);
        const lr = ledgerRows(ds, { sec, line: l.i, d0: p.d0, d1: p.d1 });
        add(
          `DIRECT_LINE ${l.code} (ledger)`,
          usd(lr.reduce((s, r) => s + r.c, 0)),
          ctl,
        );
      });
    }
  }
  if (!only) {
    const [ly, lm] = ym(ds, lastIx(ds));
    const cases: [string, Period][] = [
      [`Q3-${ly}`, period(ds, "Q", ly, 9)],
      [`YTD-${ly}-${String(lm).padStart(2, "0")}`, period(ds, "Y", ly, lm)],
    ];
    for (const [key, p] of cases) {
      const [ay, am] = ym(ds, p.a);
      const [by, bm] = ym(ds, p.b);
      const expDays =
        (Date.UTC(by, bm, 1) - Date.UTC(ay, am - 1, 1)) / 86_400_000;
      const lt = lineTotals(ds, p.a, p.b);
      for (const sec of SECTIONS) {
        const h = heat(ds, sec, p);
        const cols = h.grid[0]?.length ?? 0;
        out.push({
          period: key,
          metric: `heat columns = calendar days (${sec})`,
          page: cols,
          control: expDays,
          ok: cols === expDays && p.days === expDays,
        });
        h.rows.forEach((l, j) => {
          const rowSum = h.grid[j]!.reduce((s, c) => s + c.in + c.out, 0);
          out.push({
            period: key,
            metric: `heat row sum = row total ${l.code}`,
            page: rowSum / 100,
            control: lt[l.i]!.net / 100,
            ok: rowSum === lt[l.i]!.net,
          });
        });
      }
    }
  }
  return { pass: out.every((r) => r.ok), rows: out };
}
