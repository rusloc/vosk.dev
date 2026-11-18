import { z } from "zod";
import {
  capText,
  fail,
  runTool,
  toolDefinitions,
  RULE_FROM_TOOLS,
  RULE_SHORT,
  RULE_PLAIN_TEXT,
  RULE_REPORT_ONLY,
  RULE_DATA_NOT_INSTRUCTIONS,
  RULE_LANGUAGE,
} from "@/lib/chat/tools";
import type { ToolResult } from "@/lib/chat/tools";
import {
  createMetricCatalogue,
  formatDelta,
  formatValue,
} from "./chat-metrics";
import type { Dim, MetricDef, MetricQuery } from "./chat-metrics";
import { CMP_NAMES, MARKET_NAMES, TITLE } from "./copy";
import type { SalesEngine } from "./index";
import type { MarketCode, SalesSelection, ViewId } from "./types";
import type { HeroCard, KpiCard, TableCard } from "./view-model";
import { monthIndex, monthKey, monthLabel, periodLabel } from "./windows";

// The Mirelo report's chat tools (ADR-0005, 2026-11-06): a closed set of questions answered by the engine's own view
// models. Every figure in a result is a string the report formats for its cards, so the model quotes and never
// computes. Arguments are the report's state (view, market, closed months, comparator), validated strictly; an
// argument left out falls back to what the visitor is looking at. Results are plain text, capped, with a link that
// opens the web report in the same state. Framework-free and SDK-free: the relay route (step 2) feeds these to the
// model.

/** Characters per tool result: keeps one result ≈ 400 tokens. */
export const RESULT_CAP = 1600;

const VIEWS = [
  "overview",
  "loans",
  "clients",
  "portfolio",
  "revenue",
] as const satisfies readonly ViewId[];
const MARKETS = ["ALL", "PL", "RO", "PT"] as const;
const COUNTRIES = ["PL", "RO", "PT"] as const satisfies readonly MarketCode[];
const CMPS = ["BUD", "PY"] as const;
const TABLE_ROWS = 6;
const TREND_DEFAULT = 6;
const TREND_MAX = 13;

const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "a month is YYYY-MM")
  .describe("A closed month, YYYY-MM.");
const market = z
  .enum(MARKETS)
  .describe("ALL, PL (Poland), RO (Romania) or PT (Portugal).");
const cmp = z.enum(CMPS).describe("BUD (vs Budget) or PY (vs prior year).");
const view = z
  .enum(VIEWS)
  .describe("The report view whose cards and table to read.");
const metric = z
  .string()
  .describe("A card id from the catalogue in the instructions, e.g. l4.");

const SCHEMAS = {
  report_snapshot: z
    .object({
      view,
      market: market.optional(),
      from: month.optional().describe("First month of the period, YYYY-MM."),
      to: month.optional().describe("Last month of the period, YYYY-MM."),
      cmp: cmp.optional(),
    })
    .strict(),
  metric_trend: z
    .object({
      metric,
      market: market.optional(),
      to: month.optional().describe("Last month of the trend, YYYY-MM."),
      months: z
        .number()
        .int()
        .min(2)
        .max(TREND_MAX)
        .optional()
        .describe(`How many months, 2–${TREND_MAX}; default ${TREND_DEFAULT}.`),
    })
    .strict(),
  compare_markets: z
    .object({
      view,
      from: month.optional().describe("First month of the period, YYYY-MM."),
      to: month.optional().describe("Last month of the period, YYYY-MM."),
      cmp: cmp.optional(),
    })
    .strict(),
  explain_metric: z.object({ metric }).strict(),
  get_metric: z
    .object({
      metrics: z
        .array(z.string())
        .min(1)
        .max(4)
        .describe(
          "1–4 metric ids from the metric catalogue in the instructions, e.g. approval_rate.",
        ),
      market: market.optional(),
      from: month.optional().describe("First month of the period, YYYY-MM."),
      to: month.optional().describe("Last month of the period, YYYY-MM."),
      product: z
        .string()
        .optional()
        .describe(
          "Keep one product (a code from the instructions, e.g. FLEX30).",
        ),
      channel: z
        .string()
        .optional()
        .describe("Keep one acquisition channel: APP, PAID, PARTNER or AGENT."),
      client: z
        .enum(["NEW", "RETURNING"])
        .optional()
        .describe("Keep new or returning clients only."),
      stream: z
        .enum(["INTEREST", "FEE", "INTERCHANGE", "SUBSCRIPTION"])
        .optional()
        .describe("Keep one revenue stream."),
      tier: z
        .enum(["PLUS", "PRO"])
        .optional()
        .describe("Keep one paying subscription tier."),
      by: z
        .enum(["market", "product", "channel", "client", "stream", "tier"])
        .optional()
        .describe(
          "Break the figures down: one row per market, product, channel, client type, stream or tier.",
        ),
    })
    .strict(),
};

export type ChatToolName = keyof typeof SCHEMAS;

const DESCRIPTIONS: Record<ChatToolName, string> = {
  report_snapshot:
    "One view of the report for a period and market: its KPI cards (value, vs Budget, vs prior year, status) and the top rows of its table.",
  metric_trend:
    "One card's value month by month, with both comparators, ending at `to`.",
  compare_markets:
    "One view's KPI cards for Poland, Romania and Portugal side by side, for one period.",
  explain_metric:
    "What a card measures, why it matters and its formula, as the report's info pop-up states it.",
  get_metric:
    "Named metrics from the metric catalogue for a period, market and optional filters or breakdown: each value with Budget (where one exists) and the prior year, the change vs each, and the formula. Use it for any specific figure.",
};

// A link here is the report state as a query string: "view=revenue&market=pl".
const cap = (text: string) => capText(text, RESULT_CAP);

/** "24.4k (€9.6m) · vs Budget ▲ +0.4% · vs PY ▲ +15.2% · ▲ Good": value, comparators and status, as the card shows them. */
function figures(c: HeroCard | KpiCard): string {
  const second = "second" in c && c.second ? ` (${c.second})` : "";
  const rows = c.rows.map((r) => ` · ${r.label} ${r.text}`).join("");
  const status = c.status ? ` · ${c.status.text}` : "";
  return `${c.value}${second}${rows}${status}`;
}

const cardLine = (c: HeroCard | KpiCard) => `${c.label}: ${figures(c)}`;

function tableLines(t: TableCard): string[] {
  if (t.rows.length === 0) return [];
  return [
    `${t.title}: ${t.columns.map((c) => c.label).join(" / ")}`,
    ...t.rows
      .slice(0, TABLE_ROWS)
      .map((r) => `  ${r.cells.map((c) => c.text).join(" / ")}`),
  ];
}

export type ChatTools = ReturnType<typeof createChatTools>;

export function createChatTools(engine: SalesEngine) {
  const defaults = engine.codec.defaults();
  const { first, last } = engine.header(defaults);

  const cardsOf = (sel: SalesSelection): (HeroCard | KpiCard)[] =>
    sel.view === "overview"
      ? engine.overview(sel).heroes
      : engine.band(sel).kpis;
  const tableOf = (sel: SalesSelection): TableCard =>
    sel.view === "overview"
      ? engine.overview(sel).table
      : engine.band(sel).table;

  /** Card id → its view and label (o1…o4 on Overview, l1…r6 on the band views). */
  const catalogue = new Map<string, { view: ViewId; label: string }>();
  for (const v of VIEWS)
    for (const c of cardsOf({ ...defaults, view: v }))
      catalogue.set(c.id, { view: v, label: c.label });

  // ---- the metric catalogue (chat-metrics.ts): any named figure, with Budget, PY and a breakdown ----
  const metrics = createMetricCatalogue(engine.cube, engine.metrics);
  const { dims } = engine.cube;
  const PRODUCT_NAMES = new Map(
    dims.product.map((p) => [p.product_code, p.product_name]),
  );
  const CHANNEL_NAMES = new Map(
    dims.channel.map((c) => [c.channel_code, c.channel_name]),
  );
  const STREAM_NAMES = new Map(
    dims.revenue_type.map((r) => [r.revenue_type_code, r.revenue_type_name]),
  );
  const OTHER_NAMES: Record<string, string> = {
    NEW: "New clients",
    RETURNING: "Returning clients",
    PLUS: "Plus",
    PRO: "Pro",
  };
  const MEMBERS: Record<Dim, readonly string[]> = {
    market: COUNTRIES,
    product: [...PRODUCT_NAMES.keys()],
    channel: [...CHANNEL_NAMES.keys()],
    client: ["NEW", "RETURNING"],
    stream: [...STREAM_NAMES.keys()],
    tier: ["PLUS", "PRO"],
  };
  const memberName = (dim: Dim, code: string): string =>
    (dim === "market"
      ? MARKET_NAMES[code as MarketCode]
      : (PRODUCT_NAMES.get(code) ??
        CHANNEL_NAMES.get(code) ??
        STREAM_NAMES.get(code) ??
        OTHER_NAMES[code])) ?? code;
  const FILTER_DIMS = [
    "product",
    "channel",
    "client",
    "stream",
    "tier",
  ] as const satisfies readonly Dim[];

  /** "62.4% · Budget €1.2m (+€0.10m, +8.9%) · PY 60.1% (+2.3pp)": the value, then each comparator and the change to it. */
  function metricFigures(d: MetricDef, q: MetricQuery): string {
    const v = d.value(q);
    if (v === null) return `n/a${d.naNote ? ` (${d.naNote})` : ""}`;
    const parts = [formatValue(d.unit, v)];
    if (d.budget) {
      const b = d.budget(q);
      parts.push(
        b === null
          ? "Budget: none for this cut"
          : `Budget ${formatValue(d.unit, b)} (${formatDelta(d.unit, v, b)})`,
      );
    }
    const pq = metrics.pyQuery(d, q);
    const py = pq ? d.value(pq) : null;
    parts.push(
      py === null
        ? "PY n/a"
        : `PY ${formatValue(d.unit, py)} (${formatDelta(d.unit, v, py)})`,
    );
    return parts.join(" · ");
  }

  const link = (sel: SalesSelection) =>
    engine.codec.serialize({ ...sel, drill: null });
  const scopeOf = (sel: SalesSelection) => engine.header(sel).filterLine;

  /** A month argument as an index, or a reason when it is malformed or outside the closed months. */
  function monthOf(key: string): number | string {
    const i = monthIndex(key);
    return i < first || i > last
      ? `${key} is outside the report: closed months run ${monthKey(first)} to ${monthKey(last)}.`
      : i;
  }

  /** The period from optional `from` / `to`: none = the visitor's period; `to` alone = that month; `from` alone = through the last closed month. */
  function periodOf(
    a: { from?: string; to?: string },
    ctx: SalesSelection,
  ): { from: number; anchor: number } | string {
    if (!a.from && !a.to) return { from: ctx.from, anchor: ctx.anchor };
    const to = a.to ? monthOf(a.to) : last;
    if (typeof to === "string") return to;
    const from = a.from ? monthOf(a.from) : to;
    if (typeof from === "string") return from;
    return from > to
      ? `from (${a.from}) is after to (${a.to}).`
      : { from, anchor: to };
  }

  function unknownMetric(id: string): ToolResult {
    return fail(
      `Unknown metric "${id}". Use a card id from the catalogue (o1…o4, l1…l6, c1…c6, p1…p6, r1…r6).`,
    );
  }

  const runners: {
    [K in ChatToolName]: (
      a: z.infer<(typeof SCHEMAS)[K]>,
      ctx: SalesSelection,
    ) => ToolResult;
  } = {
    report_snapshot(a, ctx) {
      const p = periodOf(a, ctx);
      if (typeof p === "string") return fail(p);
      const sel: SalesSelection = {
        ...ctx,
        ...p,
        view: a.view,
        market: a.market ?? ctx.market,
        cmp: a.cmp ?? ctx.cmp,
        drill: null,
      };
      const scope = scopeOf(sel);
      const lines = [
        scope,
        ...cardsOf(sel).map(cardLine),
        ...tableLines(tableOf(sel)),
      ];
      return { ok: true, text: cap(lines.join("\n")), scope, link: link(sel) };
    },

    metric_trend(a, ctx) {
      const card = catalogue.get(a.metric);
      if (!card) return unknownMetric(a.metric);
      const to = a.to ? monthOf(a.to) : ctx.anchor;
      if (typeof to === "string") return fail(to);
      const start = Math.max(first, to - (a.months ?? TREND_DEFAULT) + 1);
      const base = {
        ...ctx,
        view: card.view,
        market: a.market ?? ctx.market,
        drill: null,
      };
      const lines = [`${card.label} by month - ${MARKET_NAMES[base.market]}`];
      for (let m = start; m <= to; m++) {
        const c = cardsOf({ ...base, from: m, anchor: m }).find(
          (x) => x.id === a.metric,
        );
        if (c) lines.push(`${monthLabel(m)}: ${figures(c)}`);
      }
      const sel = { ...base, from: to, anchor: to };
      const scope = `${monthLabel(start)} to ${monthLabel(to)} - ${MARKET_NAMES[base.market]}`;
      return { ok: true, text: cap(lines.join("\n")), scope, link: link(sel) };
    },

    compare_markets(a, ctx) {
      const p = periodOf(a, ctx);
      if (typeof p === "string") return fail(p);
      const sel: SalesSelection = {
        ...ctx,
        ...p,
        view: a.view,
        cmp: a.cmp ?? ctx.cmp,
        market: "ALL",
        drill: null,
      };
      const scope = `${periodLabel({ start: sel.from, end: sel.anchor }, last)} - vs ${CMP_NAMES[sel.cmp]} - by market`;
      const lines = [scope];
      for (const m of COUNTRIES) {
        lines.push(`${MARKET_NAMES[m]}:`);
        for (const c of cardsOf({ ...sel, market: m }))
          lines.push(`  ${cardLine(c)}`);
      }
      return { ok: true, text: cap(lines.join("\n")), scope, link: link(sel) };
    },

    explain_metric(a) {
      const card = catalogue.get(a.metric);
      if (!card) return unknownMetric(a.metric);
      const c = cardsOf({ ...defaults, view: card.view }).find(
        (x) => x.id === a.metric,
      );
      if (!c) return unknownMetric(a.metric);
      const { what, why, formula } = c.info;
      return {
        ok: true,
        text: cap(`${c.label}: ${what} ${why} Formula: ${formula}`),
        scope: null,
        link: link({ ...defaults, view: card.view }),
      };
    },

    get_metric(a, ctx) {
      const unknown = a.metrics.filter((id) => !metrics.byId.has(id));
      if (unknown.length)
        return fail(
          `Unknown metric ${unknown.map((x) => `"${x}"`).join(", ")}. Use ids from the metric catalogue.`,
        );
      if (a.product !== undefined && !PRODUCT_NAMES.has(a.product))
        return fail(
          `Unknown product "${a.product}". Products: ${MEMBERS.product.join(", ")}.`,
        );
      if (a.channel !== undefined && !CHANNEL_NAMES.has(a.channel))
        return fail(
          `Unknown channel "${a.channel}". Channels: ${MEMBERS.channel.join(", ")}.`,
        );
      const p = periodOf(a, ctx);
      if (typeof p === "string") return fail(p);
      const q: MetricQuery = {
        w: { start: p.from, end: p.anchor },
        market: a.market ?? ctx.market,
        product: a.product,
        channel: a.channel,
        client: a.client,
        stream: a.stream,
        tier: a.tier,
      };
      const filters = FILTER_DIMS.filter((dim) => q[dim] !== undefined);
      const scope = [
        periodLabel(q.w, last),
        MARKET_NAMES[q.market],
        ...filters.map((dim) => memberName(dim, q[dim]!)),
      ].join(" - ");
      const lines = [scope];
      for (const id of a.metrics) {
        const d = metrics.byId.get(id)!;
        const head = `${d.name}${d.derived ? " [derived: not on a card]" : ""}`;
        const off = [...filters, ...(a.by ? [a.by] : [])].filter(
          (dim) => !d.dims.includes(dim),
        );
        if (off.length) {
          lines.push(
            `${head}: cannot be cut by ${off.join(", ")} (its cuts: ${d.dims.join(", ")}).`,
          );
          continue;
        }
        if (!a.by) lines.push(`${head}: ${metricFigures(d, q)}`);
        else {
          lines.push(`${head} by ${a.by}:`);
          const before = lines.length;
          for (const code of MEMBERS[a.by]) {
            const mq: MetricQuery = { ...q, [a.by]: code };
            const v = d.value(mq);
            if (v === null || v === 0) continue; // no data for this member in the cut
            lines.push(`  ${memberName(a.by, code)}: ${metricFigures(d, mq)}`);
          }
          if (lines.length === before)
            lines.push(
              `  n/a for every ${a.by}${d.naNote ? ` (${d.naNote})` : ""}`,
            );
        }
        lines.push(`  Formula: ${d.formula}`);
      }
      const view = metrics.byId.get(a.metrics[0]!)!.view;
      const sel: SalesSelection = {
        ...ctx,
        from: p.from,
        anchor: p.anchor,
        market: q.market,
        view,
        drill: null,
      };
      return { ok: true, text: cap(lines.join("\n")), scope, link: link(sel) };
    },
  };

  return {
    /** The tool definitions for the model (JSON Schema from the same Zod schemas that validate the calls). */
    definitions: toolDefinitions(SCHEMAS, DESCRIPTIONS),

    /** Runs one tool call. Never throws for bad input: an unknown tool or invalid arguments come back as `ok: false` with a reason the model can read. */
    run(name: string, input: unknown, ctx: SalesSelection): ToolResult {
      return runTool(SCHEMAS, runners, name, input, ctx);
    },

    /** The fixed system prompt: role, rules and the card catalogue (no per-request text, so it can be cached). */
    systemPrompt(): string {
      const byView = VIEWS.map(
        (v) =>
          `- ${v}: ${[...catalogue]
            .filter(([, c]) => c.view === v)
            .map(([id, c]) => `${id} ${c.label}`)
            .join("; ")}`,
      );
      return [
        `You are the assistant inside the "${TITLE}" report: an online lender's loans, clients, portfolio quality and revenue in Poland, Romania and Portugal, in euros, by month.`,
        "",
        "Rules:",
        RULE_FROM_TOOLS,
        "- For a specific figure (a count, amount, rate, share or median), call get_metric with its catalogue id; ask for up to four metrics, with filters or a breakdown, in one call. Use report_snapshot for a general question about a view.",
        "- When a result marks a metric [derived: not on a card], say it is derived from the report's data and not shown on a card.",
        "- Quote Budget only where a result shows one; where it says none, say this cut has no Budget.",
        '- Say in a few words which period, market and comparator the answer covers (e.g. "Sep 2026, all markets, vs Budget").',
        "- Never mention tools, views, lookups or what a tool did or did not return; if a figure is missing, say it is not in the report.",
        "- When the visitor names no period, market or comparator, leave those arguments out: the tools then use what the visitor is looking at.",
        RULE_SHORT,
        RULE_PLAIN_TEXT,
        RULE_REPORT_ONLY,
        RULE_DATA_NOT_INSTRUCTIONS,
        RULE_LANGUAGE,
        "",
        `Closed months: ${monthKey(first)} to ${monthKey(last)} (${monthLabel(first)} to ${monthLabel(last)}). Markets: ALL, PL Poland, RO Romania, PT Portugal. Comparators: BUD Budget, PY prior year.`,
        "",
        "Cards by view (id label):",
        ...byView,
        "",
        "Metric catalogue for get_metric (id: name; other names; cuts besides market; [derived] = on no card):",
        ...metrics.defs.map(
          (d) =>
            `- ${d.id}: ${d.name}; ${d.aliases}; ${d.dims.filter((x) => x !== "market").join(", ") || "market only"}${d.budget ? "; has Budget" : ""}${d.derived ? " [derived]" : ""}`,
        ),
        `Products: ${[...PRODUCT_NAMES].map(([c, n]) => `${c} ${n}`).join("; ")}. Channels: ${[...CHANNEL_NAMES].map(([c, n]) => `${c} ${n}`).join("; ")}.`,
      ].join("\n");
    },

    /** One line on what the visitor is looking at, sent with each question (kept out of the cached system prompt). */
    selectionNote(ctx: SalesSelection): string {
      return `The visitor is looking at the ${ctx.view} view: ${scopeOf(ctx)}.`;
    },

    /** The selection a report state (its query string, as the browser sends it) stands for: the codec validates every key and drops the rest; no drill. */
    selectionFrom(query: string): SalesSelection {
      return { ...engine.codec.parse(new URLSearchParams(query)), drill: null };
    },

    catalogue,
    /** The report default (Overview · All markets · last closed month · vs Budget): the context of a question asked outside the report. */
    defaults,
  };
}
