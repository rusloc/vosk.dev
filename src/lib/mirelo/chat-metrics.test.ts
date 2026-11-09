import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { csvTable } from "@/lib/csv";
import { createChatTools } from "./chat-tools";
import type { ChatTools } from "./chat-tools";
import { createMetricCatalogue } from "./chat-metrics";
import type { MetricCatalogue, MetricQuery } from "./chat-metrics";
import { createSalesEngine } from "./index";
import { SALES_DATA_DIR, loadSalesBase } from "./test-utils/sales-data";
import type { MarketSel } from "./types";
import { monthIndex } from "./windows";

// The chat's answer key, level 1 (plan 2026-11-07 §2): every catalogue metric the generator's control totals cover is
// read through the catalogue (as get_metric reads it) and must equal the CSV, for each market and period. Then the
// golden rows of data/mirelo/checks/chat-golden.csv: figures the CSV does not carry, computed by SQL straight from
// mirelo_demo (data/mirelo/checks/golden.sql), not from the engine.

const CONTROL = new Map(
  [
    ...csvTable(
      readFileSync(
        join(SALES_DATA_DIR, "checks", "control_totals_eur.csv"),
        "utf8",
      ),
      ["market_code", "period", "metric_code", "value"],
      "control_totals_eur.csv",
    ),
  ].map(([market = "", period = "", metric = "", value = ""]) => [
    `${market}|${period}|${metric}`,
    Number(value),
  ]),
);

/** Catalogue id (+ filter) → control-totals code. */
const CT: [string, Partial<MetricQuery>, string][] = [
  ["loans", {}, "loans_count"],
  ["principal", {}, "principal_eur"],
  ["new_clients", {}, "new_clients"],
  ["repeat_share", {}, "returning_pct_loans"],
  ["borrowers", {}, "borrowers"],
  ["returning_clients", {}, "returning_clients"],
  ["returning_share", {}, "returning_pct_clients"],
  ["outstanding", {}, "outstanding_eur"],
  ["dpd30_balance", {}, "dpd30_balance_eur"],
  ["dpd30", {}, "dpd30_pct"],
  ["dpd90", {}, "dpd90_pct"],
  ["revenue", {}, "revenue_eur"],
  ["revenue", { stream: "INTEREST" }, "revenue_interest_eur"],
  ["revenue", { stream: "FEE" }, "revenue_fee_eur"],
  ["revenue", { stream: "INTERCHANGE" }, "revenue_interchange_eur"],
  ["revenue", { stream: "SUBSCRIPTION" }, "revenue_subscription_eur"],
];

const MARKETS: MarketSel[] = ["ALL", "PL", "RO", "PT"];
/** Control period → window. */
const PERIODS: [string, string, string][] = [
  ["2026-09", "2026-09", "2026-09"],
  ["2025-03", "2025-03", "2025-03"],
  ["FY2024", "2024-01", "2024-12"],
  ["FY2025", "2025-01", "2025-12"],
  ["FY2026_YTD_SEP", "2026-01", "2026-09"],
];

const tolerance = (code: string) =>
  code.endsWith("_eur")
    ? 0.0051
    : code.endsWith("_pct") || code.includes("pct_")
      ? 5.1e-7
      : 0;

let cat: MetricCatalogue;
let tools: ChatTools;
beforeAll(async () => {
  const engine = createSalesEngine(await loadSalesBase());
  cat = createMetricCatalogue(engine.cube, engine.metrics);
  tools = createChatTools(engine);
});

describe.each(PERIODS)("control totals %s", (period, from, to) => {
  const w = { start: monthIndex(from), end: monthIndex(to) };
  it.each(MARKETS)("%s: every covered catalogue metric", (market) => {
    for (const [id, filter, code] of CT) {
      const expected = CONTROL.get(`${market}|${period}|${code}`);
      if (expected === undefined) continue; // e.g. the CSV has no month row for a ratio
      const got = cat.byId.get(id)!.value({ w, market, ...filter });
      expect(got, `${id} ${market} ${period}`).not.toBeNull();
      expect(
        Math.abs(got! - expected),
        `${id} ${market} ${period}`,
      ).toBeLessThanOrEqual(tolerance(code));
    }
  });
});

/** chat-golden.csv: key "metric|market|from|to|k=v;k=v" (a "budget:" prefix reads the metric's Budget), expected, question. */
const GOLDEN = [
  ...csvTable(
    readFileSync(join(SALES_DATA_DIR, "checks", "chat-golden.csv"), "utf8"),
    ["key", "expected", "question"],
    "chat-golden.csv",
  ),
].map(([key = "", expected = ""]) => ({ key, expected }));

describe("golden rows (SQL over mirelo_demo, data/mirelo/checks/golden.sql)", () => {
  it("has rows", () => expect(GOLDEN.length).toBeGreaterThan(40));

  it.each(GOLDEN)("$key", ({ key, expected }) => {
    const [ref = "", market = "", from = "", to = "", filters = ""] =
      key.split("|");
    const budget = ref.startsWith("budget:");
    const d = cat.byId.get(budget ? ref.slice(7) : ref);
    expect(d, ref).toBeDefined();
    const q: MetricQuery = {
      w: { start: monthIndex(from), end: monthIndex(to) },
      market: market as MarketSel,
      ...Object.fromEntries(
        filters
          .split(";")
          .filter(Boolean)
          .map((kv) => kv.split("=")),
      ),
    };
    const got = budget ? d!.budget!(q) : d!.value(q);
    if (expected === "") return expect(got).toBeNull();
    const want = Number(expected);
    expect(got).not.toBeNull();
    expect(Math.abs(got! - want)).toBeLessThanOrEqual(
      Math.max(5.1e-7, Math.abs(want) * 1e-9),
    );
  });
});

describe("the catalogue", () => {
  it("has unique ids, a formula and at least the market cut for every metric", () => {
    expect(new Set(cat.defs.map((d) => d.id)).size).toBe(cat.defs.length);
    for (const d of cat.defs) {
      expect(d.formula.length, d.id).toBeGreaterThan(10);
      expect(d.dims, d.id).toContain("market");
    }
  });

  it("returns a number or null for every metric on the default period", () => {
    const w = { start: monthIndex("2026-07"), end: monthIndex("2026-09") };
    for (const d of cat.defs) {
      const v = d.value({ w, market: "ALL" });
      expect(v === null || Number.isFinite(v), d.id).toBe(true);
    }
  });
});

describe("get_metric", () => {
  const ctx = () => tools.defaults;

  it("answers two metrics with Budget, PY and the formula", () => {
    const r = tools.run(
      "get_metric",
      {
        metrics: ["loans", "approval_rate"],
        market: "PL",
        from: "2026-07",
        to: "2026-09",
      },
      ctx(),
    );
    expect(r.ok).toBe(true);
    expect(r.text).toMatch(/^Q3 2026|Jul/);
    expect(r.text).toContain("Loans disbursed: ");
    expect(r.text).toMatch(/Loans disbursed: [\d.,k]+ · Budget /);
    expect(r.text).toMatch(
      /Approval rate: [\d.]+% · PY [\d.]+% \([+−]?[\d.]+pp\)/,
    );
    expect(r.text).toContain("Formula: Approved ÷ submitted");
    expect(r.link).toContain("market=pl");
  });

  it("breaks a metric down by market, and marks a derived one", () => {
    const r = tools.run(
      "get_metric",
      { metrics: ["kyc_pass_rate"], by: "market" },
      ctx(),
    );
    expect(r.ok).toBe(true);
    expect(r.text).toContain("[derived: not on a card]");
    for (const name of ["Poland", "Romania", "Portugal"])
      expect(r.text).toContain(`  ${name}: `);
  });

  it("says when a metric does not take a cut instead of answering it uncut", () => {
    const r = tools.run(
      "get_metric",
      { metrics: ["hours_to_cash"], channel: "PAID" },
      ctx(),
    );
    expect(r.ok).toBe(true);
    expect(r.text).toContain("cannot be cut by channel");
  });

  it("rejects an unknown metric, product or month with a reason", () => {
    expect(tools.run("get_metric", { metrics: ["nps"] }, ctx()).text).toContain(
      'Unknown metric "nps"',
    );
    expect(
      tools.run("get_metric", { metrics: ["loans"], product: "GOLD" }, ctx())
        .text,
    ).toContain('Unknown product "GOLD"');
    expect(
      tools.run("get_metric", { metrics: ["loans"], to: "2031-01" }, ctx()).ok,
    ).toBe(false);
  });

  it("lists every catalogue id in the system prompt", () => {
    const prompt = tools.systemPrompt();
    for (const d of cat.defs) expect(prompt).toContain(`- ${d.id}: `);
  });
});
