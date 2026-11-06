"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The AI chat inside its popup (ADR-0005, 11-06). The visitor asks anything; the answer streams from the report's
 * chat route as NDJSON (text deltas, a "figures" card per lookup, then done / error). Under each answer, the figures
 * it was built from and "Open in report": a page link with the report state in the query, which the page's web
 * report popup opens on arrival (ReportDialog `openOnQuery`). English only in v1; nothing is stored.
 */

type Figures = { scope: string; text: string; link: string | null };
type Message = {
  role: "user" | "assistant";
  content: string;
  figures: Figures[];
  failed?: boolean;
};
type Event =
  | { type: "text"; text: string }
  | ({ type: "figures" } & Figures)
  | { type: "error"; message: string }
  | { type: "done" };

const NOTE =
  "AI assistant · answers come from this report's data; the figures sit under each answer.";
const MAX_QUESTION = 1000;
const HISTORY = 10;

const STATUS_TEXT: Record<number, string> = {
  400: "That question couldn't be sent. Try rephrasing it.",
  413: "That question is too long. Try a shorter one.",
  429: "Too many questions for now. Please try again in a few minutes.",
  503: "The assistant is resting right now. Please try again later.",
};

export function ChatPanel({
  endpoint,
  suggestions,
}: {
  endpoint: string;
  suggestions: readonly string[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  /** Applies a change to the answer being written (always the last message). */
  const patchLast = (fn: (m: Message) => Message) =>
    setMessages((all) => [...all.slice(0, -1), fn(all[all.length - 1]!)]);

  async function ask(question: string) {
    const q = question.trim().slice(0, MAX_QUESTION);
    if (!q || busy) return;
    // The history the model sees: answered turns only, last ten, starting with a question.
    const history = [
      ...messages,
      { role: "user" as const, content: q, figures: [] },
    ]
      .filter((m) => !m.failed && m.content.trim())
      .slice(-HISTORY)
      .map(({ role, content }) => ({ role, content }));
    while (history[0]?.role === "assistant") history.shift();

    setMessages((all) => [
      ...all,
      { role: "user", content: q, figures: [] },
      { role: "assistant", content: "", figures: [] },
    ]);
    setInput("");
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;

    const failWith = (text: string) =>
      patchLast((m) => ({ ...m, content: text, failed: true }));
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        failWith(STATUS_TEXT[res.status] ?? STATUS_TEXT[503]!);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as Event;
          if (e.type === "text")
            patchLast((m) => ({ ...m, content: m.content + e.text }));
          else if (e.type === "figures")
            patchLast((m) => ({
              ...m,
              figures: [
                ...m.figures,
                { scope: e.scope, text: e.text, link: e.link },
              ],
            }));
          else if (e.type === "error") failWith(e.message);
        }
      }
    } catch {
      if (!controller.signal.aborted) failWith(STATUS_TEXT[503]!);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <p className="text-muted-foreground text-xs">{NOTE}</p>

        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm">
              Ask anything about this report, or start with one of these:
            </p>
            <div className="flex flex-col items-start gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="border-border hover:border-primary hover:text-primary cursor-pointer rounded-full border px-3 py-1.5 text-left text-sm transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="bg-primary max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap text-white">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={i} className="max-w-[95%] space-y-2">
              {m.content ? (
                <p
                  className={`text-sm leading-relaxed whitespace-pre-wrap ${m.failed ? "text-muted-foreground italic" : ""}`}
                >
                  {m.content}
                </p>
              ) : (
                busy &&
                i === messages.length - 1 && (
                  <p className="text-muted-foreground animate-pulse text-sm">
                    {m.figures.length
                      ? "Writing the answer…"
                      : "Looking at the report…"}
                  </p>
                )
              )}
              {m.figures.map((f, j) => (
                <details
                  key={j}
                  className="border-border bg-muted/40 rounded-md border text-xs"
                >
                  <summary className="cursor-pointer px-3 py-2 font-medium">
                    Figures · {f.scope}
                  </summary>
                  <pre className="overflow-x-auto px-3 pb-2 font-sans whitespace-pre-wrap">
                    {/* the first line repeats the scope already in the summary */}
                    {f.text.startsWith(f.scope)
                      ? f.text.slice(f.scope.length).trimStart()
                      : f.text}
                  </pre>
                  <a
                    href={`?${f.link || "view=overview"}`}
                    className="text-primary block px-3 pb-2 font-medium hover:underline"
                  >
                    Open in report →
                  </a>
                </details>
              ))}
            </div>
          ),
        )}
        <div ref={end} />
      </div>

      <form
        className="border-border flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(input);
            }
          }}
          maxLength={MAX_QUESTION}
          rows={2}
          placeholder="Ask about this report…"
          aria-label="Your question"
          className="border-border bg-background focus:border-primary min-h-0 flex-1 resize-none rounded-md border px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-primary h-10 shrink-0 cursor-pointer rounded-md px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
