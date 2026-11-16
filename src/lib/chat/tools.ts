import { z } from "zod";

// What every report's chat tools share (ADR-0005; the Mirelo tools 11-06, ACME Marketing's 11-06): the result and
// definition shapes, the toolset the loop and the route take, and the strict run / definitions plumbing over a map of
// Zod schemas. A report brings its schemas, its descriptions and its runners; nothing here knows a report.

/** A tool's answer: `text` goes back to the model; `link` and `scope` feed the panel's figures card. */
export interface ToolResult {
  ok: boolean;
  text: string;
  scope: string | null; // "Q3 2026 - vs Budget - Poland"
  link: string | null; // the report state the figures came from, as the report reads it back
}

/** A tool definition in the shape the LLM API takes (name, description, JSON Schema). */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** One report's chat tools over its engine, for a report state `C` (the selection a question is asked in). */
export interface ChatToolset<C> {
  definitions: readonly ToolDefinition[];
  /**
   * Never throws for bad input: an unknown tool or invalid arguments come back as `ok: false`. A report's tools answer
   * at once (its engine is in memory); a toolset that reads a database or calls a service per question answers with a
   * promise (the Tidewell data chat, 11-16).
   */
  run(name: string, input: unknown, ctx: C): ToolResult | Promise<ToolResult>;
  /** Fixed per instance (no per-request text), so it can be cached. */
  systemPrompt(): string;
  /** One line on what the visitor is looking at, sent with each question. */
  selectionNote(ctx: C): string;
  /** The state a report sends (its query string) as a selection; bad keys are dropped by the report's codec. */
  selectionFrom(state: string): C;
  /** The report default: the context of a question asked outside the report. */
  defaults: C;
}

export const fail = (text: string): ToolResult => ({
  ok: false,
  text,
  scope: null,
  link: null,
});

export const capText = (text: string, cap: number) =>
  text.length <= cap ? text : `${text.slice(0, cap - 1)}…`;

type Schemas = Record<string, z.ZodType>;

/** The definitions for the model: JSON Schema from the same Zod schemas that validate the calls. */
export function toolDefinitions<S extends Schemas>(
  schemas: S,
  descriptions: Record<keyof S & string, string>,
): ToolDefinition[] {
  return (Object.keys(schemas) as (keyof S & string)[]).map((name) => {
    const input_schema: Record<string, unknown> = z.toJSONSchema(
      schemas[name]!,
    );
    delete input_schema.$schema; // a draft marker, not part of the tool contract
    return { name, description: descriptions[name], input_schema };
  });
}

/** Runs one call: an unknown name or arguments that fail the schema come back as a reason the model can read. */
export function runTool<
  S extends Schemas,
  C,
  R extends ToolResult | Promise<ToolResult> = ToolResult,
>(
  schemas: S,
  runners: {
    [K in keyof S]: (a: z.infer<S[K]>, ctx: C) => R;
  },
  name: string,
  input: unknown,
  ctx: C,
): ToolResult | R {
  if (!Object.hasOwn(schemas, name)) return fail(`Unknown tool "${name}".`);
  const parsed = schemas[name]!.safeParse(input);
  if (!parsed.success)
    return fail(
      `Invalid arguments for ${name}: ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "input"} ${i.message}`)
        .join("; ")}.`,
    );
  return (runners[name] as (a: unknown, c: C) => R)(parsed.data, ctx);
}
