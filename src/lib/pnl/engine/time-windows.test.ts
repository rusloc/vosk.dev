import { beforeAll, describe, expect, it } from "vitest";
import type { Manifest } from "../data/manifest";
import { loadPublicDataset } from "../test-utils/public-data";
import { resolveWindow } from "./time-windows";

// Spec §7 time windows; month index 0 = Jan 2024.
let dimMonth: Manifest["tables"]["dim_month"];
beforeAll(async () => {
  dimMonth = (await loadPublicDataset(["P"])).manifest.tables.dim_month;
});

describe("resolveWindow", () => {
  it.each([
    ["MTD", 2026, 9, [32], 0],
    ["QTD", 2026, 8, [30, 31], 0],
    ["QTD", 2026, 9, [30, 31, 32], 0],
    ["YTD", 2026, 9, [24, 25, 26, 27, 28, 29, 30, 31, 32], 0],
    ["FY", 2025, 3, [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], 0],
    ["LTM", 2025, 6, [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], 0], // crosses fiscal years
    ["LTM", 2024, 2, [0, 1], 10], // starts before the data history
  ] as const)("%s FY%i month %i", (timeView, fy, month, months, before) => {
    expect(resolveWindow(dimMonth, timeView, fy, month)).toEqual({
      months,
      monthsBeforeHistory: before,
    });
  });

  it("RANGE: every month from the start to the anchor, across fiscal years (2026-11-15)", () => {
    const range = (sfy: number, sm: 1 | 10, fy: number, m: 9 | 12) =>
      resolveWindow(dimMonth, "RANGE", fy, m, { fy: sfy, month: sm });
    expect(range(2025, 10, 2026, 9)).toEqual({
      months: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
      monthsBeforeHistory: 0,
    });
    expect(range(2025, 1, 2026, 12).months).toHaveLength(24);
    // ends the other way round: Sep 2025 – Oct 2026
    expect(range(2026, 10, 2025, 9).months).toEqual(
      Array.from({ length: 14 }, (_, i) => 20 + i),
    );
    expect(resolveWindow(dimMonth, "RANGE", 2026, 9).months).toEqual([32]); // no start: the anchor alone
  });

  it("rejects a month outside dim_month", () => {
    expect(() => resolveWindow(dimMonth, "YTD", 2023, 1)).toThrow(
      /no month 1 in FY2023/,
    );
  });
});
