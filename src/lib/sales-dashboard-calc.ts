/**
 * Payload types and the arithmetic behind the online-sales dashboard
 * (docs/08-cube-sales-showcase.md §7).
 *
 * Pure and dependency-free on purpose: NOT `server-only`, because the client chart
 * component re-slices the payload on every filter change. lib/sales-dashboard.ts produces
 * the payload; this file is everything that happens to it afterwards.
 *
 * Two rules carry the whole design:
 *  - Year is the ONLY filter. It is an order-level attribute, so every measure — `orders`
 *    included — stays additive when pre-aggregated rows are re-summed here. Category is a
 *    breakdown, never a filter: an order spans categories.
 *  - Ratios are never summed. Margin is recomputed from its summed parts at every level —
 *    tile, top-N item, channel row and total alike.
 *
 * "Profit" is Cube's `gross_margin` (revenue − cost, completed orders). Rows keep the
 * warehouse's name, `grossMargin`; everything computed here calls it `profit`.
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

/** Q2 — category × year. No `orders`: not additive across categories. */
export type CategoryRow = {
  category: string;
  year: number;
  revenue: number;
  units: number;
  grossMargin: number;
};

/** Q3 — country × year. Country is a customer attribute, so `orders` is additive. */
export type CountryRow = {
  country: string;
  countryCode: string;
  year: number;
  revenue: number;
  orders: number;
  grossMargin: number;
};

/** What the ISR page hands the client component. Plain JSON — safe across the RSC boundary. */
export type SalesDashboardData = {
  monthly: MonthlyRow[];
  byCategory: CategoryRow[];
  byCountry: CountryRow[];
};

export type SalesFilter = {
  year: number | "all";
};

export type Kpi<Value = number> = {
  value: Value;
  /**
   * Versus the same calendar months of the prior year. Relative (0.12 = +12%) for revenue,
   * profit and orders; in rate POINTS (0.021 = +2.1 pp) for margin. `undefined` when
   * `year` is "all" or the prior period has nothing to compare against.
   */
  change: number | undefined;
};

/** `margin` is `null` on zero revenue — render "—", never "0%". */
export type Kpis = {
  revenue: Kpi;
  profit: Kpi;
  orders: Kpi;
  margin: Kpi<number | null>;
};

/** Summed parts, plus the one ratio recomputed from them. */
export type Totals = {
  revenue: number;
  profit: number;
  orders: number;
  margin: number | null;
};

export type MonthlyPoint = {
  month: string;
  revenue: number;
  profit: number;
  orders: number;
};

export type TopKind = "category" | "country";
export type TopMetric = "revenue" | "profit" | "margin";

/** No `orders`: the category side cannot have it, and both sides share one shape. */
export type TopItem = {
  name: string;
  revenue: number;
  profit: number;
  margin: number | null;
};

export type ChannelRow = { channel: string } & Totals;

/** `rows` largest revenue first; `total` is the whole filtered period. */
export type ChannelMatrix = {
  rows: ChannelRow[];
  total: Totals;
};

type Filterable = { year: number } | { month: string };

const yearOf = (row: Filterable): number =>
  "year" in row ? row.year : Number(row.month.slice(0, 4));

// Code-unit order, not localeCompare: a client component renders on the server AND in the
// browser, and two ICU collations disagreeing over a tie is a hydration mismatch.
const compareText = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

const sum = <T>(rows: readonly T[], pick: (row: T) => number): number =>
  rows.reduce((total, row) => total + pick(row), 0);

/** Largest score first; ties fall back to the label so the order never depends on input order. */
function rank<T>(
  rows: T[],
  score: (row: T) => number,
  label: (row: T) => string,
): T[] {
  return rows.sort(
    (a, b) => score(b) - score(a) || compareText(label(a), label(b)),
  );
}

export function filterRows<T extends Filterable>(
  rows: readonly T[],
  { year }: SalesFilter,
): T[] {
  return rows.filter((row) => year === "all" || yearOf(row) === year);
}

/** Choices for the year control, in display order. */
export function filterOptions(monthly: readonly MonthlyRow[]): {
  years: number[];
} {
  return { years: [...new Set(monthly.map(yearOf))].sort((a, b) => a - b) };
}

/** `null`, not 0 or Infinity, when there is nothing to divide by. */
export function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function totals(rows: readonly MonthlyRow[]): Totals {
  const revenue = sum(rows, (row) => row.revenue);
  const profit = sum(rows, (row) => row.grossMargin);
  return {
    revenue,
    profit,
    orders: sum(rows, (row) => row.orders),
    margin: ratio(profit, revenue),
  };
}

/** "2025-12" → "2026-01". String arithmetic, for the same reason as everything else here. */
function nextMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const next = Number(month.slice(5, 7)) + 1;
  return next > 12
    ? `${year + 1}-01`
    : `${year}-${String(next).padStart(2, "0")}`;
}

/**
 * The x-axis: every calendar month from the first to the last one the year filter admits.
 * A month with no rows at all is ON the axis — skipping it would silently set two months a
 * quarter apart side by side. Never padded past the last month: 2026 stops at August.
 */
function monthAxis(
  monthly: readonly MonthlyRow[],
  year: SalesFilter["year"],
): string[] {
  const months = filterRows(monthly, { year })
    .map((row) => row.month)
    .sort(compareText);
  const first = months[0];
  const last = months.at(-1);
  if (first === undefined || last === undefined) return [];

  const axis: string[] = [];
  for (let month = first; month <= last; month = nextMonth(month)) {
    axis.push(month);
  }
  return axis;
}

/**
 * The prior year, cut down to the calendar months the selected year actually covers.
 * 2026 stops at August; set against all of 2025 it would read as a collapse.
 *
 * Coverage is the month AXIS, not the months that happen to have rows: a month with no
 * sales inside the period is a real zero, and must still be compared against that month
 * last year, not have it dropped.
 */
function priorYearRows(
  monthly: readonly MonthlyRow[],
  { year }: SalesFilter,
): MonthlyRow[] {
  if (year === "all") return [];
  const covered = new Set(
    monthAxis(monthly, year).map((month) => month.slice(5)),
  );
  return filterRows(monthly, { year: year - 1 }).filter((row) =>
    covered.has(row.month.slice(5)),
  );
}

function relativeChange(current: number, prior: number): number | undefined {
  return prior === 0 ? undefined : (current - prior) / prior;
}

export function computeKpis(
  monthly: readonly MonthlyRow[],
  filter: SalesFilter,
): Kpis {
  const current = totals(filterRows(monthly, filter));
  // No prior rows → zero sums and a null margin → every `change` is undefined.
  const prior = totals(priorYearRows(monthly, filter));
  return {
    revenue: {
      value: current.revenue,
      change: relativeChange(current.revenue, prior.revenue),
    },
    profit: {
      value: current.profit,
      change: relativeChange(current.profit, prior.profit),
    },
    orders: {
      value: current.orders,
      change: relativeChange(current.orders, prior.orders),
    },
    margin: {
      value: current.margin,
      change:
        current.margin === null || prior.margin === null
          ? undefined
          : current.margin - prior.margin,
    },
  };
}

/** Revenue, profit and orders per month, for the combo chart. Zero-filled along the axis. */
export function monthlyCombo(
  monthly: readonly MonthlyRow[],
  filter: SalesFilter,
): MonthlyPoint[] {
  const points = new Map<string, MonthlyPoint>(
    monthAxis(monthly, filter.year).map((month) => [
      month,
      { month, revenue: 0, profit: 0, orders: 0 },
    ]),
  );
  for (const row of filterRows(monthly, filter)) {
    const point = points.get(row.month);
    if (!point) continue;
    point.revenue += row.revenue;
    point.profit += row.grossMargin;
    point.orders += row.orders;
  }
  return [...points.values()];
}

/**
 * The top-N card: categories or countries, ranked by the metric the reader picked — so
 * switching the metric re-chooses the `n` shown, not just their order. Fewer than `n`
 * items → all of them. Margin is recomputed per item from its own summed parts.
 */
export function topItems(
  kind: TopKind,
  data: SalesDashboardData,
  filter: SalesFilter,
  metric: TopMetric,
  n = 5,
): TopItem[] {
  // One shape for both sides. A country is keyed by code and labelled by name, as Cube
  // returns it; a category is its own key.
  const parts =
    kind === "category"
      ? filterRows(data.byCategory, filter).map((row) => ({
          key: row.category,
          name: row.category,
          revenue: row.revenue,
          profit: row.grossMargin,
        }))
      : filterRows(data.byCountry, filter).map((row) => ({
          key: row.countryCode,
          name: row.country,
          revenue: row.revenue,
          profit: row.grossMargin,
        }));

  const items = new Map<string, TopItem>();
  for (const { key, name, revenue, profit } of parts) {
    const item = items.get(key) ?? {
      name,
      revenue: 0,
      profit: 0,
      margin: null,
    };
    item.revenue += revenue;
    item.profit += profit;
    items.set(key, item);
  }
  for (const item of items.values()) {
    item.margin = ratio(item.profit, item.revenue);
  }

  // `?? -Infinity` sinks a null margin below every number, negative margins included. Two
  // nulls subtract to NaN, which `rank`'s `||` reads as a tie — so they fall back to the name.
  return rank(
    [...items.values()],
    (item) => item[metric] ?? -Infinity,
    (item) => item.name,
  ).slice(0, n);
}

/**
 * The channel card: one row per channel, largest revenue first, plus the period's total —
 * which IS the KPI tiles, both being {@link totals} over the same filtered rows.
 *
 * The total's `orders` equals the sum of the rows' because channel is an ORDER-level fact:
 * every line of an order carries the same channel (data/sales/003-verify.sql asserts it —
 * `orders_mixing_status_channel_or_customer` must be 0; data/README.md). So the per-channel
 * distinct counts partition the orders instead of counting one twice. Margin is never
 * summed: each row's and the total's comes from its own revenue and profit.
 */
export function channelMatrix(
  monthly: readonly MonthlyRow[],
  filter: SalesFilter,
): ChannelMatrix {
  const rows = filterRows(monthly, filter);
  const byChannel = new Map<string, MonthlyRow[]>();
  for (const row of rows) {
    const group = byChannel.get(row.channel) ?? [];
    group.push(row);
    byChannel.set(row.channel, group);
  }
  return {
    rows: rank(
      [...byChannel].map(([channel, group]) => ({
        channel,
        ...totals(group),
      })),
      (row) => row.revenue,
      (row) => row.channel,
    ),
    total: totals(rows),
  };
}
