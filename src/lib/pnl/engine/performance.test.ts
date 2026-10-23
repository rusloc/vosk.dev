import { beforeAll, describe, expect, it } from "vitest";
import type { Dataset } from "../data/dataset";
import { loadPublicDataset } from "../test-utils/public-data";
import { selection } from "../test-utils/selection";
import { createEngine } from "./index";

// T-18 / N-01: a filter change re-renders every zone in under 2 s (p95); ADR-0002 §2.7 sets the engine's own target
// at under 50 ms for a Group YTD statement. Measured 2026-10-22 on the full data: Group statement 12 ms cold,
// 0.6 ms warm; the slowest view call (profitability by channel) 20 ms. Bounds below leave room for slower machines.

let ds: Dataset;
beforeAll(async () => {
  ds = await loadPublicDataset(["P", "S"]);
});

const ms = (fn: () => unknown) => {
  const start = performance.now();
  fn();
  return performance.now() - start;
};

describe("T-18 engine timing at full data volume", () => {
  it("Group YTD statement from a cold cache: under 50 ms", () => {
    // best of three fresh engines, so one scheduling hiccup does not fail the build
    const runs = [0, 1, 2].map(() => {
      const engine = createEngine(ds);
      return ms(() => engine.statement(selection({ entity: "GROUP" })));
    });
    expect(Math.min(...runs)).toBeLessThan(50);
  });

  it("every view for a new filter: well under the 2 s N-01 budget", () => {
    const engine = createEngine(ds);
    const sel = selection({ channel: ["MKT"], region: ["EU", "NA"] });
    const total = ms(() => {
      engine.statement(sel);
      engine.kpis(sel);
      engine.analysis(sel, "A");
      engine.profitability(sel, "A");
    });
    expect(total).toBeLessThan(500);
  });
});
