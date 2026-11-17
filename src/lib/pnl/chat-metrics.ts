import type { Dataset } from "./data/dataset";
import { aggregateAccounts } from "./engine/aggregate";
import type { Translation } from "./engine/aggregate";
import { formatAmount, formatPercent, formatPoints } from "./engine/format";
import { createFx } from "./engine/fx";
import { companyName } from "./engine/header";
import { windowLabel } from "./engine/notices";
import { createSliceCache, SLICE_DIMS } from "./engine/slices";
import type { SliceDim } from "./engine/slices";
import { buildSpine, evaluateSpine } from "./engine/spine";
import { kpiStatus, STATUS_TEXT } from "./engine/thresholds";
import type {
  BaseChoice,
  ColumnPlan,
  EntityView,
  MonthNumber,
  ReportingCurrency,
  Selection,
  TimeView,
} from "./engine/types";
import { hasNoData, versionPlan } from "./engine/versions";
import { createSelectionCodec } from "./state/selection-schema";

// The P&L metric catalogue for the report chat (2026-11-09; the Mirelo recipe, src/lib/mirelo/chat-metrics.ts; the
// list of what finance executives ask first: .log/report/2026-11-09-pnl-exec-metrics.md): every figure the chat may
// name, with its formula, the cuts it takes and how it reads on the same scans the report's views use (slices.ts,
// aggregate.ts, spine.ts). `get_metric` computes and formats here, so the model quotes and never computes. Amounts
// are signed as the statement is (revenue +, costs −; M-01), so a positive change is favourable on every line.
// `derived` = no card or statement row shows this figure; the answer says so. Answer key: data/pnl/checks/chat-golden.csv
// (chat-metrics.test.ts; rows computed by scripts/pnl-golden.ts straight from the Parquet, not by this module).

export type Dim = SliceDim;
/** Which column of the report a figure is read from: the base (actual by default), or a comparator. */
export type Column = "base" | "B" | "LE" | "PY";
export const COMPARATORS = ["B", "LE", "PY"] as const;
export type Comparator = (typeof COMPARATORS)[number];
export const COMPARATOR_NAMES: Record<Comparator, string> = {
  B: "Budget",
  LE: "Latest estimate",
  PY: "Prior year",
};
export const BASE_NAMES: Record<BaseChoice, string> = {
  A: "Actual",
  LE: "Latest estimate",
  B: "Budget",
};

type Unit = "amount" | "pct" | "pct2" | "count" | "perunit";
type Group =
  "statement" | "ratio" | "growth" | "driver" | "outlook" | "fx" | "share";

/** One question's cut: the period, the company, the base version, the currency and at most one member per slice. */
export interface MetricQuery {
  entity: EntityView;
  fy: number;
  month: MonthNumber;
  timeView: TimeView;
  /** First month of a custom range (timeView RANGE, 2026-11-15); `fy` / `month` are its last. */
  startFy?: number;
  startMonth?: MonthNumber;
  base: BaseChoice;
  currency: ReportingCurrency;
  fxBasis: "ACT" | "CC";
  region?: string;
  channel?: string;
  line?: string;
  segment?: string;
}

export interface MetricDef {
  id: string;
  name: string;
  aliases: string;
  unit: Unit;
  group: Group;
  view: Selection["view"]; // where "Show in the report" lands
  formula: string;
  what?: string;
  derived?: true;
  /** Cuts this metric takes (the company always). */
  dims: readonly Dim[];
  /** Companies it exists for. */
  entities: readonly EntityView[];
  /** "up" = higher is better, "down" = lower is better, null = no side. */
  better: "up" | "down" | null;
  /** Comparators that make sense (none for a figure that is itself a comparison). */
  compare: readonly Comparator[];
  value(q: MetricQuery, col: Column): number | null;
  naNote?: string;
}

const ratio = (n: number | null, d: number | null): number | null =>
  n === null || d === null || d === 0 ? null : n / d;
const rel = (cur: number | null, cmp: number | null): number | null =>
  cur === null || cmp === null || cmp === 0
    ? null
    : (cur - cmp) / Math.abs(cmp);
const MILLIONS = { divisor: 1_000_000, decimals: 1 };
const WHOLE = { divisor: 1, decimals: 0 };
const CENTS = { divisor: 1, decimals: 2 };
const MINUS = "−";

/** "$667.4 m", "20.1%", "1,234", "$12.34": the report's own formats (format.ts), amounts in millions (F-14 default). */
export function formatValue(
  unit: Unit,
  v: number | null,
  symbol = "$",
): string {
  if (v === null) return "n/a";
  switch (unit) {
    case "amount":
      return `${v < 0 ? MINUS : ""}${symbol}${formatAmount(Math.abs(v), MILLIONS)} m`;
    case "pct":
      return formatPercent(v, 1);
    case "pct2":
      return formatPercent(v, 2);
    case "count":
      return formatAmount(v, WHOLE);
    case "perunit":
      return `${v < 0 ? MINUS : ""}${symbol}${formatAmount(Math.abs(v), CENTS)}`;
  }
}

/** The change beside a comparator: pp for ratios; a signed amount and % for amounts, counts and per-unit figures. */
export function formatDelta(
  unit: Unit,
  v: number,
  cmp: number,
  symbol = "$",
): string {
  const d = v - cmp;
  const r = rel(v, cmp);
  const pct = r === null ? null : formatPercent(r, 1, { signed: true });
  const sign = d > 0 ? "+" : d < 0 ? MINUS : "";
  switch (unit) {
    case "pct":
    case "pct2":
      return formatPoints(d);
    case "amount":
      return `${sign}${symbol}${formatAmount(Math.abs(d), MILLIONS)} m${pct ? `, ${pct}` : ""}`;
    case "count":
      return `${sign}${formatAmount(Math.abs(d), WHOLE)}${pct ? `, ${pct}` : ""}`;
    case "perunit":
      return `${sign}${symbol}${formatAmount(Math.abs(d), CENTS)}${pct ? `, ${pct}` : ""}`;
  }
}

/** The status word vs Budget (thresholds.ts, as the Vitals cards): "ahead", "on track", "watch", "off track"; null without a side. */
export function statusText(
  d: MetricDef,
  v: number,
  budget: number,
): string | null {
  if (d.better === null) return null;
  const isRatio = d.unit === "pct" || d.unit === "pct2";
  const delta = isRatio ? v - budget : rel(v, budget);
  const s = kpiStatus(
    delta,
    isRatio ? "ratio" : "amount",
    d.better === "up" ? "Higher" : "Lower",
  );
  return s === null ? null : STATUS_TEXT[s];
}

/** Extra names for the statement lines, beside the entity aliases of dim_report_line. */
const LINE_ALIASES: Record<string, string> = {
  GR: "gross sales, gross billings, top line before deductions",
  GTN: "trade spend, deductions, discounts, rebates, returns",
  NR: "net sales, revenue, top line, turnover, выручка",
  COR: "COGS, cost of goods sold, cost of sales",
  GP: "gross profit, валовая прибыль",
  VSC: "distribution costs, cost to serve, logistics, acquisition and transaction costs",
  CM: "contribution, contribution profit",
  SM: "S&M, selling and marketing, advertising and promotion, sales costs",
  RD: "R&D, product development, innovation",
  GA: "G&A, overheads, admin costs",
  OOI: "other operating income, other operating expense",
  OPEX: "operating costs, opex, overheads total",
  EBITDA: "adjusted EBITDA, EBITDA",
  DA: "D&A, depreciation, amortisation",
  UOP: "underlying EBIT, underlying operating profit",
  ADJ: "one-offs, non-underlying items, restructuring, impairment",
  OP: "EBIT, operating income, operating result, операционная прибыль",
  INV: "investment income, associates, interest income",
  PBFIT: "profit before interest and tax",
  FIN: "interest, finance costs, financing expense",
  PBT: "pre-tax profit, profit before tax",
  TAX: "income tax, tax expense",
  NP: "net income, net earnings, bottom line, profit after tax, чистая прибыль",
  GM_PCT: "gross margin, GM%",
  CM_PCT: "contribution margin %, CM%",
  EBITDA_PCT: "EBITDA margin, adjusted EBITDA margin",
  OP_PCT: "operating margin, EBIT margin",
  NP_PCT: "net margin, net profit margin",
  ETR_PCT: "effective tax rate, tax rate",
};

const ALL: readonly EntityView[] = ["P", "S", "GROUP"];
const SINGLE: readonly EntityView[] = ["P", "S"];

export function createMetricCatalogue(ds: Dataset) {
  const m = ds.manifest;
  const fx = createFx(m);
  const cache = createSliceCache(ds);
  const codec = createSelectionCodec(m);
  const spines = new Map<EntityView, ReturnType<typeof buildSpine>>();
  const spineOf = (e: EntityView) => {
    let s = spines.get(e);
    if (!s) spines.set(e, (s = buildSpine(m, e)));
    return s;
  };
  const accountIdx = new Map(m.dict.account.map((c, i) => [c, i]));
  const symbolOf = (c: ReportingCurrency) =>
    m.tables.param_reporting_currency.find((x) => x.currency_code === c)
      ?.symbol ?? "";

  /** The report selection a query stands for (no comparators: the catalogue reads each column itself). */
  function selectionOf(
    q: MetricQuery,
    view: Selection["view"] = "kpi",
  ): Selection {
    const d = codec.defaults(q.entity);
    return {
      ...d,
      fy: q.fy,
      month: q.month,
      timeView: q.timeView,
      startFy: q.startFy ?? d.startFy,
      startMonth: q.startMonth ?? d.startMonth,
      base: q.base,
      compareA: "NONE",
      compareB: "NONE",
      currency: q.currency,
      fxBasis: q.fxBasis,
      region: q.region ? [q.region] : [],
      channel: q.channel ? [q.channel] : [],
      line: q.line ? [q.line] : [],
      segment: q.segment ? [q.segment] : [],
      view: q.entity === "GROUP" ? "statement" : view,
    };
  }
  const dimsOf = (q: MetricQuery): Dim[] =>
    SLICE_DIMS.filter((d) => q[d] !== undefined);
  const keyOf = (q: MetricQuery, by: readonly Dim[]) =>
    by.map((d) => q[d] ?? "").join("|");
  const tr = (q: MetricQuery, basis = q.fxBasis): Translation => ({
    fx,
    currency: q.currency,
    basis,
    fy: q.fy,
  });

  /** The plan of one column: the base, or a comparator computed over the same months (C-03). */
  function planOf(q: MetricQuery, col: Column): ColumnPlan | null {
    const sel = selectionOf(q);
    if (col === "base") return versionPlan(m, sel).base;
    const p = versionPlan(m, { ...sel, compareA: col }).compareA;
    return p && !hasNoData(p) ? p : null;
  }
  const fyPlans = (q: MetricQuery) => {
    const p = versionPlan(m, selectionOf(q));
    return { le: p.fyLE, budget: p.fyBudget };
  };
  const lastMonthOf = (p: ColumnPlan): ColumnPlan => {
    const last = Math.max(-1, ...p.parts.flatMap((x) => x.months));
    return {
      ...p,
      parts: p.parts
        .filter((x) => x.months.includes(last))
        .map((x) => ({ ...x, months: [last] })),
    };
  };

  /** Σ per account for the query's cut under a plan; null when the plan has no data or the cut is not available. */
  function accounts(
    q: MetricQuery,
    plan: ColumnPlan | null,
    t: Translation,
    extraBy: readonly Dim[] = [],
    extraKey: readonly string[] = [],
  ): Float64Array | null {
    if (plan === null || hasNoData(plan)) return null;
    const by = [...dimsOf(q), ...extraBy];
    if (q.entity === "GROUP") {
      if (by.length) return null; // the Group has no slice cuts (F-32)
      return aggregateAccounts(ds, "GROUP", plan, t);
    }
    const key = [keyOf(q, dimsOf(q)), ...extraKey].filter(Boolean).join("|");
    return (
      cache.accounts(q.entity, plan, t, by).get(key) ??
      new Float64Array(m.dict.account.length) // a member with nothing booked
    );
  }
  const lines = (
    q: MetricQuery,
    plan: ColumnPlan | null,
    t = tr(q),
  ): Map<string, number | null> | null => {
    const acc = accounts(q, plan, t);
    return acc ? evaluateSpine(m, spineOf(q.entity), acc) : null;
  };
  const line = (q: MetricQuery, col: Column, code: string, t = tr(q)) =>
    lines(q, planOf(q, col), t)?.get(code) ?? null;
  const leaves = (q: MetricQuery, col: Column, codes: readonly string[]) => {
    const acc = accounts(q, planOf(q, col), tr(q));
    return acc === null
      ? null
      : codes.reduce((s, c) => s + (acc[accountIdx.get(c) ?? -1] ?? 0), 0);
  };
  /** Net revenue of one service line of the S company (SUB, PAY), within the query's cut. */
  const lineNr = (q: MetricQuery, plan: ColumnPlan | null, code: string) => {
    const acc = accounts(q, plan, tr(q), ["line"], [code]);
    return acc
      ? (evaluateSpine(m, spineOf(q.entity), acc).get("NR") ?? null)
      : null;
  };
  const ops = (
    q: MetricQuery,
    plan: ColumnPlan | null,
    extraBy: readonly Dim[] = [],
    extraKey: readonly string[] = [],
  ) => {
    if (plan === null || hasNoData(plan) || q.entity === "GROUP") return null;
    const key = [keyOf(q, dimsOf(q)), ...extraKey].filter(Boolean).join("|");
    return (
      cache.ops(q.entity, plan, tr(q), [...dimsOf(q), ...extraBy]).get(key) ??
      null
    );
  };
  const only =
    (e: EntityView, f: (q: MetricQuery, col: Column) => number | null) =>
    (q: MetricQuery, col: Column) => (q.entity === e ? f(q, col) : null);
  /** Figures that compare two columns themselves exist for the base column only. */
  const baseOnly =
    (f: (q: MetricQuery) => number | null) => (q: MetricQuery, col: Column) =>
      col === "base" ? f(q) : null;

  const lineName = new Map(
    m.tables.dim_report_line.map((l) => [l.line_code, l]),
  );
  const statementLines = [...m.tables.dim_report_line]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((l) => l.row_type !== "ratio");
  const ratioLines = m.tables.dim_report_line.filter(
    (l) => l.row_type === "ratio",
  );
  const aliasesOf = (code: string) => {
    const l = lineName.get(code);
    return [l?.alias_products, l?.alias_services, LINE_ALIASES[code]]
      .filter((x): x is string => !!x)
      .filter((x, i, xs) => xs.indexOf(x) === i)
      .join(", ");
  };
  const formulaOf = (code: string) => {
    const l = lineName.get(code);
    return l?.formula
      ? `${l.formula} (statement lines, signed: costs negative).`
      : `Σ of the ${l?.line_name ?? code} accounts, signed as booked (costs negative), each month translated at its own rate.`;
  };

  const defs: MetricDef[] = [
    // ---- the statement ----
    ...statementLines.map((l): MetricDef => ({
      id: l.line_code,
      name: l.line_name,
      aliases: aliasesOf(l.line_code),
      unit: "amount",
      group: "statement",
      view: "statement",
      dims: SLICE_DIMS,
      entities: ALL,
      better: "up",
      compare: COMPARATORS,
      formula: formulaOf(l.line_code),
      value: (q, col) => line(q, col, l.line_code),
    })),
    // ---- the statement's ratio rows ----
    ...ratioLines.map((l): MetricDef => ({
      id: l.line_code,
      name: l.line_name,
      aliases: aliasesOf(l.line_code),
      unit: "pct",
      group: "ratio",
      view: l.line_code === "ETR_PCT" ? "statement" : "kpi",
      dims: SLICE_DIMS,
      entities: ALL,
      better: l.line_code === "ETR_PCT" ? null : "up",
      compare: COMPARATORS,
      formula: `${l.formula ?? ""}: the statement's ratio row, from the lines above it.`,
      value: (q, col) => line(q, col, l.line_code),
    })),
    // ---- cost ratios ----
    {
      id: "OPEX_PCT",
      name: "Opex % of revenue",
      aliases: "opex ratio, operating expenses as % of net revenue, cost ratio",
      unit: "pct",
      group: "ratio",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ALL,
      better: "down",
      compare: COMPARATORS,
      formula:
        "− (Sales & marketing + R&D + G&A) ÷ Net revenue, as the Vitals card (other operating income excluded).",
      value: (q, col) => {
        const x = lines(q, planOf(q, col));
        const sm = x?.get("SM") ?? null;
        const rd = x?.get("RD") ?? null;
        const ga = x?.get("GA") ?? null;
        return sm === null || rd === null || ga === null
          ? null
          : ratio(-(sm + rd + ga), x?.get("NR") ?? null);
      },
    },
    {
      id: "GTN_PCT",
      name: "Gross-to-net %",
      aliases: "GTN ratio, deductions as % of gross revenue, trade spend rate",
      unit: "pct",
      group: "ratio",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ALL,
      better: "down",
      compare: COMPARATORS,
      formula: "− Gross-to-net deductions ÷ Gross revenue.",
      value: (q, col) => ratio(-(line(q, col, "GTN") ?? 0), line(q, col, "GR")),
    },
    ...(
      [
        [
          "COR_PCT",
          "COR",
          "Cost of revenue % of NR",
          "COGS ratio, cost of sales as % of revenue",
        ],
        [
          "VSC_PCT",
          "VSC",
          "Variable selling % of NR",
          "cost to serve ratio, distribution cost ratio",
        ],
        [
          "SM_PCT",
          "SM",
          "Sales & marketing % of NR",
          "S&M ratio, marketing intensity",
        ],
        ["RD_PCT", "RD", "R&D % of NR", "R&D intensity, research ratio"],
        ["GA_PCT", "GA", "G&A % of NR", "G&A ratio, admin cost ratio"],
      ] as const
    ).map(([id, code, name, aliases]): MetricDef => ({
      id,
      name,
      aliases,
      unit: "pct",
      group: "ratio",
      view: "statement",
      dims: SLICE_DIMS,
      entities: ALL,
      better: "down",
      compare: COMPARATORS,
      derived: true,
      formula: `− ${lineName.get(code)?.line_name ?? code} ÷ Net revenue.`,
      value: (q, col) => ratio(-(line(q, col, code) ?? 0), line(q, col, "NR")),
    })),
    {
      id: "AP_PCT",
      name: "A&P % of NR",
      aliases:
        "advertising and promotion ratio, working media and promotions as % of net sales",
      unit: "pct",
      group: "ratio",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ["P"],
      better: null,
      compare: COMPARATORS,
      formula:
        "− (Advertising: working media + Consumer promotions, sampling & sponsorship) ÷ Net revenue. Consumer Products only.",
      naNote: "Consumer Products only.",
      value: only("P", (q, col) =>
        ratio(-(leaves(q, col, ["SM_P1", "SM_P2"]) ?? 0), line(q, col, "NR")),
      ),
    },
    // ---- growth ----
    {
      id: "NR_GROWTH",
      name: "Net revenue growth, reported",
      aliases: "revenue growth, top-line growth, YoY growth, рост выручки",
      unit: "pct",
      group: "growth",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ALL,
      better: "up",
      compare: [],
      formula:
        "Net revenue ÷ prior-year net revenue − 1, both at the selected rates.",
      naNote: "No prior-year months in the data (the history starts Jan 2024).",
      value: baseOnly((q) => rel(line(q, "base", "NR"), line(q, "PY", "NR"))),
    },
    {
      id: "NR_GROWTH_ORGANIC",
      name: "Net revenue growth, organic (constant currency)",
      aliases:
        "organic growth, like-for-like growth, growth ex FX, constant-currency growth",
      unit: "pct",
      group: "growth",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ALL,
      better: "up",
      compare: [],
      formula:
        "Net revenue at constant currency ÷ prior-year net revenue at constant currency − 1 (both at the fiscal year's budget rates, C-12).",
      naNote: "No prior-year months in the data (the history starts Jan 2024).",
      value: baseOnly((q) =>
        rel(
          line(q, "base", "NR", tr(q, "CC")),
          line(q, "PY", "NR", tr(q, "CC")),
        ),
      ),
    },
    {
      id: "EBITDA_GROWTH",
      name: "Adjusted EBITDA growth",
      aliases: "EBITDA growth YoY, profit growth",
      unit: "pct",
      group: "growth",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ALL,
      better: "up",
      compare: [],
      derived: true,
      formula: "Adjusted EBITDA ÷ prior-year adjusted EBITDA − 1.",
      naNote:
        "No prior-year months in the data, or a prior-year EBITDA of zero.",
      value: baseOnly((q) =>
        rel(line(q, "base", "EBITDA"), line(q, "PY", "EBITDA")),
      ),
    },
    // ---- drivers: Consumer Products ----
    {
      id: "UNITS",
      name: "Units sold",
      aliases: "volume, units shipped, штуки",
      unit: "count",
      group: "driver",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ["P"],
      better: "up",
      compare: COMPARATORS,
      formula:
        "Σ units sold over the window's months (a flow). Consumer Products only.",
      naNote: "Consumer Products only.",
      value: only("P", (q, col) => {
        const o = ops(q, planOf(q, col));
        return o && o.units > 0 ? o.units : null;
      }),
    },
    {
      id: "NR_PER_UNIT",
      name: "Net revenue per unit",
      aliases: "price per unit, average selling price, ASP, revenue per unit",
      unit: "perunit",
      group: "driver",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ["P"],
      better: "up",
      compare: COMPARATORS,
      formula: "Net revenue ÷ units sold. Consumer Products only.",
      naNote: "Consumer Products only.",
      value: only("P", (q, col) => {
        const o = ops(q, planOf(q, col));
        return ratio(line(q, col, "NR"), o && o.units > 0 ? o.units : null);
      }),
    },
    {
      id: "AP_SPEND",
      name: "A&P spend",
      aliases:
        "advertising and promotion spend, working media plus consumer promotions",
      unit: "amount",
      group: "driver",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ["P"],
      better: "up",
      compare: COMPARATORS,
      derived: true,
      formula:
        "Advertising: working media + Consumer promotions, sampling & sponsorship (signed, a cost). Consumer Products only.",
      naNote: "Consumer Products only.",
      value: only("P", (q, col) => leaves(q, col, ["SM_P1", "SM_P2"])),
    },
    // ---- drivers: Commerce Cloud ----
    {
      id: "GMV",
      name: "GMV processed",
      aliases: "gross merchandise value, payment volume, TPV",
      unit: "amount",
      group: "driver",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ["S"],
      better: "up",
      compare: COMPARATORS,
      formula:
        "Σ GMV processed over the window's months, translated like amounts (per month × currency). Commerce Cloud only.",
      naNote: "Commerce Cloud only.",
      value: only("S", (q, col) => ops(q, planOf(q, col))?.gmv ?? null),
    },
    {
      id: "TAKE_RATE",
      name: "Payments take rate",
      aliases: "take rate, payments yield, revenue per GMV",
      unit: "pct2",
      group: "driver",
      view: "kpi",
      dims: ["region", "channel", "segment"],
      entities: ["S"],
      better: "up",
      compare: COMPARATORS,
      formula:
        "Payments net revenue ÷ Payments GMV processed. Commerce Cloud only.",
      naNote:
        "Commerce Cloud only; not cut by service line (it is the Payments line).",
      value: only("S", (q, col) => {
        if (q.line !== undefined) return null;
        const p = planOf(q, col);
        return ratio(
          lineNr(q, p, "PAY"),
          ops(q, p, ["line"], ["PAY"])?.gmv ?? null,
        );
      }),
    },
    {
      id: "ACTIVE_MERCHANTS",
      name: "Active merchants",
      aliases: "merchants, customers on a paid plan, merchant count",
      unit: "count",
      group: "driver",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ["S"],
      better: "up",
      compare: COMPARATORS,
      formula:
        "Merchants on an active paid plan at the window's last month-end (a stock, never summed over months; K-23). Commerce Cloud only.",
      naNote: "Commerce Cloud only.",
      value: only("S", (q, col) => {
        const o = ops(q, planOf(q, col));
        return o && o.merchants > 0 ? o.merchants : null;
      }),
    },
    {
      id: "GMV_PER_MERCHANT",
      name: "GMV per merchant",
      aliases: "volume per merchant, average merchant GMV",
      unit: "perunit",
      group: "driver",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ["S"],
      better: "up",
      compare: COMPARATORS,
      derived: true,
      formula:
        "GMV processed ÷ active merchants at the window's end. Commerce Cloud only.",
      naNote: "Commerce Cloud only.",
      value: only("S", (q, col) => {
        const o = ops(q, planOf(q, col));
        return o && o.merchants > 0 ? o.gmv / o.merchants : null;
      }),
    },
    {
      id: "ARR",
      name: "ARR (run-rate)",
      aliases: "annual recurring revenue, subscription run-rate",
      unit: "amount",
      group: "driver",
      view: "kpi",
      dims: ["region", "channel", "segment"],
      entities: ["S"],
      better: "up",
      compare: COMPARATORS,
      formula:
        "Platform-subscription net revenue of the window's last month × 12 (a run-rate proxy, not contract ARR). Commerce Cloud only.",
      naNote:
        "Commerce Cloud only; not cut by service line (it is the Subscriptions line).",
      value: only("S", (q, col) => {
        if (q.line !== undefined) return null;
        const p = planOf(q, col);
        const x = p ? lineNr(q, lastMonthOf(p), "SUB") : null;
        return x === null ? null : x * 12;
      }),
    },
    ...(
      [
        [
          "SUB_SHARE",
          "SUB",
          "Subscriptions share of net revenue",
          "subscription mix, platform subscriptions as % of revenue",
        ],
        [
          "PAY_SHARE",
          "PAY",
          "Payments share of net revenue",
          "payments mix, payments as % of revenue",
        ],
      ] as const
    ).map(([id, code, name, aliases]): MetricDef => ({
      id,
      name,
      aliases,
      unit: "pct",
      group: "driver",
      view: "kpi",
      dims: ["region", "channel", "segment"],
      entities: ["S"],
      better: null,
      compare: COMPARATORS,
      formula: `Net revenue of the ${m.tables.dim_line.find((l) => l.line_code === code)?.line_name ?? code} line ÷ Net revenue (the Revenue mix card). Commerce Cloud only.`,
      naNote: "Commerce Cloud only; not cut by service line.",
      value: only("S", (q, col) => {
        if (q.line !== undefined) return null;
        const p = planOf(q, col);
        return ratio(lineNr(q, p, code), line(q, col, "NR"));
      }),
    })),
    // ---- FY outlook (whole fiscal year, whatever the time view; M-14) ----
    ...(
      [
        [
          "FY_NR_LE",
          "NR",
          "le",
          "FY net revenue, latest estimate",
          "full-year revenue outlook, FY LE revenue, forecast revenue",
        ],
        [
          "FY_NR_BUDGET",
          "NR",
          "budget",
          "FY net revenue, Budget",
          "full-year revenue budget, annual budget revenue",
        ],
        [
          "FY_EBITDA_LE",
          "EBITDA",
          "le",
          "FY adjusted EBITDA, latest estimate",
          "full-year EBITDA outlook, FY LE EBITDA, forecast EBITDA",
        ],
        [
          "FY_EBITDA_BUDGET",
          "EBITDA",
          "budget",
          "FY adjusted EBITDA, Budget",
          "full-year EBITDA budget",
        ],
      ] as const
    ).map(([id, code, which, name, aliases]): MetricDef => ({
      id,
      name,
      aliases,
      unit: "amount",
      group: "outlook",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ALL,
      better: "up",
      compare: [],
      formula:
        which === "le"
          ? `${lineName.get(code)?.line_name ?? code} for the whole fiscal year: actual closed months plus the latest forecast for the open months (C-02).`
          : `${lineName.get(code)?.line_name ?? code} of the approved Budget for the whole fiscal year, phased by month (C-05).`,
      value: baseOnly((q) => lines(q, fyPlans(q)[which])?.get(code) ?? null),
    })),
    ...(
      [
        [
          "FY_NR_ATTAINMENT",
          "NR",
          "FY revenue attainment",
          "revenue attainment, LE vs budget revenue, outlook vs budget",
        ],
        [
          "FY_EBITDA_ATTAINMENT",
          "EBITDA",
          "FY EBITDA attainment",
          "EBITDA attainment, LE vs budget EBITDA",
        ],
      ] as const
    ).map(([id, code, name, aliases]): MetricDef => ({
      id,
      name,
      aliases,
      unit: "pct",
      group: "outlook",
      view: "kpi",
      dims: SLICE_DIMS,
      entities: ALL,
      better: "up",
      compare: [],
      formula: `FY latest estimate ÷ FY Budget of ${lineName.get(code)?.line_name ?? code} (the FY outlook card).`,
      value: baseOnly((q) => {
        const p = fyPlans(q);
        return ratio(
          lines(q, p.le)?.get(code) ?? null,
          lines(q, p.budget)?.get(code) ?? null,
        );
      }),
    })),
    // ---- FX ----
    ...(
      [
        [
          "FX_EFFECT_NR",
          "NR",
          "FX effect on net revenue",
          "currency effect on revenue, translation effect, FX impact",
        ],
        [
          "FX_EFFECT_EBITDA",
          "EBITDA",
          "FX effect on adjusted EBITDA",
          "currency effect on EBITDA, FX impact on profit",
        ],
        [
          "FX_EFFECT_OP",
          "OP",
          "FX effect on operating profit",
          "currency effect on operating profit",
        ],
      ] as const
    ).map(([id, code, name, aliases]): MetricDef => ({
      id,
      name,
      aliases,
      unit: "amount",
      group: "fx",
      view: "analysis",
      dims: SLICE_DIMS,
      entities: ALL,
      better: null,
      compare: [],
      derived: true,
      formula: `${lineName.get(code)?.line_name ?? code} at actual rates − the same at constant currency (the fiscal year's budget rates): the translation effect of the period's FX moves.`,
      value: baseOnly((q) => {
        const p = planOf(q, "base");
        const act = lines(q, p, tr(q, "ACT"))?.get(code) ?? null;
        const cc = lines(q, p, tr(q, "CC"))?.get(code) ?? null;
        return act === null || cc === null ? null : act - cc;
      }),
    })),
    // ---- shares of the company total (need one slice member) ----
    ...(
      [
        [
          "NR_SHARE",
          "NR",
          "Share of net revenue",
          "revenue share, revenue mix by region or channel, доля выручки",
        ],
        [
          "CM_SHARE",
          "CM",
          "Share of contribution margin",
          "contribution share, contribution mix",
        ],
        [
          "EBITDA_SHARE",
          "EBITDA",
          "Share of adjusted EBITDA",
          "EBITDA share, profit mix",
        ],
      ] as const
    ).map(([id, code, name, aliases]): MetricDef => ({
      id,
      name,
      aliases,
      unit: "pct",
      group: "share",
      view: "profitability",
      dims: SLICE_DIMS,
      entities: SINGLE,
      better: null,
      compare: COMPARATORS,
      derived: true,
      formula: `${lineName.get(code)?.line_name ?? code} of the chosen region, channel, line or segment ÷ the company's ${lineName.get(code)?.line_name ?? code}.`,
      naNote: "Needs one region, channel, line or segment.",
      value: (q, col) => {
        if (q.entity === "GROUP" || dimsOf(q).length === 0) return null;
        const whole: MetricQuery = {
          entity: q.entity,
          fy: q.fy,
          month: q.month,
          timeView: q.timeView,
          startFy: q.startFy,
          startMonth: q.startMonth,
          base: q.base,
          currency: q.currency,
          fxBasis: q.fxBasis,
        };
        return ratio(line(q, col, code), line(whole, col, code));
      },
    })),
  ];

  const byId = new Map(defs.map((d) => [d.id, d]));

  /** "Consumer Products · YTD Sep 2026 · Actual · USD, actual rates · Continental Europe": the cut in words. */
  function scopeOf(q: MetricQuery): string {
    const sel = selectionOf(q);
    const names = [
      ...(q.region
        ? [
            m.tables.dim_region.find((r) => r.region_code === q.region)
              ?.region_name ?? q.region,
          ]
        : []),
      ...(q.channel
        ? [
            m.tables.dim_channel.find((r) => r.channel_code === q.channel)
              ?.channel_name ?? q.channel,
          ]
        : []),
      ...(q.line
        ? [
            m.tables.dim_line.find((r) => r.line_code === q.line)?.line_name ??
              q.line,
          ]
        : []),
      ...(q.segment
        ? [
            m.tables.dim_segment.find((r) => r.segment_code === q.segment)
              ?.segment_name ?? q.segment,
          ]
        : []),
    ];
    return [
      companyName(m, q.entity),
      windowLabel(m, sel),
      BASE_NAMES[q.base],
      `${q.currency}, ${q.fxBasis === "CC" ? "constant currency" : "actual rates"}`,
      ...names,
    ].join(" · ");
  }

  return {
    defs,
    byId,
    selectionOf,
    scopeOf,
    symbolOf,
    codec,
    /** The plan of one column for a query; null when the comparator has no data (e.g. prior year before the history). */
    planOf,
    /** The members of a slice dimension for a company (the unassigned member excluded), as code → name. */
    members(entity: EntityView, dim: Dim): Map<string, string> {
      if (dim === "region")
        return new Map(
          m.tables.dim_region.map((r) => [r.region_code, r.region_name]),
        );
      if (entity === "GROUP") return new Map();
      const rows =
        dim === "channel"
          ? m.tables.dim_channel
              .filter((d) => d.entity_code === entity && !d.is_unassigned)
              .map((d) => [d.channel_code, d.channel_name] as const)
          : dim === "line"
            ? m.tables.dim_line
                .filter((d) => d.entity_code === entity && !d.is_unassigned)
                .map((d) => [d.line_code, d.line_name] as const)
            : m.tables.dim_segment
                .filter((d) => d.entity_code === entity && !d.is_unassigned)
                .map((d) => [d.segment_code, d.segment_name] as const);
      return new Map(rows);
    },
  };
}

export type MetricCatalogue = ReturnType<typeof createMetricCatalogue>;
