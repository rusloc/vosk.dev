import {
  allocates,
  narrow,
  sliceFilter,
  type SliceDimension,
} from "./aggregate";
import type { Core } from "./core";
import { ELIM_REVENUE } from "./core";
import type { ColumnPlan, EntityCode, Selection, SpineRow } from "./types";

// C-45 largest variances and C-46 profitability by slice, both against one comparison (Compare A, else Compare B,
// else prior year — the bridge's comparison, C-40).

export interface VarianceRow {
  code: string;
  label: string; // the leaf line
  block: string; // its block, and in the Group view its company: "Sales & marketing · Commerce Cloud"
  base: number;
  comparison: number;
  delta: number; // base − comparison on signed values: positive is favourable (M-10)
  deltaPct: number | null;
  favourable: boolean | null;
}

const TOP = 8;

/** C-45: leaf lines ranked by |Δ| vs the comparison, top 8. */
export function largestVariances(
  core: Core,
  sel: Selection,
  base: ColumnPlan,
  comparison: ColumnPlan,
): VarianceRow[] {
  const f = sliceFilter(core.m, sel);
  const tr = core.translation(sel);
  const b = core.values(sel.entity, base, f, tr);
  const c = core.values(sel.entity, comparison, f, tr);
  if (!b || !c) return [];
  const rows = core.spine(sel.entity, allocates(f));
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const blockOf = (r: SpineRow) => {
    const names: string[] = [];
    for (
      let p = byCode.get(r.parent ?? "");
      p;
      p = byCode.get(p.parent ?? "")
    ) {
      if (p.kind === "entity") names.push(p.label);
      if (p.kind === "block") {
        names.unshift(p.label);
        break;
      }
    }
    return names.join(" · ");
  };
  return rows
    .filter((r) => r.kind === "leaf")
    .map((r) => {
      const vb = b.get(r.code) ?? 0;
      const vc = c.get(r.code) ?? 0;
      const delta = vb - vc;
      return {
        code: r.code,
        label: r.label,
        block: blockOf(r),
        base: vb,
        comparison: vc,
        delta,
        deltaPct: vc === 0 ? null : delta / Math.abs(vc),
        favourable: delta === 0 ? null : delta > 0,
      };
    })
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, TOP);
}

export interface ProfitabilityRow {
  key: string;
  label: string;
  netRevenue: number | null;
  share: number | null; // of the total shown (rows add up to 100 %)
  growth: number | null; // NR Δ % vs the comparison
  favourable: boolean | null;
  gm: number | null;
  cm: number | null;
  ebitda: number | null;
  op: number | null;
}

export interface Profitability {
  rows: ProfitabilityRow[];
  total: ProfitabilityRow;
}

const DIM: Record<Exclude<Selection["breakdown"], "ENTITY">, SliceDimension> = {
  REGION: "region",
  CHANNEL: "channel",
  LINE: "line",
  SEGMENT: "segment",
};

/**
 * C-46: per value of the breakdown, net revenue, share, growth vs the comparison and four margins. Lines below
 * contribution margin are allocated by net revenue (C-31). Group by region: each region includes its own
 * eliminations; Group by entity: the two companies standalone plus the eliminations, so the rows add up.
 */
export function profitability(
  core: Core,
  sel: Selection,
  base: ColumnPlan,
  comparison: ColumnPlan,
): Profitability {
  const { m } = core;
  const f = sliceFilter(m, sel);
  const tr = core.translation(sel);
  const row = (
    key: string,
    label: string,
    entity: Selection["entity"],
    g = f,
    total?: number | null,
  ): ProfitabilityRow => {
    const b = core.values(entity, base, g, tr);
    const c = core.values(entity, comparison, g, tr);
    const nr = b?.get("NR") ?? null;
    const before = c?.get("NR") ?? null;
    const growth =
      nr === null || !before ? null : (nr - before) / Math.abs(before);
    return {
      key,
      label,
      netRevenue: nr,
      share: nr === null || !total ? null : nr / total,
      growth,
      favourable: growth === null || growth === 0 ? null : growth > 0,
      gm: b?.get("GM_PCT") ?? null,
      cm: b?.get("CM_PCT") ?? null,
      ebitda: b?.get("EBITDA_PCT") ?? null,
      op: b?.get("OP_PCT") ?? null,
    };
  };

  const totalRow = row("TOTAL", "Total", sel.entity);
  const total = totalRow.netRevenue;
  let rows: ProfitabilityRow[];

  // F-21: the Group view breaks down by Region or Entity only; anything else reads as Entity
  const breakdown =
    sel.entity === "GROUP" && sel.breakdown !== "REGION"
      ? "ENTITY"
      : sel.breakdown === "ENTITY" && sel.entity !== "GROUP"
        ? "CHANNEL"
        : sel.breakdown;
  if (breakdown === "ENTITY") {
    const elimination = (() => {
      const v = core.values("GROUP", base, f, tr)?.get(ELIM_REVENUE) ?? null;
      const before =
        core.values("GROUP", comparison, f, tr)?.get(ELIM_REVENUE) ?? null;
      const growth =
        v === null || !before ? null : (v - before) / Math.abs(before);
      return {
        key: "ELIM",
        label: "Intercompany eliminations",
        netRevenue: v,
        share: v === null || !total ? null : v / total,
        growth,
        // a larger elimination is neither good nor bad for the group
        favourable: null,
        gm: null,
        cm: null,
        ebitda: null,
        op: null,
      };
    })();
    rows = [
      ...m.tables.dim_entity.map((e) =>
        row(e.entity_code, e.short_name, e.entity_code, f, total),
      ),
      elimination,
    ];
  } else {
    const dim = DIM[breakdown];
    const values = sliceValues(
      core,
      dim,
      sel.entity === "GROUP" ? null : sel.entity,
    );
    const chosen = f[dim];
    rows = values
      .map((v) => ({ v, index: m.dict[dim].indexOf(v.code) }))
      .filter(({ index }) => chosen === null || chosen.has(index))
      .map(({ v, index }) =>
        row(v.code, v.name, sel.entity, narrow(f, dim, index), total),
      );
  }
  return { rows, total: { ...totalRow, share: total ? 1 : null } };
}

/** The values of one slice dimension in display order: regions are shared, the rest belong to one company. */
function sliceValues(
  core: Core,
  dim: SliceDimension,
  owner: EntityCode | null,
): { code: string; name: string }[] {
  const t = core.m.tables;
  const own = <
    R extends {
      entity_code: string;
      is_unassigned: boolean;
      sort_order: number;
    },
  >(
    rows: readonly R[],
    code: (r: R) => string,
    name: (r: R) => string,
  ) =>
    rows
      .filter((r) => r.entity_code === owner && !r.is_unassigned)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((r) => ({ code: code(r), name: name(r) }));
  switch (dim) {
    case "region":
      return [...t.dim_region]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((r) => ({ code: r.region_code, name: r.region_name }));
    case "channel":
      return own(
        t.dim_channel,
        (r) => r.channel_code,
        (r) => r.channel_name,
      );
    case "line":
      return own(
        t.dim_line,
        (r) => r.line_code,
        (r) => r.line_name,
      );
    case "segment":
      return own(
        t.dim_segment,
        (r) => r.segment_code,
        (r) => r.segment_name,
      );
  }
}
