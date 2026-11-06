import Anthropic from "@anthropic-ai/sdk";
import type { ChatTools } from "@/lib/mirelo/chat-tools";
import type { SalesSelection } from "@/lib/mirelo/types";

// One question, answered (ADR-0005): the LLM picks from the report's closed tools, the engine runs them on the
// server, the answer streams back. Caps per question: 3 model calls (the last with tools off), 4 tool calls,
// 1,024 output tokens per call. Events go to `emit` as they happen: text deltas, each tool result as a "figures"
// card, then the usage. Framework-free, so a script can run the same loop over the Parquet (the smoke test).

export const CHAT_MODEL = "claude-haiku-5-5";

const MAX_MODEL_CALLS = 3;
const MAX_TOOL_CALLS = 4;
const MAX_TOKENS = 1024;

// USD per token, prompts ≤ 100k tokens (the provider's price list, 2026-10): input, output, cache read, cache write.
const PRICE = {
  in: 0.1e-6,
  out: 0.5e-6,
  cacheRead: 0.01e-6,
  cacheWrite: 0.125e-6,
};

const REFUSAL_LINE =
  "I can't help with that. Ask me about this report's figures.";

export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "figures"; scope: string; text: string; link: string | null }
  | { type: "error"; message: string };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  tools: string[];
  modelCalls: number;
  stop: string | null;
}

export async function runChat({
  client,
  tools,
  ctx,
  turns,
  emit,
  signal,
}: {
  client: Anthropic;
  tools: ChatTools;
  ctx: SalesSelection;
  turns: readonly ChatTurn[];
  emit: (e: ChatEvent) => void;
  signal?: AbortSignal;
}): Promise<ChatUsage> {
  const messages: Anthropic.MessageParam[] = turns.map((t) => ({
    role: t.role,
    content: t.content,
  }));
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: tools.systemPrompt(),
      cache_control: { type: "ephemeral" },
    },
    { type: "text", text: tools.selectionNote(ctx) },
  ];
  const definitions = tools.definitions.map((d): Anthropic.Tool => ({
    name: d.name,
    description: d.description,
    input_schema: d.input_schema as Anthropic.Tool.InputSchema,
  }));
  const usage: ChatUsage = {
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    tools: [],
    modelCalls: 0,
    stop: null,
  };
  let toolCalls = 0;

  for (let call = 0; call < MAX_MODEL_CALLS; call++) {
    const last = call === MAX_MODEL_CALLS - 1 || toolCalls >= MAX_TOOL_CALLS;
    const stream = client.messages.stream(
      {
        model: CHAT_MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: "low" },
        system,
        tools: definitions,
        tool_choice: last ? { type: "none" } : { type: "auto" },
        messages,
      },
      { signal },
    );
    stream.on("text", (text) => emit({ type: "text", text }));
    const message = await stream.finalMessage();

    usage.modelCalls++;
    const u = message.usage;
    const cacheRead = u.cache_read_input_tokens ?? 0;
    const cacheWrite = u.cache_creation_input_tokens ?? 0;
    usage.inputTokens += u.input_tokens + cacheRead + cacheWrite;
    usage.outputTokens += u.output_tokens;
    usage.costUsd +=
      u.input_tokens * PRICE.in +
      u.output_tokens * PRICE.out +
      cacheRead * PRICE.cacheRead +
      cacheWrite * PRICE.cacheWrite;
    usage.stop = message.stop_reason;

    if (message.stop_reason === "refusal") {
      emit({ type: "text", text: REFUSAL_LINE });
      break;
    }
    if (message.stop_reason !== "tool_use") break;

    const uses = message.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    messages.push({ role: "assistant", content: message.content });
    messages.push({
      role: "user",
      content: uses.map((use): Anthropic.ToolResultBlockParam => {
        if (toolCalls >= MAX_TOOL_CALLS)
          return {
            type: "tool_result",
            tool_use_id: use.id,
            is_error: true,
            content:
              "No more lookups for this question; answer with what you have.",
          };
        toolCalls++;
        usage.tools.push(use.name);
        const r = tools.run(use.name, use.input, ctx);
        // a figures card for data only: a definition (explain_metric) has no scope
        if (r.ok && r.scope)
          emit({ type: "figures", scope: r.scope, text: r.text, link: r.link });
        return {
          type: "tool_result",
          tool_use_id: use.id,
          is_error: !r.ok,
          content: r.text,
        };
      }),
    });
  }
  return usage;
}
