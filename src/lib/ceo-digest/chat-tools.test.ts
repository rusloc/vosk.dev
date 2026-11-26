import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_DAILY_SENDS,
  MAX_SENDS,
  WEEK_ROWS,
  createChatTools,
} from "./chat-tools";
import type { DigestContext, FetchLike } from "./chat-tools";
import type { CustomerRow, DigestData, Meta } from "./queries";

// The Tidewell chat tools with the data and the webhook faked (no database, no n8n): the closed set, strict
// arguments, periods clamped to the data, figures as formatted text, and everything about the email: what is posted,
// how each answer reads, the limit per visitor, and that an address the visitor did not type is never sent to.

const META: Meta = {
  company: "Tidewell",
  currency: "EUR",
  data_from: "2024-01-01",
  data_as_of: "2026-11-15",
  weeks: 150,
};

const CUSTOMER: CustomerRow = {
  customer_id: 7,
  name: "Harbour Physio",
  practice_type: "physio chain",
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

const week = (i: number) => ({
  week_start: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
  week_label: `W${i + 1}`,
  spend_eur: 4200.5,
  budget_eur: 4000,
  clicks: 1830,
  cpc_eur: 1.87,
  mqls: 96,
  mqls_target: 90,
  new_customers: 11,
  cac_eur: 381.86,
});

function fakeData(over: Partial<DigestData> = {}): DigestData {
  return {
    meta: vi.fn(async () => META),
    marketingByChannel: vi.fn(async () => [
      {
        channel_code: "paid_search",
        channel_name: "Paid search",
        weeks: 4,
        spend_eur: 12480,
        impressions: 412300,
        clicks: 6674,
        ctr_pct: 1.62,
        cpc_eur: 1.87,
        mqls: 212,
        cost_per_mql_eur: 58.87,
        trials_started: 64,
        trials_converted: 21,
        trial_to_paid_pct: 32.81,
        new_customers: 21,
        cac_eur: 594.29,
        new_mrr_eur: 2499,
      },
      {
        channel_code: "referral",
        channel_name: "Referral",
        weeks: 4,
        spend_eur: 0,
        impressions: 0,
        clicks: 0,
        ctr_pct: null,
        cpc_eur: null,
        mqls: 40,
        cost_per_mql_eur: null,
        trials_started: 18,
        trials_converted: 9,
        trial_to_paid_pct: 50,
        new_customers: 9,
        cac_eur: null,
        new_mrr_eur: 1071,
      },
      {
        channel_code: "total",
        channel_name: null,
        weeks: 4,
        spend_eur: 12480,
        impressions: 412300,
        clicks: 6674,
        ctr_pct: 1.62,
        cpc_eur: 1.87,
        mqls: 252,
        cost_per_mql_eur: 49.52,
        trials_started: 82,
        trials_converted: 30,
        trial_to_paid_pct: 36.59,
        new_customers: 30,
        cac_eur: 416,
        new_mrr_eur: 3570,
      },
    ]),
    marketingByWeek: vi.fn(async () => [week(0), week(1)]),
    cashByCategory: vi.fn(async () => [
      {
        category_code: "subscriptions",
        category_name: "Subscriptions",
        flow: "operating",
        direction: "in",
        amount_eur: 184200.4,
        share_pct: 91.3,
        ly_amount_eur: 151000,
      },
      {
        category_code: "payroll",
        category_name: "Payroll",
        flow: "operating",
        direction: "out",
        amount_eur: -120300,
        share_pct: 61.2,
        ly_amount_eur: -98000,
      },
      {
        category_code: "net",
        category_name: null,
        flow: null,
        direction: null,
        amount_eur: -12340.5,
        share_pct: null,
        ly_amount_eur: 8200,
      },
    ]),
    cashByWeek: vi.fn(async () => []),
    customersByPlan: vi.fn(async () => [
      {
        plan_code: "pro",
        plan_name: "Pro",
        active_customers: 1812,
        new_last_4w: 14,
        churned_last_4w: 9,
        avg_tenure_months: 17.3,
        invoices_last_12m: 20110,
        billed_last_12m_eur: 1982400,
        overdue_eur: 0,
      },
    ]),
    customerSearch: vi.fn(async () => [CUSTOMER]),
    topCustomers: vi.fn(async () => [CUSTOMER]),
    ...over,
  };
}

const ADDRESS = "Ana.Costa@example.com";
const visitor = (
  ip = "203.0.113.7",
  questions: string[] = [`send it to ${ADDRESS}`, "yes, go ahead"],
): DigestContext => ({ ip, questions });

const SEND = {
  email: ADDRESS,
  scope: "marketing",
  from: "2026-10-01",
  to: "2026-10-31",
  lang: "en",
};

const WEBHOOK = {
  url: "https://n8n.example.test/webhook/digest",
  secret: "s3cret-value",
};

function setup({
  status = 202,
  data = fakeData(),
  webhook = WEBHOOK as typeof WEBHOOK | null,
}: {
  status?: number | "throw";
  data?: DigestData;
  webhook?: typeof WEBHOOK | null;
} = {}) {
  const clock = { now: Date.UTC(2026, 10, 16, 9) };
  const post = vi.fn<FetchLike>(async () => {
    if (status === "throw") throw new DOMException("timed out", "TimeoutError");
    return new Response(null, { status });
  });
  const tools = createChatTools({
    data,
    meta: META,
    webhook,
    fetch: post,
    now: () => clock.now,
    requestId: () => "11111111-2222-4333-8444-555555555555",
  });
  return { tools, post, data, clock };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ceo-digest chat tools", () => {
  it("defines the closed set", () => {
    expect(setup().tools.definitions.map((d) => d.name)).toEqual([
      "get_meta",
      "marketing_by_channel",
      "marketing_by_week",
      "cash_by_category",
      "cash_by_week",
      "clients_by_plan",
      "search_clients",
      "top_clients",
      "send_email_report",
    ]);
  });

  it("the send tool's description demands a request, a typed address and a confirmation", () => {
    const send = setup().tools.definitions.find(
      (d) => d.name === "send_email_report",
    );
    expect(send?.description).toMatch(/ONLY when/);
    expect(send?.description).toMatch(/typed the address/);
    expect(send?.description).toMatch(/confirmed/);
    expect(send?.input_schema.required).toEqual([
      "email",
      "scope",
      "from",
      "to",
    ]);
  });

  it("dates 'today' from the data, not the clock", () => {
    const { tools } = setup();
    expect(tools.systemPrompt()).toContain("Today is 2026-11-15");
    expect(tools.selectionNote()).toBe("Today in the data is 2026-11-15.");
  });

  it("get_meta states the range", async () => {
    const r = await setup().tools.run("get_meta", {}, visitor());
    expect(r.ok).toBe(true);
    expect(r.text).toContain("Data from 2024-01-01 to 2026-11-15 (150 weeks)");
  });

  it("marketing by channel quotes formatted figures and has no report link", async () => {
    const { tools, data } = setup();
    const r = await tools.run(
      "marketing_by_channel",
      { from: "2026-10-19", to: "2026-11-15" },
      visitor(),
    );
    expect(data.marketingByChannel).toHaveBeenCalledWith(
      "2026-10-19",
      "2026-11-15",
    );
    expect(r.scope).toBe("Marketing by channel · 2026-10-19 to 2026-11-15");
    expect(r.link).toBeNull();
    expect(r.text).toContain(
      "Paid search: spend €12,480, impressions 412,300, clicks 6,674, CTR 1.62%, CPC €1.87",
    );
    expect(r.text).toContain("Referral: spend €0.00");
    expect(r.text).toContain("CPC n/a");
    expect(r.text).toContain("Total: spend €12,480");
  });

  it("clamps a period to the data, as the SQL functions do", async () => {
    const { tools, data } = setup();
    const r = await tools.run(
      "cash_by_category",
      { from: "2023-06-01", to: "2027-01-31" },
      visitor(),
    );
    expect(data.cashByCategory).toHaveBeenCalledWith(
      "2024-01-01",
      "2026-11-15",
    );
    expect(r.scope).toBe("Cash flow by category · 2024-01-01 to 2026-11-15");
    expect(r.text).toContain(
      "Subscriptions [operating, in]: €184,200, share 91.3%, same period last year €151,000",
    );
    expect(r.text).toContain("Payroll [operating, out]: -€120,300");
    expect(r.text).toContain(
      "Net cash flow: -€12,341, same period last year €8,200",
    );
  });

  it("a long by-week period lists its latest weeks and says so", async () => {
    const all = Array.from({ length: 40 }, (_, i) => week(i));
    const { tools } = setup({
      data: fakeData({ marketingByWeek: vi.fn(async () => all) }),
    });
    const r = await tools.run(
      "marketing_by_week",
      { from: "2026-01-01", to: "2026-11-15" },
      visitor(),
    );
    expect(r.text).toContain(
      `The period has 40 weeks; the latest ${WEEK_ROWS}`,
    );
    expect(r.text).not.toContain("W14 (");
    expect(r.text).toContain("W15 (");
    expect(r.text).toContain("W40 (");
    expect(r.text).toContain("MQLs 96, MQL target 90");
  });

  it("an empty result is an answer, not an error", async () => {
    const r = await setup().tools.run(
      "cash_by_week",
      { from: "2026-11-01", to: "2026-11-15" },
      visitor(),
    );
    expect(r.ok).toBe(true);
    expect(r.text).toContain("No rows");
  });

  it("clients by plan defaults to the data's today", async () => {
    const { tools, data } = setup();
    const r = await tools.run("clients_by_plan", {}, visitor());
    expect(data.customersByPlan).toHaveBeenCalledWith("2026-11-15");
    expect(r.text).toContain(
      "Pro: active customers 1,812, new in the last 4 weeks 14, churned in the last 4 weeks 9, average tenure 17.3 months",
    );
  });

  it("search and top list customers, ten unless asked", async () => {
    const { tools, data } = setup();
    const s = await tools.run("search_clients", { query: " lyon " }, visitor());
    expect(data.customerSearch).toHaveBeenCalledWith("lyon", 10);
    expect(s.text).toContain(
      "Harbour Physio (physio chain, Lyon, FR): Clinic plan, channel Paid search, customer since 2024-03-11, active, tenure 32 months, 3 invoices, billed to date €158,400, last invoice 2026-10-12, overdue €52,800",
    );
    const t = await tools.run(
      "top_clients",
      { order: "overdue", limit: 5 },
      visitor(),
    );
    expect(data.topCustomers).toHaveBeenCalledWith("overdue", 5);
    expect(t.scope).toBe("Top 5 clients by overdue amount · as of 2026-11-15");
  });

  it.each([
    ["marketing_by_channel", {}, "Invalid arguments"],
    ["marketing_by_channel", { from: "2026-10-01" }, "Invalid arguments"],
    [
      "marketing_by_channel",
      { from: "01.10.2026", to: "2026-10-31" },
      "Invalid arguments",
    ],
    [
      "marketing_by_channel",
      { from: "2026-02-30", to: "2026-03-31" },
      "Invalid arguments",
    ],
    [
      "cash_by_week",
      { from: "2026-10-01", to: "2026-10-31", sql: "select 1" },
      "Invalid arguments",
    ],
    [
      "cash_by_week",
      { from: "2026-10-31", to: "2026-10-01" },
      "ends before it starts",
    ],
    [
      "cash_by_week",
      { from: "2027-01-01", to: "2027-01-31" },
      "the data runs 2024-01-01 to 2026-11-15",
    ],
    ["clients_by_plan", { as_of: "2030-01-01" }, "No data for that date"],
    ["search_clients", { query: "a" }, "Invalid arguments"],
    ["search_clients", { query: "lyon", limit: 21 }, "Invalid arguments"],
    ["top_clients", { order: "revenue" }, "Invalid arguments"],
    ["top_clients", { order: "billed", limit: 0 }, "Invalid arguments"],
    ["get_meta", { extra: 1 }, "Invalid arguments"],
    ["run_sql", { query: "select 1" }, "Unknown tool"],
  ])("refuses %s %j", async (name, input, message) => {
    const { tools, data } = setup();
    const r = await tools.run(name, input, visitor());
    expect(r.ok).toBe(false);
    expect(r.text).toContain(message);
    for (const fn of Object.values(data)) expect(fn).not.toHaveBeenCalled();
  });

  it("a failed read is a line for the model, and the log carries no detail", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { tools } = setup({
      data: fakeData({
        customerSearch: vi.fn(async () => {
          throw new Error("connect ECONNREFUSED db.internal:5432 password=x");
        }),
      }),
    });
    const r = await tools.run("search_clients", { query: "lyon" }, visitor());
    expect(r).toEqual({
      ok: false,
      text: "The data is not available right now.",
      scope: null,
      link: null,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("password");
  });
});

describe("send_email_report", () => {
  it("posts the contract's body with the secret header", async () => {
    const { tools, post } = setup();
    const r = await tools.run("send_email_report", SEND, visitor());
    expect(r.ok).toBe(true);
    expect(r.text).toMatch(/^Queued/);
    expect(r.scope).toBeNull(); // no figures card for an email

    expect(post).toHaveBeenCalledTimes(1);
    const [url, init] = post.mock.calls[0]!;
    expect(url).toBe(WEBHOOK.url);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "X-Digest-Secret": WEBHOOK.secret,
    });
    expect(init.redirect).toBe("error");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body as string)).toEqual({
      requestId: "11111111-2222-4333-8444-555555555555",
      email: ADDRESS,
      scope: "marketing",
      from: "2026-10-01",
      to: "2026-10-31",
      lang: "en",
    });
  });

  it("defaults the language to en and clamps the period", async () => {
    const { tools, post } = setup();
    await tools.run(
      "send_email_report",
      {
        email: ADDRESS,
        scope: "clients",
        from: "2026-11-01",
        to: "2026-12-31",
      },
      visitor(),
    );
    expect(JSON.parse(post.mock.calls[0]![1].body as string)).toMatchObject({
      scope: "clients",
      from: "2026-11-01",
      to: "2026-11-15",
      lang: "en",
    });
  });

  it.each([
    [{ ...SEND, email: "not-an-address" }],
    [{ ...SEND, email: "a@b" }],
    [{ ...SEND, email: `${ADDRESS}, other@example.com` }],
    [{ ...SEND, scope: "payroll" }],
    [{ ...SEND, from: "October" }],
    [{ ...SEND, lang: "de" }],
    [{ ...SEND, cc: "boss@example.com" }],
    [{ ...SEND, email: undefined }],
  ])("refuses bad arguments %j without calling n8n", async (input) => {
    const { tools, post } = setup();
    const r = await tools.run("send_email_report", input, visitor());
    expect(r.ok).toBe(false);
    expect(r.text).toContain("Invalid arguments");
    expect(post).not.toHaveBeenCalled();
  });

  it("refuses a backwards period without calling n8n", async () => {
    const { tools, post } = setup();
    const r = await tools.run(
      "send_email_report",
      { ...SEND, from: "2026-10-31", to: "2026-10-01" },
      visitor(),
    );
    expect(r.ok).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it("never sends to an address the visitor did not type", async () => {
    const { tools, post } = setup();
    const r = await tools.run(
      "send_email_report",
      SEND,
      visitor("203.0.113.7", ["email me the marketing report", "yes"]),
    );
    expect(r.ok).toBe(false);
    expect(r.text).toContain("has not typed this address");
    expect(post).not.toHaveBeenCalled();
    // …and the check ignores letter case
    const ok = await tools.run(
      "send_email_report",
      SEND,
      visitor("203.0.113.7", [`to ${ADDRESS.toUpperCase()} please`]),
    );
    expect(ok.ok).toBe(true);
  });

  it.each([
    [429, "the email limit is reached"],
    [400, "rejected the request"],
    [401, "not available right now"],
    [500, "not available right now"],
    [200, "not available right now"],
    ["throw" as const, "not available right now"],
  ])("maps a %s answer to a short outcome", async (status, message) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { tools } = setup({ status });
    const r = await tools.run("send_email_report", SEND, visitor());
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/^Not sent/);
    expect(r.text).toContain(message);
    // nothing about the visitor or the secret reaches the log
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain(ADDRESS);
    expect(logged).not.toContain(WEBHOOK.secret);
    expect(log.mock.calls.length).toBe(status === 401 ? 1 : 0);
  });

  it("answers 'not available' while the webhook is not set up", async () => {
    const { tools, post } = setup({ webhook: null });
    const r = await tools.run("send_email_report", SEND, visitor());
    expect(r.ok).toBe(false);
    expect(r.text).toContain("not available");
    expect(post).not.toHaveBeenCalled();
  });

  it(`allows ${MAX_SENDS} emails per visitor in 24 hours`, async () => {
    const { tools, post, clock } = setup();
    const send = (ip: string) =>
      tools.run("send_email_report", SEND, visitor(ip));

    expect((await send("203.0.113.7")).ok).toBe(true);
    clock.now += 60_000;
    expect((await send("203.0.113.7")).ok).toBe(true);
    clock.now += 60_000;
    const third = await send("203.0.113.7");
    expect(third.ok).toBe(false);
    expect(third.text).toContain("limit of 2 emails in 24 hours");
    expect(post).toHaveBeenCalledTimes(2);

    // another visitor is not affected
    expect((await send("198.51.100.9")).ok).toBe(true);

    // the window slides: 24 hours after the first send one slot is free again
    clock.now += 24 * 60 * 60 * 1000 - 110_000;
    expect((await send("203.0.113.7")).ok).toBe(true);
    expect((await send("203.0.113.7")).ok).toBe(false);
  });

  it(`stops at ${MAX_DAILY_SENDS} emails a day across all visitors`, async () => {
    const { tools, post, clock } = setup();
    for (let i = 0; i < MAX_DAILY_SENDS; i++) {
      clock.now += 1000;
      expect(
        (await tools.run("send_email_report", SEND, visitor(`198.51.100.${i}`)))
          .ok,
      ).toBe(true);
    }
    const over = await tools.run(
      "send_email_report",
      SEND,
      visitor("203.0.113.99"),
    );
    expect(over.ok).toBe(false);
    expect(over.text).toContain("daily email limit");
    expect(post).toHaveBeenCalledTimes(MAX_DAILY_SENDS);
  });

  it("a send that was not queued does not use up the limit", async () => {
    const data = fakeData();
    const clock = { now: 0 };
    const statuses = [500, 429, 202, 202];
    const post = vi.fn<FetchLike>(
      async () => new Response(null, { status: statuses.shift() ?? 202 }),
    );
    const tools = createChatTools({
      data,
      meta: META,
      webhook: WEBHOOK,
      fetch: post,
      now: () => ++clock.now,
    });
    const send = () => tools.run("send_email_report", SEND, visitor());
    expect((await send()).ok).toBe(false);
    expect((await send()).ok).toBe(false);
    expect((await send()).ok).toBe(true);
    expect((await send()).ok).toBe(true);
    expect((await send()).text).toContain("limit of 2");
    expect(post).toHaveBeenCalledTimes(4);
  });

  it("two sends at once cannot both take the last slot", async () => {
    const { tools, post } = setup();
    await tools.run("send_email_report", SEND, visitor());
    const [a, b] = await Promise.all([
      tools.run("send_email_report", SEND, visitor()),
      tools.run("send_email_report", SEND, visitor()),
    ]);
    expect([a.ok, b.ok].filter(Boolean).length).toBe(1);
    expect(post).toHaveBeenCalledTimes(2);
  });
});
