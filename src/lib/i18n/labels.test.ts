import { describe, expect, it } from "vitest";
import { en } from "./en";
import { ru } from "./ru";

// The sales dashboard keys its chart rows by these labels (they are the legend text), and
// recharts resolves a string dataKey as a property path: a "." or "[" in a label would
// turn every value undefined — empty bars, no error, no type error.
describe("sales dashboard metric labels", () => {
  const METRICS = ["revenue", "profit", "orders", "margin"] as const;

  for (const [locale, dict] of [
    ["en", en],
    ["ru", ru],
  ] as const) {
    it(`${locale}: are safe recharts dataKeys and don't collide`, () => {
      const labels = METRICS.map((key) => dict.salesDashboard[key]);
      for (const label of labels) expect(label).toMatch(/^[^.[\]]+$/);
      // Each row also carries `month` / `name` / `tooltip`; a label equal to one would overwrite it.
      expect(new Set([...labels, "month", "name", "tooltip"]).size).toBe(
        labels.length + 3,
      );
    });
  }
});
