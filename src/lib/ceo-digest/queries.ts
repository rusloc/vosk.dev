import { z } from "zod";

// The Tidewell SQL functions the chat may call (the contract: docs/ceo-digest/chat-and-email.md § The SQL functions;
// data/ceo-digest/sql/006-chat-functions.sql). One typed wrapper per function, nothing else reaches the database: no
// text-to-SQL, every argument a bound parameter. A row comes back as JSON (`to_jsonb`), so a date is "YYYY-MM-DD" and a
// numeric is a number whatever the driver's type parsers do, and each row is checked against the contract's columns:
// a column added, dropped or renamed on the SQL side fails here, loudly, and not as a wrong figure in an answer.
// Framework-free: `sql` is the `postgres` client's tagged template (lib/ceo-digest/server.ts) or a test's stand-in.

export type SqlTag = (
  strings: TemplateStringsArray,
  ...values: (string | number)[]
) => PromiseLike<readonly { r?: unknown }[]>;

const text = z.string();
const label = z.string().nullable(); // a total row may carry no name
const num = z.number().nullable(); // a rate with a zero denominator is null
const date = z.iso.date();

const metaRow = z
  .object({
    company: text,
    currency: text,
    data_from: date,
    data_as_of: date,
    weeks: z.number().int(),
  })
  .strict();

const marketingChannelRow = z
  .object({
    channel_code: text,
    channel_name: label,
    weeks: num,
    spend_eur: num,
    impressions: num,
    clicks: num,
    ctr_pct: num,
    cpc_eur: num,
    mqls: num,
    cost_per_mql_eur: num,
    trials_started: num,
    trials_converted: num,
    trial_to_paid_pct: num,
    new_customers: num,
    cac_eur: num,
    new_mrr_eur: num,
  })
  .strict();

const marketingWeekRow = z
  .object({
    week_start: date,
    week_label: text,
    spend_eur: num,
    budget_eur: num,
    clicks: num,
    cpc_eur: num,
    mqls: num,
    mqls_target: num,
    new_customers: num,
    cac_eur: num,
  })
  .strict();

const cashCategoryRow = z
  .object({
    category_code: text,
    category_name: label,
    flow: label,
    direction: label,
    amount_eur: num,
    share_pct: num,
    ly_amount_eur: num,
  })
  .strict();

const cashWeekRow = z
  .object({
    week_start: date,
    week_label: text,
    cash_in_eur: num,
    cash_out_eur: num,
    net_eur: num,
    closing_cash_eur: num,
    runway_months: num,
    receivables_eur: num,
    overdue_receivables_eur: num,
    payables_due_14d_eur: num,
  })
  .strict();

const planRow = z
  .object({
    plan_code: text,
    plan_name: label,
    active_customers: num,
    new_last_4w: num,
    churned_last_4w: num,
    avg_tenure_months: num,
    invoices_last_12m: num,
    billed_last_12m_eur: num,
    overdue_eur: num,
  })
  .strict();

const customerRow = z
  .object({
    customer_id: z.union([z.number(), z.string()]),
    name: text,
    practice_type: label,
    city: label,
    country: label,
    plan_name: label,
    channel_name: label,
    signup_date: date,
    churn_date: date.nullable(),
    status: text,
    tenure_months: num,
    invoices: num,
    billed_to_date_eur: num,
    last_invoice_date: date.nullable(),
    overdue_eur: num,
  })
  .strict();

// fn_top_customers_period (007): the top customers over a period, with all four figures, the clamped period, the
// share of the metric and how many customers had any.
const topPeriodRow = z
  .object({
    rank: z.number().int(),
    customer_id: z.union([z.number(), z.string()]),
    name: text,
    practice_type: label,
    city: label,
    country: label,
    plan_name: label,
    signup_date: date,
    status: text,
    period_from: date,
    period_to: date,
    invoices: num,
    billed_eur: num,
    paid_eur: num,
    overdue_eur: num,
    share_pct: num,
    ranked_customers: num,
  })
  .strict();

export type Meta = z.infer<typeof metaRow>;
export type MarketingChannelRow = z.infer<typeof marketingChannelRow>;
export type MarketingWeekRow = z.infer<typeof marketingWeekRow>;
export type CashCategoryRow = z.infer<typeof cashCategoryRow>;
export type CashWeekRow = z.infer<typeof cashWeekRow>;
export type PlanRow = z.infer<typeof planRow>;
export type CustomerRow = z.infer<typeof customerRow>;
export type TopPeriodRow = z.infer<typeof topPeriodRow>;

export const TOP_ORDERS = [
  "billed",
  "tenure",
  "invoices",
  "overdue",
  "newest",
] as const;
export type TopOrder = (typeof TOP_ORDERS)[number];

/** The most rows the customer functions return (the contract's cap; the functions enforce it too). */
export const MAX_CUSTOMER_ROWS = 20;

/** What fn_top_customers_period ranks by, over its period (007). */
export const PERIOD_METRICS = [
  "billed",
  "paid",
  "invoices",
  "overdue",
] as const;
export type PeriodMetric = (typeof PERIOD_METRICS)[number];
/** The most rows fn_top_customers_period returns (007 enforces it too). */
export const MAX_TOP_ROWS = 25;

const rows = <T>(schema: z.ZodType<T>, result: readonly { r?: unknown }[]) =>
  result.map((x) => schema.parse(x.r));

const limited = (limit: number, max = MAX_CUSTOMER_ROWS) =>
  Math.max(1, Math.min(Math.trunc(limit), max));

export async function meta(sql: SqlTag): Promise<Meta> {
  const [row] = rows(
    metaRow,
    await sql`select to_jsonb(t) as r from ceo_digest_demo.fn_meta() as t`,
  );
  if (!row) throw new Error("fn_meta returned no row");
  return row;
}

export const marketingByChannel = async (
  sql: SqlTag,
  from: string,
  to: string,
) =>
  rows(
    marketingChannelRow,
    await sql`select to_jsonb(t) as r from ceo_digest_demo.fn_marketing_by_channel(${from}::date, ${to}::date) as t`,
  );

export const marketingByWeek = async (sql: SqlTag, from: string, to: string) =>
  rows(
    marketingWeekRow,
    await sql`select to_jsonb(t) as r from ceo_digest_demo.fn_marketing_by_week(${from}::date, ${to}::date) as t`,
  );

export const cashByCategory = async (sql: SqlTag, from: string, to: string) =>
  rows(
    cashCategoryRow,
    await sql`select to_jsonb(t) as r from ceo_digest_demo.fn_cash_by_category(${from}::date, ${to}::date) as t`,
  );

export const cashByWeek = async (sql: SqlTag, from: string, to: string) =>
  rows(
    cashWeekRow,
    await sql`select to_jsonb(t) as r from ceo_digest_demo.fn_cash_by_week(${from}::date, ${to}::date) as t`,
  );

export const customersByPlan = async (sql: SqlTag, asOf: string) =>
  rows(
    planRow,
    await sql`select to_jsonb(t) as r from ceo_digest_demo.fn_customers_by_plan(${asOf}::date) as t`,
  );

export const customerSearch = async (
  sql: SqlTag,
  query: string,
  limit: number,
) =>
  rows(
    customerRow,
    await sql`select to_jsonb(t) as r from ceo_digest_demo.fn_customer_search(${query}::text, ${limited(limit)}::int) as t`,
  );

export const topCustomers = async (
  sql: SqlTag,
  order: TopOrder,
  limit: number,
) =>
  rows(
    customerRow,
    await sql`select to_jsonb(t) as r from ceo_digest_demo.fn_top_customers(${order}::text, ${limited(limit)}::int) as t`,
  );

export const topCustomersPeriod = async (
  sql: SqlTag,
  from: string,
  to: string,
  metric: PeriodMetric,
  limit: number,
) =>
  rows(
    topPeriodRow,
    await sql`select to_jsonb(t) as r from ceo_digest_demo.fn_top_customers_period(${from}::date, ${to}::date, ${metric}::text, ${limited(limit, MAX_TOP_ROWS)}::int) as t`,
  );

/** What the chat tools read: the functions above, bound to a connection (server.ts) or faked in a test. */
export interface DigestData {
  meta(): Promise<Meta>;
  marketingByChannel(from: string, to: string): Promise<MarketingChannelRow[]>;
  marketingByWeek(from: string, to: string): Promise<MarketingWeekRow[]>;
  cashByCategory(from: string, to: string): Promise<CashCategoryRow[]>;
  cashByWeek(from: string, to: string): Promise<CashWeekRow[]>;
  customersByPlan(asOf: string): Promise<PlanRow[]>;
  customerSearch(query: string, limit: number): Promise<CustomerRow[]>;
  topCustomers(order: TopOrder, limit: number): Promise<CustomerRow[]>;
  topCustomersPeriod(
    from: string,
    to: string,
    metric: PeriodMetric,
    limit: number,
  ): Promise<TopPeriodRow[]>;
}
