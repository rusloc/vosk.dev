import type { Period } from "./calendar";
import { span, type Dataset } from "./data";
import { lineTotals } from "./direct";
import { statement } from "./statement";

// KPIs and the Diagram's metrics (handoff 02 § 3.5, CF-ENG-17, CF-ENG-18; mock `metrics()`). Money in cents, ratios
// unrounded, null where the table says so. Line codes may be named here (CF-ARC-05).

export interface Metrics {
  close: number;
  net: number;
  cfo: number;
  inv: number;
  fin: number;
  fcf: number;
  revenue: number;
  ni: number;
  /** cash conversion, raw (the control tie); null when net income is zero */
  conv: number | null;
  /** faces show n/m unless net income is positive */
  convMeaningful: boolean;
  margin: number | null;
  accruals: number;
  dso: number | null;
  dpo: number | null;
  ccc: number | null;
  capex: number;
  capexIntensity: number | null;
  capexCoverage: number | null;
  debtService: number;
  dscr: number | null;
  ebitda: number;
  netDebt: number;
  netDebtEbitda: number | null;
  draws: number;
  payout: number | null;
  days: number;
}

export function metrics(ds: Dataset, p: Pick<Period, "a" | "b">): Metrics {
  const { a, b } = p;
  const days = ds.mEnd[b]! - ds.mStart[a]! + 1;
  const st = statement(ds, a, b);
  const lt = lineTotals(ds, a, b);
  const L = (code: string) => {
    const l = ds.lineByCode.get(code);
    if (!l) throw new Error(`direct line ${code} is not in the data`);
    return lt[l.i]!.net;
  };
  const S = ds.series;
  const revenue = span(S.revenue, a, b);
  const ni = st.ni;
  const cfo = st.op;
  const capex = -L("D_INV_PURCHASE");
  const fcf = cfo - capex + L("D_INV_PROCEEDS");
  const spend = span(S.spend, a, b);
  const debtService = -L("D_PAY_INT") + span(S.termPrincipal, a, b);
  const draws = -L("D_FIN_DRAWS");
  const ebitda = ni + span(S.interest, a, b) + span(S.depreciation, a, b);
  const ebitdaAnn = (ebitda * 12) / (b - a + 1);
  const netDebt = S.debtClose[b]! - st.close;
  const dso = revenue > 0 ? (S.arClose[b]! / revenue) * days : null;
  const dpo = spend > 0 ? (S.apClose[b]! / spend) * days : null;
  /** x ÷ y when y is positive (the mock's `ratio`) */
  const ratio = (x: number, y: number) => (y > 0 ? x / y : null);
  return {
    close: st.close,
    net: st.net,
    cfo,
    inv: st.iv,
    fin: st.fn,
    fcf,
    revenue,
    ni,
    conv: ni !== 0 ? cfo / ni : null,
    convMeaningful: ni > 0,
    margin: revenue > 0 ? cfo / revenue : null,
    accruals: ni - cfo,
    dso,
    dpo,
    ccc: dso !== null && dpo !== null ? dso - dpo : null,
    capex,
    capexIntensity: revenue > 0 ? capex / revenue : null,
    capexCoverage: ratio(cfo, capex),
    debtService,
    dscr: ratio(cfo, debtService),
    ebitda,
    netDebt,
    netDebtEbitda: ebitdaAnn > 0.5 ? netDebt / ebitdaAnn : null, // the mock: > 0.005 USD
    draws,
    payout: ratio(cfo, draws),
    days,
  };
}
