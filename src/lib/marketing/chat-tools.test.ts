import { beforeAll, describe, expect, it } from "vitest";
import { RESULT_CAP, createChatTools } from "./chat-tools";
import type { ChatTools } from "./chat-tools";
import { CARDS } from "./engine/copy";
import type { Dataset } from "./engine/data";
import { DEFAULT_SELECTION, VIEW_KEYS } from "./engine/selection";
import type { Selection } from "./engine/selection";
import { context, vitals } from "./engine/view";
import { loadDataset } from "./test-utils/marketing-data";

// The ACME Marketing chat tools (ADR-0005, 11-06) against the real data: every vital equals the engine's tile, every
// result fits the cap, the links read back as the same state, bad calls come back as readable refusals, and the
// definitions are the shape the LLM API takes.

let ds: Dataset;
let tools: ChatTools;
const ctx: Selection = DEFAULT_SELECTION; // Overview · last 30 days · vs prior period · DDA

beforeAll(async () => {
  ds = await loadDataset();
  tools = createChatTools(ds);
});

describe("definitions", () => {
  it("are four closed tools with object schemas and no draft marker", () => {
    expect(tools.definitions.map((d) => d.name)).toEqual([
      "report_snapshot",
      "metric_trend",
      "campaign_detail",
      "explain_metric",
    ]);
    for (const d of tools.definitions) {
      expect(d.input_schema.type).toBe("object");
      expect(d.input_schema.$schema).toBeUndefined();
      expect(d.input_schema.additionalProperties).toBe(false);
    }
  });
});

describe("report_snapshot", () => {
  it.each(VIEW_KEYS)("reads the %s view within the cap", (view) => {
    const r = tools.run("report_snapshot", { view }, ctx);
    expect(r.ok).toBe(true);
    expect(r.text.length).toBeLessThanOrEqual(RESULT_CAP);
    expect(r.scope).toBeTruthy();
    expect(tools.selectionFrom(r.link ?? "").view).toBe(view);
  });

  it("quotes the vitals exactly as the tiles show them", () => {
    const r = tools.run(
      "report_snapshot",
      { view: "channels", preset: "7d", channels: ["PAID_SEARCH"] },
      ctx,
    );
    expect(r.ok).toBe(true);
    const sel = tools.selectionFrom(r.link ?? "");
    expect(sel.preset).toBe("7d");
    expect(sel.channels).toEqual(["PAID_SEARCH"]);
    for (const v of vitals(context(ds, sel))) expect(r.text).toContain(v.value);
  });

  it("takes a custom window and the attribution model", () => {
    const r = tools.run(
      "report_snapshot",
      {
        view: "overview",
        from: "2026-09-01",
        to: "2026-09-30",
        model: "LAST_CLICK",
      },
      ctx,
    );
    expect(r.ok).toBe(true);
    const sel = tools.selectionFrom(r.link ?? "");
    expect(sel.preset).toBe("custom");
    expect(ds.cal.iso(sel.from ?? -1)).toBe("2026-09-01");
    expect(ds.cal.iso(sel.to ?? -1)).toBe("2026-09-30");
    expect(sel.model).toBe("LAST_CLICK");
  });

  it("falls back to what the visitor is looking at", () => {
    const visitor = tools.selectionFrom("p=qtd&ch=paid_search#campaigns");
    const r = tools.run("report_snapshot", { view: "campaigns" }, visitor);
    const sel = tools.selectionFrom(r.link ?? "");
    expect(sel.preset).toBe("qtd");
    expect(sel.channels).toEqual(["PAID_SEARCH"]);
  });
});

describe("metric_trend", () => {
  it("gives eight weeks by default, each equal to the vital for that week", () => {
    const r = tools.run("metric_trend", { vital: "V5" }, ctx);
    expect(r.ok).toBe(true);
    const lines = r.text.split("\n").slice(1);
    expect(lines).toHaveLength(8);
    expect(r.text.length).toBeLessThanOrEqual(RESULT_CAP);
  });

  it("gives months on request", () => {
    const r = tools.run(
      "metric_trend",
      { vital: "V1", grain: "month", periods: 3, to: "2026-09-30" },
      ctx,
    );
    expect(r.ok).toBe(true);
    const lines = r.text.split("\n").slice(1);
    expect(lines.map((l) => l.split(":")[0])).toEqual([
      "Jul 2026",
      "Aug 2026",
      "Sep 2026",
    ]);
    const sep = vitals(
      context(ds, {
        ...ctx,
        preset: "custom",
        from: ds.cal.ix("2026-09-01"),
        to: ds.cal.ix("2026-09-30"),
      }),
    )[0];
    expect(lines[2]).toContain(sep?.value ?? "missing");
  });
});

describe("campaign_detail", () => {
  it("reads every campaign within the cap", () => {
    for (const c of ds.m.campaigns) {
      const r = tools.run("campaign_detail", { campaign: c.campaign_key }, ctx);
      expect(r.ok).toBe(true);
      expect(r.text).toContain(c.campaign_name);
      expect(r.text.length).toBeLessThanOrEqual(RESULT_CAP);
      expect(tools.selectionFrom(r.link ?? "").view).toBe("campaigns");
    }
  });
});

describe("explain_metric", () => {
  it("states every card's definition without spec references", () => {
    for (const card of CARDS) {
      const r = tools.run("explain_metric", { card: card.code }, ctx);
      expect(r.ok).toBe(true);
      expect(r.scope).toBeNull();
      expect(r.text.startsWith(`${card.title}: ${card.what}`)).toBe(true);
      const note = r.text.slice(
        r.text.indexOf(card.formula) + card.formula.length,
      );
      expect(note).not.toMatch(/^\s*(A-\d|data README)/);
    }
  });
});

describe("bad calls", () => {
  it("come back as readable refusals", () => {
    const cases: [string, unknown][] = [
      ["drop_tables", {}],
      ["report_snapshot", { view: "sales" }],
      ["report_snapshot", { view: "overview", channels: ["TV"] }],
      ["report_snapshot", { view: "overview", extra: 1 }],
      ["report_snapshot", { view: "overview", from: "2019-01-01" }],
      [
        "report_snapshot",
        { view: "overview", from: "2026-09-30", to: "2026-09-01" },
      ],
      ["metric_trend", { vital: "V9" }],
      ["campaign_detail", { campaign: "NOPE" }],
      ["explain_metric", { card: "Z1" }],
    ];
    for (const [name, input] of cases) {
      const r = tools.run(name, input, ctx);
      expect(r.ok, `${name} ${JSON.stringify(input)}`).toBe(false);
      expect(r.text.length).toBeGreaterThan(0);
      expect(r.link).toBeNull();
    }
  });
});

describe("prompt and state", () => {
  it("names every campaign, channel and card in the system prompt", () => {
    const p = tools.systemPrompt();
    for (const c of ds.m.campaigns) expect(p).toContain(c.campaign_key);
    for (const c of ds.m.channels) expect(p).toContain(c.channel_code);
    for (const c of CARDS) expect(p).toContain(`${c.code} ${c.title}`);
  });

  it("reads the report's state with or without the leading ?", () => {
    const a = tools.selectionFrom("?p=7d&c=ly#journey");
    const b = tools.selectionFrom("p=7d&c=ly#journey");
    expect(a).toEqual(b);
    expect(a.view).toBe("journey");
    expect(a.cmp).toBe("ly");
    expect(tools.selectionFrom("utm_source=x&p=bogus").preset).toBe("30d");
    expect(tools.selectionNote(a)).toContain("Journey");
  });
});
