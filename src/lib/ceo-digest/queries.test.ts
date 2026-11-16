import { describe, expect, it } from "vitest";
import * as q from "./queries";
import type { SqlTag } from "./queries";

// The SQL wrappers against a stand-in for the driver's tagged template (no database): which function each one calls,
// that every argument is a bound parameter, and that a row off the contract is refused.

function fakeSql(result: unknown[]) {
  const calls: { text: string; values: (string | number)[] }[] = [];
  const sql: SqlTag = (strings, ...values) => {
    calls.push({ text: strings.join("$"), values });
    return Promise.resolve(result.map((r) => ({ r })));
  };
  return { sql, calls };
}

const META = {
  company: "Tidewell",
  currency: "EUR",
  data_from: "2024-01-01",
  data_as_of: "2026-11-15",
  weeks: 150,
};

const CUSTOMER = {
  customer_id: 7,
  name: "Harbour Physio",
  practice_type: "physio",
  city: "Lyon",
  country: "FR",
  plan_name: "Clinic",
  channel_name: "Paid search",
  signup_date: "2024-03-11",
  churn_date: null,
  status: "active",
  tenure_months: 32,
  invoices: 3,
  billed_to_date_eur: 158400,
  last_invoice_date: "2026-10-12",
  overdue_eur: 52800,
};

describe("ceo-digest SQL wrappers", () => {
  it("reads fn_meta as one row", async () => {
    const { sql, calls } = fakeSql([META]);
    expect(await q.meta(sql)).toEqual(META);
    expect(calls[0]?.text).toBe(
      "select to_jsonb(t) as r from ceo_digest_demo.fn_meta() as t",
    );
    expect(calls[0]?.values).toEqual([]);
  });

  it("fails when fn_meta returns nothing", async () => {
    await expect(q.meta(fakeSql([]).sql)).rejects.toThrow("no row");
  });

  it.each([
    ["fn_marketing_by_channel", q.marketingByChannel],
    ["fn_marketing_by_week", q.marketingByWeek],
    ["fn_cash_by_category", q.cashByCategory],
    ["fn_cash_by_week", q.cashByWeek],
  ] as const)("%s takes the period as two bound dates", async (name, fn) => {
    const { sql, calls } = fakeSql([]);
    expect(await fn(sql, "2026-10-01", "2026-10-31")).toEqual([]);
    expect(calls[0]?.text).toBe(
      `select to_jsonb(t) as r from ceo_digest_demo.${name}($::date, $::date) as t`,
    );
    expect(calls[0]?.values).toEqual(["2026-10-01", "2026-10-31"]);
  });

  it("fn_customers_by_plan takes the date", async () => {
    const { sql, calls } = fakeSql([]);
    await q.customersByPlan(sql, "2026-11-15");
    expect(calls[0]?.text).toContain("fn_customers_by_plan($::date)");
    expect(calls[0]?.values).toEqual(["2026-11-15"]);
  });

  it("the search text is a parameter, never part of the statement", async () => {
    const { sql, calls } = fakeSql([CUSTOMER]);
    const text = "x'; drop table dim_customer; --";
    expect(await q.customerSearch(sql, text, 5)).toEqual([CUSTOMER]);
    expect(calls[0]?.text).toBe(
      "select to_jsonb(t) as r from ceo_digest_demo.fn_customer_search($::text, $::int) as t",
    );
    expect(calls[0]?.values).toEqual([text, 5]);
  });

  it("caps the customer rows at the contract's 20", async () => {
    const { sql, calls } = fakeSql([]);
    await q.topCustomers(sql, "overdue", 500);
    await q.customerSearch(sql, "lyon", 0);
    expect(calls[0]?.text).toContain("fn_top_customers($::text, $::int)");
    expect(calls[0]?.values).toEqual(["overdue", 20]);
    expect(calls[1]?.values).toEqual(["lyon", 1]);
  });

  it("refuses a row with a column outside the contract", async () => {
    const { sql } = fakeSql([{ ...CUSTOMER, email: "x@y.z" }]);
    await expect(q.topCustomers(sql, "billed", 5)).rejects.toThrow();
  });

  it("refuses a row with a contract column missing or mistyped", async () => {
    // no week_label
    const row = {
      week_start: "2026-11-09",
      spend_eur: 1,
      budget_eur: 1,
      clicks: 1,
      cpc_eur: 1,
      mqls: 1,
      mqls_target: 1,
      new_customers: 1,
      cac_eur: 1,
    };
    await expect(
      q.marketingByWeek(fakeSql([row]).sql, "2026-11-01", "2026-11-15"),
    ).rejects.toThrow();
    await expect(
      q.meta(fakeSql([{ ...META, data_as_of: "15.11.2026" }]).sql),
    ).rejects.toThrow();
  });
});
