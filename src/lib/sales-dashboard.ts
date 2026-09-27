import "server-only";
import { z } from "zod";
import { cubeSql } from "./cube";
import type {
  CategoryRow,
  CountryRow,
  MonthlyRow,
  SalesDashboardData,
} from "./sales-dashboard-calc";

/**
 * The three queries behind the online-sales dashboard, and the contract on what comes back
 * (docs/08-cube-sales-showcase.md §7). The only object queried is the `sales_overview` view.
 *
 * Cube's response is external input, so every row goes through a `.strict()` schema: a
 * renamed measure or a stray column fails the build/revalidation — production then keeps
 * its last good page — instead of rendering a chart of `undefined`.
 *
 * What is deliberately NOT selected:
 *  - `aov`, `margin_rate`, `return_rate` — ratios, never summed. The one the dashboard
 *    shows, margin, is recomputed from its parts after filtering (lib/sales-dashboard-calc.ts).
 *  - `orders` in the category query — an order spans products, so it is not additive
 *    across category. It IS additive across month, channel and country, which is why the
 *    dashboard filters on year only, and ranks categories by revenue, profit or margin.
 *  - `channel` in the category and country queries — year is the only filter, so a
 *    channel split there would be shipped only to be summed away. `monthly` keeps it:
 *    the channel card is built from month × channel.
 *
 * Aliases start with `_` (house SQL style), so rows come back keyed `_month`, `_revenue`, …
 * and are mapped to camelCase here.
 */
const QUERIES = {
  monthly: `
select
     date_trunc('month', s.ordered_at)    _month
    ,s.channel_name                       _channel
    ,measure(s.revenue)                   _revenue
    ,measure(s.orders)                    _orders
    ,measure(s.units)                     _units
    ,measure(s.gross_margin)              _gross_margin
    ,measure(s.orders_placed)             _orders_placed
    ,measure(s.orders_returned)           _orders_returned
    ,measure(s.new_customer_orders)       _new_customer_orders
from sales_overview s
where 1=1
    and s.ordered_at >= date '2024-01-01'
group by 1, 2
order by 1, 2`,

  byCategory: `
select
     s.category                           _category
    ,date_trunc('year', s.ordered_at)     _year
    ,measure(s.revenue)                   _revenue
    ,measure(s.units)                     _units
    ,measure(s.gross_margin)              _gross_margin
from sales_overview s
where 1=1
    and s.ordered_at >= date '2024-01-01'
group by 1, 2
order by 1, 2`,

  byCountry: `
select
     s.country_name                       _country
    ,s.country_code                       _country_code
    ,date_trunc('year', s.ordered_at)     _year
    ,measure(s.revenue)                   _revenue
    ,measure(s.orders)                    _orders
    ,measure(s.gross_margin)              _gross_margin
from sales_overview s
where 1=1
    and s.ordered_at >= date '2024-01-01'
group by 1, 2, 3
order by 1, 2, 3`,
} as const;

const label = z.string().min(1);

// A filtered sum over a group with no completed lines is SQL NULL — and that is a zero,
// not a fault: a country whose only orders in a year were returned is a real row.
const measure = z
  .number()
  .nullable()
  .transform((value) => value ?? 0);

// `date_trunc` comes back as a timestamp string. Sliced, never parsed: no Date, no timezone.
const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}/);
const month = timestamp.transform((value) => value.slice(0, 7));
const year = timestamp.transform((value) => Number(value.slice(0, 4)));

const monthlyRow = z
  .object({
    _month: month,
    _channel: label,
    _revenue: measure,
    _orders: measure,
    _units: measure,
    _gross_margin: measure,
    _orders_placed: measure,
    _orders_returned: measure,
    _new_customer_orders: measure,
  })
  .strict()
  .transform((row): MonthlyRow => ({
    month: row._month,
    channel: row._channel,
    revenue: row._revenue,
    orders: row._orders,
    units: row._units,
    grossMargin: row._gross_margin,
    ordersPlaced: row._orders_placed,
    ordersReturned: row._orders_returned,
    newCustomerOrders: row._new_customer_orders,
  }));

const categoryRow = z
  .object({
    _category: label,
    _year: year,
    _revenue: measure,
    _units: measure,
    _gross_margin: measure,
  })
  .strict()
  .transform((row): CategoryRow => ({
    category: row._category,
    year: row._year,
    revenue: row._revenue,
    units: row._units,
    grossMargin: row._gross_margin,
  }));

const countryRow = z
  .object({
    _country: label,
    _country_code: label,
    _year: year,
    _revenue: measure,
    _orders: measure,
    _gross_margin: measure,
  })
  .strict()
  .transform((row): CountryRow => ({
    country: row._country,
    countryCode: row._country_code,
    year: row._year,
    revenue: row._revenue,
    orders: row._orders,
    grossMargin: row._gross_margin,
  }));

async function run<Row>(
  name: keyof typeof QUERIES,
  row: z.ZodType<Row>,
): Promise<Row[]> {
  // `.min(1)`: the warehouse is static and non-empty, so zero rows is a broken pipeline.
  const parsed = z
    .array(row)
    .min(1)
    .safeParse(await cubeSql(QUERIES[name].trim()));
  if (parsed.success) return parsed.data;

  // One bad column repeats on every row — the first few issues say everything.
  const issues = parsed.error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(
    `Cube query "${name}" broke its row contract — ${issues.join("; ")}`,
  );
}

/** Everything the dashboard needs, in one JSON-serialisable payload. Three queries, in parallel. */
export async function getSalesDashboardData(): Promise<SalesDashboardData> {
  const [monthly, byCategory, byCountry] = await Promise.all([
    run("monthly", monthlyRow),
    run("byCategory", categoryRow),
    run("byCountry", countryRow),
  ]);
  return { monthly, byCategory, byCountry };
}
