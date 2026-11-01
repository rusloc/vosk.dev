import { describe, expect, it } from "vitest";
import { filterLine } from "./copy";
import { kpiRows } from "./kpis";
import { monthIndex } from "./windows";

// KPI card rows since 2026-11-01: "vs Budget" and "vs PY" both shown (Budget first), the chip follows the chosen
// comparator; and the one-line filter summary beside the Filters button.

describe("KPI comparator rows", () => {
  const b = { actual: 110, budget: 100, py: 120 };

  it("shows vs Budget and vs PY, Budget first, whatever the comparator", () => {
    for (const cmp of ["BUD", "PY"] as const)
      expect(kpiRows("countUp", b, cmp).rows.map((r) => r.label)).toEqual([
        "vs Budget",
        "vs PY",
      ]);
  });

  it("the chip follows the chosen comparator", () => {
    expect(kpiRows("countUp", b, "BUD").chip?.status).toBe("good"); // 110 vs 100
    expect(kpiRows("countUp", b, "PY").chip?.status).not.toBe("good"); // 110 vs 120
  });

  it("a metric without a Budget shows vs PY alone; a fixed comparator shows itself alone", () => {
    expect(
      kpiRows("countUp", { actual: 1, py: 1 }, "BUD").rows.map((r) => r.label),
    ).toEqual(["vs PY"]);
    expect(
      kpiRows(
        "countUp",
        { actual: 1, py: 1, ref: { label: "vs target", value: 2 } },
        "BUD",
      ).rows.map((r) => r.label),
    ).toEqual(["vs target"]);
  });

  it("falls back to the other row's chip when the chosen one has no value", () => {
    const r = kpiRows("countUp", { actual: 110, budget: null, py: 100 }, "BUD");
    expect(r.rows).toHaveLength(2);
    expect(r.chip?.status).toBe("good");
  });
});

describe("filter line", () => {
  it("window - granularity - comparison - region", () => {
    expect(
      filterLine({
        view: "overview",
        market: "RO",
        tv: "Q",
        anchor: monthIndex("2026-09"),
        cmp: "PY",
        drill: null,
      }),
    ).toBe("Jul–Sep 2026 - Quarter to date - vs Prior year - Romania");
  });
});
