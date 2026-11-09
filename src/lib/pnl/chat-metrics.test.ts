import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { csvTable } from "@/lib/csv";
import { createMetricCatalogue } from "./chat-metrics";
import type { Column, MetricCatalogue, MetricQuery } from "./chat-metrics";
import { createChatTools } from "./chat-tools";
import type { ChatTools } from "./chat-tools";
import type {
  BaseChoice,
  EntityView,
  MonthNumber,
  TimeView,
} from "./engine/types";
import { DATA_DIR, loadPublicDataset } from "./test-utils/public-data";

// The chat's answer key, level 1 (plan 2026-11-07 §2, §5): every statement line the generator's control totals cover
// is read through the catalogue (as get_metric reads it) and must equal the CSV, for each company, version and
// window. Then the golden rows of data/pnl/checks/chat-golden.csv: figures the CSV does not carry (currencies,
// constant currency, MTD / QTD / LTM, slices and their allocation, drivers, comparators, the Group, shares), computed
// by scripts/pnl-golden.ts straight from the Parquet (plain loops from the data contract), not by the engine.

const CONTROL = [
  ...csvTable(
    readFileSync(join(DATA_DIR, "checks", "control_totals_usd.csv"), "utf8"),
    ["entity_code", "version", "window", "line_code", "amount_usd"],
    "control_totals_usd.csv",
  ),
].map(([entity = "", version = "", window = "", line = "", amount = ""]) => ({
  entity,
  version,
  window,
  line,
  amount: Number(amount),
}));

const BASE: Record<string, BaseChoice> = { ACT: "A", BUD: "B", LE: "LE" };
const MONTH_NUMBER: Record<string, MonthNumber> = { Sep: 9 };

/** "FY2025" → full year; "FY2026 YTD Sep" → YTD to Sep; "FY2026 (actual Jan-Sep + forecast 9+3)" → full year. */
function queryOf(entity: string, version: string, window: string): MetricQuery {
  const match = /^FY(\d{4})(?: YTD (\w{3}))?/.exec(window);
  const ytd = match?.[2];
  const month = ytd === undefined ? 12 : MONTH_NUMBER[ytd];
  const base = BASE[version];
  if (!match?.[1] || !base || !month)
    throw new Error(`unmapped control row ${entity} ${version} ${window}`);
  return {
    entity: entity as EntityView,
    fy: Number(match[1]),
    month,
    timeView: ytd ? "YTD" : "FY",
    base,
    currency: "USD",
    fxBasis: "ACT",
  };
}

const cases = [
  ...new Set(CONTROL.map((c) => `${c.entity}|${c.version}|${c.window}`)),
].map((key) => {
  const [entity = "", version = "", window = ""] = key.split("|");
  return {
    entity,
    version,
    window,
    rows: CONTROL.filter((c) => `${c.entity}|${c.version}|${c.window}` === key),
  };
});

let cat: MetricCatalogue;
let tools: ChatTools;
beforeAll(async () => {
  const ds = await loadPublicDataset(["P", "S"]);
  cat = createMetricCatalogue(ds);
  tools = createChatTools(ds);
});

describe("control totals (control_totals_usd.csv) through the catalogue", () => {
  it("covers 552 rows: P / S / GROUP × 8 windows × 23 lines", () => {
    expect(CONTROL).toHaveLength(552);
    expect(cases).toHaveLength(24);
  });

  it.each(cases)(
    "$entity · $version · $window",
    ({ entity, version, window, rows }) => {
      const q = queryOf(entity, version, window);
      for (const c of rows) {
        const d = cat.byId.get(c.line);
        expect(d, c.line).toBeDefined();
        const got = d!.value(q, "base");
        expect(got, `${c.line} ${entity} ${version} ${window}`).not.toBeNull();
        expect(
          Math.abs(got! - c.amount),
          `${c.line} ${entity} ${version} ${window}`,
        ).toBeLessThanOrEqual(0.01);
      }
    },
  );
});

/** chat-golden.csv: key "metric|entity|fy|month|tv|base|cur|fx|col|k=v;k=v", expected (empty = n/a), question. */
const GOLDEN = [
  ...csvTable(
    readFileSync(join(DATA_DIR, "checks", "chat-golden.csv"), "utf8"),
    ["key", "expected", "question"],
    "chat-golden.csv",
  ),
].map(([key = "", expected = ""]) => ({ key, expected }));

describe("golden rows (plain loops over the Parquet, scripts/pnl-golden.ts)", () => {
  it("has rows", () => expect(GOLDEN.length).toBeGreaterThan(45));

  it.each(GOLDEN)("$key", ({ key, expected }) => {
    const [
      ref = "",
      entity = "",
      fy = "",
      month = "",
      tv = "",
      base = "",
      cur = "",
      fx = "",
      col = "",
      filters = "",
    ] = key.split("|");
    const d = cat.byId.get(ref);
    expect(d, ref).toBeDefined();
    const q: MetricQuery = {
      entity: entity as EntityView,
      fy: Number(fy),
      month: Number(month) as MonthNumber,
      timeView: tv as TimeView,
      base: base as BaseChoice,
      currency: cur as MetricQuery["currency"],
      fxBasis: fx as MetricQuery["fxBasis"],
      ...Object.fromEntries(
        filters
          .split(";")
          .filter(Boolean)
          .map((kv) => kv.split("=")),
      ),
    };
    const got = d!.value(q, col as Column);
    if (expected === "") return expect(got).toBeNull();
    const want = Number(expected);
    expect(got).not.toBeNull();
    // Amounts: a cent plus float noise over a few hundred thousand rows; ratios and counts: noise only.
    const tolerance =
      d!.unit === "amount" ? 0.011 : d!.unit === "count" ? 0 : 1e-9;
    expect(
      Math.abs(got! - want),
      `${key}: ${got} vs ${want}`,
    ).toBeLessThanOrEqual(tolerance + Math.abs(want) * 1e-9);
  });
});

describe("the catalogue", () => {
  it("has unique ids, a formula and the four cuts or fewer for every metric", () => {
    expect(new Set(cat.defs.map((d) => d.id)).size).toBe(cat.defs.length);
    expect(cat.defs.length).toBeGreaterThanOrEqual(55);
    for (const d of cat.defs) {
      expect(d.formula.length, d.id).toBeGreaterThan(10);
      expect(d.dims.length, d.id).toBeGreaterThan(0);
      expect(d.entities.length, d.id).toBeGreaterThan(0);
    }
  });

  it("returns a number or null for every metric and column on the default period, both companies and the Group", () => {
    for (const entity of ["P", "S", "GROUP"] as const) {
      const q: MetricQuery = {
        entity,
        fy: 2026,
        month: 9,
        timeView: "YTD",
        base: "A",
        currency: "USD",
        fxBasis: "ACT",
      };
      for (const d of cat.defs)
        for (const col of ["base", "B", "LE", "PY"] as const) {
          const v = d.value(q, col);
          expect(
            v === null || Number.isFinite(v),
            `${d.id} ${entity} ${col}`,
          ).toBe(true);
        }
    }
  });
});

describe("get_metric and friends", () => {
  const ctx = () => tools.defaults;

  it("lists five tools whose schemas are strict objects", () => {
    expect(tools.definitions.map((d) => d.name)).toEqual([
      "report_snapshot",
      "statement",
      "get_metric",
      "top_variances",
      "explain_metric",
    ]);
    for (const d of tools.definitions) {
      expect(d.input_schema.type).toBe("object");
      expect(d.input_schema.additionalProperties).toBe(false);
      expect(d.input_schema.$schema).toBeUndefined();
    }
  });

  it("answers metrics with Budget, prior year, a status and the formula", () => {
    const r = tools.run(
      "get_metric",
      { metrics: ["NR", "GM_PCT"], region: "EU" },
      ctx(),
    );
    expect(r.ok).toBe(true);
    expect(r.text).toMatch(
      /^Consumer Products · YTD Sep 2026 · Actual · USD, actual rates · Continental Europe/,
    );
    expect(r.text).toMatch(
      /Net revenue: \$[\d,.]+ m · Budget \$[\d,.]+ m \([+−]\$[\d,.]+ m, [+−][\d.]+%\) · (ahead|on track|watch|off track) · PY /,
    );
    expect(r.text).toMatch(
      /Gross margin %: [\d.]+% · Budget [\d.]+% \([+−]?[\d.]+ pp\)/,
    );
    expect(r.text).toContain("Formula: GR + GTN");
    expect(r.link).toContain("r=EU");
  });

  it("breaks a line down by channel and marks a derived figure", () => {
    const r = tools.run(
      "get_metric",
      { metrics: ["EBITDA", "FX_EFFECT_NR"], by: "channel" },
      ctx(),
    );
    expect(r.ok).toBe(true);
    for (const name of [
      "Grocery & mass retail",
      "Own D2C webstore",
      "Wholesale & distributors",
    ])
      expect(r.text).toContain(`  ${name}: `);
    expect(r.text).toContain("FX effect on net revenue [derived");
  });

  it("refuses what the data cannot say, with a reason", () => {
    expect(tools.run("get_metric", { metrics: ["nps"] }, ctx()).text).toContain(
      'Unknown metric "nps"',
    );
    expect(
      tools.run(
        "get_metric",
        { metrics: ["NR"], entity: "GROUP", channel: "GRO" },
        ctx(),
      ).text,
    ).toContain("Group has no channel cut");
    expect(
      tools.run("get_metric", { metrics: ["NR"], channel: "SELF" }, ctx()).text,
    ).toContain('Unknown channel "SELF"');
    expect(
      tools.run("get_metric", { metrics: ["NR"], fy: 2023 }, ctx()).ok,
    ).toBe(false);
    expect(tools.run("get_metric", { metrics: ["GMV"] }, ctx()).text).toContain(
      "not for Consumer Products",
    );
    expect(tools.run("top_variances", { entity: "GROUP" }, ctx()).ok).toBe(
      false,
    );
  });

  it("reads the statement in another currency and the Group's key lines", () => {
    const eur = tools.run("statement", { currency: "EUR" }, ctx());
    expect(eur.ok).toBe(true);
    expect(eur.text).toMatch(/Net revenue: €[\d,.]+ m · Budget €/);
    expect(eur.text).not.toContain("LE €"); // no open months in an actual YTD: the LE column says nothing
    const group = tools.run(
      "report_snapshot",
      { entity: "GROUP", fy: 2025, time_view: "FY" },
      ctx(),
    );
    expect(group.ok).toBe(true);
    expect(group.text).toMatch(/^ACME Group · Full year 2025/);
    expect(group.link).toBeNull();
  });

  it("ranks the largest variances and reads the Vitals", () => {
    const v = tools.run("top_variances", { n: 3, entity: "S" }, ctx());
    expect(v.ok).toBe(true);
    expect(v.text.split("\n").filter((l) => l.startsWith("  ")).length).toBe(4); // 3 lines + the total
    expect(v.link).toContain("v=analysis");
    const s = tools.run("report_snapshot", {}, ctx());
    expect(s.text).toContain("Net revenue: $3,398.5 m");
    expect(s.text).toContain("FY outlook:");
  });

  it("reads a report state back and lists every catalogue id in the system prompt", () => {
    const sel = tools.selectionFrom("e=S&tv=QTD&cur=EUR&r=EU");
    expect(sel.entity).toBe("S");
    expect(sel.region).toEqual(["EU"]);
    expect(tools.selectionNote(sel)).toContain("Commerce Cloud · QTD Sep 2026");
    const prompt = tools.systemPrompt();
    for (const d of cat.defs) expect(prompt).toContain(`- ${d.id}: `);
    expect(prompt.length).toBeLessThan(10_000);
  });
});
