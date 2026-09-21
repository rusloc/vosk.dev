import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CubeRow } from "./cube";
import { getSalesDashboardData } from "./sales-dashboard";

/**
 * Tests for the dashboard's query layer. `./cube` is mocked — there is no live endpoint —
 * so what is exercised here is the contract on what comes back: the `.strict()` row
 * schemas, the `_alias` → camelCase mapping, and the house style of the SQL going out.
 */

const mocks = vi.hoisted(() => ({ cubeSql: vi.fn() }));

// Hoisted above the imports by Vitest, so the static import above already sees the mock.
vi.mock("./cube", () => ({ cubeSql: mocks.cubeSql }));

type QueryName = "monthly" | "byCategory" | "byProduct" | "byCountry";

const MONTHLY: CubeRow = {
  _month: "2025-06-01T00:00:00.000",
  _channel: "Email",
  _revenue: 1234.5,
  _orders: 10,
  _units: 25,
  _gross_margin: 400.25,
  _orders_placed: 12,
  _orders_returned: 1,
  _new_customer_orders: 4,
};

const PRODUCT: CubeRow = {
  _product: "Desk Lamp",
  _category: "Home",
  _year: "2025-01-01T00:00:00.000",
  _channel: "Email",
  _revenue: 120,
  _units: 3,
};

const GOOD: Record<QueryName, CubeRow[]> = {
  monthly: [MONTHLY],
  byCategory: [
    {
      _category: "Audio",
      _year: "2025-01-01T00:00:00.000",
      _channel: "Email",
      _revenue: 900,
      _units: 9,
      _gross_margin: 300,
    },
  ],
  byProduct: [PRODUCT],
  byCountry: [
    {
      _country: "Germany",
      _country_code: "DE",
      _year: "2025-01-01T00:00:00.000",
      _channel: "Email",
      _revenue: 500,
      _orders: 5,
    },
  ],
};

/** Tells the four queries apart by an alias only that one selects. */
function queryName(sql: string): QueryName {
  if (sql.includes("_month")) return "monthly";
  if (sql.includes("_product")) return "byProduct";
  if (sql.includes("_country")) return "byCountry";
  return "byCategory";
}

function answerWith(overrides: Partial<Record<QueryName, CubeRow[]>> = {}) {
  const rows = { ...GOOD, ...overrides };
  mocks.cubeSql.mockImplementation(async (sql: string) => rows[queryName(sql)]);
}

const without = (row: CubeRow, key: string): CubeRow =>
  Object.fromEntries(Object.entries(row).filter(([name]) => name !== key));

const sentQueries = (): string[] =>
  mocks.cubeSql.mock.calls.map(([sql]) => sql as string);

beforeEach(() => {
  mocks.cubeSql.mockReset();
  answerWith();
});

describe("getSalesDashboardData — payload", () => {
  it("maps the four result sets to clean camelCase rows", async () => {
    await expect(getSalesDashboardData()).resolves.toEqual({
      monthly: [
        {
          month: "2025-06", // sliced off the timestamp, never parsed
          channel: "Email",
          revenue: 1234.5,
          orders: 10,
          units: 25,
          grossMargin: 400.25,
          ordersPlaced: 12,
          ordersReturned: 1,
          newCustomerOrders: 4,
        },
      ],
      byCategory: [
        {
          category: "Audio",
          year: 2025, // a number, not "2025"
          channel: "Email",
          revenue: 900,
          units: 9,
          grossMargin: 300,
        },
      ],
      byProduct: [
        {
          product: "Desk Lamp",
          category: "Home",
          year: 2025,
          channel: "Email",
          revenue: 120,
          units: 3,
        },
      ],
      byCountry: [
        {
          country: "Germany",
          countryCode: "DE",
          year: 2025,
          channel: "Email",
          revenue: 500,
          orders: 5,
        },
      ],
    });
    expect(mocks.cubeSql).toHaveBeenCalledTimes(4);
  });

  it("is plain JSON — it has to survive the server → client boundary", async () => {
    const data = await getSalesDashboardData();

    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });

  it("reads a NULL measure as zero — a group with no completed lines is a real row", async () => {
    answerWith({ byProduct: [{ ...PRODUCT, _revenue: null, _units: null }] });

    const { byProduct } = await getSalesDashboardData();

    expect(byProduct[0]).toMatchObject({ revenue: 0, units: 0 });
  });

  it.each([
    ["a space-separated timestamp", "2025-06-01 00:00:00"],
    ["a Z-suffixed timestamp", "2025-06-01T00:00:00.000Z"],
    ["a bare date", "2025-06-01"],
  ])("accepts %s", async (_name, raw) => {
    answerWith({ monthly: [{ ...MONTHLY, _month: raw }] });

    const { monthly } = await getSalesDashboardData();

    expect(monthly[0]?.month).toBe("2025-06");
  });
});

describe("getSalesDashboardData — a broken contract fails loudly", () => {
  it.each([
    ["an unexpected column", { ...MONTHLY, _aov: 12.5 }, /"monthly".*_aov/],
    [
      "a renamed measure",
      { ...without(MONTHLY, "_revenue"), _net_revenue: 1 },
      /"monthly".*_revenue/,
    ],
    [
      "a number that arrived as a string",
      { ...MONTHLY, _revenue: "1234.5" },
      /"monthly".*_revenue/,
    ],
    [
      "a month that is not a timestamp",
      { ...MONTHLY, _month: "June 2025" },
      /"monthly".*_month/,
    ],
    ["an empty dimension", { ...MONTHLY, _channel: "" }, /"monthly".*_channel/],
    ["a null dimension", { ...MONTHLY, _channel: null }, /"monthly".*_channel/],
  ])("rejects %s", async (_name, row, message) => {
    answerWith({ monthly: [row] });

    await expect(getSalesDashboardData()).rejects.toThrow(message);
  });

  it("rejects an empty result — the warehouse is static and never empty", async () => {
    answerWith({ byCountry: [] });

    await expect(getSalesDashboardData()).rejects.toThrow(
      /"byCountry" broke its row contract/,
    );
  });

  it("keeps the error short when every row is wrong", async () => {
    answerWith({
      byProduct: Array.from({ length: 1000 }, () => ({
        ...PRODUCT,
        _revenue: "x",
      })),
    });

    const error: unknown = await getSalesDashboardData().catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('"byProduct"');
    expect((error as Error).message.length).toBeLessThan(600);
  });

  it("propagates a Cube failure instead of returning a partial payload", async () => {
    mocks.cubeSql.mockRejectedValueOnce(
      new Error("Cube responded 503: asleep"),
    );

    await expect(getSalesDashboardData()).rejects.toThrow("Cube responded 503");
  });
});

describe("the SQL that goes out", () => {
  it("queries only the sales_overview view, from 2024-01-01 on", async () => {
    await getSalesDashboardData();

    for (const sql of sentQueries()) {
      expect(sql).toContain("\nfrom sales_overview s\n");
      expect(sql).toContain("\n    and s.ordered_at >= date '2024-01-01'\n");
    }
  });

  it("never selects a ratio, and never selects orders across category or product", async () => {
    await getSalesDashboardData();
    const queries = sentQueries();

    for (const sql of queries) {
      expect(sql).not.toMatch(/aov|margin_rate|return_rate/);
    }
    const acrossProducts = queries.filter((sql) => sql.includes("s.category"));
    expect(acrossProducts).toHaveLength(2); // Q2 + Q3
    for (const sql of acrossProducts) {
      expect(sql).not.toContain("measure(s.orders");
    }
  });

  it("follows the house SQL style", async () => {
    await getSalesDashboardData();

    for (const sql of sentQueries()) {
      const lines = sql.split("\n");
      const from = lines.findIndex((line) => line.startsWith("from "));
      const columns = lines.slice(1, from);

      expect(sql).toBe(sql.toLowerCase());
      expect(sql).toBe(sql.trim());
      expect(lines[0]).toBe("select"); // alone on its line
      expect(sql).not.toMatch(/\bas\b/);
      expect(lines[from + 1]).toBe("where 1=1");
      expect(lines[from + 2]).toMatch(/^ {4}and /);

      // One column per line: the first indented one extra space, the rest leading-comma
      // with no space after it — and every alias starting in the same text column.
      expect(columns[0]).toMatch(/^ {5}\S/);
      for (const line of columns.slice(1)) expect(line).toMatch(/^ {4},\S/);
      const aliasAt = columns.map((line) => line.search(/ _[a-z_]+$/));
      expect(aliasAt.every((at) => at > 0)).toBe(true);
      expect(new Set(aliasAt).size).toBe(1);
    }
  });
});
