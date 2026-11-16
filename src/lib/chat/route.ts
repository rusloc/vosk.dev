import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { runChat } from "./run-chat";
import type { ChatEvent } from "./run-chat";
import type { ChatToolset } from "./tools";

/**
 * A report's AI chat route (ADR-0005), shared by /api/chat/mirelo and /api/chat/marketing (11-06). A visitor's
 * question goes to the LLM with the report's closed tools; the tools run here, on an engine built from the report's
 * reader connection (the same data as its /api/<report> route), and the answer streams back as NDJSON events: text
 * deltas, a "figures" card per lookup, then "done" or "error".
 *
 * Public and anonymous, so every limit is enforced here: a strict body schema, a per-IP rate limit, a cap on
 * questions in flight, a daily spend cap per instance and a kill switch (CHAT_ENABLED). Each route file calls this
 * once, so each report keeps its own counters (and Vercel runs each route as its own function anyway). The hard
 * monthly limit sits in the provider's console. The LLM key never leaves the server; no question text is logged.
 */

const MAX_BODY = 16_000; // characters
const MAX_PER_WINDOW = 20; // questions per IP per window
const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_FLIGHT = 4;

const fail = (status: number, error: string) =>
  Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );

export function chatRoute<C>({
  name,
  maxState,
  load,
  context,
}: {
  /** The report, for the log line. */
  name: string;
  /** The longest report state (query string) the browser may send. */
  maxState: number;
  /** Builds the report's tools over its reader connection; called once per instance, again after a failure. */
  load: () => Promise<ChatToolset<C>>;
  /**
   * For a chat with no report beside it (the Tidewell data chat, 11-16): the context its tools run in, built from the
   * request instead of a report state. `ip` keys a tool's own per-visitor limit; `questions` are the visitor's own
   * messages in this conversation. Neither is logged.
   */
  context?: (req: { ip: string; questions: readonly string[] }) => C;
}): (req: Request) => Promise<Response> {
  const body = z
    .object({
      messages: z
        .array(
          z.discriminatedUnion("role", [
            z
              .object({
                role: z.literal("user"),
                content: z.string().trim().min(1).max(1000),
              })
              .strict(),
            z
              .object({
                role: z.literal("assistant"),
                content: z.string().trim().min(1).max(4000),
              })
              .strict(),
          ]),
        )
        .min(1)
        .max(10),
      /** What the visitor is looking at in the web report: its query string ("view=revenue&market=pl"). */
      state: z.string().max(maxState).optional(),
    })
    .strict()
    .refine(
      (b) => b.messages.at(-1)?.role === "user",
      "the last message must be the visitor's",
    );

  // Best-effort, per instance, reset on a cold start (same shape as the data routes); the provider cap is the real wall.
  const hits = new Map<string, number[]>();
  let inFlight = 0;
  let spend = { day: "", usd: 0 };

  function isRateLimited(key: string, now: number): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    hits.set(key, recent);
    return recent.length > MAX_PER_WINDOW;
  }

  function spentToday(): number {
    const day = new Date().toISOString().slice(0, 10);
    if (spend.day !== day) spend = { day, usd: 0 };
    return spend.usd;
  }

  let tools: Promise<ChatToolset<C>> | undefined;
  /** The engine over the reader connection, built once per instance; a failed build is retried on the next question. */
  function chatTools(): Promise<ChatToolset<C>> {
    tools ??= load().catch((error: unknown) => {
      tools = undefined;
      throw error;
    });
    return tools;
  }

  return async function POST(req: Request) {
    const key = process.env.CHAT_LLM_API_KEY;
    if (process.env.CHAT_ENABLED !== "1" || !key) return fail(503, "off");

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip, Date.now())) return fail(429, "rate");
    if (spentToday() >= Number(process.env.CHAT_DAILY_CAP_USD ?? "0.5"))
      return fail(503, "paused");
    if (inFlight >= MAX_IN_FLIGHT) return fail(429, "busy");

    const raw = await req.text();
    if (raw.length > MAX_BODY) return fail(413, "too long");
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return fail(400, "bad request");
    }
    const parsed = body.safeParse(json);
    if (!parsed.success) return fail(400, "bad request");

    let ready: ChatToolset<C>;
    try {
      ready = await chatTools();
    } catch (error) {
      console.error(
        `chat ${name}: report data unavailable`,
        error instanceof Error ? error.message : "",
      );
      return fail(503, "data");
    }

    const client = new Anthropic({
      apiKey: key,
      maxRetries: 1,
      timeout: 45_000,
    });
    const ipHash = createHash("sha256")
      .update(`${process.env.CHAT_IP_HASH_SALT ?? ""}${ip}`)
      .digest("hex")
      .slice(0, 12);
    const started = Date.now();
    inFlight++;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (e: ChatEvent | { type: "done" }) => {
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
          } catch {
            // the visitor closed the chat; the loop stops on the aborted signal
          }
        };
        try {
          const usage = await runChat({
            client,
            tools: ready,
            ctx: context
              ? context({
                  ip,
                  questions: parsed.data.messages
                    .filter((m) => m.role === "user")
                    .map((m) => m.content),
                })
              : parsed.data.state === undefined
                ? ready.defaults
                : ready.selectionFrom(parsed.data.state),
            turns: parsed.data.messages,
            emit: send,
            signal: req.signal,
          });
          spend.usd += usage.costUsd;
          send({ type: "done" });
          // One line per question, no text and no raw IP.
          console.log(
            JSON.stringify({
              chat: name,
              ip: ipHash,
              ms: Date.now() - started,
              in: usage.inputTokens,
              out: usage.outputTokens,
              usd: Number(usage.costUsd.toFixed(5)),
              tools: usage.tools,
              calls: usage.modelCalls,
              stop: usage.stop,
            }),
          );
        } catch (error) {
          const status =
            error instanceof Anthropic.APIError ? error.status : undefined;
          console.error(
            JSON.stringify({
              chat: name,
              ip: ipHash,
              error:
                error instanceof Error ? error.constructor.name : "unknown",
              status,
            }),
          );
          send({
            type: "error",
            message:
              "The assistant is unavailable right now. Please try again later.",
          });
        } finally {
          inFlight--;
          try {
            controller.close();
          } catch {
            // already closed by the client
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  };
}
