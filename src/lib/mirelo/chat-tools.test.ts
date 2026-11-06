import { beforeAll, describe, expect, it } from "vitest";
import { loadSalesBase } from "./test-utils/sales-data";
import { RESULT_CAP, createChatTools } from "./chat-tools";
import type { ChatTools } from "./chat-tools";
import { createSalesEngine } from "./index";
import type { SalesEngine } from "./index";
import type { SalesSelection, ViewId } from "./types";
import { monthIndex } from "./windows";

// The chat tools (ADR-0005) against the real data: every figure equals the engine's card, every result fits the cap,
// bad calls come back as readable refusals, and the definitions are the shape the LLM API takes.

let engine: SalesEngine;
let tools: ChatTools;
let ctx: SalesSelection;

const VIEWS: ViewId[] = [
  "overview",
  "loans",
  "clients",
  "portfolio",
  "revenue",
];
const MARKETS = ["ALL", "PL", "RO", "PT"] as const;

beforeAll(async () => {
  engine = createSalesEngine(await loadSalesBase());
  tools = createChatTools(engine);
  ctx = engine.codec.defaults(); // Overview · All markets · Sep 2026 · vs Budget
});

const cards = (sel: SalesSelection) =>
  sel.view === "overview" ? engine.overview(sel).heroes : engine.band(sel).kpis;

describe("catalogue", () => {
  it("holds the 28 cards of the five views (4 + 4 × 6), ids unique", () => {
    expect(tools.catalogue.size).toBe(28);
    expect([...tools.catalogue.keys()].slice(0, 5)).toEqual([
      "o1",
      "o2",
      "o3",
      "o4",
      "l1",
    ]);
  });
});

describe("report_snapshot", () => {
  it("defaults to the visitor's selection and quotes the engine's cards", () => {
    const r = tools.run("report_snapshot", { view: "revenue" }, ctx);
    expect(r.ok).toBe(true);
    const sel = { ...ctx, view: "revenue" as const };
    expect(r.scope).toBe(engine.header(sel).filterLine);
    for (const c of cards(sel)) {
      expect(r.text).toContain(`${c.label}: ${c.value}`);
      for (const row of c.rows)
        expect(r.text).toContain(`${row.label} ${row.text}`);
    }
    expect(r.link).toBe(engine.codec.serialize(sel));
  });

  it("reads the period, market and comparator it is given", () => {
    const r = tools.run(
      "report_snapshot",
      {
        view: "loans",
        market: "PL",
        from: "2026-07",
        to: "2026-09",
        cmp: "PY",
      },
      ctx,
    );
    expect(r.scope).toBe("Q3 2026 - vs Prior year - Poland");
    const sel: SalesSelection = {
      ...ctx,
      view: "loans",
      market: "PL",
      from: monthIndex("2026-07"),
      anchor: monthIndex("2026-09"),
      cmp: "PY",
    };
    for (const c of cards(sel))
      expect(r.text).toContain(`${c.label}: ${c.value}`);
  });

  it("`to` alone is that month; `from` alone runs to the last closed month", () => {
    expect(
      tools.run("report_snapshot", { view: "loans", to: "2025-03" }, ctx).scope,
    ).toBe("Mar 2025 - vs Budget - All markets");
    expect(
      tools.run("report_snapshot", { view: "loans", from: "2026-01" }, ctx)
        .scope,
    ).toBe("Year 2026 (Jan–Sep) - vs Budget - All markets");
  });

  it("fits the cap for every view, market and comparator", () => {
    for (const view of VIEWS)
      for (const market of MARKETS)
        for (const cmp of ["BUD", "PY"] as const) {
          const r = tools.run("report_snapshot", { view, market, cmp }, ctx);
          expect(r.ok).toBe(true);
          expect(r.text.length).toBeLessThanOrEqual(RESULT_CAP);
          expect(r.text).not.toContain("…"); // not truncated either
        }
  });
});

describe("metric_trend", () => {
  it("gives one line per month with the engine's value", () => {
    const r = tools.run("metric_trend", { metric: "l4", months: 3 }, ctx);
    expect(r.ok).toBe(true);
    const lines = r.text.split("\n");
    expect(lines[0]).toBe("Approval rate by month - All markets");
    expect(lines).toHaveLength(4);
    for (const [i, key] of ["2026-07", "2026-08", "2026-09"].entries()) {
      const m = monthIndex(key);
      const c = engine
        .band({ ...ctx, view: "loans", from: m, anchor: m })
        .kpis.find((k) => k.id === "l4");
      expect(lines[i + 1]).toMatch(
        new RegExp(`^\\w{3} 2026: ${c!.value.replace(/[.+]/g, "\\$&")}`),
      );
    }
  });

  it("stops at the first month with data and fits the cap for every card at 13 months", () => {
    const early = tools.run(
      "metric_trend",
      { metric: "r1", to: "2024-03", months: 13 },
      ctx,
    );
    expect(early.text.split("\n")).toHaveLength(4); // Jan–Mar 2024
    for (const id of tools.catalogue.keys()) {
      const r = tools.run("metric_trend", { metric: id, months: 13 }, ctx);
      expect(r.ok).toBe(true);
      expect(r.text.length).toBeLessThanOrEqual(RESULT_CAP);
    }
  });
});

describe("compare_markets", () => {
  it("lists each country's cards as the engine draws them, within the cap", () => {
    for (const view of VIEWS) {
      const r = tools.run("compare_markets", { view }, ctx);
      expect(r.ok).toBe(true);
      expect(r.text.length).toBeLessThanOrEqual(RESULT_CAP);
      for (const market of ["PL", "RO", "PT"] as const) {
        const first = cards({ ...ctx, view, market })[0]!;
        expect(r.text).toContain(`${first.label}: ${first.value}`);
      }
    }
    expect(tools.run("compare_markets", { view: "revenue" }, ctx).scope).toBe(
      "Sep 2026 - vs Budget - by market",
    );
  });
});

describe("explain_metric", () => {
  it("returns the card's info text", () => {
    const r = tools.run("explain_metric", { metric: "l4" }, ctx);
    const info = engine.band({ ...ctx, view: "loans" }).kpis[3]!.info;
    expect(r.text).toBe(
      `Approval rate: ${info.what} ${info.why} Formula: ${info.formula}`,
    );
  });
});

describe("refusals (readable, never thrown)", () => {
  const refused = (name: string, input: unknown) => {
    const r = tools.run(name, input, ctx);
    expect(r.ok).toBe(false);
    expect(r.link).toBeNull();
    return r.text;
  };

  it("rejects unknown tools, unknown arguments and wrong values", () => {
    expect(refused("run_sql", { q: "select 1" })).toBe(
      'Unknown tool "run_sql".',
    );
    expect(refused("toString", {})).toBe('Unknown tool "toString".');
    expect(refused("report_snapshot", { view: "loans", sql: "x" })).toMatch(
      /Invalid arguments/,
    );
    expect(refused("report_snapshot", { view: "sales" })).toMatch(/view/);
    expect(refused("report_snapshot", { view: "loans", market: "DE" })).toMatch(
      /market/,
    );
    expect(refused("report_snapshot", { view: "loans", to: "2026-9" })).toMatch(
      /YYYY-MM/,
    );
    expect(refused("report_snapshot", null)).toMatch(/Invalid arguments/);
    expect(refused("metric_trend", { metric: "l4", months: 40 })).toMatch(
      /months/,
    );
  });

  it("rejects months outside the data, reversed periods and unknown cards", () => {
    expect(refused("report_snapshot", { view: "loans", to: "2026-10" })).toBe(
      "2026-10 is outside the report: closed months run 2024-01 to 2026-09.",
    );
    expect(
      refused("report_snapshot", {
        view: "loans",
        from: "2023-12",
        to: "2024-02",
      }),
    ).toMatch(/outside/);
    expect(
      refused("compare_markets", {
        view: "loans",
        from: "2026-05",
        to: "2026-02",
      }),
    ).toBe("from (2026-05) is after to (2026-02).");
    expect(refused("explain_metric", { metric: "x9" })).toMatch(
      /Unknown metric "x9"/,
    );
  });
});

describe("selectionFrom (the report state the browser sends)", () => {
  it("reads a valid state, drops unknown keys and falls back on invalid values", () => {
    expect(tools.selectionFrom("view=revenue&market=pl&cmp=py")).toMatchObject({
      view: "revenue",
      market: "PL",
      cmp: "PY",
    });
    const odd = tools.selectionFrom("view=sql&market=de&evil=1&drill=client:1");
    expect(odd).toMatchObject({ view: "overview", market: "ALL", drill: null });
    expect(tools.selectionFrom("")).toEqual(ctx);
  });

  it("makes the tools default to that state", () => {
    const sel = tools.selectionFrom("view=loans&market=ro&month=2026-03");
    const r = tools.run("report_snapshot", { view: "loans" }, sel);
    expect(r.scope).toBe("Mar 2026 - vs Budget - Romania");
  });
});

describe("definitions and prompt", () => {
  it("defines the four tools as closed JSON Schemas", () => {
    expect(tools.definitions.map((d) => d.name)).toEqual([
      "report_snapshot",
      "metric_trend",
      "compare_markets",
      "explain_metric",
    ]);
    for (const d of tools.definitions) {
      expect(d.input_schema.type).toBe("object");
      expect(d.input_schema.additionalProperties).toBe(false);
      expect(d.input_schema).not.toHaveProperty("$schema");
      expect(d.description.length).toBeGreaterThan(20);
    }
  });

  it("carries every card id and the closed range, and stays small", () => {
    const p = tools.systemPrompt();
    for (const id of tools.catalogue.keys()) expect(p).toContain(`${id} `);
    expect(p).toContain("2024-01 to 2026-09");
    expect(p).not.toMatch(/synthetic|fictional/i);
    expect(p.length).toBeLessThan(3000); // ≈ 750 tokens
    expect(tools.selectionNote(ctx)).toBe(
      "The visitor is looking at the overview view: Sep 2026 - vs Budget - All markets.",
    );
  });
});
