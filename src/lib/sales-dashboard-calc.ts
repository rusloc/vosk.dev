/**
 * Payload types and the arithmetic behind the online-sales dashboard
 * (docs/08-cube-sales-showcase.md §7).
 *
 * Pure and dependency-free on purpose: NOT `server-only`, because the client chart
 * component re-slices the payload on every filter change. lib/sales-dashboard.ts produces
 * the payload; this file is everything that happens to it afterwards.
 *
 * Two rules carry the whole design:
 *  - Filters are year and channel ONLY. Both are order-level attributes, so every measure —
 *    `orders` included — stays additive when pre-aggregated rows are re-summed here.
 *    Category and product are breakdowns, never filters: an order spans them.
 *  - Ratios are never summed. AOV and margin rate are recomputed from their summed parts.
 *
 * Months are "YYYY-MM" strings and are only ever compared and sliced as strings — no Date,
 * so the server render and the browser cannot disagree over a timezone.
 */

/** Q1 — month × channel. `month` is "YYYY-MM". */
export type MonthlyRow = {
  month: string;
  channel: string;
  revenue: number;
  orders: number;
  units: number;
  grossMargin: number;
  ordersPlaced: number;
  ordersReturned: number;
  newCustomerOrders: number;
};

/** Q2 — category × year × channel. No `orders`: not additive across categories. */
export type CategoryRow = {
  category: string;
  year: number;
  channel: string;
  revenue: number;
  units: number;
  grossMargin: number;
};

/** Q3 — product × category × year × channel. No `orders`, same reason. */
export type ProductRow = {
  product: string;
  category: string;
  year: number;
  channel: string;
  revenue: number;
  units: number;
};

/** Q4 — country × year × channel. Country is a customer attribute, so `orders` is additive. */
export type CountryRow = {
  country: string;
  countryCode: string;
  year: number;
  channel: string;
  revenue: number;
  orders: number;
};

/** What the ISR page hands the client component. Plain JSON — safe across the RSC boundary. */
export type SalesDashboardData = {
  monthly: MonthlyRow[];
  byCategory: CategoryRow[];
  byProduct: ProductRow[];
  byCountry: CountryRow[];
};

export type SalesFilter = {
  year: number | "all";
  channel: string | "all";
};

export type Kpi<Value = number> = {
  value: Value;
  /**
   * Versus the same calendar months of the prior year. Relative (0.12 = +12%) for revenue,
   * orders and AOV; in rate POINTS (0.021 = +2.1 pp) for margin rate. `undefined` when
   * `year` is "all" or the prior period has nothing to compare against.
   */
  change: number | undefined;
};

/** The two ratios are `null` on a zero denominator — render "—", never "$0". */
export type Kpis = {
  revenue: Kpi;
  orders: Kpi;
  aov: Kpi<number | null>;
  marginRate: Kpi<number | null>;
};

export type MonthlyPoint = { month: string; revenue: number; orders: number };

/** Chart-ready: `series[n].revenue[i]` belongs to `months[i]`, zero-filled. */
export type ChannelMix = {
  months: string[];
  series: { channel: string; revenue: number[] }[];
};

export type CategoryRevenue = { category: string; revenue: number };

export type ProductRevenue = {
  product: string;
  category: string;
  revenue: number;
  units: number;
};

/** `countryCode` is `null` on the trailing "Other" bucket — that is how to recognise it. */
export type CountryRevenue = {
  country: string;
  countryCode: string | null;
  revenue: number;
};

type Filterable = { channel: string } & ({ year: number } | { month: string });

const yearOf = (row: Filterable): number =>
  "year" in row ? row.year : Number(row.month.slice(0, 4));

// Code-unit order, not localeCompare: a client component renders on the server AND in the
// browser, and two ICU collations disagreeing over a tie is a hydration mismatch.
const compareText = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

const sum = <T>(rows: readonly T[], pick: (row: T) => number): number =>
  rows.reduce((total, row) => total + pick(row), 0);

/** Largest revenue first; ties fall back to the label so the order never depends on input order. */
function rank<T extends { revenue: number }>(
  rows: T[],
  label: (row: T) => string,
): T[] {
  return rows.sort(
    (a, b) => b.revenue - a.revenue || compareText(label(a), label(b)),
  );
}

export function filterRows<T extends Filterable>(
  rows: readonly T[],
  { year, channel }: SalesFilter,
): T[] {
  return rows.filter(
    (row) =>
      (year === "all" || yearOf(row) === year) &&
      (channel === "all" || row.channel === channel),
  );
}

/** Choices for the two filter controls, in display order. */
export function filterOptions(monthly: readonly MonthlyRow[]): {
  years: number[];
  channels: string[];
} {
  return {
    years: [...new Set(monthly.map(yearOf))].sort((a, b) => a - b),
    channels: [...new Set(monthly.map((row) => row.channel))].sort(compareText),
  };
}

/** `null`, not 0 or Infinity, when there is nothing to divide by. */
export function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function totals(rows: readonly MonthlyRow[]) {
  const revenue = sum(rows, (row) => row.revenue);
  const orders = sum(rows, (row) => row.orders);
  return {
    revenue,
    orders,
    aov: ratio(revenue, orders),
    marginRate: ratio(
      sum(rows, (row) => row.grossMargin),
      revenue,
    ),
  };
}

/**
 * The prior year, cut down to the calendar months the selected year actually covers.
 * 2026 stops at August; set against all of 2025 it would read as a collapse.
 *
 * Coverage is taken across ALL channels, not the filtered one: a channel that went quiet
 * for a month must still be compared against that month last year, not have it dropped.
 */
function priorYearRows(
  monthly: readonly MonthlyRow[],
  { year, channel }: SalesFilter,
): MonthlyRow[] {
  if (year === "all") return [];
  const covered = new Set(
    monthly
      .filter((row) => yearOf(row) === year)
      .map((row) => row.month.slice(5)),
  );
  return filterRows(monthly, { year: year - 1, channel }).filter((row) =>
    covered.has(row.month.slice(5)),
  );
}

function relativeChange(
  current: number | null,
  prior: number | null,
): number | undefined {
  return current === null || !prior ? undefined : (current - prior) / prior;
}

export function computeKpis(
  monthly: readonly MonthlyRow[],
  filter: SalesFilter,
): Kpis {
  const current = totals(filterRows(monthly, filter));
  // No prior rows → zero revenue and orders, null ratios → every `change` is undefined.
  const prior = totals(priorYearRows(monthly, filter));
  return {
    revenue: {
      value: current.revenue,
      change: relativeChange(current.revenue, prior.revenue),
    },
    orders: {
      value: current.orders,
      change: relativeChange(current.orders, prior.orders),
    },
    aov: { value: current.aov, change: relativeChange(current.aov, prior.aov) },
    marginRate: {
      value: current.marginRate,
      change:
        current.marginRate === null || prior.marginRate === null
          ? undefined
          : current.marginRate - prior.marginRate,
    },
  };
}

/**
 * The x-axis: every month the year filter admits, whichever channel is selected — a
 * channel with an empty month must plot a zero there, not silently close the gap.
 */
function monthAxis(
  monthly: readonly MonthlyRow[],
  year: SalesFilter["year"],
): string[] {
  const rows = filterRows(monthly, { year, channel: "all" });
  return [...new Set(rows.map((row) => row.month))].sort(compareText);
}

/** Revenue + orders per month, for the bar/line combo. */
export function monthlySeries(
  monthly: readonly MonthlyRow[],
  filter: SalesFilter,
): MonthlyPoint[] {
  const points = new Map<string, MonthlyPoint>(
    monthAxis(monthly, filter.year).map((month) => [
      month,
      { month, revenue: 0, orders: 0 },
    ]),
  );
  for (const row of filterRows(monthly, filter)) {
    const point = points.get(row.month);
    if (!point) continue;
    point.revenue += row.revenue;
    point.orders += row.orders;
  }
  return [...points.values()];
}

/** Revenue per channel per month, for the stacked bar. Channels in name order, so stable. */
export function channelMix(
  monthly: readonly MonthlyRow[],
  filter: SalesFilter,
): ChannelMix {
  const months = monthAxis(monthly, filter.year);
  const index = new Map(months.map((month, i) => [month, i]));
  const series = new Map<string, number[]>();

  for (const row of filterRows(monthly, filter)) {
    const i = index.get(row.month);
    if (i === undefined) continue;
    const revenue =
      series.get(row.channel) ?? new Array<number>(months.length).fill(0);
    revenue[i] = (revenue[i] ?? 0) + row.revenue;
    series.set(row.channel, revenue);
  }

  return {
    months,
    series: [...series]
      .sort(([a], [b]) => compareText(a, b))
      .map(([channel, revenue]) => ({ channel, revenue })),
  };
}

export function revenueByCategory(
  byCategory: readonly CategoryRow[],
  filter: SalesFilter,
): CategoryRevenue[] {
  const totalsByCategory = new Map<string, CategoryRevenue>();
  for (const { category, revenue } of filterRows(byCategory, filter)) {
    const entry = totalsByCategory.get(category) ?? { category, revenue: 0 };
    entry.revenue += revenue;
    totalsByCategory.set(category, entry);
  }
  return rank([...totalsByCategory.values()], (row) => row.category);
}

export function topProducts(
  byProduct: readonly ProductRow[],
  filter: SalesFilter,
  limit = 10,
): ProductRevenue[] {
  const totalsByProduct = new Map<string, ProductRevenue>();
  for (const row of filterRows(byProduct, filter)) {
    const entry = totalsByProduct.get(row.product) ?? {
      product: row.product,
      category: row.category,
      revenue: 0,
      units: 0,
    };
    entry.revenue += row.revenue;
    entry.units += row.units;
    totalsByProduct.set(row.product, entry);
  }
  return rank([...totalsByProduct.values()], (row) => row.product).slice(
    0,
    limit,
  );
}

/** The `top` largest countries, then everything else rolled into one trailing "Other". */
export function revenueByCountry(
  byCountry: readonly CountryRow[],
  filter: SalesFilter,
  top = 8,
): CountryRevenue[] {
  const totalsByCountry = new Map<string, CountryRevenue>();
  for (const row of filterRows(byCountry, filter)) {
    const entry = totalsByCountry.get(row.countryCode) ?? {
      country: row.country,
      countryCode: row.countryCode,
      revenue: 0,
    };
    entry.revenue += row.revenue;
    totalsByCountry.set(row.countryCode, entry);
  }
  const ranked = rank([...totalsByCountry.values()], (row) => row.country);
  const rest = ranked.slice(top);
  if (rest.length === 0) return ranked;
  return [
    ...ranked.slice(0, top),
    {
      country: "Other",
      countryCode: null,
      revenue: sum(rest, (row) => row.revenue),
    },
  ];
}
