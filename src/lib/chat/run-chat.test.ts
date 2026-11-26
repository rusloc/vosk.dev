import type Anthropic from "@anthropic-ai/sdk";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSalesBase } from "@/lib/mirelo/test-utils/sales-data";
import { createChatTools } from "@/lib/mirelo/chat-tools";
import type { ChatTools } from "@/lib/mirelo/chat-tools";
import { createSalesEngine } from "@/lib/mirelo/index";
import { runChat } from "./run-chat";
import type { ChatEvent } from "./run-chat";
import type { ChatToolset } from "./tools";

// The chat loop's caps and events with a scripted model (no network): figures per lookup, at most 3 model calls
// (the last with tools off), at most 4 tool calls, a refusal answered with a fixed line, bad calls returned as errors.

let tools: ChatTools;
beforeAll(async () => {
  tools = createChatTools(createSalesEngine(await loadSalesBase()));
});

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown };

const reply = (stop: string, ...content: Block[]) => ({
  content,
  stop_reason: stop,
  usage: {
    input_tokens: 1000,
    output_tokens: 100,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  },
});
const snapshot = (id: string): Block => ({
  type: "tool_use",
  id,
  name: "report_snapshot",
  input: { view: "revenue" },
});

/** A client whose stream() plays back `replies` in order and records what each call was sent. */
function scripted(replies: ReturnType<typeof reply>[]) {
  const sent: { toolChoice: string; messages: number; lastContent: unknown }[] =
    [];
  const client = {
    messages: {
      stream(params: Anthropic.MessageCreateParams) {
        const r = replies[sent.length];
        if (!r) throw new Error("more calls than scripted");
        const last = params.messages.at(-1);
        sent.push({
          toolChoice: params.tool_choice?.type ?? "",
          messages: params.messages.length,
          lastContent: last?.content,
        });
        const onText: ((t: string) => void)[] = [];
        return {
          on(event: string, fn: (t: string) => void) {
            if (event === "text") onText.push(fn);
            return this;
          },
          async finalMessage() {
            for (const b of r.content)
              if (b.type === "text") onText.forEach((fn) => fn(b.text));
            return r;
          },
        };
      },
    },
  } as unknown as Anthropic;
  return { client, sent };
}

async function ask(replies: ReturnType<typeof reply>[]) {
  const { client, sent } = scripted(replies);
  const events: ChatEvent[] = [];
  const costs: number[] = [];
  const usage = await runChat({
    client,
    tools,
    ctx: tools.defaults,
    turns: [{ role: "user", content: "How is revenue doing?" }],
    emit: (e) => events.push(e),
    onCost: (usd) => costs.push(usd),
  });
  return { usage, events, sent, costs };
}

describe("runChat", () => {
  it("runs a lookup, emits its figures, then streams the answer", async () => {
    const { usage, events, sent } = await ask([
      reply("tool_use", snapshot("t1")),
      reply("end_turn", { type: "text", text: "Revenue is €1.3m." }),
    ]);
    expect(events.map((e) => e.type)).toEqual(["figures", "text"]);
    const figures = events[0] as Extract<ChatEvent, { type: "figures" }>;
    expect(figures.scope).toBe("Sep 2026 - vs Budget - All markets");
    expect(figures.link).toBe("view=revenue");
    expect(sent.map((s) => s.toolChoice)).toEqual(["auto", "auto"]);
    expect(sent[1]!.messages).toBe(3); // question, the tool call, its result
    expect(usage).toMatchObject({
      modelCalls: 2,
      tools: ["report_snapshot"],
      inputTokens: 2000,
      outputTokens: 200,
    });
    expect(usage.costUsd).toBeCloseTo(2 * (1000 * 0.1e-6 + 100 * 0.5e-6), 10);
  });

  it("reports each model call's cost as it happens, so a cut-off question still counts", async () => {
    const { usage, costs } = await ask([
      reply("tool_use", snapshot("t1")),
      reply("end_turn", { type: "text", text: "Revenue is €1.3m." }),
    ]);
    expect(costs).toHaveLength(2);
    expect(costs[0]! + costs[1]!).toBeCloseTo(usage.costUsd, 12);
  });

  it("stops at 3 model calls, the last with tools off, and runs at most 4 lookups", async () => {
    const { usage, events, sent } = await ask([
      reply("tool_use", snapshot("a"), snapshot("b"), snapshot("c")),
      reply("tool_use", snapshot("d"), snapshot("e")),
      reply("end_turn", { type: "text", text: "Done." }),
    ]);
    expect(sent.map((s) => s.toolChoice)).toEqual(["auto", "auto", "none"]);
    expect(usage.tools).toHaveLength(4);
    expect(events.filter((e) => e.type === "figures")).toHaveLength(4);
    const results = sent[2]!.lastContent as Anthropic.ToolResultBlockParam[];
    expect(results.map((r) => r.is_error)).toEqual([false, true]); // d ran, e refused
  });

  it("answers a refusal with a fixed line", async () => {
    const { events } = await ask([reply("refusal")]);
    expect(events).toEqual([
      {
        type: "text",
        text: "I can't help with that. Ask me about this report's figures.",
      },
    ]);
  });

  it("returns a bad tool call to the model as an error, with no figures card", async () => {
    const { events, sent } = await ask([
      reply("tool_use", {
        type: "tool_use",
        id: "x",
        name: "run_sql",
        input: { q: "select 1" },
      }),
      reply("end_turn", { type: "text", text: "Sorry." }),
    ]);
    expect(events.map((e) => e.type)).toEqual(["text"]);
    const [result] = sent[1]!.lastContent as Anthropic.ToolResultBlockParam[];
    expect(result).toMatchObject({
      is_error: true,
      content: 'Unknown tool "run_sql".',
    });
  });

  it("shows no figures card for a definition", async () => {
    const { events } = await ask([
      reply("tool_use", {
        type: "tool_use",
        id: "e",
        name: "explain_metric",
        input: { metric: "p5" },
      }),
      reply("end_turn", { type: "text", text: "Roll rate is…" }),
    ]);
    expect(events.map((e) => e.type)).toEqual(["text"]);
  });

  it("waits for a tool that answers later, one call at a time and in the model's order", async () => {
    // A toolset over a database or a service (the Tidewell data chat, 11-16): `run` returns a promise.
    const order: string[] = [];
    const slow: ChatToolset<null> = {
      definitions: [],
      async run(name) {
        order.push(`start ${name}`);
        await new Promise((r) => setTimeout(r, name === "first" ? 15 : 0));
        order.push(`end ${name}`);
        return { ok: true, text: `rows of ${name}`, scope: name, link: null };
      },
      systemPrompt: () => "system",
      selectionNote: () => "note",
      selectionFrom: () => null,
      defaults: null,
    };
    const { client, sent } = scripted([
      reply(
        "tool_use",
        { type: "tool_use", id: "1", name: "first", input: {} },
        { type: "tool_use", id: "2", name: "second", input: {} },
      ),
      reply("end_turn", { type: "text", text: "Done." }),
    ]);
    const events: ChatEvent[] = [];
    await runChat({
      client,
      tools: slow,
      ctx: null,
      turns: [{ role: "user", content: "?" }],
      emit: (e) => events.push(e),
    });
    expect(order).toEqual([
      "start first",
      "end first",
      "start second",
      "end second",
    ]);
    expect(events.map((e) => e.type)).toEqual(["figures", "figures", "text"]);
    const results = sent[1]!.lastContent as Anthropic.ToolResultBlockParam[];
    expect(results.map((r) => [r.tool_use_id, r.content])).toEqual([
      ["1", "rows of first"],
      ["2", "rows of second"],
    ]);
  });
});
