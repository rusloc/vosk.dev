import type { Dataset } from "../data/dataset";
import type { SliceDim } from "./slices";
import type { ColumnPlan, EntityCode, SpineRow } from "./types";
import { money, pctSigned, v } from "./view-context";
import type { Values, ViewContext } from "./view-context";
import type {
  AnalysisVM,
  BridgeStep,
  BridgeVM,
  Tone,
  VarFilter,
  VarFilterDim,
  VarRow,
  VariancesVM,
} from "./view-types";
import { VAR_DIMS } from "./view-types";

// Analysis view (P&L views redesign v4, build-brief §2; one page since 2026-10-31). Lower half: net revenue bridge with
// a constant-currency subtotal (Track B `Bridge Value` + new step "Constant-currency NR") and the profit bridge Budget
// Adj. EBITDA → Actual → Operating profit (new `dim_profit_step`). Upper half: largest variances (`LV *` measures, C-45) with Top-N, block
// grouping, slice cut, prior-year Δ and "of which FX" (`LV FX`, gap analysis P4). Comparison = Compare A, else
// Compare B, else prior year (parity rule 1, `Bridge Comparison Amount`).

const SHORT: Readonly<Record<"B" | "LE" | "PY", string>> = {
  B: "Budget",
  LE: "LE",
  PY: "PY",
};
const SVC_LINES = ["SUB", "PAY", "APP", "PS"] as const; // Commerce Cloud service-line steps (SVC_*), C-40
const VARIANCE_BLOCKS = [
  "GR",
  "GTN",
  "COR",
  "VSC",
  "SM",
  "RD",
  "GA",
  "OOI",
  "DA",
  "ADJ",
] as const; // to OP

const residualOf = (steps: readonly BridgeStep[]) => {
  const start = steps.find((s) => s.kind === "start")?.value ?? 0;
  const end = steps.find((s) => s.kind === "end")?.value ?? 0;
  const changes = steps
    .filter((s) => s.kind === "up" || s.kind === "down" || s.kind === "fx")
    .reduce((a, s) => a + s.value, 0);
  const levels = steps
    .filter((s) => s.kind === "level")
    .reduce((a, s) => a + s.value, 0);
  return start + changes + levels - end;
};

const change = (
  label: string,
  value: number,
  ctx: ViewContext,
  sub: string | null = null,
): BridgeStep => ({
  label,
  kind: value >= 0 ? "up" : "down",
  value,
  text: money(ctx, value, true),
  sub,
});

// ---------- bridges (lower half since 2026-10-31) ----------

function nrBridge(ctx: ViewContext): BridgeVM {
  const { plan, tr, trCC, bridgeCmp: cmp } = ctx;
  const nr = (p: ColumnPlan, t = tr) => v(ctx.total(p, t), "NR") ?? 0;
  const start = nr(cmp.plan);
  const end = nr(plan.base);
  const ccBase = nr(plan.base, trCC);
  const ccCmp = nr(cmp.plan, trCC);
  // labels per build-brief §2: "<cmp> NR → … → Constant-currency NR → FX → Actual NR" (PV-11)
  const steps: BridgeStep[] = [
    {
      label: `${cmp.name} NR`,
      kind: "start",
      value: start,
      text: money(ctx, start),
      sub: null,
    },
  ];
  if (ctx.entity === "S") {
    const base = ctx.values(plan.base, trCC, ["line"]);
    const prior = ctx.values(cmp.plan, trCC, ["line"]);
    const priorAct = ctx.values(cmp.plan, tr, ["line"]);
    for (const l of SVC_LINES) {
      const d =
        (v(base?.get(l) ?? null, "NR") ?? 0) -
        (v(prior?.get(l) ?? null, "NR") ?? 0);
      const stream = v(priorAct?.get(l) ?? null, "NR");
      const name =
        ctx.ds.manifest.tables.dim_line.find((x) => x.line_code === l)
          ?.line_name ?? l;
      steps.push(
        change(name, d, ctx, stream ? pctSigned(d / Math.abs(stream)) : null),
      );
    }
  } else {
    // Consumer Products: volume per lowest slice k = (U base − U cmp) × NRcc cmp ÷ U cmp; a slice without comparison
    // units counts entirely as volume. Price / mix = the CC change − volume, so the steps add up (Bridge Volume /
    // Bridge Price Mix, K-11 / K-12).
    const by: SliceDim[] = ["region", "channel", "line", "segment"];
    const nrB = ctx.values(plan.base, trCC, by);
    const nrC = ctx.values(cmp.plan, trCC, by);
    const uB = ctx.ops(ctx.entity, plan.base, trCC, by);
    const uC = ctx.ops(ctx.entity, cmp.plan, trCC, by);
    let volume = 0;
    for (const k of new Set([...(nrB?.keys() ?? []), ...(nrC?.keys() ?? [])])) {
      const nb = v(nrB?.get(k) ?? null, "NR") ?? 0;
      const nc = v(nrC?.get(k) ?? null, "NR") ?? 0;
      const ub = uB.get(k)?.units ?? 0;
      const uc = uC.get(k)?.units ?? 0;
      volume += uc > 0 ? ((ub - uc) * nc) / uc : nb - nc;
    }
    steps.push(
      change(
        "Volume",
        volume,
        ctx,
        start ? pctSigned(volume / Math.abs(start)) : null,
      ),
    );
    const price = ccBase - ccCmp - volume;
    steps.push(
      change(
        "Price / mix",
        price,
        ctx,
        start ? pctSigned(price / Math.abs(start)) : null,
      ),
    );
  }
  const cc = start + (ccBase - ccCmp);
  steps.push({
    label: "Constant-currency NR",
    kind: "subtotal",
    value: cc,
    text: money(ctx, cc),
    sub: pctSigned(rel0(cc, start)),
  });
  const fx = end - ccBase - (start - ccCmp); // Bridge FX = (NR − NRcc) base − (NR − NRcc) comparison
  steps.push({
    label: "FX",
    kind: "fx",
    value: fx,
    text: money(ctx, fx, true),
    sub: null,
  });
  steps.push({
    label: "Actual NR",
    kind: "end",
    value: end,
    text: money(ctx, end),
    sub: pctSigned(rel0(end, start)),
  });
  return {
    id: "nrBridge",
    title: "Net revenue bridge",
    steps,
    residual: residualOf(steps),
    info: {
      title: "Net revenue bridge",
      what: `${cmp.name} to actual: driver steps at constant currency, a constant-currency subtotal, then FX (translation, not controllable). The axis does not start at zero; read the labels.`,
      formula: `${ctx.entity === "S" ? "service-line step = NRcc actual − NRcc comparison per line" : "volume = Σ slices (U − Ucmp) × NRcc cmp ÷ Ucmp; price / mix = ΔNRcc − volume"}; CC subtotal = comparison + Σ steps; FX = (NR − NRcc) actual − (NR − NRcc) comparison`,
      values: [
        {
          label: `Reported Δ vs ${cmp.name}`,
          value: `${money(ctx, end - start, true)} (${pctSigned(rel0(end, start))})`,
        },
        {
          label: "Constant-currency Δ",
          value: `${money(ctx, cc - start, true)} (${pctSigned(rel0(cc, start))})`,
        },
        { label: "FX", value: money(ctx, fx, true) },
      ],
      source:
        'Bridge Value - Bridge Comparison NR - _NR CC Base - _NR CC Bridge Cmp - Bridge FX - C-40 - new step "Constant-currency NR"',
    },
  };
}

const rel0 = (a: number, b: number) => (b === 0 ? null : (a - b) / Math.abs(b));

function profitBridge(ctx: ViewContext): BridgeVM {
  const { plan, tr, trCC, bridgeCmp: cmp } = ctx;
  const A = ctx.total(plan.base, tr);
  const B = ctx.total(cmp.plan, tr);
  const Acc = ctx.total(plan.base, trCC);
  const Bcc = ctx.total(cmp.plan, trCC);
  const val = (x: Values | null, code: string) => v(x, code) ?? 0;
  const eA = val(A, "EBITDA");
  const eB = val(B, "EBITDA");
  // Gross-profit steps at constant currency, by service line / category (COR is direct at line grain, C-30).
  const linesA = ctx.values(plan.base, trCC, ["line"]);
  const linesB = ctx.values(cmp.plan, trCC, ["line"]);
  const nrA = val(Acc, "NR");
  const nrB = val(Bcc, "NR");
  const gmB = nrB === 0 ? 0 : val(Bcc, "GP") / nrB;
  const volume = (nrA - nrB) * gmB;
  let mix = 0;
  for (const k of new Set([
    ...(linesA?.keys() ?? []),
    ...(linesB?.keys() ?? []),
  ])) {
    const a = linesA?.get(k) ?? null;
    const b = linesB?.get(k) ?? null;
    const nrAl = val(a, "NR");
    const nrBl = val(b, "NR");
    const gmBl =
      nrBl !== 0 ? val(b, "GP") / nrBl : nrAl !== 0 ? val(a, "GP") / nrAl : 0;
    mix += (nrAl - (nrB === 0 ? 0 : (nrA * nrBl) / nrB)) * gmBl;
  }
  const rate = val(Acc, "GP") - val(Bcc, "GP") - volume - mix; // GM rate = the remainder, so the steps add up
  const block = (code: string) => val(Acc, code) - val(Bcc, code);
  const fx = eA - val(Acc, "EBITDA") - (eB - val(Bcc, "EBITDA"));
  const da = val(A, "DA");
  const adj = val(A, "ADJ");
  const op = val(A, "OP");
  const level = (label: string, code: string, x: number): BridgeStep => ({
    label,
    kind: "level",
    value: x,
    text: money(ctx, x),
    sub: `Δ ${money(ctx, x - val(B, code), true)}`, // Δ vs the comparison; the ⓘ names it
  });
  const steps: BridgeStep[] = [
    {
      label: `${cmp.name} Adj. EBITDA`,
      kind: "start",
      value: eB,
      text: money(ctx, eB),
      sub: null,
    },
    change("Revenue volume", volume, ctx),
    change("GM rate", rate, ctx),
    change("GM mix", mix, ctx),
    change("Variable selling", block("VSC"), ctx),
    change("S&M", block("SM"), ctx),
    change("R&D", block("RD"), ctx),
    change("G&A", block("GA"), ctx),
    change("Other operating", block("OOI"), ctx),
    {
      label: "FX",
      kind: "fx",
      value: fx,
      text: money(ctx, fx, true),
      sub: null,
    },
    {
      label: "Adj. EBITDA",
      kind: "subtotal",
      value: eA,
      text: money(ctx, eA),
      sub: `Δ ${money(ctx, eA - eB, true)}`,
    },
    level("D&A", "DA", da),
    level("Adjusting items", "ADJ", adj),
    {
      label: "Operating profit",
      kind: "end",
      value: op,
      text: money(ctx, op),
      sub: `Δ ${money(ctx, op - val(B, "OP"), true)}`,
    },
  ];
  // Reconciliation: comparison EBITDA + changes = actual EBITDA; + D&A + adjusting items = operating profit.
  const changes = steps
    .filter((s) => s.kind === "up" || s.kind === "down" || s.kind === "fx")
    .reduce((a, s) => a + s.value, 0);
  const residual = Math.abs(eB + changes - eA) + Math.abs(eA + da + adj - op);
  return {
    id: "profitBridge",
    title: `Profit bridge: ${cmp.name} Adj. EBITDA → Actual → Operating profit`,
    steps,
    residual,
    info: {
      title: "Profit bridge",
      what: `${cmp.name} Adj. EBITDA to actual: revenue volume at the comparison's gross margin, GM rate and mix by ${ctx.entity === "S" ? "service line" : "category"}, variable selling, the opex blocks (all at constant currency), then FX. D&A and adjusting items are actual levels (their Δ is the small label) so the bridge reconciles to operating profit. No share-based compensation step: not in the data.`,
      formula:
        "volume = ΔNRcc × GM %cmp; mix = Σ lines (NR − NR × share cmp) × GM %cmp,line; rate = ΔGPcc − volume − mix; FX = (E − Ecc) − (Ecmp − Ecc,cmp)",
      values: [
        {
          label: `Adj. EBITDA Δ vs ${cmp.name}`,
          value: money(ctx, eA - eB, true),
        },
        { label: "of which FX", value: money(ctx, fx, true) },
        {
          label: "Δ at constant currency",
          value: money(ctx, eA - eB - fx, true),
        },
        {
          label: `Operating profit Δ vs ${cmp.name}`,
          value: money(ctx, op - val(B, "OP"), true),
        },
      ],
      source:
        "PL Δ A rows VSC SM RD GA OOI - PL Base rows DA ADJ - GP by dim_line - _Bridge NR CC Change - CC branch of _Amt Raw - new dim_profit_step - spec Analysis §5.2",
    },
  };
}

export function analysisBridges(ctx: ViewContext): AnalysisVM {
  return { nr: nrBridge(ctx), profit: profitBridge(ctx) };
}

// ---------- largest variances (upper half since 2026-10-31) ----------
// Every leaf line with data, ranked by |Δ|, under a filter of up to four slice members combined (2026-10-31, owner's
// change; Top-N, block grouping and the cut are gone). Direct lines are read as booked at the member tuple; lines
// below contribution margin are allocated by NR share unless the filter is by region only (C-31, marked alloc.).

const UNASSIGNED = /UNASSIGNED$/;

/** The four filter dimensions with the company's members and slot labels (L-10); the unassigned member is left out. */
export function varianceFilterDims(
  m: Dataset["manifest"],
  entity: EntityCode,
): VarFilterDim[] {
  const t = m.tables;
  const of = <R extends { entity_code: string; slot_label: string }>(
    rows: readonly R[],
    code: (r: R) => string,
    label: (r: R) => string,
  ) => {
    const mine = rows.filter((r) => r.entity_code === entity);
    return {
      label: mine[0]?.slot_label ?? "",
      options: mine
        .filter((r) => !UNASSIGNED.test(code(r)))
        .map((r) => ({ code: code(r), label: label(r) })),
    };
  };
  return [
    {
      dim: "region",
      label: "Region",
      options: t.dim_region.map((r) => ({
        code: r.region_code,
        label: r.region_name,
      })),
    },
    {
      dim: "channel",
      ...of(
        t.dim_channel,
        (r) => r.channel_code,
        (r) => r.channel_name,
      ),
    },
    {
      dim: "line",
      ...of(
        t.dim_line,
        (r) => r.line_code,
        (r) => r.line_name,
      ),
    },
    {
      dim: "segment",
      ...of(
        t.dim_segment,
        (r) => r.segment_code,
        (r) => r.segment_name,
      ),
    },
  ];
}

/** Drops members the company does not have (a link made for the other company, a typo in the URL). */
export function validVarFilter(
  dims: readonly VarFilterDim[],
  f: VarFilter,
): VarFilter {
  const out = { ...f };
  for (const d of dims)
    if (out[d.dim] !== null && !d.options.some((o) => o.code === out[d.dim]))
      out[d.dim] = null;
  return out;
}

export function largestVariances(
  ctx: ViewContext,
  filter: VarFilter,
): VariancesVM {
  const { plan, tr, trCC, bridgeCmp: cmp, spine } = ctx;
  const m = ctx.ds.manifest;
  const idx = new Map(m.dict.account.map((c, i) => [c, i]));
  const dims = varianceFilterDims(m, ctx.entity);
  const by = VAR_DIMS.filter((d) => filter[d] !== null);
  const key = by.map((d) => filter[d]).join("|");
  const allocated = by.some((d) => d !== "region");
  // Leaf vectors of the filtered member ("" = the whole company); a member with nothing booked is all zeros.
  const acc = (p: ColumnPlan, t = tr) =>
    ctx.leaves(p, t, by).get(key) ?? new Float64Array(m.dict.account.length);
  const base = acc(plan.base);
  const comp = acc(cmp.plan);
  // Second comparison column = Compare B (build-brief §2 "Compare B Amount per leaf"); dropped when Compare B = None
  // (parity rule 17, PV-05). Its header names the choice: "vs PY", "vs Budget", "vs LE".
  const cmpB = ctx.compareB;
  const pyHas = cmpB !== null && cmpB.plan.parts.length > 0;
  const py = cmpB ? acc(cmpB.plan) : new Float64Array(m.dict.account.length);
  const baseCC = acc(plan.base, trCC);
  const compCC = acc(cmp.plan, trCC);
  const isBelowCm = new Map(
    m.tables.dim_account.map((a) => [a.account_code, a.is_below_cm]),
  );
  const blockNames = new Map(
    spine.filter((r) => r.kind === "block").map((r) => [r.code, r.label]),
  );
  const nm = 2 * ctx.units.divisor; // n.m. when |comparison| < 2.0 display units (spec Analysis 6.2)

  const deltaPct = (d: number, c: number) => {
    if (Math.abs(c) < nm) return "n.m.";
    const r = d / Math.abs(c);
    return Math.abs(r) > 0.5 ? "n.m." : pctSigned(r);
  };
  // "plan" when the Δ shows as zero in the selected units (half the last displayed digit)
  const zero = 0.5 * 10 ** -ctx.units.decimals * ctx.units.divisor;
  const tone = (d: number): Tone =>
    Math.abs(d) < zero ? "plan" : d > 0 ? "ahead" : "adverse";

  interface Leaf {
    row: VarRow;
    abs: number;
    i: number;
  }
  const leaves: Leaf[] = spine
    .filter(
      (r): r is SpineRow & { parent: string } =>
        r.kind === "leaf" &&
        r.parent !== null &&
        (VARIANCE_BLOCKS as readonly string[]).includes(r.parent),
    )
    // A line with no data in either version is hidden, not "n.m." (Track B parity round 2026-10-27, PV-12); its Δ is
    // 0, so the total is unchanged. n.m. stays for lines with data (comparison < 2.0 or |Δ %| > 50 %).
    .filter((r) => {
      const i = idx.get(r.code) ?? -1;
      return (base[i] ?? 0) !== 0 || (comp[i] ?? 0) !== 0;
    })
    .map((r) => {
      const i = idx.get(r.code) ?? -1;
      const b = base[i] ?? 0;
      const c = comp[i] ?? 0;
      const d = b - c;
      const fx = d - ((baseCC[i] ?? 0) - (compCC[i] ?? 0)); // LV FX = (base − base cc) − (cmp − cmp cc)
      const row: VarRow = {
        kind: "leaf",
        code: r.code,
        label: r.label,
        blockName: blockNames.get(r.parent) ?? r.parent,
        comparison: money(ctx, c),
        actual: money(ctx, b),
        delta: d,
        deltaText: money(ctx, d, true),
        deltaPct: deltaPct(d, c),
        py: pyHas ? money(ctx, b - (py[i] ?? 0), true) : "n/a",
        fx: money(ctx, fx, true),
        tone: tone(d),
        alloc: allocated && (isBelowCm.get(r.code) ?? false),
      };
      return { row, abs: Math.abs(d), i };
    })
    .sort((a, b) => b.abs - a.abs || a.i - b.i);

  const sum = (f: (l: Leaf) => number) => leaves.reduce((s, l) => s + f(l), 0);
  const b = sum((l) => base[l.i] ?? 0);
  const c = sum((l) => comp[l.i] ?? 0);
  const d = b - c;
  const total: VarRow = {
    kind: "footer",
    code: "TOTAL",
    label: "Total P&L Δ at operating profit",
    blockName: null,
    comparison: money(ctx, c),
    actual: money(ctx, b),
    delta: d,
    deltaText: money(ctx, d, true),
    deltaPct: deltaPct(d, c),
    py: pyHas ? money(ctx, b - sum((l) => py[l.i] ?? 0), true) : "n/a",
    fx: money(
      ctx,
      d - sum((l) => (baseCC[l.i] ?? 0) - (compCC[l.i] ?? 0)),
      true,
    ),
    tone: tone(d),
    alloc: false,
  };
  const applied = dims
    .filter((x) => filter[x.dim] !== null)
    .map((x) => x.options.find((o) => o.code === filter[x.dim])?.label ?? "");
  const filterText = applied.length ? applied.join(" · ") : null;
  return {
    title: `Largest variances vs ${cmp.name}`,
    cmpName: cmp.name,
    columns: {
      comparison: cmp.name,
      py: cmpB ? `vs ${SHORT[cmpB.choice]}` : "",
    },
    rows: leaves.map((l) => l.row),
    footer: [total],
    scale: Math.max(...leaves.map((l) => l.abs), 1e-9),
    filter: dims,
    filterText,
    info: {
      title: `Largest variances vs ${cmp.name}`,
      what: "Every leaf line of the P&L down to operating profit, ranked by |Δ|. Δ = actual − comparison on signed values, so a positive Δ always helps profit and a negative one hurts it; bars share one scale. The filter narrows the figures to one region, channel, category or price tier, or any combination of them; opex and below are booked by region only and allocated by NR share to the other slices (marked alloc.).",
      formula:
        "Δ = actual − comparison; Δ % = Δ ÷ |comparison|, n.m. when |comparison| < 2.0 or |Δ %| > 50 %; FX = (actual − actual cc) − (comparison − comparison cc); filtered line = Σ fact rows of the chosen members, below CM × NR share",
      values: [
        { label: "Lines to operating profit", value: String(leaves.length) },
        { label: "Filter", value: filterText ?? "none (whole company)" },
        {
          label: "Second comparison",
          value: cmpB
            ? pyHas
              ? `actual − ${cmpB.name}, same months`
              : `n/a (no ${cmpB.name} data)`
            : "none (Compare B off)",
        },
      ],
      source:
        "LV Base - LV Comparison - LV Δ - LV Δ % - LV Abs Δ - Compare B Amount (PY) - dim_account.block_code - fact_pl / fact_pl_allocated by member tuple (C-30, C-31) - new: LV FX, member filter - C-45",
    },
  };
}
