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

type QueryName = "monthly" | "byCategory" | "byCountry";

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

const CATEGORY: CubeRow = {
  _category: "Audio",
  _year: "2025-01-01T00:00:00.000",
  _revenue: 900,
  _units: 9,
  _gross_margin: 300,
};

const COUNTRY: CubeRow = {
  _country: "Germany",
  _country_code: "DE",
  _year: "2025-01-01T00:00:00.000",
  _revenue: 500,
  _orders: 5,
  _gross_margin: 210,
};

const GOOD: Record<QueryName, CubeRow[]> = {
  monthly: [MONTHLY],
  byCategory: [CATEGORY],
  byCountry: [COUNTRY],
};

/** Tells the three queries apart by an alias only that one selects. */
function queryName(sql: string): QueryName {
  if (sql.includes("_month")) return "monthly";
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
  it("maps the three result sets to clean camelCase rows", async () => {
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
          revenue: 900,
          units: 9,
          grossMargin: 300,
        },
      ],
      byCountry: [
        {
          country: "Germany",
          countryCode: "DE",
          year: 2025,
          revenue: 500,
          orders: 5,
          grossMargin: 210,
        },
      ],
    });
    expect(mocks.cubeSql).toHaveBeenCalledTimes(3);
  });

  it("is plain JSON — it has to survive the server → client boundary", async () => {
    const data = await getSalesDashboardData();

    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });

  it("reads a NULL measure as zero — a group with no completed lines is a real row", async () => {
    answerWith({
      byCountry: [
        { ...COUNTRY, _revenue: null, _orders: null, _gross_margin: null },
      ],
    });

    const { byCountry } = await getSalesDashboardData();

    expect(byCountry[0]).toMatchObject({
      revenue: 0,
      orders: 0,
      grossMargin: 0,
    });
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

  it("holds a country row to its gross_margin — the top-5 card ranks on it", async () => {
    answerWith({ byCountry: [without(COUNTRY, "_gross_margin")] });

    await expect(getSalesDashboardData()).rejects.toThrow(
      /"byCountry".*_gross_margin/,
    );
  });

  it.each<[QueryName, CubeRow]>([
    ["byCategory", { ...CATEGORY, _channel: "Email" }],
    ["byCountry", { ...COUNTRY, _channel: "Email" }],
  ])(
    "rejects a channel column on %s — that split is no longer asked for",
    async (name, row) => {
      answerWith({ [name]: [row] });

      await expect(getSalesDashboardData()).rejects.toThrow(
        new RegExp(`"${name}".*_channel`),
      );
    },
  );

  it("rejects an empty result — the warehouse is static and never empty", async () => {
    answerWith({ byCountry: [] });

    await expect(getSalesDashboardData()).rejects.toThrow(
      /"byCountry" broke its row contract/,
    );
  });

  it("keeps the error short when every row is wrong", async () => {
    answerWith({
      byCountry: Array.from({ length: 1000 }, () => ({
        ...COUNTRY,
        _revenue: "x",
      })),
    });

    const error: unknown = await getSalesDashboardData().catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('"byCountry"');
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

  it("never selects a ratio, and never selects orders across category", async () => {
    await getSalesDashboardData();
    const queries = sentQueries();

    for (const sql of queries) {
      expect(sql).not.toMatch(/aov|margin_rate|return_rate/);
    }
    const acrossCategories = queries.filter((sql) =>
      sql.includes("s.category"),
    );
    expect(acrossCategories).toHaveLength(1);
    for (const sql of acrossCategories) {
      expect(sql).not.toContain("measure(s.orders");
    }
  });

  it("sends three queries: products are gone, countries carry gross_margin", async () => {
    await getSalesDashboardData();
    const queries = sentQueries();

    expect(queries).toHaveLength(3);
    for (const sql of queries) expect(sql).not.toContain("product");
    expect(queries.find((sql) => sql.includes("_country"))).toContain(
      "\n    ,measure(s.gross_margin)              _gross_margin\n",
    );
  });

  it("splits by channel in the monthly query only, and groups by exactly the dimensions", async () => {
    await getSalesDashboardData();

    for (const sql of sentQueries()) {
      const lines = sql.split("\n");
      const columns = lines.slice(
        1,
        lines.findIndex((line) => line.startsWith("from ")),
      );
      const dimensions = columns.filter((line) => !line.includes("measure("));
      // monthly: month, channel · byCategory: category, year · byCountry: name, code, year
      const positions = dimensions.map((_, i) => i + 1).join(", ");

      expect(sql.includes("s.channel_name")).toBe(queryName(sql) === "monthly");
      expect(lines.slice(-2)).toEqual([
        `group by ${positions}`,
        `order by ${positions}`,
      ]);
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
