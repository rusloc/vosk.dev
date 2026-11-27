import { describe, expect, it } from "vitest";
import { NAMED_PERIODS, periodLabel, resolvePeriod } from "./periods";

// Named periods against the data's "today" (2026-11-15, a Sunday) and other days, and the label each period gets.

const TODAY = "2026-11-15";

describe("resolvePeriod", () => {
  it.each([
    ["this_week", "2026-11-09", "2026-11-15", "W46 2026"],
    ["last_week", "2026-11-02", "2026-11-08", "W45 2026"],
    ["this_month", "2026-11-01", "2026-11-15", "November 2026 to date"],
    ["last_month", "2026-10-01", "2026-10-31", "October 2026"],
    ["this_quarter", "2026-10-01", "2026-11-15", "Q4 2026 to date"],
    ["last_quarter", "2026-07-01", "2026-09-30", "Q3 2026"],
    ["this_year", "2026-01-01", "2026-11-15", "2026 to date"],
    ["last_year", "2025-01-01", "2025-12-31", "2025"],
    ["last_4_weeks", "2026-10-19", "2026-11-15", "2026-10-19 to 2026-11-15"],
  ] as const)("%s from %s to %s is %s", (name, from, to, label) => {
    expect(resolvePeriod(name, TODAY)).toEqual({ from, to });
    expect(periodLabel(from, to, TODAY)).toBe(label);
  });

  it("covers every named period", () => {
    for (const name of NAMED_PERIODS) {
      const { from, to } = resolvePeriod(name, TODAY);
      expect(from <= to).toBe(true);
      expect(to <= TODAY).toBe(true);
    }
  });

  it("a week still running ends today, and says so", () => {
    expect(resolvePeriod("this_week", "2026-11-11")).toEqual({
      from: "2026-11-09",
      to: "2026-11-11",
    });
    expect(periodLabel("2026-11-09", "2026-11-11", "2026-11-11")).toBe(
      "W46 2026 to date",
    );
  });

  it("crosses a year boundary", () => {
    expect(resolvePeriod("last_quarter", "2026-02-10")).toEqual({
      from: "2025-10-01",
      to: "2025-12-31",
    });
    expect(resolvePeriod("last_month", "2026-01-15")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
    expect(resolvePeriod("last_week", "2026-01-01")).toEqual({
      from: "2025-12-22",
      to: "2025-12-28",
    });
    expect(resolvePeriod("this_week", "2026-01-01")).toEqual({
      from: "2025-12-29",
      to: "2026-01-01",
    });
  });

  it("knows month lengths and leap years", () => {
    expect(resolvePeriod("last_month", "2024-03-05")).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
    expect(resolvePeriod("last_month", "2026-03-31")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });
});

describe("periodLabel", () => {
  it.each([
    ["2026-03-01", "2026-03-31", "March 2026"],
    ["2024-02-01", "2024-02-29", "February 2024"],
    ["2026-04-01", "2026-06-30", "Q2 2026"],
    ["2024-01-01", "2024-12-31", "2024"],
    ["2025-12-29", "2026-01-04", "W1 2026"], // the ISO year holds the Thursday
    ["2020-12-28", "2021-01-03", "W53 2020"],
    ["2026-06-01", "2026-06-07", "W23 2026"], // a Monday on the 1st: the week, not the month
    ["2026-05-04", "2026-06-20", "2026-05-04 to 2026-06-20"],
    ["2026-03-01", "2026-03-20", "2026-03-01 to 2026-03-20"], // not to today: no "to date"
    ["2026-11-03", "2026-11-03", "2026-11-03"],
    ["2026-10-01", "2026-12-31", "Q4 2026"],
  ])("%s to %s is %s", (from, to, label) => {
    expect(periodLabel(from, to, TODAY)).toBe(label);
  });
});
