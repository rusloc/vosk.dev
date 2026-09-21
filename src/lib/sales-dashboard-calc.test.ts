import { describe, expect, it } from "vitest";
import {
  channelMix,
  channelShares,
  computeKpis,
  filterOptions,
  filterRows,
  monthlySeries,
  ratio,
  revenueByCategory,
  revenueByCountry,
  topProducts,
  type CategoryRow,
  type CountryRow,
  type MonthlyRow,
  type ProductRow,
  type SalesFilter,
} from "./sales-dashboard-calc";

/**
 * Fixtures use whole numbers so every SUM is asserted exactly — no `toBeCloseTo` hiding a
 * double-count behind float fuzz (it appears only on year-over-year ratios, which are
 * genuinely fractional). Expected values are worked out by hand in the comments, not
 * recomputed with the code under test.
 */

const ALL: SalesFilter = { year: "all", channel: "all" };

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

// 2025 is a full-ish year (Jan, Feb, Mar, Dec); 2026 is PARTIAL (Jan, Feb only).
// Email has no 2026-02 row at all — a channel that went quiet for a month.
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
  it("passes everything through on all/all", () => {
    expect(filterRows(MONTHLY, ALL)).toEqual(MONTHLY);
  });

  it("reads the year off a month string and off a year field alike", () => {
    const byYear: CategoryRow[] = [
      {
        category: "A",
        year: 2025,
        channel: "Email",
        revenue: 1,
        units: 1,
        grossMargin: 1,
      },
      {
        category: "A",
        year: 2026,
        channel: "Email",
        revenue: 2,
        units: 1,
        grossMargin: 1,
      },
    ];

    expect(filterRows(MONTHLY, { year: 2026, channel: "all" })).toHaveLength(3);
    expect(filterRows(byYear, { year: 2026, channel: "all" })).toEqual([
      byYear[1],
    ]);
  });

  it("combines year and channel", () => {
    const rows = filterRows(MONTHLY, { year: 2025, channel: "Email" });

    expect(rows.map((row) => row.month)).toEqual([
      "2025-01",
      "2025-02",
      "2025-03",
    ]);
  });
});

describe("filterOptions", () => {
  it("lists years ascending and channels by name", () => {
    expect(filterOptions(MONTHLY)).toEqual({
      years: [2025, 2026],
      channels: ["Email", "Paid Search"],
    });
  });
});

describe("computeKpis — additivity", () => {
  it("sums revenue and orders over every row on all/all", () => {
    const kpis = computeKpis(MONTHLY, ALL);

    // 100+300+200+400+1000+5000+150+450+600 · 10+20+10+20+50+100+10+30+30
    expect(kpis.revenue.value).toBe(8200);
    expect(kpis.orders.value).toBe(280);
  });

  it("splits cleanly by channel and by year — the parts add up to the whole", () => {
    const revenue = (filter: SalesFilter) =>
      computeKpis(MONTHLY, filter).revenue.value;
    const orders = (filter: SalesFilter) =>
      computeKpis(MONTHLY, filter).orders.value;

    expect(revenue({ year: "all", channel: "Email" })).toBe(1450);
    expect(revenue({ year: "all", channel: "Paid Search" })).toBe(6750);
    expect(revenue({ year: 2025, channel: "all" })).toBe(7000);
    expect(revenue({ year: 2026, channel: "all" })).toBe(1200);
    expect(orders({ year: "all", channel: "Email" })).toBe(80);
    expect(orders({ year: "all", channel: "Paid Search" })).toBe(200);
    expect(1450 + 6750).toBe(8200);
    expect(7000 + 1200).toBe(8200);
    expect(80 + 200).toBe(280);
  });

  it("recomputes the ratios from summed parts — never averages them", () => {
    const rows = [
      monthly("2025-01", "Email", 100, 1, 10), // AOV 100, margin 10%
      monthly("2025-01", "Paid Search", 900, 99, 450), // AOV ~9.09, margin 50%
    ];
    const kpis = computeKpis(rows, ALL);

    expect(kpis.aov.value).toBe(10); // 1000 / 100 — not (100 + 9.09) / 2
    expect(kpis.marginRate.value).toBe(0.46); // 460 / 1000 — not (10% + 50%) / 2
  });
});

describe("computeKpis — zero guards", () => {
  it("returns null ratios, not NaN or Infinity, when nothing matches", () => {
    const kpis = computeKpis(MONTHLY, { year: 2026, channel: "Nope" });

    expect(kpis.revenue.value).toBe(0);
    expect(kpis.orders.value).toBe(0);
    expect(kpis.aov.value).toBeNull();
    expect(kpis.marginRate.value).toBeNull();
  });

  it("guards AOV on zero orders and margin on zero revenue independently", () => {
    expect(
      computeKpis([monthly("2025-01", "Email", 500, 0)], ALL).aov.value,
    ).toBeNull();
    expect(
      computeKpis([monthly("2025-01", "Email", 0, 5, 0)], ALL).marginRate.value,
    ).toBeNull();
    expect(ratio(1, 0)).toBeNull();
    expect(ratio(0, 4)).toBe(0);
  });
});

describe("computeKpis — change vs prior year", () => {
  it("compares a partial year against the SAME months of the prior year", () => {
    const kpis = computeKpis(MONTHLY, { year: 2026, channel: "all" });

    // 2026 covers Jan + Feb → 1200 revenue, 70 orders.
    // 2025 Jan + Feb only  → 1000 revenue, 60 orders. March and the 5000 December are
    // excluded; against the full 7000 this would read as −83% instead of +20%.
    expect(kpis.revenue.change).toBeCloseTo(0.2, 10);
    expect(kpis.orders.change).toBeCloseTo(70 / 60 - 1, 10);
    // AOV 1200/70 vs 1000/60.
    expect(kpis.aov.change).toBeCloseTo(1200 / 70 / (1000 / 60) - 1, 10);
  });

  it("takes month coverage from ALL channels, not the filtered one", () => {
    const kpis = computeKpis(MONTHLY, { year: 2026, channel: "Email" });

    // Email has no 2026-02 row, but 2026 as a whole covers Feb — so Email's prior period
    // is still Jan + Feb 2025 (300), not Jan alone (100). 150 vs 300 = −50%, not +50%.
    expect(kpis.revenue.value).toBe(150);
    expect(kpis.revenue.change).toBeCloseTo(-0.5, 10);
  });

  it("reports margin-rate change in points, not as a relative change", () => {
    const rows = [
      monthly("2025-01", "Email", 1000, 10, 400), // 40%
      monthly("2026-01", "Email", 1000, 10, 450), // 45%
    ];
    const kpis = computeKpis(rows, { year: 2026, channel: "all" });

    expect(kpis.marginRate.change).toBeCloseTo(0.05, 10); // +5 pp, not +12.5%
  });

  it("is undefined across the board for year = all", () => {
    const kpis = computeKpis(MONTHLY, ALL);

    expect(Object.values(kpis).map((kpi) => kpi.change)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("is undefined when the prior year has no data", () => {
    const kpis = computeKpis(MONTHLY, { year: 2025, channel: "all" });

    expect(kpis.revenue.value).toBe(7000);
    expect(Object.values(kpis).map((kpi) => kpi.change)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("is undefined when the channel did not exist in the prior year", () => {
    const rows = [...MONTHLY, monthly("2026-01", "Affiliate", 50, 5)];
    const kpis = computeKpis(rows, { year: 2026, channel: "Affiliate" });

    expect(kpis.revenue.value).toBe(50);
    expect(kpis.revenue.change).toBeUndefined();
    expect(kpis.marginRate.change).toBeUndefined();
  });
});

describe("monthlySeries", () => {
  it("sums channels per month, in month order, and adds up to the KPI", () => {
    const series = monthlySeries(MONTHLY, { year: 2025, channel: "all" });

    expect(series).toEqual([
      { month: "2025-01", revenue: 400, orders: 30 },
      { month: "2025-02", revenue: 600, orders: 30 },
      { month: "2025-03", revenue: 1000, orders: 50 },
      { month: "2025-12", revenue: 5000, orders: 100 },
    ]);
    expect(series.reduce((total, point) => total + point.revenue, 0)).toBe(
      7000,
    );
  });

  it("sorts months even when the input is not sorted", () => {
    const series = monthlySeries([...MONTHLY].reverse(), ALL);

    expect(series.map((point) => point.month)).toEqual([
      "2025-01",
      "2025-02",
      "2025-03",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("plots a zero for a month the selected channel sat out", () => {
    const series = monthlySeries(MONTHLY, { year: 2026, channel: "Email" });

    expect(series).toEqual([
      { month: "2026-01", revenue: 150, orders: 10 },
      { month: "2026-02", revenue: 0, orders: 0 },
    ]);
  });
});

describe("channelMix", () => {
  it("returns aligned, zero-filled series in channel-name order", () => {
    expect(channelMix(MONTHLY, { year: 2026, channel: "all" })).toEqual({
      months: ["2026-01", "2026-02"],
      series: [
        { channel: "Email", revenue: [150, 0] },
        { channel: "Paid Search", revenue: [450, 600] },
      ],
    });
  });

  it("adds up to the same total as the KPI", () => {
    const { series } = channelMix(MONTHLY, ALL);
    const total = series
      .flatMap((entry) => entry.revenue)
      .reduce((sum, value) => sum + value, 0);

    expect(total).toBe(8200);
  });

  it("keeps the full month axis when narrowed to one channel", () => {
    expect(channelMix(MONTHLY, { year: 2026, channel: "Email" })).toEqual({
      months: ["2026-01", "2026-02"],
      series: [{ channel: "Email", revenue: [150, 0] }],
    });
  });
});

describe("channelShares", () => {
  it("turns each month's revenue into fractions that add up to 1", () => {
    // 2026-01: 150 + 450 = 600 → 0.25 / 0.75. 2026-02: Email is quiet → 0 / 1.
    expect(
      channelShares(channelMix(MONTHLY, { year: 2026, channel: "all" })),
    ).toEqual({
      months: ["2026-01", "2026-02"],
      series: [
        { channel: "Email", share: [0.25, 0] },
        { channel: "Paid Search", share: [0.75, 1] },
      ],
    });
  });

  it("gives zeros, not NaN, for a month with no revenue", () => {
    expect(
      channelShares({
        months: ["2026-01"],
        series: [{ channel: "Email", revenue: [0] }],
      }),
    ).toEqual({ months: ["2026-01"], series: [{ channel: "Email", share: [0] }] });
  });
});

describe("revenueByCategory", () => {
  const category = (
    name: string,
    year: number,
    channel: string,
    revenue: number,
  ): CategoryRow => ({
    category: name,
    year,
    channel,
    revenue,
    units: 1,
    grossMargin: 0,
  });
  const ROWS = [
    category("Audio", 2025, "Email", 100),
    category("Audio", 2026, "Email", 50),
    category("Home", 2025, "Email", 400),
    category("Home", 2025, "Paid Search", 100),
    category("Toys", 2026, "Paid Search", 150),
  ];

  it("sums across year and channel, largest first", () => {
    expect(revenueByCategory(ROWS, ALL)).toEqual([
      { category: "Home", revenue: 500 },
      { category: "Audio", revenue: 150 },
      { category: "Toys", revenue: 150 }, // tie with Audio → name order
    ]);
  });

  it("respects the filter", () => {
    expect(revenueByCategory(ROWS, { year: 2025, channel: "Email" })).toEqual([
      { category: "Home", revenue: 400 },
      { category: "Audio", revenue: 100 },
    ]);
  });
});

describe("topProducts", () => {
  const product = (
    name: string,
    revenue: number,
    channel = "Email",
    year = 2025,
  ): ProductRow => ({
    product: name,
    category: "Audio",
    year,
    channel,
    revenue,
    units: 1,
  });

  // P01 … P12 with revenue 1200 … 100, fed in ASCENDING revenue order so a lazy
  // implementation that leans on input order gets caught.
  const TWELVE = Array.from({ length: 12 }, (_, i) =>
    product(`P${String(12 - i).padStart(2, "0")}`, (i + 1) * 100),
  );

  it("returns the ten largest, largest first", () => {
    const top = topProducts(TWELVE, ALL);

    expect(top).toHaveLength(10);
    expect(top.map((row) => row.product)).toEqual([
      "P01",
      "P02",
      "P03",
      "P04",
      "P05",
      "P06",
      "P07",
      "P08",
      "P09",
      "P10",
    ]);
    expect(top[0]).toEqual({
      product: "P01",
      category: "Audio",
      revenue: 1200,
      units: 1,
    });
  });

  it("ranks on the FILTERED sum, merging a product's rows across channel and year", () => {
    const rows = [
      product("Lamp", 300, "Email", 2025),
      product("Lamp", 300, "Paid Search", 2026),
      product("Desk", 500, "Email", 2025),
    ];

    expect(
      topProducts(rows, ALL).map((row) => [row.product, row.revenue]),
    ).toEqual([
      ["Lamp", 600],
      ["Desk", 500],
    ]);
    expect(
      topProducts(rows, { year: 2025, channel: "all" }).map(
        (row) => row.product,
      ),
    ).toEqual(["Desk", "Lamp"]);
  });

  it("breaks ties by name, whatever order the rows arrive in", () => {
    const tied = [
      product("Cherry", 100),
      product("Apple", 100),
      product("Banana", 100),
    ];
    const expected = ["Apple", "Banana", "Cherry"];

    expect(topProducts(tied, ALL).map((row) => row.product)).toEqual(expected);
    expect(
      topProducts([...tied].reverse(), ALL).map((row) => row.product),
    ).toEqual(expected);
  });

  it("keeps a tie at the cut-off deterministic", () => {
    const rows = [product("B", 100), product("A", 100), product("Z", 900)];

    expect(topProducts(rows, ALL, 2).map((row) => row.product)).toEqual([
      "Z",
      "A",
    ]);
  });
});

describe("revenueByCountry", () => {
  const country = (code: string, revenue: number, year = 2025): CountryRow => ({
    country: `Country ${code}`,
    countryCode: code,
    year,
    channel: "Email",
    revenue,
    orders: 1,
  });
  const ROWS = [
    country("DE", 500),
    country("DE", 100, 2026),
    country("US", 900),
    country("FR", 300),
    country("NL", 200),
    country("PL", 50),
  ];

  it("keeps the top N and rolls the rest into a trailing Other", () => {
    expect(revenueByCountry(ROWS, ALL, 3)).toEqual([
      { country: "Country US", countryCode: "US", revenue: 900 },
      { country: "Country DE", countryCode: "DE", revenue: 600 },
      { country: "Country FR", countryCode: "FR", revenue: 300 },
      { country: "Other", countryCode: null, revenue: 250 }, // NL 200 + PL 50
    ]);
  });

  it("loses nothing to the roll-up", () => {
    const total = revenueByCountry(ROWS, ALL, 2).reduce(
      (sum, row) => sum + row.revenue,
      0,
    );

    expect(total).toBe(2050);
  });

  it("adds no Other bucket when everything fits", () => {
    const rows = revenueByCountry(ROWS, ALL, 5);

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.countryCode !== null)).toBe(true);
  });
});
