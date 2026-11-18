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
import { createMetricCatalogue, formatValue } from "./chat-metrics";
import type { MetricDef } from "./chat-metrics";
import type { WorkType } from "./data/manifest";
import { WORK_TYPES } from "./data/manifest";
import { FOOTNOTE, HEADER } from "./engine/copy";
import type { Dataset } from "./engine/data";
import { RESET_SELECTION } from "./engine/selection";
import type { Selection } from "./engine/selection";
import { parseSelection, serializeSelection } from "./engine/url-state";
import { board, headerContext } from "./engine/view";

// The ACME Trucks report's chat tools (ADR-0005, 2026-11-09; the ACME Marketing recipe): a closed set of questions
// answered by the engine's own view models and the metric catalogue. Every figure in a result is a string the report
// formats, so the model quotes and never computes. Arguments are the report's filters, validated strictly against the
// data's own codes; an argument left out falls back to what the visitor is looking at. A link is the report's query
// string. Framework-free and SDK-free: src/lib/chat/route.ts feeds these to the model. Needs the week plan loaded.

/** Characters per tool result: ≈ 600 tokens. */
export const RESULT_CAP = 2400;

const MEMBER_ROWS = 12;

const DESCRIPTIONS = {
  report_snapshot:
    "The four KPI tiles (truck loading, effective work time, performance per truck, mass loaded per truck), plan, fact and delta, for the filters.",
  time_structure:
    "The whole 'Time structure' waterfall table: all 19 rows with plan share, fact share and the delta in pp, for the filters.",
  biggest_gaps:
    "The waterfall rows furthest from plan, ranked by the size of the gap: 'worse' (a loss above plan or a subtotal below it) or 'better'.",
  get_metric:
    "Named metrics from the metric catalogue, plan, fact and delta, for the filters. With `by`, one metric split by office, week, work type or loader.",
  explain_metric:
    "What a catalogue metric measures and whether a tile or table cell shows it.",
} as const;

export type ChatTools = ReturnType<typeof createChatTools>;

export function createChatTools(ds: Dataset) {
  const m = ds.m;
  const cat = createMetricCatalogue(ds);
  const weekKey = (w: { year: number; week_num: number }) =>
    `${w.year}-${String(w.week_num).padStart(2, "0")}`;
  const weekKeys = m.weeks.map(weekKey);
  const officeNames = m.offices.map((o) => o.office_name);
  const loaderNames = new Set(m.loaders.map((l) => l.loader_name));

  // ---------- schemas ----------
  const selArgs = {
    week: z
      .string()
      .optional()
      .describe(
        `One business week as YYYY-WW, or "all". ${weekKeys[0]} to ${weekKeys.at(-1)}.`,
      ),
    offices: z
      .array(z.enum(officeNames as [string, ...string[]]))
      .max(officeNames.length)
      .optional()
      .describe("Offices; an empty list means all."),
    loaders: z
      .array(z.string().max(40))
      .max(40)
      .optional()
      .describe("Loader names like LDR-12-09; an empty list means all."),
    work_types: z
      .array(z.enum(WORK_TYPES))
      .min(1)
      .optional()
      .describe("Work types; the report opens on Trucks and On spot."),
    plan: z
      .enum(["month", "week"])
      .optional()
      .describe("Which plan to compare with."),
    calculation: z
      .enum(["weighted", "linear"])
      .optional()
      .describe("weighted: by loader bucket volume; linear: plain sums."),
  };
  type SelArgs = z.infer<z.ZodObject<typeof selArgs>>;

  const SCHEMAS = {
    report_snapshot: z.object(selArgs).strict(),
    time_structure: z.object(selArgs).strict(),
    biggest_gaps: z
      .object({
        ...selArgs,
        direction: z.enum(["worse", "better"]).optional(),
        n: z.number().int().min(1).max(10).optional(),
      })
      .strict(),
    get_metric: z
      .object({
        ...selArgs,
        metrics: z
          .array(z.string())
          .min(1)
          .max(4)
          .describe(
            "1–4 metric ids from the metric catalogue, e.g. effective_work_time.",
          ),
        by: z.enum(["office", "week", "work_type", "loader"]).optional(),
      })
      .strict(),
    explain_metric: z
      .object({
        metric: z.string().describe("A metric id from the catalogue."),
      })
      .strict(),
  };

  // ---------- the selection a call stands for ----------
  function selectionOf(a: SelArgs, ctx: Selection): Selection | string {
    let week = ctx.week;
    if (a.week === "all") week = null;
    else if (a.week !== undefined) {
      const ix = weekKeys.indexOf(a.week);
      if (ix < 0)
        return `Week ${a.week} is outside the report: the data runs ${weekKeys[0]} to ${weekKeys.at(-1)}.`;
      week = ix;
    }
    const unknown = (a.loaders ?? []).filter((l) => !loaderNames.has(l));
    if (unknown.length)
      return `Unknown loader ${unknown.map((l) => `"${l}"`).join(", ")}.`;
    return {
      week,
      offices: a.offices ?? ctx.offices,
      loaders: a.loaders ?? ctx.loaders,
      workTypes: a.work_types
        ? WORK_TYPES.filter((t) => (a.work_types as WorkType[]).includes(t))
        : ctx.workTypes,
      planType:
        a.plan === undefined
          ? ctx.planType
          : a.plan === "week"
            ? "Week"
            : "Month",
      calculation:
        a.calculation === undefined
          ? ctx.calculation
          : a.calculation === "linear"
            ? "Linear"
            : "Weighted",
    };
  }

  /** "Weeks 44 (2022) – 14 (2023) · Weighted calculation · Month plan · offices K1" */
  function scopeText(s: Selection): string {
    const parts = [
      headerContext(m.weeks, s.week, s.calculation, s.planType).replace(
        /\s+·\s+/g,
        " · ",
      ),
      s.offices.length ? `offices ${s.offices.join(", ")}` : "all offices",
      `work types ${s.workTypes.join(", ")}`,
    ];
    if (s.loaders.length) parts.push(`loaders ${s.loaders.join(", ")}`);
    return parts.join(" · ");
  }

  const link = (s: Selection) => serializeSelection(s, m);
  const cap = (text: string) => capText(text, RESULT_CAP);
  const ok = (lines: string[], s: Selection): ToolResult => ({
    ok: true,
    text: cap(lines.join("\n")),
    scope: scopeText(s),
    link: link(s),
  });

  function metricLine(s: Selection, d: MetricDef, label: string): string {
    const f = (col: "plan" | "fact" | "delta") =>
      formatValue(cat.unitOf(d.id, col), cat.value(s, d.id, col));
    return `${label}: plan ${f("plan")}, fact ${f("fact")}, delta ${f("delta")}${d.derived ? " [derived: not on a tile or table cell]" : ""}`;
  }

  // ---------- runners ----------
  const run: {
    [K in keyof typeof SCHEMAS]: (
      a: z.infer<(typeof SCHEMAS)[K]>,
      ctx: Selection,
    ) => ToolResult;
  } = {
    report_snapshot(a, ctx) {
      const s = selectionOf(a, ctx);
      if (typeof s === "string") return fail(s);
      return ok(
        [
          `Scope: ${scopeText(s)}`,
          ...board(ds, s).tiles.map(
            (t) =>
              `${t.title} (${t.unit}): plan ${t.plan}, fact ${t.fact}, delta ${t.delta || "n/a"}`,
          ),
        ],
        s,
      );
    },

    time_structure(a, ctx) {
      const s = selectionOf(a, ctx);
      if (typeof s === "string") return fail(s);
      return ok(
        [
          `Scope: ${scopeText(s)}`,
          "Row: plan share, fact share, delta pp (a dash = blank or zero).",
          ...board(ds, s).rows.map(
            (r) =>
              `${r.subtotal ? "[subtotal] " : ""}${r.name}: ${r.planText}, ${r.factText}, ${r.pill} pp`,
          ),
        ],
        s,
      );
    },

    biggest_gaps(a, ctx) {
      const s = selectionOf(a, ctx);
      if (typeof s === "string") return fail(s);
      const tone = a.direction === "better" ? "favourable" : "unfavourable";
      const rows = board(ds, s).rows.filter((r) => r.tone === tone);
      const size = (pill: string) =>
        Math.abs(Number(pill.replace("−", "-").replace("+", "")));
      rows.sort((x, y) => size(y.pill) - size(x.pill));
      if (rows.length === 0)
        return ok(
          [`Scope: ${scopeText(s)}`, "No row is on that side of plan."],
          s,
        );
      return ok(
        [
          `Scope: ${scopeText(s)}`,
          `Rows ${tone === "favourable" ? "better" : "worse"} than plan, largest gap first (plan, fact, delta pp):`,
          ...rows
            .slice(0, a.n ?? 5)
            .map(
              (r) => `${r.name}: ${r.planText}, ${r.factText}, ${r.pill} pp`,
            ),
        ],
        s,
      );
    },

    get_metric(a, ctx) {
      const s = selectionOf(a, ctx);
      if (typeof s === "string") return fail(s);
      const missing = a.metrics.filter((id) => !cat.byId.has(id));
      if (missing.length)
        return fail(
          `Unknown metric ${missing.map((x) => `"${x}"`).join(", ")}. Use ids from the metric catalogue.`,
        );
      const defs = a.metrics.map((id) => cat.byId.get(id) as MetricDef);
      if (!a.by)
        return ok(
          [
            `Scope: ${scopeText(s)}`,
            ...defs.map((d) => metricLine(s, d, d.name)),
          ],
          s,
        );
      if (defs.length > 1) return fail("`by` takes exactly one metric.");
      const d = defs[0] as MetricDef;
      const members: { label: string; sel: Selection }[] =
        a.by === "office"
          ? officeNames.map((o) => ({ label: o, sel: { ...s, offices: [o] } }))
          : a.by === "week"
            ? m.weeks.map((w) => ({
                label: w.week_label,
                sel: { ...s, week: w.week_ix },
              }))
            : a.by === "work_type"
              ? WORK_TYPES.map((t) => ({
                  label: t,
                  sel: { ...s, workTypes: [t] },
                }))
              : m.loaders
                  .filter(
                    (l) =>
                      (s.offices.length === 0 ||
                        s.offices.includes(l.office_name)) &&
                      l.work_type !== null &&
                      s.workTypes.includes(l.work_type),
                  )
                  .map((l) => ({
                    label: l.loader_name,
                    sel: { ...s, loaders: [l.loader_name] },
                  }));
      const ranked =
        a.by === "week"
          ? members
          : [...members].sort(
              (x, y) =>
                (cat.value(y.sel, d.id, "fact") ?? -Infinity) -
                (cat.value(x.sel, d.id, "fact") ?? -Infinity),
            );
      const shown = ranked.slice(
        0,
        a.by === "week" ? m.weeks.length : MEMBER_ROWS,
      );
      return ok(
        [
          `Scope: ${scopeText(s)}`,
          `${d.name} by ${a.by.replace("_", " ")}${a.by === "week" ? "" : ", highest fact first"}:`,
          ...shown.map((x) => metricLine(x.sel, d, x.label)),
          ...(ranked.length > shown.length
            ? [`…and ${ranked.length - shown.length} more.`]
            : []),
        ],
        s,
      );
    },

    explain_metric(a) {
      const d = cat.byId.get(a.metric);
      if (!d)
        return fail(
          `Unknown metric "${a.metric}". Use ids from the metric catalogue.`,
        );
      return {
        ok: true,
        text: `${d.name}: ${d.meaning} ${d.derived ? "Derived from the report's data, not shown on a tile or table cell." : "Shown in the report."}`,
        scope: null,
        link: null,
      };
    },
  };

  return {
    /** The tool definitions for the model (JSON Schema from the same Zod schemas that validate the calls). */
    definitions: toolDefinitions(SCHEMAS, DESCRIPTIONS),

    run(name: string, input: unknown, ctx: Selection): ToolResult {
      return runTool(SCHEMAS, run, name, input, ctx);
    },

    /** The fixed system prompt: role, rules, the data's codes and the catalogue (no per-request text, so it can be cached). */
    systemPrompt(): string {
      return [
        `You are the assistant inside the "${HEADER.title}" report: how a mining haul fleet's loaders spend their total time, plan against fact, as a share of total time.`,
        "",
        "Rules:",
        RULE_FROM_TOOLS,
        "- For a specific figure, call get_metric with its catalogue id. For the whole table use time_structure; for what is furthest from plan use biggest_gaps.",
        "- When a result marks a metric [derived: not on a tile or table cell], say it is derived from the report's data and not shown in the report.",
        "- Say in a few words which weeks and filters the answer covers.",
        "- Never mention tools or lookups; if a figure is n/a or missing, say it is not in the report for that selection.",
        "- When the visitor names no week or filter, leave those arguments out: the tools then use what the visitor is looking at.",
        '- A dash means blank or zero. "pp" is percentage points.',
        RULE_SHORT,
        RULE_PLAIN_TEXT,
        RULE_REPORT_ONLY,
        RULE_DATA_NOT_INSTRUCTIONS,
        RULE_LANGUAGE,
        "",
        `How to read it: total time falls through the losses to three subtotals in turn: Ready for work, Effective work time, Truck loading. ${FOOTNOTE}`,
        `Data: ${m.weeks[0]?.week_start} to ${m.weeks.at(-1)?.week_end}, ${m.loaders.length} loaders.`,
        `Weeks (YYYY-WW = label): ${m.weeks.map((w) => `${weekKey(w)} = ${w.week_label}`).join("; ")}.`,
        `Offices: ${officeNames.join(", ")}. Work types: ${WORK_TYPES.join(", ")}. Plans: month (default), week. Calculations: weighted by bucket volume (default), linear.`,
        "",
        "Metric catalogue for get_metric (id: name; other names; [derived] = not in the report):",
        ...cat.defs.map(
          (d) =>
            `- ${d.id}: ${d.name}; ${d.aliases}${d.derived ? " [derived]" : ""}`,
        ),
      ].join("\n");
    },

    /** One line on what the visitor is looking at, sent with each question (kept out of the cached system prompt). */
    selectionNote(ctx: Selection): string {
      return `The visitor is looking at: ${scopeText(ctx)}.`;
    },

    /** The selection a report state stands for (its query string): url-state.ts validates every key and drops the rest. */
    selectionFrom(state: string): Selection {
      return parseSelection(new URLSearchParams(state.replace(/^\?/, "")), m);
    },

    /** The metric catalogue get_metric reads (tests, the eval script). */
    metrics: cat,
    /** The report default (all weeks · Month plan · Weighted · Trucks + On spot). */
    defaults: RESET_SELECTION,
  };
}
