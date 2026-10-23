import { narrow, sliceFilter } from "./aggregate";
import type { Core } from "./core";
import { ELIM_REVENUE } from "./core";
import type { ColumnPlan, EntityCode, Selection } from "./types";

// C-40 net revenue bridge: from the comparison's net revenue to the base's. Driver steps at constant currency
// (the selected year's budget rates, C-12); FX is the translation difference. The steps add up exactly (T-05):
// comparison NR + every step = base NR, by construction — FX is what is left once the drivers are taken out.

export interface BridgeStep {
  key: string;
  label: string;
  value: number;
}

export interface Bridge {
  start: number; // comparison net revenue
  end: number; // base net revenue
  steps: BridgeStep[];
}

const NR = "NR";

export function bridge(
  core: Core,
  sel: Selection,
  base: ColumnPlan,
  comparison: ColumnPlan,
): Bridge {
  const { m } = core;
  const f = sliceFilter(m, sel);
  const tr = core.translation(sel);
  const cc = core.translation(sel, "CC");
  const nr = (e: Selection["entity"], plan: ColumnPlan, t = tr) =>
    core.values(e, plan, f, t)?.get(NR) ?? 0;

  const start = nr(sel.entity, comparison);
  const end = nr(sel.entity, base);
  const drivers: BridgeStep[] = [];

  if (sel.entity === "GROUP") {
    // Change by company, then the change in eliminations — a Δ of base vs comparison, not a level.
    for (const e of ["P", "S"] as const)
      drivers.push({
        key: e,
        label:
          m.tables.dim_entity.find((d) => d.entity_code === e)?.short_name ?? e,
        value: nr(e, base, cc) - nr(e, comparison, cc),
      });
    const elim = (plan: ColumnPlan) =>
      core.values("GROUP", plan, f, cc)?.get(ELIM_REVENUE) ?? 0;
    drivers.push({
      key: "ELIM",
      label: "Intercompany eliminations",
      value: elim(base) - elim(comparison),
    });
  } else if (sel.entity === "S") {
    // Commerce Cloud: the change in net revenue at constant currency by service line.
    const lines = m.tables.dim_line
      .filter((l) => l.entity_code === "S" && !l.is_unassigned)
      .sort((a, b) => a.sort_order - b.sort_order);
    for (const l of lines) {
      const g = narrow(f, "line", m.dict.line.indexOf(l.line_code));
      const v = (plan: ColumnPlan) =>
        core.values("S", plan, g, cc)?.get(NR) ?? 0;
      drivers.push({
        key: l.line_code,
        label: l.line_name,
        value: v(base) - v(comparison),
      });
    }
  } else {
    drivers.push(...productsDrivers(core, sel.entity, base, comparison, sel));
  }

  const driversTotal = drivers.reduce((s, d) => s + d.value, 0);
  return {
    start,
    end,
    steps: [
      ...drivers,
      // With FX basis = constant currency this is zero (T-10).
      { key: "FX", label: "FX", value: end - start - driversTotal },
    ],
  };
}

/**
 * Consumer Products, per lowest slice k (region × channel × category × tier), with U = units sold:
 * Volume_k = (U_b,k − U_c,k) · NRcc_c,k ÷ U_c,k; Price / mix_k = NRcc_b,k − NRcc_c,k − Volume_k.
 * A slice the comparison sold no units in counts entirely as volume.
 */
function productsDrivers(
  core: Core,
  e: EntityCode,
  base: ColumnPlan,
  comparison: ColumnPlan,
  sel: Selection,
): BridgeStep[] {
  const f = sliceFilter(core.m, sel);
  const cc = core.translation(sel, "CC");
  const nrB = core.agg.nrBySlice(e, base, f, cc);
  const nrC = core.agg.nrBySlice(e, comparison, f, cc);
  const uB = core.agg.operational(e, base, f, cc).unitsBySlice;
  const uC = core.agg.operational(e, comparison, f, cc).unitsBySlice;
  let volume = 0;
  let priceMix = 0;
  for (const k of new Set([...nrB.keys(), ...nrC.keys()])) {
    const b = nrB.get(k) ?? 0;
    const c = nrC.get(k) ?? 0;
    const unitsC = uC.get(k) ?? 0;
    const v = unitsC === 0 ? b - c : ((uB.get(k) ?? 0) - unitsC) * (c / unitsC);
    volume += v;
    priceMix += b - c - v;
  }
  return [
    { key: "VOLUME", label: "Volume", value: volume },
    { key: "PRICE_MIX", label: "Price / mix", value: priceMix },
  ];
}
