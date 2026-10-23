import type { Dataset } from "../data/dataset";
import { allocates, sliceFilter } from "./aggregate";
import {
  largestVariances,
  profitability,
  type Profitability,
  type VarianceRow,
} from "./analysis";
import { bridge, type Bridge } from "./bridge";
import { createCore, IC_DIFFERENCE } from "./core";
import { kpis, type KpiTile } from "./kpis";
import { contextLine, notices } from "./notices";
import type { Notice } from "./notices";
import type {
  ColumnPlan,
  CompareChoice,
  Selection,
  SpineRow,
  StatementResult,
  StatementRow,
  Variance,
  VersionPlan,
} from "./types";
import { priorYearPlan, versionPlan } from "./versions";

// Public engine API (ADR-0002 §2.3): the UI calls this and nothing else; every number on screen comes from here.

/** Which comparison the Analysis and Profitability views use: Compare A or Compare B (C-40). */
export type Against = "A" | "B";

export interface Comparison {
  choice: Exclude<CompareChoice, "NONE">;
  label: string; // "Budget", "Latest estimate", "Prior year"
}

export interface Engine {
  statement(sel: Selection): StatementResult;
  kpis(sel: Selection): KpiTile[]; // spec §5, kpi-card-v2
  analysis(
    sel: Selection,
    against: Against,
  ): { comparison: Comparison; bridge: Bridge; variances: VarianceRow[] }; // C-40, C-45
  profitability(
    sel: Selection,
    against: Against,
  ): Profitability & { comparison: Comparison }; // C-46
  notices(sel: Selection): Notice[]; // C-50, L-05
  context(sel: Selection): string; // L-04
  dataStatus(): { lastClosedMonth: string; builtAt: string }; // N-02 / N-03
}

const NET_REVENUE = "NR"; // every ratio and % NR divides by step 3 (M-03, M-12)
const NO_COLOUR = new Set(["ETR_PCT"]); // effective tax rate Δ carries no favourable/unfavourable colour (M-11)
const COMPARE_LABEL = {
  B: "Budget",
  LE: "Latest estimate",
  PY: "Prior year",
} as const;

/**
 * Δ = current − comparison on signed values (M-10): positive is favourable on every line, revenue or cost (T-13).
 * Δ % = Δ ÷ |comparison|. Ratio rows: Δ in percentage points, no Δ % (M-11).
 */
export function variance(
  row: Pick<SpineRow, "code" | "kind">,
  current: number | null,
  comparison: number | null,
) {
  if (current === null || comparison === null)
    return { delta: null, deltaPct: null, favourable: null };
  const delta = current - comparison;
  const isRatio = row.kind === "ratio";
  return {
    delta,
    deltaPct: isRatio || comparison === 0 ? null : delta / Math.abs(comparison),
    favourable: delta === 0 || NO_COLOUR.has(row.code) ? null : delta > 0,
  };
}

/** C-40: the chosen comparison if it is on, else the other one, else the prior year. */
function comparisonOf(
  m: Dataset["manifest"],
  sel: Selection,
  plan: VersionPlan,
  against: Against,
): { plan: ColumnPlan; comparison: Comparison } {
  const options: [ColumnPlan | null, CompareChoice][] =
    against === "B"
      ? [
          [plan.compareB, sel.compareB],
          [plan.compareA, sel.compareA],
        ]
      : [
          [plan.compareA, sel.compareA],
          [plan.compareB, sel.compareB],
        ];
  for (const [p, choice] of options)
    if (p && choice !== "NONE")
      return { plan: p, comparison: { choice, label: COMPARE_LABEL[choice] } };
  return {
    plan: priorYearPlan(m, plan),
    comparison: { choice: "PY", label: COMPARE_LABEL.PY },
  };
}

export function createEngine(ds: Dataset): Engine {
  const core = createCore(ds);
  const m = ds.manifest;

  return {
    statement(sel) {
      const plan = versionPlan(m, sel);
      const f = sliceFilter(m, sel);
      const tr = core.translation(sel);
      const spine = core.spine(sel.entity, allocates(f));
      const col = (p: ColumnPlan | null) =>
        core.column(sel.entity, spine, p, f, tr);
      const base = col(plan.base);
      const compareA = col(plan.compareA);
      const compareB = col(plan.compareB);
      const fyBudget = col(plan.fyBudget);
      const fyLE = col(plan.fyLE);
      const baseNr = base?.get(NET_REVENUE) ?? null;

      const rows = spine.map((row): StatementRow => {
        const value = (c: Map<string, number | null> | null) =>
          c?.get(row.code) ?? null;
        const b = value(base);
        const compare = (
          on: ColumnPlan | null,
          c: Map<string, number | null> | null,
        ): Variance | null => {
          if (on === null) return null;
          const v = value(c);
          return { value: v, ...variance(row, b, v) };
        };
        const le = value(fyLE);
        const budget = value(fyBudget);
        return {
          ...row,
          base: b,
          pctNr:
            row.kind === "ratio" || b === null || !baseNr ? null : b / baseNr,
          compareA: compare(plan.compareA, compareA),
          compareB: compare(plan.compareB, compareB),
          fyBudget: budget,
          fyLE: { value: le, ...variance(row, le, budget) },
        };
      });
      // C-37: the Intercompany difference shows only when it is not zero — below half a cent is float noise
      const isZero = (r: StatementRow) =>
        [
          r.base,
          r.compareA?.value,
          r.compareB?.value,
          r.fyBudget,
          r.fyLE.value,
        ].every((v) => Math.abs(v ?? 0) < 0.005);
      return {
        rows: rows.filter((r) => r.code !== IC_DIFFERENCE || !isZero(r)),
        plan,
      };
    },

    kpis(sel) {
      return kpis(core, sel, versionPlan(m, sel));
    },

    analysis(sel, against) {
      const plan = versionPlan(m, sel);
      const c = comparisonOf(m, sel, plan, against);
      return {
        comparison: c.comparison,
        bridge: bridge(core, sel, plan.base, c.plan),
        variances: largestVariances(core, sel, plan.base, c.plan),
      };
    },

    profitability(sel, against) {
      const plan = versionPlan(m, sel);
      const c = comparisonOf(m, sel, plan, against);
      return {
        ...profitability(core, sel, plan.base, c.plan),
        comparison: c.comparison,
      };
    },

    notices(sel) {
      return notices(m, versionPlan(m, sel), sel);
    },

    context(sel) {
      return contextLine(m, sel);
    },

    dataStatus() {
      const closed = m.tables.dim_month.filter((d) => d.is_closed);
      const last = closed[closed.length - 1];
      if (!last) throw new Error("engine: no closed month in dim_month");
      return { lastClosedMonth: last.month_key, builtAt: m.builtAt };
    },
  };
}
