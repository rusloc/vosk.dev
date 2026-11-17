import { beforeAll, describe, expect, it } from "vitest";
import type { Manifest } from "../data/manifest";
import { loadPublicDataset } from "../test-utils/public-data";
import { selection } from "../test-utils/selection";
import { periodSummary, periodView, rangePatch } from "./period";

// Period picker v2 (docs/design/period-picker-v2.md Part 1) on the dummy data: FY2024 … FY2026, last close Sep 2026.
let m: Manifest;
beforeAll(async () => {
  m = (await loadPublicDataset(["P"])).manifest;
});

describe("periodSummary — the months the numbers contain, one sentence per time view", () => {
  it.each([
    ["MTD", 2026, 9, "A", "Showing Sep 2026"],
    ["MTD", 2024, 1, "A", "Showing Jan 2024"],
    ["QTD", 2026, 9, "A", "Showing Jul – Sep 2026 - quarter to date"],
    ["QTD", 2026, 7, "A", "Showing Jul 2026 - quarter to date"], // first month of the quarter
    ["YTD", 2026, 9, "A", "Showing Jan – Sep 2026 - year to date"],
    ["YTD", 2025, 1, "A", "Showing Jan 2025 - year to date"],
    ["LTM", 2026, 9, "A", "Showing Oct 2025 – Sep 2026 - last 12 months"], // crosses into the previous year
    ["LTM", 2025, 12, "A", "Showing Jan – Dec 2025 - last 12 months"], // inside one year
    ["LTM", 2024, 3, "A", "Showing Jan – Mar 2024 - last 12 months"], // clipped to the data history
    ["FY", 2025, 9, "A", "Showing Jan – Dec 2025 - full year"],
    ["FY", 2024, 2, "A", "Showing Jan – Dec 2024 - full year"], // the anchor month does not narrow a full year
    // C-01: under Actual the window is cut at the last close (Sep 2026); Latest estimate / Budget keep it whole
    ["FY", 2026, 9, "A", "Showing Jan – Sep 2026 - full year"],
    ["FY", 2026, 9, "LE", "Showing Jan – Dec 2026 - full year"],
    ["FY", 2026, 9, "B", "Showing Jan – Dec 2026 - full year"],
    ["YTD", 2026, 12, "A", "Showing Jan – Sep 2026 - year to date"],
    ["YTD", 2026, 12, "LE", "Showing Jan – Dec 2026 - year to date"],
    ["LTM", 2026, 12, "A", "Showing Jan – Sep 2026 - last 12 months"],
    ["LTM", 2026, 12, "B", "Showing Jan – Dec 2026 - last 12 months"],
    ["QTD", 2026, 11, "A", "Showing no closed month yet"], // parity rule 7: exactly this, no time-view tail
    ["MTD", 2026, 11, "A", "Showing no closed month yet"],
    ["MTD", 2026, 11, "LE", "Showing Nov 2026"],
  ] as const)("%s FY%i month %i base %s", (timeView, fy, month, base, text) => {
    expect(periodSummary(m, { timeView, fy, month, base })).toBe(text);
  });
});

describe("periodSummary — custom range (2026-11-15)", () => {
  it.each([
    [2025, 10, 2026, 9, "A", "Showing Oct 2025 – Sep 2026"],
    [2025, 1, 2026, 12, "LE", "Showing Jan 2025 – Dec 2026"], // two whole years
    [2025, 1, 2026, 12, "A", "Showing Jan 2025 – Sep 2026"], // C-01: Actual stops at the last close
    [2026, 3, 2026, 6, "A", "Showing Mar – Jun 2026"],
    [2024, 2, 2024, 2, "A", "Showing Feb 2024"],
    [2026, 9, 2025, 10, "A", "Showing Oct 2025 – Sep 2026"], // ends given the other way round
  ] as const)(
    "%i-%i to %i-%i base %s",
    (startFy, startMonth, fy, month, base, text) => {
      expect(
        periodSummary(m, {
          timeView: "RANGE",
          startFy,
          startMonth,
          fy,
          month,
          base,
        }),
      ).toBe(text);
    },
  );
});

describe("custom range picker (2026-11-15)", () => {
  const range = selection({
    timeView: "RANGE",
    startFy: 2025,
    startMonth: 10,
    fy: 2026,
    month: 9,
  });

  it("choosing Custom range starts from the months on screen", () => {
    const ytd = periodView(m, selection());
    expect(ytd.range).toBeNull();
    expect(ytd.timeViewPatch("RANGE")).toEqual({
      timeView: "RANGE",
      startFy: 2026,
      startMonth: 1,
    });
    expect(
      periodView(m, selection({ timeView: "LTM" })).timeViewPatch("RANGE"),
    ).toEqual({ timeView: "RANGE", startFy: 2025, startMonth: 10 });
    expect(ytd.timeViewPatch("FY")).toEqual({ timeView: "FY" });
    expect(periodView(m, range).timeViewPatch("RANGE")).toEqual({}); // already a range
  });

  it("the grid edits one end: From shows the first month's year, To the last's", () => {
    const from = periodView(m, range, "from");
    expect(from.gridLabel).toBe("From");
    expect(from.year).toBe(2025);
    expect(from.months.find((c) => c.anchor)?.name).toBe("Oct");
    expect(from.months.filter((c) => c.covered).map((c) => c.name)).toEqual([
      "Oct",
      "Nov",
      "Dec",
    ]);
    const to = periodView(m, range, "to");
    expect(to.gridLabel).toBe("To");
    expect(to.year).toBe(2026);
    expect(to.months.find((c) => c.anchor)?.name).toBe("Sep");
    expect(to.months.filter((c) => c.covered)).toHaveLength(9);
    expect(to.months.filter((c) => !c.selectable)).toHaveLength(3); // C-01 under Actual
    expect(to.fullYearNote).toBeNull();
    expect(to.range).toMatchObject({
      edit: "to",
      from: { label: "Oct 2025" },
      to: { label: "Sep 2026" },
      span: null,
    });
  });

  it("whole-year spans: every year alone and every run of years", () => {
    const v = periodView(m, range);
    expect(v.range?.spans.map((s) => s.label)).toEqual([
      "2024",
      "2024 – 2025",
      "2024 – 2026",
      "2025",
      "2025 – 2026",
      "2026",
    ]);
    expect(v.range?.spans.find((s) => s.key === "2025-2026")?.patch).toEqual({
      startFy: 2025,
      startMonth: 1,
      fy: 2026,
      month: 12,
    });
    expect(
      periodView(
        m,
        selection({
          timeView: "RANGE",
          startFy: 2025,
          startMonth: 1,
          fy: 2026,
          month: 12,
        }),
      ).range?.span,
    ).toBe("2025-2026");
  });

  it("moving one end past the other takes the other along", () => {
    expect(rangePatch(range, "from", 2024, 5)).toEqual({
      startFy: 2024,
      startMonth: 5,
      fy: 2026,
      month: 9,
    });
    expect(rangePatch(range, "from", 2026, 11)).toEqual({
      startFy: 2026,
      startMonth: 11,
      fy: 2026,
      month: 11,
    });
    expect(rangePatch(range, "to", 2025, 3)).toEqual({
      startFy: 2025,
      startMonth: 3,
      fy: 2025,
      month: 3,
    });
    expect(rangePatch(range, "to", 2026, 6)).toEqual({
      startFy: 2025,
      startMonth: 10,
      fy: 2026,
      month: 6,
    });
  });
});

describe("periodView", () => {
  const cells = (overrides: Parameters<typeof selection>[0]) =>
    periodView(m, selection(overrides)).months;
  const names = (rows: readonly { name: string }[]) => rows.map((c) => c.name);

  it('time views first with plain labels, years without "FY"', () => {
    const v = periodView(m, selection());
    expect(v.timeViews.map((t) => t.label)).toEqual([
      "One month",
      "Quarter to date",
      "Year to date",
      "Last 12 months",
      "Full year",
      "Custom range",
    ]);
    expect(v.years).toEqual([2024, 2025, 2026]);
    expect(v.summary).toBe("Showing Jan – Sep 2026 - year to date");
  });

  it.each([
    ["MTD", "Month"],
    ["QTD", "Up to"],
    ["YTD", "Up to"],
    ["LTM", "Ending"],
  ] as const)('%s: the month grid is labelled "%s"', (timeView, label) => {
    const v = periodView(m, selection({ timeView }));
    expect(v.gridLabel).toBe(label);
    expect(v.fullYearNote).toBeNull();
  });

  it("Full year hides the grid and says which months it covers", () => {
    const v = periodView(m, selection({ timeView: "FY" }));
    expect(v.gridLabel).toBeNull();
    expect(v.fullYearNote).toBe("Full year covers January to December.");
  });

  it("12 months of the selected year; the anchor is the selected month", () => {
    const c = cells({ fy: 2025, month: 4 });
    expect(c).toHaveLength(12);
    expect(c.filter((x) => x.anchor).map((x) => x.month)).toEqual([4]);
  });

  it("covered months are the window: YTD, QTD, one month", () => {
    expect(
      names(cells({ timeView: "YTD", month: 9 }).filter((c) => c.covered)),
    ).toEqual(names(cells({}).slice(0, 9)));
    expect(
      names(cells({ timeView: "QTD", month: 8 }).filter((c) => c.covered)),
    ).toEqual(["Jul", "Aug"]);
    expect(
      names(cells({ timeView: "MTD", month: 5 }).filter((c) => c.covered)),
    ).toEqual(["May"]);
  });

  it("LTM across years shades only the selected year’s part", () => {
    expect(
      names(
        cells({ timeView: "LTM", fy: 2026, month: 3 }).filter((c) => c.covered),
      ),
    ).toEqual(["Jan", "Feb", "Mar"]);
    expect(
      names(
        cells({ timeView: "LTM", fy: 2025, month: 12 }).filter(
          (c) => c.covered,
        ),
      ),
    ).toHaveLength(12);
  });

  it('C-01, base Actual: open months are not selectable, say "not closed yet" and are never shaded', () => {
    const c = cells({ base: "A", timeView: "LTM", month: 9 });
    const open = c.filter((x) => !x.selectable);
    expect(names(open)).toEqual(["Oct", "Nov", "Dec"]);
    expect(open.every((x) => x.note === "not closed yet" && !x.covered)).toBe(
      true,
    );
    expect(c.filter((x) => x.selectable).every((x) => x.note === null)).toBe(
      true,
    );
    expect(periodView(m, selection()).openMonthHint).toBe(
      "Switch the base to Latest estimate to include forecast months.",
    );
  });

  it("C-02 / C-05: Latest estimate and Budget make open months selectable with a small label", () => {
    const le = cells({ base: "LE", month: 11 });
    expect(le.every((x) => x.selectable)).toBe(true);
    expect(le.filter((x) => x.note !== null).map((x) => x.note)).toEqual([
      "forecast",
      "forecast",
      "forecast",
    ]);
    expect(names(le.filter((x) => x.covered))).toHaveLength(11);
    expect(
      cells({ base: "B" })
        .filter((x) => x.note !== null)
        .map((x) => x.note),
    ).toEqual(["budget", "budget", "budget"]);
  });

  it("a closed year has no open months", () => {
    expect(
      cells({ fy: 2025 }).every((x) => x.selectable && x.note === null),
    ).toBe(true);
  });
});
