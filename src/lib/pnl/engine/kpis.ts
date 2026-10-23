import { narrow, sliceFilter, type SliceFilter } from "./aggregate";
import { bridge } from "./bridge";
import type { Column, Core } from "./core";
import { ELIM_REVENUE } from "./core";
import type { ColumnPlan, EntityCode, Selection, VersionPlan } from "./types";
import { hasNoData, priorOf } from "./versions";

// Spec §5 key figures: twelve fixed slots, eight financial and four operational (L-06). Slots 1–3 and 6–8 are the
// same for every view; 4–5 and 9–12 swap by entity. Values follow every filter (K-22); period-end KPIs read the last
// month of the window (K-23). Tiles show value, sub-line and Δ vs Compare A / B (K-20, kpi-card-v2).

export type KpiFormat =
  | "amount" // reporting currency, display units (e.g. $3,398.5m)
  | "percent" // ratio, 1 decimal (Δ in pp)
  | "rate" // ratio, 2 decimals (take rate; Δ in pp)
  | "count" // plain number in display units (units sold)
  | "perUnit" // currency per unit, 2 decimals
  | "integer"; // whole number (active merchants)

export type BetterWhen = "higher" | "lower" | "neutral";

export interface KpiComparison {
  value: number | null;
  delta: number | null; // value difference (pp for ratio formats)
  deltaPct: number | null; // relative Δ for amount formats
  favourable: boolean | null; // null = no colour (neutral KPI, zero Δ, n/a — K-21)
}

export interface KpiTile {
  id: string; // K-01 … K-12
  group: "financial" | "operational";
  label: string;
  definition: string; // one line, shown as the label's tooltip
  format: KpiFormat;
  betterWhen: BetterWhen;
  growth: boolean; // growth KPIs carry no comparisons (K-20, kpi-card-v2)
  value: number | null;
  sub: { label: string; value: number | null; format: KpiFormat } | null;
  compareA: KpiComparison | null; // null = comparison off
  compareB: KpiComparison | null;
}

const RATIO_FORMATS: ReadonlySet<KpiFormat> = new Set(["percent", "rate"]);
const div = (a: number | null, b: number | null) =>
  a === null || b === null || b === 0 ? null : a / b;

interface Definition {
  id: string;
  group: KpiTile["group"];
  label: string;
  definition: string;
  format: KpiFormat;
  betterWhen: BetterWhen;
  growth?: boolean;
  value: (c: Ctx) => number | null;
  sub?: { label: string; format: KpiFormat; value: (c: Ctx) => number | null };
}

/** Everything one column of the tile needs, built lazily so a tile only pays for what it reads. */
interface Ctx {
  line: (code: string) => number | null; // spine line of the selected view
  entityLine: (e: EntityCode, code: string) => number | null; // a company standalone (Group tiles)
  sliceLine: (dim: "line", value: string, code: string) => number | null; // spine line, one service line only
  ops: () => { units: number; gmv: number; merchants: number };
  lastMonth: () => Ctx; // the same column at the window's last month only (K-23)
  organic: () => number | null; // NR at constant currency vs its own prior year − 1
  reported: () => number | null; // the same at the selected FX basis
  bridgeVsPy: () => { volume: number; priceMix: number; pyNrCc: number } | null;
}

const SHARED_TOP: Definition[] = [
  {
    id: "K-01",
    group: "financial",
    label: "Net revenue",
    definition: "Gross revenue less trade and customer deductions.",
    format: "amount",
    betterWhen: "higher",
    value: (c) => c.line("NR"),
  },
  {
    id: "K-02",
    group: "financial",
    label: "Organic growth vs prior year",
    definition:
      "Net revenue at constant currency vs the prior year at the same rates, same months.",
    format: "percent",
    betterWhen: "higher",
    growth: true,
    value: (c) => c.organic(),
    sub: {
      label: "Reported, incl. FX",
      format: "percent",
      value: (c) => c.reported(),
    },
  },
  {
    id: "K-03",
    group: "financial",
    label: "Gross margin",
    definition: "Gross profit as a share of net revenue.",
    format: "percent",
    betterWhen: "higher",
    value: (c) => c.line("GM_PCT"),
  },
];

const SHARED_MID: Definition[] = [
  {
    id: "K-06",
    group: "financial",
    label: "Contribution margin",
    definition:
      "Contribution margin (after selling and delivery costs) as a share of net revenue.",
    format: "percent",
    betterWhen: "higher",
    value: (c) => c.line("CM_PCT"),
  },
  {
    id: "K-07",
    group: "financial",
    label: "Adjusted EBITDA",
    definition:
      "Earnings before interest, tax, depreciation, amortisation and adjusting items.",
    format: "amount",
    betterWhen: "higher",
    value: (c) => c.line("EBITDA"),
    sub: {
      label: "Margin",
      format: "percent",
      value: (c) => c.line("EBITDA_PCT"),
    },
  },
  {
    id: "K-08",
    group: "financial",
    label: "Operating profit",
    definition:
      "IFRS 18 operating profit: after depreciation and adjusting items.",
    format: "amount",
    betterWhen: "higher",
    value: (c) => c.line("OP"),
    sub: { label: "Margin", format: "percent", value: (c) => c.line("OP_PCT") },
  },
];

const BY_ENTITY: Record<
  Selection["entity"],
  { k4: Definition; k5: Definition; ops: Definition[] }
> = {
  P: {
    k4: {
      id: "K-04",
      group: "financial",
      label: "Gross-to-net",
      definition: "Trade and customer deductions as a share of gross revenue.",
      format: "percent",
      betterWhen: "lower",
      value: (c) => div(-(c.line("GTN") ?? 0), c.line("GR")),
    },
    k5: {
      id: "K-05",
      group: "financial",
      label: "Advertising & promotion",
      definition:
        "Working media plus consumer promotions, as a share of net revenue.",
      format: "percent",
      betterWhen: "neutral",
      value: (c) =>
        div(-((c.line("SM_P1") ?? 0) + (c.line("SM_P2") ?? 0)), c.line("NR")),
    },
    ops: [
      {
        id: "K-09",
        group: "operational",
        label: "Units sold",
        definition: "Units shipped to customers in the window.",
        format: "count",
        betterWhen: "higher",
        value: (c) => c.ops().units,
      },
      {
        id: "K-10",
        group: "operational",
        label: "Net revenue per unit",
        definition: "Net revenue divided by units sold.",
        format: "perUnit",
        betterWhen: "higher",
        value: (c) => div(c.line("NR"), c.ops().units),
      },
      {
        id: "K-11",
        group: "operational",
        label: "Volume growth vs prior year",
        definition:
          "The bridge's volume step vs the prior year, as a share of prior-year net revenue at constant currency.",
        format: "percent",
        betterWhen: "higher",
        growth: true,
        value: (c) => {
          const b = c.bridgeVsPy();
          return b ? div(b.volume, b.pyNrCc) : null;
        },
      },
      {
        id: "K-12",
        group: "operational",
        label: "Price / mix vs prior year",
        definition:
          "The bridge's price / mix step vs the prior year, as a share of prior-year net revenue at constant currency.",
        format: "percent",
        betterWhen: "higher",
        growth: true,
        value: (c) => {
          const b = c.bridgeVsPy();
          return b ? div(b.priceMix, b.pyNrCc) : null;
        },
      },
    ],
  },
  S: {
    k4: {
      id: "K-04",
      group: "financial",
      label: "ARR (period end)",
      definition: "Subscription net revenue of the window's last month × 12.",
      format: "amount",
      betterWhen: "higher",
      value: (c) => {
        const v = c.lastMonth().sliceLine("line", "SUB", "NR");
        return v === null ? null : v * 12;
      },
    },
    k5: {
      id: "K-05",
      group: "financial",
      label: "Payments take rate",
      definition: "Payments net revenue as a share of GMV processed.",
      format: "rate",
      betterWhen: "higher",
      value: (c) => div(c.sliceLine("line", "PAY", "NR"), c.ops().gmv),
    },
    ops: [
      {
        id: "K-09",
        group: "operational",
        label: "GMV processed",
        definition:
          "Gross merchandise value processed through Commerce Cloud payments.",
        format: "amount",
        betterWhen: "higher",
        value: (c) => c.ops().gmv,
      },
      {
        id: "K-10",
        group: "operational",
        label: "Active merchants",
        definition:
          "Merchants with an active paid plan at the window's last month-end.",
        format: "integer",
        betterWhen: "higher",
        value: (c) => c.lastMonth().ops().merchants,
      },
      {
        id: "K-11",
        group: "operational",
        label: "Subscription gross margin",
        definition:
          "Gross profit as a share of net revenue, Platform subscriptions only.",
        format: "percent",
        betterWhen: "higher",
        value: (c) => c.sliceLine("line", "SUB", "GM_PCT"),
      },
      {
        id: "K-12",
        group: "operational",
        label: "Rule of 40",
        definition: "Organic growth plus Adjusted EBITDA margin.",
        format: "percent",
        betterWhen: "higher",
        value: (c) => {
          const g = c.organic();
          const e = c.line("EBITDA_PCT");
          return g === null || e === null ? null : g + e;
        },
      },
    ],
  },
  GROUP: {
    k4: {
      id: "K-04",
      group: "financial",
      label: "Services share",
      definition:
        "Commerce Cloud net revenue after eliminations, as a share of Group net revenue.",
      format: "percent",
      betterWhen: "neutral",
      value: (c) => {
        const s = c.entityLine("S", "NR");
        return s === null
          ? null
          : div(s + (c.line(ELIM_REVENUE) ?? 0), c.line("NR"));
      },
    },
    k5: {
      id: "K-05",
      group: "financial",
      label: "Intercompany eliminated",
      definition:
        "Fees Commerce Cloud billed to Consumer Products in the window.",
      format: "amount",
      betterWhen: "neutral",
      value: (c) => {
        const e = c.line(ELIM_REVENUE);
        return e === null ? null : -e;
      },
    },
    ops: [
      {
        id: "K-09",
        group: "operational",
        label: "Consumer Products operating margin",
        definition:
          "Consumer Products operating profit as a share of its net revenue.",
        format: "percent",
        betterWhen: "higher",
        value: (c) => div(c.entityLine("P", "OP"), c.entityLine("P", "NR")),
      },
      {
        id: "K-10",
        group: "operational",
        label: "Commerce Cloud operating margin",
        definition:
          "Commerce Cloud operating profit as a share of its net revenue.",
        format: "percent",
        betterWhen: "higher",
        value: (c) => div(c.entityLine("S", "OP"), c.entityLine("S", "NR")),
      },
      {
        id: "K-11",
        group: "operational",
        label: "Net profit",
        definition: "Profit for the period after financing and income taxes.",
        format: "amount",
        betterWhen: "higher",
        value: (c) => c.line("NP"),
        sub: {
          label: "Margin",
          format: "percent",
          value: (c) => c.line("NP_PCT"),
        },
      },
      {
        id: "K-12",
        group: "operational",
        label: "Effective tax rate",
        definition: "Income tax expense as a share of profit before tax.",
        format: "percent",
        betterWhen: "neutral",
        value: (c) => c.line("ETR_PCT"),
      },
    ],
  },
};

export function kpis(core: Core, sel: Selection, plan: VersionPlan): KpiTile[] {
  const { m } = core;
  const f = sliceFilter(m, sel);
  const tr = core.translation(sel);
  const cc = core.translation(sel, "CC");
  const memo = <T>(fn: () => T) => {
    let done = false;
    let v: T;
    return () => {
      if (!done) {
        v = fn();
        done = true;
      }
      return v;
    };
  };

  const ctx = (col: ColumnPlan): Ctx => {
    const view = memo(() => core.values(sel.entity, col, f, tr));
    const entity = new Map<EntityCode, () => Column | null>(
      (["P", "S"] as const).map((e) => [
        e,
        memo(() => core.values(e, col, f, tr)),
      ]),
    );
    const prior = memo(() => priorOf(m, col));
    const nrOf = (c: ColumnPlan, t = tr) =>
      core.values(sel.entity, c, f, t)?.get("NR") ?? null;
    const growth = (t: typeof tr) => {
      const p = prior();
      if (hasNoData(p)) return null;
      const before = nrOf(p, t);
      const ratio = before ? div(nrOf(col, t), before) : null;
      return ratio === null ? null : ratio - 1;
    };
    const filtered = (g: SliceFilter, code: string) =>
      core.values(sel.entity, col, g, tr)?.get(code) ?? null;
    return {
      line: (code) => view()?.get(code) ?? null,
      entityLine: (e, code) => entity.get(e)?.()?.get(code) ?? null,
      sliceLine: (dim, value, code) =>
        filtered(narrow(f, dim, m.dict[dim].indexOf(value)), code),
      // operational facts belong to one company; Group tiles never read them
      ops: memo(() =>
        core.agg.operational(sel.entity === "S" ? "S" : "P", col, f, tr),
      ),
      lastMonth: memo(() => {
        const last = Math.max(...col.parts.flatMap((p) => p.months));
        return ctx({
          ...col,
          parts: col.parts
            .filter((p) => p.months.includes(last))
            .map((p) => ({ ...p, months: [last] })),
        });
      }),
      organic: memo(() => growth(cc)),
      reported: memo(() => growth(tr)),
      bridgeVsPy: memo(() => {
        const py = prior();
        if (hasNoData(py) || sel.entity !== "P") return null;
        const b = bridge(core, sel, col, py);
        const step = (key: string) =>
          b.steps.find((s) => s.key === key)?.value ?? 0;
        return {
          volume: step("VOLUME"),
          priceMix: step("PRICE_MIX"),
          pyNrCc: nrOf(py, cc) ?? 0,
        };
      }),
    };
  };

  const base = ctx(plan.base);
  const compareA =
    plan.compareA && !hasNoData(plan.compareA) ? ctx(plan.compareA) : null;
  const compareB =
    plan.compareB && !hasNoData(plan.compareB) ? ctx(plan.compareB) : null;
  const specific = BY_ENTITY[sel.entity];
  const defs = [
    ...SHARED_TOP,
    specific.k4,
    specific.k5,
    ...SHARED_MID,
    ...specific.ops,
  ];

  return defs.map((d) => {
    const value = hasNoData(plan.base) ? null : d.value(base);
    const compare = (on: unknown, c: Ctx | null): KpiComparison | null => {
      if (on === null || d.growth) return null;
      const v = c ? d.value(c) : null;
      const delta = value === null || v === null ? null : value - v;
      return {
        value: v,
        delta,
        deltaPct:
          delta === null || RATIO_FORMATS.has(d.format) || v === 0 || v === null
            ? null
            : delta / Math.abs(v),
        favourable:
          delta === null || delta === 0 || d.betterWhen === "neutral"
            ? null
            : d.betterWhen === "higher"
              ? delta > 0
              : delta < 0,
      };
    };
    return {
      id: d.id,
      group: d.group,
      label: d.label,
      definition: d.definition,
      format: d.format,
      betterWhen: d.betterWhen,
      growth: d.growth ?? false,
      value,
      sub: d.sub
        ? {
            label: d.sub.label,
            format: d.sub.format,
            value: hasNoData(plan.base) ? null : d.sub.value(base),
          }
        : null,
      compareA: compare(plan.compareA, compareA),
      compareB: compare(plan.compareB, compareB),
    };
  });
}
