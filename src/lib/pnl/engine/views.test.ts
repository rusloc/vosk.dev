import { beforeAll, describe, expect, it } from "vitest";
import type { Dataset } from "../data/dataset";
import { loadPublicDataset } from "../test-utils/public-data";
import { selection } from "../test-utils/selection";
import { createFx } from "./fx";
import { createEngine } from "./index";
import type { Engine } from "./index";
import { aggregateBy, createSliceCache } from "./slices";
import { aggregateAccounts } from "./aggregate";
import type { Selection } from "./types";
import { createViewContext, money } from "./view-context";
import { versionPlan } from "./versions";

// P&L views redesign v4 (Vitals · Analysis · Profitability): values against control_totals_usd.csv (the quoted
// Commerce Cloud FY2025 view) and the internal reconciliations of build-brief §5 (bridge Σ steps = Δ, variances total
// = operating-profit Δ, coverage, of which FX = reported − constant currency, shares sum to 100 %, allocation
// conserves every account).

let ds: Dataset;
let engine: Engine;
beforeAll(async () => {
  ds = await loadPublicDataset(["P", "S"]);
  engine = createEngine(ds);
});

const fy2025 = (o: Partial<Selection> = {}) =>
  selection({ entity: "S", fy: 2025, month: 12, timeView: "FY", ...o });
const SELECTIONS: [string, Selection][] = [
  ["S FY2025 vs Budget", fy2025()],
  ["P FY2025 vs Budget", fy2025({ entity: "P" })],
  ["S YTD Sep 2026", selection({ entity: "S" })],
  [
    "P YTD Sep 2026 vs PY only",
    selection({ compareA: "PY", compareB: "NONE" }),
  ],
  [
    "S Q3 2026 in EUR at CC",
    selection({ entity: "S", timeView: "QTD", currency: "EUR", fxBasis: "CC" }),
  ],
];

describe("Vitals", () => {
  it("hero values of the quoted Commerce Cloud FY2025 view (control_totals_usd: NR 667.4, EBITDA 82.8, OP 48.6)", () => {
    const vm = engine.vitals(fy2025());
    expect(vm.results.map((c) => [c.title, c.value])).toEqual([
      ["Net revenue", "$667.4 m"],
      ["Adjusted EBITDA", "$82.8 m"],
      ["Operating profit", "$48.6 m"],
      ["Gross margin %", "55.9%"],
      ["Opex % revenue", "38.9%"],
    ]);
    expect(vm.drivers.map((c) => c.title)).toEqual([
      "GMV processed",
      "Active merchants",
      "ARR (run-rate)",
      "Revenue mix",
      "FY outlook",
    ]);
  });

  it("cards: two Δ rows (Compare A, B), Budget-only chip, a complete ⓘ, no sparkline", () => {
    for (const [, sel] of SELECTIONS) {
      const vm = engine.vitals(sel);
      expect(vm.results).toHaveLength(5);
      expect(vm.drivers).toHaveLength(5);
      for (const c of [...vm.results, ...vm.drivers]) {
        expect(c).not.toHaveProperty("spark");
        expect(c.info.what.length, c.id).toBeGreaterThan(10);
        expect(c.info.source.length, c.id).toBeGreaterThan(5);
        expect(JSON.stringify(c), c.id).not.toMatch(/NaN|undefined|Infinity/);
      }
      const rows = sel.compareB === "NONE" ? 1 : 2;
      expect(vm.results[0]?.rows).toHaveLength(rows); // parity rule 17: NONE drops the row
    }
    expect(engine.vitals(selection()).drivers.map((c) => c.id)).toEqual([
      "units",
      "nrPerUnit",
      "gtn",
      "ap",
      "fy",
    ]); // L-10
  });

  it("heroes equal the statement (one engine, one number)", () => {
    for (const [, sel] of SELECTIONS) {
      const st = engine.statement(sel).rows;
      const val = (code: string) =>
        st.find((r) => r.code === code)?.base ?? null;
      const ctx = createViewContext(
        ds,
        sel,
        createSliceCache(ds),
        createFx(ds.manifest),
      );
      const t = ctx.total(ctx.plan.base, ctx.tr);
      for (const code of ["NR", "EBITDA", "OP"])
        expect(t?.get(code)).toBeCloseTo(val(code) ?? NaN, 6);
    }
  });
});

describe("Analysis, bridges (lower half) — reconcile (T-05)", () => {
  it.each(SELECTIONS)("%s", (_, sel) => {
    const vm = engine.analysis(sel);
    expect(Math.abs(vm.nr.residual)).toBeLessThan(1e-3);
    expect(Math.abs(vm.profit.residual)).toBeLessThan(1e-3);
    const st = engine.statement(sel).rows;
    const op = st.find((r) => r.code === "OP")?.base ?? NaN;
    expect(vm.profit.steps.at(-1)?.value).toBeCloseTo(op, 3);
    const nr = st.find((r) => r.code === "NR")?.base ?? NaN;
    expect(vm.nr.steps.at(-1)?.value).toBeCloseTo(nr, 3);
    // CC subtotal + FX = actual
    const cc = vm.nr.steps.find((s) => s.kind === "subtotal")?.value ?? NaN;
    const fx = vm.nr.steps.find((s) => s.kind === "fx")?.value ?? NaN;
    expect(cc + fx).toBeCloseTo(nr, 3);
    if (sel.fxBasis === "CC") expect(fx).toBeCloseTo(0, 6); // Bridge FX is zero at constant currency
  });

  it("Commerce Cloud bridge steps are the four service lines; Consumer Products volume + price / mix", () => {
    const s = engine.analysis(fy2025()).nr.steps;
    expect(
      s.map((x) => (x.kind === "up" || x.kind === "down" ? "step" : x.kind)),
    ).toEqual([
      "start",
      "step",
      "step",
      "step",
      "step",
      "subtotal",
      "fx",
      "end",
    ]);
    expect(s[1]?.label).toBe("Platform subscriptions");
    expect(
      engine.analysis(fy2025({ entity: "P" })).nr.steps.map((s) => s.label),
    ).toEqual([
      "Budget NR",
      "Volume",
      "Price / mix",
      "Constant-currency NR",
      "FX",
      "Actual NR",
    ]); // build-brief §2 labels (PV-11)
  });
});

describe("Analysis, largest variances (upper half)", () => {
  const F = { region: null, channel: null, line: null, segment: null };
  it.each(SELECTIONS)(
    "%s: every line with data ranked by |Δ|, total = operating-profit Δ, FX = reported − CC",
    (_, sel) => {
      const vm = engine.variances(sel, F);
      const ctx = createViewContext(
        ds,
        sel,
        createSliceCache(ds),
        createFx(ds.manifest),
      );
      const op = (p: typeof ctx.plan.base, t = ctx.tr) =>
        ctx.total(p, t)?.get("OP") ?? 0;
      const total = vm.footer.find((f) => f.code === "TOTAL");
      expect(total?.delta).toBeCloseTo(
        op(ctx.plan.base) - op(ctx.bridgeCmp.plan),
        3,
      );
      expect(vm.footer).toHaveLength(1);
      const abs = vm.rows.map((r) => Math.abs(r.delta));
      expect(abs).toEqual([...abs].sort((a, b) => b - a));
      expect(vm.rows.every((r) => r.kind === "leaf" && r.blockName)).toBe(true);
      expect(vm.filterText).toBeNull();
      // of which FX: Δ at the selected basis − Δ at constant currency, summed over every leaf = OP
      const ccDelta =
        op(ctx.plan.base, ctx.trCC) - op(ctx.bridgeCmp.plan, ctx.trCC);
      const fxTotal = (total?.delta ?? 0) - ccDelta;
      expect(total?.fx).toBe(money(ctx, fxTotal, true));
      if (sel.fxBasis === "CC") expect(Math.abs(fxTotal)).toBeLessThan(1e-6);
    },
  );

  it("filter dimensions: Region plus the company's three slots, without the unassigned member", () => {
    const p = engine.variances(fy2025({ entity: "P" }), F).filter;
    expect(p.map((d) => d.label)).toEqual([
      "Region",
      "Channel",
      "Category",
      "Price tier",
    ]);
    expect(p.map((d) => d.options.length)).toEqual([4, 5, 5, 3]);
    const s = engine.variances(fy2025(), F).filter;
    expect(s.map((d) => d.label)).toEqual([
      "Region",
      "Sales motion",
      "Service line",
      "Customer segment",
    ]);
    expect(
      s.flatMap((d) => d.options).some((o) => /UNASSIGNED/.test(o.code)),
    ).toBe(false);
    // a member of the other company is dropped, a valid one kept
    expect(
      engine.validVarFilter(fy2025({ entity: "P" }), {
        ...F,
        channel: "SELF",
        line: "HOME",
      }),
    ).toEqual({ ...F, line: "HOME" });
  });

  it("a filter by one dimension partitions the total: Σ members = whole company; below CM allocated unless by region", () => {
    const sel = fy2025();
    const whole = engine.variances(sel, F);
    const totalOf = (vm: ReturnType<typeof engine.variances>) =>
      vm.footer.find((f) => f.code === "TOTAL")?.delta ?? NaN;
    for (const d of whole.filter) {
      let sum = 0;
      for (const o of d.options) {
        const vm = engine.variances(sel, { ...F, [d.dim]: o.code });
        sum += totalOf(vm);
        expect(vm.filterText).toBe(o.label);
        const allocated = vm.rows.filter((r) => r.alloc).map((r) => r.code);
        if (d.dim === "region") expect(allocated).toEqual([]);
        else
          expect(
            allocated.every((c) => /^(SM|RD|GA|OOI|DA|ADJ)_/.test(c)),
            d.dim,
          ).toBe(true);
      }
      expect(sum, d.dim).toBeCloseTo(totalOf(whole), 2);
    }
  });

  it("members combine (AND): the four-way filter equals the member tuple of the four-dimension cut", () => {
    const sel = fy2025({ entity: "P" });
    const filter = {
      region: "NA",
      channel: "MKT",
      line: "HOME",
      segment: "PREM",
    };
    const vm = engine.variances(sel, filter);
    expect(vm.filterText).toBe(
      "North America · Online marketplaces · Home care · Premium",
    );
    const ctx = createViewContext(
      ds,
      sel,
      createSliceCache(ds),
      createFx(ds.manifest),
    );
    const by = ["region", "channel", "line", "segment"] as const;
    const base = ctx.leaves(ctx.plan.base, ctx.tr, by).get("NA|MKT|HOME|PREM");
    const comp = ctx
      .leaves(ctx.bridgeCmp.plan, ctx.tr, by)
      .get("NA|MKT|HOME|PREM");
    const idx = new Map(ds.manifest.dict.account.map((c, i) => [c, i]));
    for (const r of vm.rows) {
      const i = idx.get(r.code) ?? -1;
      expect(r.delta, r.code).toBeCloseTo(
        (base?.[i] ?? 0) - (comp?.[i] ?? 0),
        6,
      );
    }
    expect(vm.rows.length).toBeGreaterThan(0);
    // the four single-member totals are each larger than the combined one in magnitude of lines shown
    expect(
      engine.variances(sel, { ...F, region: "NA" }).rows.length,
    ).toBeGreaterThanOrEqual(vm.rows.length);
  });

  it("n.m. when |comparison| < 2.0 display units or |Δ %| > 50 %", () => {
    const vm = engine.variances(fy2025(), F);
    for (const r of vm.rows)
      if (r.deltaPct !== "n.m.")
        expect(
          Math.abs(parseFloat(r.deltaPct.replace("−", "-"))),
        ).toBeLessThanOrEqual(50);
    expect(vm.rows.some((r) => r.deltaPct === "n.m.")).toBe(true);
  });

  it("hides lines with no data in either version; they never show as n.m. (Track B parity round)", () => {
    const sel = fy2025({ entity: "S" });
    const vm = engine.variances(sel, F);
    // S FY2025 vs Budget: OOI_2, ADJ_1 and ADJ_2 are empty in both versions (35 leaves → 32)
    expect(vm.rows).toHaveLength(32);
    for (const code of ["OOI_2", "ADJ_1", "ADJ_2"])
      expect(vm.rows.some((r) => r.code === code)).toBe(false);
    const total = vm.footer.find((f) => f.code === "TOTAL");
    expect(total?.delta).toBeCloseTo(
      vm.rows.reduce((s, r) => s + r.delta, 0),
      6,
    ); // hiding moves no money
  });
});

describe("C-31 allocation in the engine", () => {
  it("a cut by channel / line / segment conserves every account (Σ members = total)", () => {
    const sel = fy2025();
    const fx = createFx(ds.manifest);
    const tr = { fx, currency: sel.currency, basis: sel.fxBasis, fy: sel.fy };
    const plan = versionPlan(ds.manifest, sel).base;
    const total = aggregateAccounts(ds, "S", plan, tr);
    for (const dim of ["channel", "line", "segment"] as const) {
      const cut = aggregateBy(ds, "S", plan, tr, [dim]);
      for (let a = 0; a < total.length; a++) {
        const s = [...cut.values()].reduce((x, arr) => x + (arr[a] ?? 0), 0);
        expect(s, `${dim} ${ds.manifest.dict.account[a]}`).toBeCloseTo(
          total[a] ?? 0,
          2,
        );
      }
      expect([...cut.keys()].some((k) => k.endsWith("UNASSIGNED"))).toBe(false); // nothing left unallocated
    }
  });
});

describe("Profitability", () => {
  it.each(SELECTIONS)(
    "%s: shares sum to 100 %, heat and table reconcile, CC subtitle",
    (_, sel) => {
      const vm = engine.profitability(sel);
      for (const level of vm.concentration.levels)
        expect(
          level.segments.reduce((s, x) => s + x.share, 0),
          level.label,
        ).toBeCloseTo(1, 9);
      expect(vm.table.rows.at(-1)?.label).toBe("Total");
      expect(vm.table.rows.at(-1)?.nr).toBe(vm.heat.grand); // table total = heatmap grand total (both CC)
      expect(vm.subtitle).toMatch(
        /^Constant currency \(FY\d{4} budget rates\)/,
      );
      expect(vm.heat.rows).toHaveLength(4);
      // heatmap colour = the cell's NR: every cell carries its value, the largest cell is a real amount
      const cellValues = vm.heat.rows.flatMap((r) =>
        r.cells.map((c) => c.value),
      );
      expect(cellValues.every((x) => typeof x === "number")).toBe(true);
      expect(Math.max(...cellValues.map((x) => x ?? 0))).toBeGreaterThan(0);
      expect(vm.bubble.points.length).toBeGreaterThan(0);
      expect(JSON.stringify(vm)).not.toMatch(/NaN|undefined|Infinity/);
    },
  );

  it("heat cells add up to their region and line totals (CC)", () => {
    const sel = fy2025();
    const ctx = createViewContext(
      ds,
      sel,
      createSliceCache(ds),
      createFx(ds.manifest),
    );
    const cells = ctx.values(ctx.plan.base, ctx.trCC, ["region", "line"]);
    const regions = ctx.values(ctx.plan.base, ctx.trCC, ["region"]);
    for (const [r, vals] of regions ?? []) {
      const sum = [...(cells ?? [])]
        .filter(([k]) => k.startsWith(`${r}|`))
        .reduce((s, [, x]) => s + (x.get("NR") ?? 0), 0);
      expect(sum, r).toBeCloseTo(vals.get("NR") ?? NaN, 3);
    }
  });

  it("prior-year trails need two earlier years (C-04): none for FY2025, drawn for FY2026", () => {
    expect(
      engine
        .profitability(fy2025())
        .bubble.points.every((p) => p.trail === null),
    ).toBe(true);
    expect(
      engine
        .profitability(selection({ entity: "S" }))
        .bubble.points.every((p) => p.trail !== null),
    ).toBe(true);
  });
});

describe("How to read", () => {
  it("one per view, starting with the period sentence", () => {
    const titles = (["kpi", "analysis", "profitability"] as const).map(
      (view) => engine.howToRead(selection({ view })).title,
    );
    expect(titles).toEqual([
      "How to read - Vitals",
      "How to read - Analysis",
      "How to read - Profitability",
    ]);
    expect(
      engine.howToRead(selection({ view: "kpi" })).lines[0]?.value,
    ).toMatch(/^Showing /);
  });
});
