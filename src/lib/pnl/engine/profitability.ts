import { kpiStatus } from "./thresholds";
import type { ColumnPlan } from "./types";
import { money, pct, pctSigned, pp, ratio, rel, v } from "./view-context";
import type { Values, ViewContext } from "./view-context";
import type {
  ConcentrationVM,
  HeatVM,
  ProfRow,
  ProfitabilityVM,
  Tone,
  MarginVM,
} from "./view-types";

// Profitability view (P&L views redesign v4, build-brief §3). Constant currency by default when comparing (README
// decision 7): every amount here is at the selected year's budget rates (C-12). Region only (F-21 default): opex is
// booked at entity × region (C-31), so Adj. EBITDA by region is measured, never allocated. One scrolling page since
// 2026-11-15: 8-column table + concentration bars on top; revenue and margin by month (combo chart since 2026-11-17, it
// replaced the growth × margin bubbles) + region × service line mix heatmap underneath.

export function profitability(ctx: ViewContext): ProfitabilityVM {
  const { plan, trCC, bridgeCmp: cmp, sel } = ctx;
  const t = ctx.ds.manifest.tables;
  const regionName = new Map(
    t.dim_region.map((r) => [r.region_code, r.region_name]),
  );
  const regionOrder = new Map(
    t.dim_region.map((r) => [r.region_code, r.sort_order]),
  );
  const byRegion = (p: ColumnPlan) =>
    ctx.values(p, trCC, ["region"]) ?? new Map<string, Values>();
  const now = byRegion(plan.base);
  const prior = byRegion(cmp.plan);
  const total = ctx.total(plan.base, trCC);
  const totalCmp = ctx.total(cmp.plan, trCC);
  const regions = [...now.keys()].sort(
    (a, b) =>
      (v(now.get(b) ?? null, "NR") ?? 0) - (v(now.get(a) ?? null, "NR") ?? 0) ||
      (regionOrder.get(a) ?? 0) - (regionOrder.get(b) ?? 0),
  );
  const amt = (x: number | null) => money(ctx, x);

  const row = (
    key: string,
    label: string,
    a: Values | null,
    c: Values | null,
    isTotal: boolean,
  ): ProfRow => {
    const nrRel = rel(v(a, "NR"), v(c, "NR"));
    const cm = ratio(v(a, "CM"), v(a, "NR"));
    const cmCmp = ratio(v(c, "CM"), v(c, "NR"));
    const cmDelta = cm === null || cmCmp === null ? null : cm - cmCmp;
    // CM Δ is the only status indicator on this table (build-brief §3, PV-13): the NR Δ % stays plain text
    const tone: Tone = "neutral";
    return {
      key,
      label,
      nr: amt(v(a, "NR")),
      nrDelta: { text: pctSigned(nrRel), tone },
      gm: pct(ratio(v(a, "GP"), v(a, "NR"))),
      cm: pct(cm),
      // the only status dot: CM Δ in pp (thresholds of spec KPI §6, never on revenue)
      cmDelta: {
        text: pp(cmDelta),
        status: kpiStatus(cmDelta, "ratio", "Higher"),
      },
      contribution: amt(v(a, "CM")),
      ebitda: amt(v(a, "EBITDA")),
      total: isTotal,
    };
  };
  const rows = [
    ...regions.map((r) =>
      row(
        r,
        regionName.get(r) ?? r,
        now.get(r) ?? null,
        prior.get(r) ?? null,
        false,
      ),
    ),
    row("TOTAL", "Total", total, totalCmp, true),
  ];

  // Concentration: share of NR, contribution and Adj. EBITDA by region (Prof NR Share pattern).
  const share = (r: string, code: string) =>
    ratio(v(now.get(r) ?? null, code), v(total, code));
  const levels: ConcentrationVM["levels"] = [
    ["Net revenue", "NR"],
    ["Contribution", "CM"],
    ["Adj. EBITDA", "EBITDA"],
  ].map(([label, code]) => ({
    label: label ?? "",
    segments: regions.map((r) => {
      const s = share(r, code ?? "NR") ?? 0;
      return { key: r, label: regionName.get(r) ?? r, share: s, text: pct(s) };
    }),
  }));
  // 2026-11-15 (owner): the panel shows the bars only; the drift that the legend carried is in the ⓘ values
  const concentration: ConcentrationVM = {
    levels,
    info: {
      title: "Concentration - share by profit level",
      what: "Three 100 % bars: each region’s share of net revenue, of contribution and of Adj. EBITDA (booked by region), regions in the table’s order; hover a segment for its region. A region whose share shrinks from revenue to contribution dilutes the margin; one whose share grows is accretive.",
      formula:
        "share = region value ÷ company value, per level; drift = EBITDA share − NR share (pp)",
      values: regions.map((r) => ({
        label: regionName.get(r) ?? r,
        value: `${pct(share(r, "NR"))} / ${pct(share(r, "CM"))} / ${pct(share(r, "EBITDA"))} (drift ${pp((share(r, "EBITDA") ?? 0) - (share(r, "NR") ?? 0))})`,
      })),
      source:
        "Prof NR Share - contribution and EBITDA shares (same pattern on Contribution Margin / Adjusted EBITDA)",
    },
  };

  const margin = marginOf(ctx, regions);

  // Mix heatmap: region × service line (category for Consumer Products), NR at CC; colour = the cell's NR (2026-10-31,
  // owner's change: a heatmap of the cells, no longer the column's GM %).
  const lines = t.dim_line
    .filter((l) => l.entity_code === ctx.entity && !l.is_unassigned)
    .sort((a, b) => a.sort_order - b.sort_order);
  const cells = ctx.values(plan.base, trCC, ["region", "line"]);
  const byLine = ctx.values(plan.base, trCC, ["line"]);
  const heat: HeatVM = {
    rows: regions.map((r) => {
      const regionNr = v(now.get(r) ?? null, "NR");
      return {
        key: r,
        label: regionName.get(r) ?? r,
        cells: lines.map((l) => {
          const c = cells?.get(`${r}|${l.line_code}`) ?? null;
          const nr = v(c, "NR");
          return {
            value: nr,
            text: amt(nr),
            share: pct(ratio(nr, regionNr), 0),
            detail: `${regionName.get(r) ?? r} × ${l.line_name}: NR ${amt(nr)}, ${pct(ratio(nr, regionNr))} of the region, GM ${pct(ratio(v(c, "GP"), nr))}`,
          };
        }),
        total: amt(regionNr),
      };
    }),
    cols: lines.map((l) => {
      const x = byLine?.get(l.line_code) ?? null;
      const gm = ratio(v(x, "GP"), v(x, "NR"));
      return {
        key: l.line_code,
        label: l.line_name,
        gm,
        gmText: `GM ${pct(gm)}`,
        total: amt(v(x, "NR")),
      };
    }),
    grand: amt(v(total, "NR")),
    info: {
      title: `Mix - region × ${ctx.entity === "S" ? "service line" : "category"}`,
      what: "Cells: net revenue at constant currency and its share of the region; colour = the cell's net revenue (dark = large). Column headers carry the line's gross margin %. Row and column totals reconcile to the table.",
      formula:
        "cell = NR(region, line); share = cell ÷ region NR; colour = cell ÷ largest cell; header GM = GP ÷ NR of the line",
      values: lines.map((l) => {
        const x = byLine?.get(l.line_code) ?? null;
        return {
          label: l.line_name,
          value: `NR ${amt(v(x, "NR"))}, GM ${pct(ratio(v(x, "GP"), v(x, "NR")))}`,
        };
      }),
      source:
        "Net Revenue - Gross Profit at dim_region × dim_line grain (both direct, C-30)",
    },
  };

  return {
    title: "Profitability by Region",
    subtitle: `Constant currency (FY${sel.fy} budget rates) - ${sel.currency} ${ctx.unitLabel} - vs ${cmp.name}`,
    table: {
      rows,
      cmpName: cmp.name,
      info: {
        title: "Profitability by Region",
        what: `Constant currency, rows by net revenue. Δ vs ${cmp.name} % on net revenue; GM % and CM % of the region’s revenue; CM Δ = contribution margin % minus ${cmp.name} in pp, the only column with a status dot. Adj. EBITDA is booked by region (C-31): nothing here is allocated.`,
        formula:
          "GM % = GP ÷ NR; CM % = contribution ÷ NR; CM Δ = CM % − comparison CM %",
        values: [
          { label: "Comparison", value: cmp.name },
          {
            label: "Status dot",
            value:
              "on track ±0.3 pp, watch to 1.0 pp, off track beyond, ahead = green",
          },
        ],
        source:
          "Prof Net Revenue - Prof NR Δ % (CC) - Gross Profit - Contribution Margin - KPI CM % - Adjusted EBITDA - new: CM Δ pp - C-46",
      },
    },
    concentration,
    margin,
    heat,
  };
}

/**
 * Revenue and margin by month (2026-11-17, owner: a combo chart; it replaced the 11-15 growth/margin small multiples,
 * which read as ten tiny charts with two metrics). Per period of the selection: net revenue (bars, left axis) and
 * contribution margin % = contribution ÷ NR (line, right axis), constant currency, the company total under the
 * report's filters. Months; whole quarters of the fiscal calendar once the period runs past 12 months (custom ranges).
 * One scan by region and month; the company is the sum of its regions (NR and contribution add up).
 */
function marginOf(ctx: ViewContext, regions: readonly string[]): MarginVM {
  const { plan, trCC } = ctx;
  const dim = ctx.ds.manifest.tables.dim_month;
  const byQuarter = plan.months.length > 12;
  const now = ctx.monthly(plan.base, trCC, ["region"]);
  const periods: {
    key: string;
    short: string;
    long: string;
    months: number[];
  }[] = [];
  for (const t of plan.months) {
    const d = dim[t];
    const key = d
      ? byQuarter
        ? `${d.fiscal_year} ${d.quarter}`
        : d.month_key
      : `m${t}`;
    const last = periods.at(-1);
    if (last?.key === key) last.months.push(t);
    else
      periods.push({
        key,
        short: d ? (byQuarter ? d.quarter : d.month_name.slice(0, 3)) : `${t}`,
        long: d
          ? byQuarter
            ? `${d.quarter} ${d.fiscal_year}`
            : `${d.month_name} ${d.fiscal_year}`
          : `month ${t}`,
        months: [t],
      });
  }
  const sum = (months: readonly number[], code: string) => {
    let any = false;
    let total = 0;
    for (const t of months)
      for (const r of regions) {
        const x = v(now.get(`${r}@${t}`) ?? null, code);
        if (x !== null) {
          any = true;
          total += x;
        }
      }
    return any ? total : null;
  };
  const divisor = ctx.units.divisor;
  const rows = periods.map((p, i) => {
    const nr = sum(p.months, "NR");
    const cm = sum(p.months, "CM");
    const cmPct = ratio(cm, nr);
    const prev = dim[p.months[0]!];
    const before = i > 0 ? dim[periods[i - 1]!.months[0]!] : undefined;
    return {
      key: p.key,
      short: p.short,
      // the year under the first period and wherever it changes
      year:
        prev && prev.fiscal_year !== before?.fiscal_year
          ? `${prev.fiscal_year}`
          : "",
      nr: nr === null ? null : nr / divisor,
      cmPct,
      cmText: pct(cmPct),
      detail: `${p.long}${byQuarter && p.months.length < 3 ? ` (${p.months.length} of 3 months)` : ""}: net revenue ${money(ctx, nr)}, contribution ${money(ctx, cm)}, CM ${pct(cmPct)}`,
    };
  });
  const totalNr = sum(plan.months, "NR");
  const totalCm = sum(plan.months, "CM");
  return {
    grain: byQuarter ? "quarter" : "month",
    unit: `${ctx.symbol} ${ctx.unitLabel}`,
    periods: rows,
    info: {
      title: byQuarter
        ? "Revenue and margin by quarter"
        : "Revenue and margin by month",
      what: "Bars: net revenue of each period, left axis. Line: contribution margin %, the share of revenue left after the cost of sales and the variable costs, right axis. A line that climbs while the bars stay level means each sale earns more. Company total under the report's filters, constant currency; hover a period for its figures. A period longer than 12 months shows quarters.",
      formula: "CM % = contribution ÷ net revenue of the period",
      values: [
        {
          label: "Period",
          value: `net revenue ${money(ctx, totalNr)}, CM ${pct(ratio(totalCm, totalNr))}`,
        },
        ...rows.map((r) => ({
          label: r.detail.split(":")[0] ?? r.key,
          value: r.detail.split(": ")[1] ?? "",
        })),
      ],
      source:
        "KPI CM % per slice by month (contribution ÷ NR), NR at constant currency (C-12)",
    },
  };
}
