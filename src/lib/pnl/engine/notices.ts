import type { Manifest } from "../data/manifest";
import type { Selection, VersionPlan } from "./types";

// C-50 notices (L-05): the labelled notice rows of the applied-filters pop-up. Parity rule 9: the same rows, labels,
// conditions and text as Track B's dim_filter_row notice rows and `_Notice Row` (Track A reads the same model), in
// Track B's order. A notice that does not apply has no row. Allocation (C-31) and Eliminations (C-36) are written
// here already; they apply once slice filters (step 5) and the Group view (step 4) are built.

export type NoticeCode =
  "N_CLOSE" | "N_FORECAST" | "N_PY" | "N_LTM" | "N_ALLOC" | "N_ELIM";

export interface Notice {
  code: NoticeCode;
  label: string;
  text: string;
}

const LABEL: Record<NoticeCode, string> = {
  N_CLOSE: "Cut-off",
  N_FORECAST: "Forecast",
  N_PY: "Prior year",
  N_LTM: "History",
  N_ALLOC: "Allocation",
  N_ELIM: "Eliminations",
};

export const BASE_LABEL = {
  A: "Actual",
  LE: "Latest estimate",
  B: "Budget",
} as const;
export const COMPARE_LABEL = {
  B: "Budget",
  LE: "Latest estimate",
  PY: "Prior year",
  NONE: null,
} as const;

export function notices(
  m: Manifest,
  sel: Selection,
  plan: VersionPlan,
): Notice[] {
  const dim = m.tables.dim_month;
  const month = (t: number) => {
    const d = dim[t];
    return d ? `${d.month_name} ${d.fiscal_year}` : `month ${t}`;
  };
  const closed = dim.filter((d) => d.is_closed);
  const lastClosed = closed[closed.length - 1]?.month_index ?? -1;
  // Track B's _Win Start / _Win End Raw: the time-view window before the C-01 cut; LTM may start before the data
  const start = (plan.window[0] ?? 0) - plan.monthsBeforeHistory;
  const end = plan.window[plan.window.length - 1] ?? start;
  const forecast =
    m.tables.dim_version.find((v) => v.is_latest_forecast)?.version_name ??
    "latest forecast";
  const company = (e: "P" | "S") =>
    m.tables.dim_entity.find((r) => r.entity_code === e)?.short_name ?? e;
  const group = m.tables.dim_entity[0]?.consolidation_group ?? "Group";
  // Custom range (2026-11-15): the prior-year row also says how much of the range the prior year covers
  const pyMonths = plan.months.filter((t) => t - 12 >= 0).length;
  const pyCover =
    sel.timeView === "RANGE"
      ? `: it covers ${pyMonths} of the range's ${plan.months.length} months`
      : "";

  const text: Record<NoticeCode, string | null> = {
    N_CLOSE:
      sel.base === "A" && end > lastClosed
        ? `Actuals closed through ${month(lastClosed)}: later months excluded; use Latest estimate for the full window`
        : null,
    // Only when the base itself reads forecast months (Track B); a Latest-estimate comparison adds no row
    N_FORECAST:
      sel.base === "LE" && end > lastClosed
        ? `Forecast months included: ${month(Math.max(lastClosed + 1, start))} – ${month(end)} (${forecast})`
        : null,
    N_PY:
      (sel.compareA === "PY" || sel.compareB === "PY") && start - 12 < 0
        ? `Prior year n/a before ${month(0)}${pyCover}`
        : null,
    N_LTM:
      sel.timeView === "LTM" && start < 0
        ? `LTM starts before the data history (${month(0)})`
        : null,
    N_ALLOC:
      [sel.channel, sel.line, sel.segment].some((s) => s.length > 0) &&
      sel.entity !== "GROUP"
        ? "Slice filter on: lines from operating expenses down are allocated by net-revenue share"
        : null,
    N_ELIM:
      sel.entity === "GROUP"
        ? `${group}: ${company("S")} fees billed to ${company("P")} are eliminated`
        : null,
  };
  return (Object.keys(LABEL) as NoticeCode[]).flatMap((code) => {
    const t = text[code];
    return t === null ? [] : [{ code, label: LABEL[code], text: t }];
  });
}

/** Window part of the statement's first column-group title (Track B `PL Hdr Base`): "YTD Sep 2026", "Sep 2026",
 * "LTM Sep 2026", "Full year 2026"; a custom range "Oct 2025 – Sep 2026" or "Mar – Sep 2026". */
export function windowLabel(m: Manifest, sel: Selection): string {
  const name = (fy: number, n: number) =>
    m.tables.dim_month.find((d) => d.fiscal_year === fy && d.month_number === n)
      ?.month_name ?? String(n);
  const at = `${name(sel.fy, sel.month)} ${sel.fy}`;
  if (sel.timeView === "RANGE") {
    if (sel.startFy === sel.fy && sel.startMonth === sel.month) return at;
    const from = name(sel.startFy, sel.startMonth);
    return `${sel.startFy === sel.fy ? from : `${from} ${sel.startFy}`} – ${at}`;
  }
  return sel.timeView === "FY"
    ? `Full year ${sel.fy}`
    : sel.timeView === "MTD"
      ? at
      : `${sel.timeView} ${at}`;
}
