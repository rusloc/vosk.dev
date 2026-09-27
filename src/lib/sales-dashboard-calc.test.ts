import { describe, expect, it } from "vitest";
import {
  channelMatrix,
  computeKpis,
  filterOptions,
  filterRows,
  monthlyCombo,
  ratio,
  topItems,
  type CategoryRow,
  type CountryRow,
  type MonthlyRow,
  type SalesDashboardData,
  type SalesFilter,
  type TopMetric,
} from "./sales-dashboard-calc";

/**
 * Fixtures use whole numbers so every SUM is asserted exactly — no `toBeCloseTo` hiding a
 * double-count behind float fuzz (it appears only on year-over-year ratios, which are
 * genuinely fractional). Expected values are worked out by hand in the comments, not
 * recomputed with the code under test.
 */

const ALL: SalesFilter = { year: "all" };

function monthly(
  month: string,
  channel: string,
  revenue: number,
  orders: number,
  grossMargin = revenue / 2,
): MonthlyRow {
  return {
    month,
    channel,
    revenue,
    orders,
    grossMargin,
    units: orders * 2,
    ordersPlaced: orders + 1,
    ordersReturned: 1,
    newCustomerOrders: 0,
  };
}

// 2025 has a hole — nothing at all in April–November; 2026 is PARTIAL (Jan, Feb only).
// Profit is half of revenue on every row, so margin is 50% wherever it is not overridden.
const MONTHLY: MonthlyRow[] = [
  monthly("2025-01", "Email", 100, 10),
  monthly("2025-01", "Paid Search", 300, 20),
  monthly("2025-02", "Email", 200, 10),
  monthly("2025-02", "Paid Search", 400, 20),
  monthly("2025-03", "Email", 1000, 50),
  monthly("2025-12", "Paid Search", 5000, 100),
  monthly("2026-01", "Email", 150, 10),
  monthly("2026-01", "Paid Search", 450, 30),
  monthly("2026-02", "Paid Search", 600, 30),
];

describe("filterRows", () => {
  it("passes everything through on All", () => {
    expect(filterRows(MONTHLY, ALL)).toEqual(MONTHLY);
  });

  it("reads the year off a month string and off a year field alike", () => {
    const byYear: CategoryRow[] = [
      {
        category: "A",
        year: 2025,
        revenue: 1,
        units: 1,
        grossMargin: 1,
      },
      {
        category: "A",
        year: 2026,
        revenue: 2,
        units: 1,
        grossMargin: 1,
      },
    ];

    expect(filterRows(MONTHLY, { year: 2026 })).toHaveLength(3);
    expect(filterRows(byYear, { year: 2026 })).toEqual([byYear[1]]);
  });
});

describe("filterOptions", () => {
  it("lists years ascending, whatever order the rows arrive in", () => {
    expect(filterOptions([...MONTHLY].reverse())).toEqual({
      years: [2025, 2026],
    });
  });
});

describe("computeKpis — additivity", () => {
  it("sums revenue, profit and orders over every row on All", () => {
    const kpis = computeKpis(MONTHLY, ALL);

    // 100+300+200+400+1000+5000+150+450+600 · half of it · 10+20+10+20+50+100+10+30+30
    expect(kpis.revenue.value).toBe(8200);
    expect(kpis.profit.value).toBe(4100);
    expect(kpis.orders.value).toBe(280);
  });

  it("splits cleanly by year — the parts add up to the whole", () => {
    const kpis2025 = computeKpis(MONTHLY, { year: 2025 });
    const kpis2026 = computeKpis(MONTHLY, { year: 2026 });

    expect(kpis2025.revenue.value).toBe(7000);
    expect(kpis2026.revenue.value).toBe(1200);
    expect(kpis2025.profit.value).toBe(3500);
    expect(kpis2026.profit.value).toBe(600);
    expect(kpis2025.orders.value).toBe(210);
    expect(kpis2026.orders.value).toBe(70);
    expect(7000 + 1200).toBe(8200);
    expect(210 + 70).toBe(280);
  });

  it("recomputes margin from summed parts — never averages it", () => {
    const rows = [
      monthly("2025-01", "Email", 100, 1, 10), // margin 10%
      monthly("2025-01", "Paid Search", 900, 99, 450), // margin 50%
    ];

    // 460 / 1000 — not (10% + 50%) / 2
    expect(computeKpis(rows, ALL).margin.value).toBe(0.46);
  });
});

describe("computeKpis — zero guards", () => {
  it("returns zeros and a null margin, not NaN, when nothing matches", () => {
    const kpis = computeKpis(MONTHLY, { year: 2030 });

    expect(kpis.revenue.value).toBe(0);
    expect(kpis.profit.value).toBe(0);
    expect(kpis.orders.value).toBe(0);
    expect(kpis.margin.value).toBeNull();
  });

  it("has no margin on zero revenue", () => {
    const kpis = computeKpis([monthly("2025-01", "Email", 0, 5, 0)], ALL);

    expect(kpis.orders.value).toBe(5);
    expect(kpis.margin.value).toBeNull();
    expect(ratio(1, 0)).toBeNull();
    expect(ratio(0, 4)).toBe(0);
  });
});

describe("computeKpis — change vs prior year", () => {
  it("compares a partial year against the SAME months of the prior year", () => {
    const kpis = computeKpis(MONTHLY, { year: 2026 });

    // 2026 covers Jan + Feb → 1200 revenue, 600 profit, 70 orders.
    // 2025 Jan + Feb only  → 1000 revenue, 500 profit, 60 orders. March and the 5000
    // December are excluded; against the full 7000 this would read as −83% instead of +20%.
    expect(kpis.revenue.change).toBeCloseTo(0.2, 10);
    expect(kpis.profit.change).toBeCloseTo(0.2, 10);
    expect(kpis.orders.change).toBeCloseTo(70 / 60 - 1, 10);
    expect(kpis.margin.change).toBeCloseTo(0, 10); // 50% vs 50%
  });

  it("counts a month with no sales at all as part of the period", () => {
    const rows = [
      monthly("2025-01", "Email", 100, 10),
      monthly("2025-02", "Email", 100, 10),
      monthly("2025-03", "Email", 100, 10),
      monthly("2026-01", "Email", 150, 10),
      monthly("2026-03", "Email", 150, 10), // no 2026-02 row in any channel
    ];
    const kpis = computeKpis(rows, { year: 2026 });

    // The period is Jan–Mar, so the prior is all three 2025 months (300), not Jan + Mar
    // (200): 300 vs 300 is flat, not +50%.
    expect(kpis.revenue.value).toBe(300);
    expect(kpis.revenue.change).toBeCloseTo(0, 10);
  });

  it("reports profit change as relative and margin change in points", () => {
    const rows = [
      monthly("2025-01", "Email", 1000, 10, 400), // 40%
      monthly("2026-01", "Email", 1000, 10, 450), // 45%
    ];
    const kpis = computeKpis(rows, { year: 2026 });

    expect(kpis.profit.change).toBeCloseTo(0.125, 10); // 450 vs 400
    expect(kpis.margin.change).toBeCloseTo(0.05, 10); // +5 pp, not +12.5%
  });

  it("is undefined across the board for All", () => {
    const kpis = computeKpis(MONTHLY, ALL);

    expect(Object.values(kpis).map((kpi) => kpi.change)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("is undefined when the prior year has no data", () => {
    const kpis = computeKpis(MONTHLY, { year: 2025 });

    expect(kpis.revenue.value).toBe(7000);
    expect(Object.values(kpis).map((kpi) => kpi.change)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("has no margin change against a prior period with no revenue", () => {
    const rows = [
      monthly("2025-01", "Email", 0, 5, 0), // every order returned
      monthly("2026-01", "Email", 100, 10, 40),
    ];
    const kpis = computeKpis(rows, { year: 2026 });

    expect(kpis.margin.value).toBe(0.4);
    expect(kpis.margin.change).toBeUndefined();
    expect(kpis.revenue.change).toBeUndefined();
    expect(kpis.profit.change).toBeUndefined();
    expect(kpis.orders.change).toBe(1); // 10 vs 5 — orders still compare
  });
});

describe("monthlyCombo", () => {
  const zero = (month: string) => ({ month, revenue: 0, profit: 0, orders: 0 });

  it("sums channels per month and zero-fills a month with no rows", () => {
    const points = monthlyCombo(MONTHLY, { year: 2025 });

    expect(points).toEqual([
      { month: "2025-01", revenue: 400, profit: 200, orders: 30 },
      { month: "2025-02", revenue: 600, profit: 300, orders: 30 },
      { month: "2025-03", revenue: 1000, profit: 500, orders: 50 },
      ...["04", "05", "06", "07", "08", "09", "10", "11"].map((mm) =>
        zero(`2025-${mm}`),
      ),
      { month: "2025-12", revenue: 5000, profit: 2500, orders: 100 },
    ]);
    expect(points.reduce((total, point) => total + point.revenue, 0)).toBe(
      7000,
    );
  });

  it("runs every month across the year boundary on All, whatever the input order", () => {
    const points = monthlyCombo([...MONTHLY].reverse(), ALL);

    expect(points.map((point) => point.month)).toEqual([
      "2025-01",
      "2025-02",
      "2025-03",
      "2025-04",
      "2025-05",
      "2025-06",
      "2025-07",
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(points.slice(-2)).toEqual([
      { month: "2026-01", revenue: 600, profit: 300, orders: 40 },
      { month: "2026-02", revenue: 600, profit: 300, orders: 30 },
    ]);
  });

  it("stops at the last month of a partial year — no padding to December", () => {
    expect(monthlyCombo(MONTHLY, { year: 2026 })).toEqual([
      { month: "2026-01", revenue: 600, profit: 300, orders: 40 },
      { month: "2026-02", revenue: 600, profit: 300, orders: 30 },
    ]);
  });

  it("is empty for a year with no rows", () => {
    expect(monthlyCombo(MONTHLY, { year: 2030 })).toEqual([]);
  });
});

describe("topItems", () => {
  const category = (
    name: string,
    revenue: number,
    profit: number,
    year = 2025,
  ): CategoryRow => ({
    category: name,
    year,
    revenue,
    units: 1,
    grossMargin: profit,
  });
  const country = (
    code: string,
    name: string,
    revenue: number,
    profit: number,
    year = 2025,
  ): CountryRow => ({
    country: name,
    countryCode: code,
    year,
    revenue,
    orders: 1,
    grossMargin: profit,
  });
  const data = (
    byCategory: CategoryRow[],
    byCountry: CountryRow[] = [],
  ): SalesDashboardData => ({ monthly: [], byCategory, byCountry });

  // 2025, largest revenue → smallest:  revenue  profit  margin
  //   Audio                              1000     300    30%
  //   Books                               900     450    50%
  //   Cameras                             800      80    10%
  //   Decor                               700     560    80%
  //   Electronics                         600     120    20%
  //   Fashion                             100      90    90%
  //   Garden                               50      35    70%   (+ 2000/200 in 2026)
  // Fed in reverse name order so a lazy implementation leaning on input order gets caught.
  const SEVEN = data([
    category("Garden", 2000, 200, 2026),
    category("Garden", 50, 35),
    category("Fashion", 100, 90),
    category("Electronics", 600, 120),
    category("Decor", 700, 560),
    category("Cameras", 800, 80),
    category("Books", 900, 450),
    category("Audio", 1000, 300),
  ]);
  const names = (metric: TopMetric, filter: SalesFilter = { year: 2025 }) =>
    topItems("category", SEVEN, filter, metric).map((item) => item.name);

  it("re-ranks by each metric — the five shown change, not just their order", () => {
    expect(names("revenue")).toEqual([
      "Audio",
      "Books",
      "Cameras",
      "Decor",
      "Electronics",
    ]);
    // Cameras (80) drops out, Fashion (90) comes in.
    expect(names("profit")).toEqual([
      "Decor",
      "Books",
      "Audio",
      "Electronics",
      "Fashion",
    ]);
    // Cameras and Electronics drop out; Fashion and Garden, the two smallest, come in.
    expect(names("margin")).toEqual([
      "Fashion",
      "Decor",
      "Garden",
      "Books",
      "Audio",
    ]);
  });

  it("merges an item's years on All, and ranks on the FILTERED sum", () => {
    expect(topItems("category", SEVEN, { year: 2025 }, "revenue")[0]).toEqual({
      name: "Audio",
      revenue: 1000,
      profit: 300,
      margin: 0.3,
    });

    // All years: Garden's 2026 lifts it to 2050 revenue — and sinks its margin to
    // 235 / 2050 ≈ 11%, out of the margin top five.
    const [garden] = topItems("category", SEVEN, ALL, "revenue");
    expect(garden).toMatchObject({
      name: "Garden",
      revenue: 2050,
      profit: 235,
    });
    expect(garden?.margin).toBeCloseTo(235 / 2050, 10);
    expect(names("revenue", ALL)).toEqual([
      "Garden",
      "Audio",
      "Books",
      "Cameras",
      "Decor",
    ]);
    expect(names("margin", ALL)).toEqual([
      "Fashion",
      "Decor",
      "Books",
      "Audio",
      "Electronics",
    ]);
  });

  it("gives a zero-revenue item a null margin, sunk below every number", () => {
    const rows = data([
      category("Returns only", 0, 0),
      category("Clearance", 100, -10),
      category("Discontinued", 0, 0),
      category("Toys", 100, 50),
    ]);

    // Below the NEGATIVE margin too; and two nulls tie, so they fall back to the name.
    expect(topItems("category", rows, ALL, "margin")).toEqual([
      { name: "Toys", revenue: 100, profit: 50, margin: 0.5 },
      { name: "Clearance", revenue: 100, profit: -10, margin: -0.1 },
      { name: "Discontinued", revenue: 0, profit: 0, margin: null },
      { name: "Returns only", revenue: 0, profit: 0, margin: null },
    ]);
  });

  it.each<TopMetric>(["revenue", "profit", "margin"])(
    "breaks a %s tie by name, whatever order the rows arrive in",
    (metric) => {
      const tied = [
        category("Cherry", 100, 50),
        category("Apple", 100, 50),
        category("Banana", 100, 50),
      ];
      const expected = ["Apple", "Banana", "Cherry"];
      const ranked = (rows: CategoryRow[]) =>
        topItems("category", data(rows), ALL, metric).map((item) => item.name);

      expect(ranked(tied)).toEqual(expected);
      expect(ranked([...tied].reverse())).toEqual(expected);
    },
  );

  it("breaks a tie in code-unit order, not locale order — server and browser must agree", () => {
    const rows = data(
      [],
      [country("AT", "Österreich", 100, 50), country("CY", "Zypern", 100, 50)],
    );

    // "Z" is U+005A, "Ö" is U+00D6. A German collation would put Österreich first.
    expect(
      topItems("country", rows, ALL, "revenue").map((item) => item.name),
    ).toEqual(["Zypern", "Österreich"]);
  });

  it("keeps a tie at the cut-off deterministic", () => {
    const rows = data([
      category("B", 100, 10),
      category("A", 100, 10),
      category("Z", 900, 90),
    ]);

    expect(
      topItems("category", rows, ALL, "revenue", 2).map((item) => item.name),
    ).toEqual(["Z", "A"]);
  });

  it("returns every item when there are fewer than five", () => {
    const rows = data([
      category("Audio", 300, 30),
      category("Books", 200, 20),
      category("Toys", 100, 10),
    ]);

    expect(
      topItems("category", rows, ALL, "profit").map((item) => item.name),
    ).toEqual(["Audio", "Books", "Toys"]);
  });

  it("keys countries by code, labels them by name, and merges their years", () => {
    const rows = data(
      [category("Audio", 99_999, 1)], // the category side — must not leak in
      [
        country("DE", "Germany", 500, 200),
        country("DE", "Germany", 100, 40, 2026),
        country("US", "United States", 900, 270),
        country("FR", "France", 300, 150),
      ],
    );

    expect(topItems("country", rows, ALL, "revenue")).toEqual([
      { name: "United States", revenue: 900, profit: 270, margin: 0.3 },
      { name: "Germany", revenue: 600, profit: 240, margin: 0.4 },
      { name: "France", revenue: 300, profit: 150, margin: 0.5 },
    ]);
    expect(topItems("country", rows, { year: 2026 }, "revenue")).toEqual([
      { name: "Germany", revenue: 100, profit: 40, margin: 0.4 },
    ]);
  });
});

describe("channelMatrix", () => {
  it("gives one row per channel, largest revenue first, and the period's total", () => {
    expect(channelMatrix(MONTHLY, { year: 2026 })).toEqual({
      rows: [
        // 450 + 600 · half · 30 + 30
        {
          channel: "Paid Search",
          revenue: 1050,
          profit: 525,
          orders: 60,
          margin: 0.5,
        },
        { channel: "Email", revenue: 150, profit: 75, orders: 10, margin: 0.5 },
      ],
      total: { revenue: 1200, profit: 600, orders: 70, margin: 0.5 },
    });
  });

  it("sums every year into each channel on All", () => {
    expect(channelMatrix(MONTHLY, ALL)).toEqual({
      rows: [
        // 300+400+5000+450+600 · half · 20+20+100+30+30
        {
          channel: "Paid Search",
          revenue: 6750,
          profit: 3375,
          orders: 200,
          margin: 0.5,
        },
        // 100+200+1000+150 · half · 10+10+50+10
        {
          channel: "Email",
          revenue: 1450,
          profit: 725,
          orders: 80,
          margin: 0.5,
        },
      ],
      total: { revenue: 8200, profit: 4100, orders: 280, margin: 0.5 },
    });
  });

  it.each<[string, SalesFilter]>([
    ["All", ALL],
    ["a full year", { year: 2025 }],
    ["a partial year", { year: 2026 }],
    ["an empty year", { year: 2030 }],
  ])("has a total row equal to the KPI tiles — %s", (_name, filter) => {
    const kpis = computeKpis(MONTHLY, filter);

    expect(channelMatrix(MONTHLY, filter).total).toEqual({
      revenue: kpis.revenue.value,
      profit: kpis.profit.value,
      orders: kpis.orders.value,
      margin: kpis.margin.value,
    });
  });

  it("adds its rows up to the total — orders too, because an order has one channel", () => {
    const { rows, total } = channelMatrix(MONTHLY, { year: 2025 });
    const add = (pick: (row: (typeof rows)[number]) => number) =>
      rows.reduce((sum, row) => sum + pick(row), 0);

    expect(total).toMatchObject({ revenue: 7000, profit: 3500, orders: 210 });
    expect(add((row) => row.revenue)).toBe(7000);
    expect(add((row) => row.profit)).toBe(3500);
    expect(add((row) => row.orders)).toBe(210);
  });

  it("recomputes margin per row and for the total — never averages the rows'", () => {
    const rows = [
      monthly("2025-01", "Email", 100, 1, 10), // 10%
      monthly("2025-01", "Paid Search", 900, 99, 450), // 50%
    ];
    const matrix = channelMatrix(rows, ALL);

    expect(matrix.rows.map((row) => row.margin)).toEqual([0.5, 0.1]);
    expect(matrix.total.margin).toBe(0.46); // 460 / 1000 — not 30%
  });

  it("gives a channel with no revenue a null margin, and breaks revenue ties by name", () => {
    const rows = [
      monthly("2025-01", "Referral", 0, 0, 0),
      monthly("2025-01", "Email", 100, 5),
      monthly("2025-01", "Affiliate", 100, 5),
    ];

    expect(channelMatrix(rows, ALL)).toEqual({
      rows: [
        {
          channel: "Affiliate",
          revenue: 100,
          profit: 50,
          orders: 5,
          margin: 0.5,
        },
        { channel: "Email", revenue: 100, profit: 50, orders: 5, margin: 0.5 },
        { channel: "Referral", revenue: 0, profit: 0, orders: 0, margin: null },
      ],
      total: { revenue: 200, profit: 100, orders: 10, margin: 0.5 },
    });
  });

  it("is empty, with a null-margin total, for a year with no rows", () => {
    expect(channelMatrix(MONTHLY, { year: 2030 })).toEqual({
      rows: [],
      total: { revenue: 0, profit: 0, orders: 0, margin: null },
    });
  });
});
