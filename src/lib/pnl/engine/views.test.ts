import { beforeAll, describe, expect, it } from "vitest";
import type { Dataset } from "../data/dataset";
import { loadPublicDataset } from "../test-utils/public-data";
import { selection } from "../test-utils/selection";
import { createEngine } from "./index";
import type { Engine } from "./index";
import type { EntityView, Selection } from "./types";

// Build steps 6–8: key figures (spec §5), the bridge and largest variances (C-40, C-45), profitability (C-46).

let ds: Dataset;
let engine: Engine;
beforeAll(async () => {
  ds = await loadPublicDataset(["P", "S"]);
  engine = createEngine(ds);
});

const ENTITIES: EntityView[] = ["P", "S", "GROUP"];
const line = (sel: Selection, code: string) =>
  engine.statement(sel).rows.find((r) => r.code === code);

describe("net revenue bridge (C-40)", () => {
  for (const entity of ENTITIES)
    for (const [label, against, extra] of [
      ["vs Budget", "A", {}],
      ["vs prior year", "B", {}],
      [
        "vs prior year, slice on",
        "B",
        entity === "GROUP" ? { region: ["EU"] } : { region: ["NA", "AP"] },
      ],
    ] as const)
      it(`T-05 ${entity} ${label}: comparison + steps = base, to the unit`, () => {
        const sel = selection({ entity, ...extra });
        const { bridge, comparison } = engine.analysis(sel, against);
        const total = bridge.steps.reduce((s, x) => s + x.value, bridge.start);
        expect(Math.abs(total - bridge.end)).toBeLessThan(1);
        expect(bridge.end).toBeCloseTo(line(sel, "NR")?.base ?? NaN, 4);
        expect(comparison.label).toBe(
          against === "A" ? "Budget" : "Prior year",
        );
      });

  it("step sets: volume and price / mix (CP), service lines (CC), companies and eliminations (Group)", () => {
    const keys = (entity: EntityView) =>
      engine
        .analysis(selection({ entity }), "A")
        .bridge.steps.map((s) => s.key);
    expect(keys("P")).toEqual(["VOLUME", "PRICE_MIX", "FX"]);
    expect(keys("S")).toEqual(["SUB", "PAY", "APP", "PS", "FX"]);
    expect(keys("GROUP")).toEqual(["P", "S", "ELIM", "FX"]);
  });

  it("T-10 constant currency: the FX step is zero", () => {
    for (const entity of ENTITIES) {
      const fx = engine
        .analysis(selection({ entity, fxBasis: "CC" }), "B")
        .bridge.steps.find((s) => s.key === "FX");
      expect(Math.abs(fx?.value ?? NaN)).toBeLessThan(0.01);
    }
  });

  it("falls back to the prior year when both comparisons are off", () => {
    const a = engine.analysis(
      selection({ compareA: "NONE", compareB: "NONE" }),
      "A",
    );
    expect(a.comparison.choice).toBe("PY");
  });
});

describe("largest variances (C-45)", () => {
  it("top 8 leaf lines by |Δ|, Δ = base − comparison as in the statement", () => {
    const sel = selection();
    const rows = engine.analysis(sel, "A").variances;
    expect(rows).toHaveLength(8);
    for (let i = 1; i < rows.length; i++)
      expect(Math.abs(rows[i - 1]?.delta ?? 0)).toBeGreaterThanOrEqual(
        Math.abs(rows[i]?.delta ?? 0),
      );
    const top = rows[0];
    const st = line(sel, top?.code ?? "");
    expect(st?.kind).toBe("leaf");
    expect(top?.delta).toBeCloseTo(st?.compareA?.delta ?? NaN, 4);
    expect(top?.favourable).toBe((top?.delta ?? 0) > 0);
  });

  it("Group rows name their block and company", () => {
    const rows = engine.analysis(selection({ entity: "GROUP" }), "A").variances;
    expect(
      rows.every(
        (r) =>
          / · (Consumer Products|Commerce Cloud)$/.test(r.block) ||
          r.code.startsWith("ELIM"),
      ),
    ).toBe(true);
  });
});

describe("profitability by slice (C-46)", () => {
  const cases: [EntityView, Selection["breakdown"]][] = [
    ["P", "CHANNEL"],
    ["P", "REGION"],
    ["P", "SEGMENT"],
    ["S", "LINE"],
    ["GROUP", "REGION"],
    ["GROUP", "ENTITY"],
  ];
  for (const [entity, breakdown] of cases)
    it(`${entity} by ${breakdown}: NR rows sum to the total, shares to 100 %`, () => {
      const p = engine.profitability(selection({ entity, breakdown }), "A");
      const nr = p.rows.reduce((s, r) => s + (r.netRevenue ?? 0), 0);
      const share = p.rows.reduce((s, r) => s + (r.share ?? 0), 0);
      expect(Math.abs(nr - (p.total.netRevenue ?? NaN))).toBeLessThan(0.01);
      expect(share).toBeCloseTo(1, 9);
      expect(p.total.netRevenue).toBeCloseTo(
        line(selection({ entity }), "NR")?.base ?? NaN,
        4,
      );
    });

  it("a slice filter limits the rows to the chosen values", () => {
    const p = engine.profitability(
      selection({ breakdown: "CHANNEL", channel: ["MKT", "D2C"] }),
      "A",
    );
    expect(p.rows.map((r) => r.key)).toEqual(["D2C", "MKT"]);
  });
});

describe("key figures (spec §5)", () => {
  const tile = (sel: Selection, id: string) =>
    engine.kpis(sel).find((t) => t.id === id);

  it("twelve tiles per view, eight financial then four operational", () => {
    for (const entity of ENTITIES) {
      const tiles = engine.kpis(selection({ entity }));
      expect(tiles.map((t) => t.id)).toEqual([
        "K-01",
        "K-02",
        "K-03",
        "K-04",
        "K-05",
        "K-06",
        "K-07",
        "K-08",
        "K-09",
        "K-10",
        "K-11",
        "K-12",
      ]);
      expect(tiles.filter((t) => t.group === "financial")).toHaveLength(8);
    }
  });

  it("tiles equal the statement: net revenue, gross margin, Adj. EBITDA and its margin", () => {
    for (const entity of ENTITIES) {
      const sel = selection({ entity });
      expect(tile(sel, "K-01")?.value).toBeCloseTo(
        line(sel, "NR")?.base ?? NaN,
        4,
      );
      expect(tile(sel, "K-03")?.value).toBeCloseTo(
        line(sel, "GM_PCT")?.base ?? NaN,
        9,
      );
      expect(tile(sel, "K-07")?.value).toBeCloseTo(
        line(sel, "EBITDA")?.base ?? NaN,
        4,
      );
      expect(tile(sel, "K-07")?.sub?.value).toBeCloseTo(
        line(sel, "EBITDA_PCT")?.base ?? NaN,
        9,
      );
      expect(tile(sel, "K-01")?.compareA?.value).toBeCloseTo(
        line(sel, "NR")?.compareA?.value ?? NaN,
        4,
      );
    }
  });

  it("T-17: period-end KPIs read the window's last month, not a sum", () => {
    const ytd = selection({ entity: "S" });
    const sep = selection({ entity: "S", timeView: "MTD" });
    expect(tile(ytd, "K-10")?.value).toBe(tile(sep, "K-10")?.value); // active merchants
    expect(tile(ytd, "K-04")?.value).toBeCloseTo(
      tile(sep, "K-04")?.value ?? NaN,
      4,
    ); // ARR
    expect(tile(sep, "K-04")?.value).toBeGreaterThan(0);
  });

  it("growth KPIs carry no comparisons; neutral KPIs are never coloured (K-20, K-21)", () => {
    const tiles = engine.kpis(selection());
    for (const t of tiles.filter((x) => x.growth)) {
      expect(t.compareA).toBeNull();
      expect(t.compareB).toBeNull();
    }
    for (const t of tiles.filter((x) => x.betterWhen === "neutral"))
      expect(
        [t.compareA?.favourable, t.compareB?.favourable].every(
          (f) => f == null,
        ),
      ).toBe(true);
  });

  it("volume + price / mix vs prior year = organic growth (Consumer Products)", () => {
    const sel = selection();
    const v = tile(sel, "K-11")?.value ?? NaN;
    const pm = tile(sel, "K-12")?.value ?? NaN;
    expect(v + pm).toBeCloseTo(tile(sel, "K-02")?.value ?? NaN, 9);
  });

  it("first-year window: prior year n/a, growth n/a", () => {
    const sel = selection({ fy: 2024, timeView: "FY", month: 12 });
    expect(tile(sel, "K-02")?.value).toBeNull();
    expect(tile(sel, "K-01")?.compareB?.value).toBeNull();
  });
});
