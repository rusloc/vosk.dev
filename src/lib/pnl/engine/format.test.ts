import { describe, expect, it } from "vitest";
import {
  displayValue,
  formatAmount,
  formatPercent,
  formatPoints,
  isEmptyRow,
  roundsToZero,
} from "./format";
import type { StatementRow } from "./types";

// N-06 number formats; D-30 rounding at display only.
const M = { divisor: 1_000_000, decimals: 1 };
const K = { divisor: 1_000, decimals: 0 };

describe("format", () => {
  it("millions with 1 decimal, thousands with 0, thousands separators", () => {
    expect(formatAmount(3_398_512_345.67, M)).toBe("3,398.5");
    expect(formatAmount(3_398_512_345.67, K)).toBe("3,398,512");
  });

  it("uses a true minus sign (U+2212) and never shows −0", () => {
    expect(formatAmount(-1_719_300_000, M)).toBe("−1,719.3");
    expect(formatAmount(-40_000, M)).toBe("0.0");
    expect(formatPercent(-0.0004)).toBe("0.0%");
  });

  it("percentages with 1 decimal, take rate with 2, points for ratio Δ", () => {
    expect(formatPercent(0.20084)).toBe("20.1%");
    expect(formatPercent(0.029345, 2)).toBe("2.93%");
    expect(formatPoints(-0.0123)).toBe("−1.2 pp");
    expect(formatPoints(0.0123)).toBe("+1.2 pp");
    expect(formatPoints(0.0123)).toBe("+1.2 pp");
  });

  it("n/a for missing values (M-13)", () => {
    expect(formatAmount(null, M)).toBe("n/a");
    expect(formatPercent(null)).toBe("n/a");
    expect(formatPoints(null)).toBe("n/a");
  });

  it("signs deltas with + and keeps zero unsigned (L-12)", () => {
    expect(formatAmount(21_600_000, M, { signed: true })).toBe("+21.6");
    expect(formatAmount(-21_600_000, M, { signed: true })).toBe("−21.6");
    expect(formatAmount(30_000, M, { signed: true })).toBe("0.0");
    expect(formatPercent(0.0312, 1, { signed: true })).toBe("+3.1%");
  });

  it("roundsToZero follows the display units", () => {
    expect(roundsToZero(40_000, M)).toBe(true);
    expect(roundsToZero(60_000, M)).toBe(false);
    expect(roundsToZero(400, K)).toBe(true);
  });

  it("F-15: costs shown as positives flips cost rows only", () => {
    expect(displayValue(-1_719.3, true, -1)).toBe(1_719.3);
    expect(displayValue(-1_719.3, true, 1)).toBe(-1_719.3);
    expect(displayValue(3_398.5, false, -1)).toBe(3_398.5);
    expect(displayValue(null, true, -1)).toBeNull();
  });
});

describe("M-22 hide empty lines (T-16)", () => {
  const row = (kind: StatementRow["kind"], v: number | null): StatementRow => ({
    code: "X",
    kind,
    label: "x",
    alias: null,
    parent: null,
    level: 1,
    tag: null,
    isKey: false,
    isCost: false,
    account: null,
    entity: null,
    base: v,
    pctNr: null,
    compareA: { value: v, delta: 0, deltaPct: null, favourable: null },
    compareB: { value: v, delta: 0, deltaPct: null, favourable: null },
    fyBudget: v,
    fyLE: { value: v, delta: 0, deltaPct: null, favourable: null },
  });
  const sel = { compareA: "B", compareB: "PY", showFyOutlook: true } as const;

  it("hides leaf and company rows that show zero in every visible column", () => {
    expect(isEmptyRow(row("leaf", 40_000), sel, M)).toBe(true); // 0.04 m shows as 0.0
    expect(isEmptyRow(row("entity", null), sel, M)).toBe(true);
    expect(isEmptyRow(row("leaf", 60_000), sel, M)).toBe(false); // shows as 0.1
    expect(isEmptyRow(row("leaf", 40_000), sel, K)).toBe(false); // 40 in thousands
  });

  it("T-16: never hides a block, subtotal, group total, memo or ratio", () => {
    for (const kind of [
      "block",
      "subtotal",
      "group_total",
      "memo",
      "ratio",
    ] as const)
      expect(isEmptyRow(row(kind, 0), sel, M)).toBe(false);
  });

  it("only visible columns count", () => {
    const r = { ...row("leaf", 0), fyBudget: 5_000_000 };
    expect(isEmptyRow(r, sel, M)).toBe(false);
    expect(isEmptyRow(r, { ...sel, showFyOutlook: false }, M)).toBe(true);
  });
});
