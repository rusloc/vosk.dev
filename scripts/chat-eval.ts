import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { runChat } from "@/lib/chat/run-chat";
import type { ChatToolset } from "@/lib/chat/tools";
import { csvTable } from "@/lib/csv";
import { createMetricCatalogue, formatValue } from "@/lib/mirelo/chat-metrics";
import { createChatTools } from "@/lib/mirelo/chat-tools";
import { createSalesLoader, parquetSource } from "@/lib/mirelo/data";
import { createSalesEngine } from "@/lib/mirelo/index";
import { createChatTools as createMarketingTools } from "@/lib/marketing/chat-tools";
import { loadDataset as loadMarketingDataset } from "@/lib/marketing/test-utils/marketing-data";
import { formatValue as formatMarketingValue } from "@/lib/marketing/chat-metrics";
import { createChatTools as createPnlTools } from "@/lib/pnl/chat-tools";
import { formatValue as formatPnlValue } from "@/lib/pnl/chat-metrics";
import { loadPublicDataset as loadPnlDataset } from "@/lib/pnl/test-utils/public-data";

// The chat's answer key, level 2 (plan .log/report/2026-11-07-ai-chat-metrics-plan.md §2): every question of
// data/<report>/checks/chat-golden.csv goes through the real chat loop (the LLM + the report's tools over the local
// Parquet, the same rows as <report>_demo). A row passes when the answer quotes the expected figure as the report
// formats it and get_metric asked for that metric. Costs real tokens (≈ $0.001 a question); run by hand:
//
//     node --env-file=.env.local --import tsx scripts/chat-eval.ts mirelo        # all rows
//     node --env-file=.env.local --import tsx scripts/chat-eval.ts mirelo 10     # the first 10
//
// Needs CHAT_LLM_API_KEY in the environment. Never prints a value from .env.local. Writes the result table to
// .log/report/<today>-chat-eval-<report>.md and prints the pass rate.

const ROOT = new URL("../", import.meta.url);
const REPORT = process.argv[2] ?? "mirelo";
const LIMIT = Number(process.argv[3] ?? Infinity);
/** A trap row passes when the answer declines the figure (the wording varies; the phrasings seen so far). */
const NA =
  /n\/a|not available|isn.t available|isn.t reported|not reported|no data|not in the report|no approv|none|needs a window/i;

/** A report's tools with its selection type erased: the loop only passes the selection through. */
type AnyTools = ChatToolset<unknown>;

interface Report {
  dir: string;
  /** The tools, the defaults they take and a lookup of a metric's unit for formatting the expected figure. */
  load(): Promise<{
    tools: AnyTools;
    format(id: string, raw: number, key: string): string | null;
  }>;
}

const REPORTS: Record<string, Report> = {
  mirelo: {
    dir: "data/mirelo/",
    async load() {
      const DATA = new URL(this.dir, ROOT);
      const loader = createSalesLoader(
        parquetSource(async (name) => {
          const b = await readFile(
            fileURLToPath(new URL(`parquet/${name}`, DATA)),
          );
          return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
        }),
      );
      const engine = createSalesEngine(await loader.base());
      const cat = createMetricCatalogue(engine.cube, engine.metrics);
      return {
        tools: createChatTools(engine) as unknown as AnyTools,
        format: (id, raw) => {
          const unit = cat.byId.get(id)?.unit;
          return unit ? formatValue(unit, raw) : null;
        },
      };
    },
  },
  marketing: {
    dir: "data/marketing/",
    async load() {
      const tools = createMarketingTools(await loadMarketingDataset());
      return {
        tools: tools as unknown as AnyTools,
        format: (id, raw) => {
          const unit = tools.metrics.byId.get(id)?.unit;
          return unit ? formatMarketingValue(unit, raw) : null;
        },
      };
    },
  },
  pnl: {
    dir: "data/pnl/",
    async load() {
      const tools = createPnlTools(await loadPnlDataset(["P", "S"]));
      const symbol = (key: string) =>
        tools.catalogue.symbolOf(
          (key.split("|")[6] ?? "USD") as "USD" | "EUR" | "GBP",
        );
      return {
        tools: tools as unknown as AnyTools,
        format: (id, raw, key) => {
          const unit = tools.catalogue.byId.get(id)?.unit;
          return unit ? formatPnlValue(unit, raw, symbol(key)) : null;
        },
      };
    },
  },
};

async function main() {
  const report = REPORTS[REPORT];
  if (!report) {
    console.error(
      `Unknown report "${REPORT}" (${Object.keys(REPORTS).join(", ")}).`,
    );
    process.exit(1);
  }
  const key = process.env.CHAT_LLM_API_KEY;
  if (!key) {
    console.error("CHAT_LLM_API_KEY is not set (add it to .env.local).");
    process.exit(1);
  }

  const { tools, format } = await report.load();
  const client = new Anthropic({ apiKey: key, maxRetries: 2 });
  const rows = [
    ...csvTable(
      await readFile(
        fileURLToPath(new URL(`${report.dir}checks/chat-golden.csv`, ROOT)),
        "utf8",
      ),
      ["key", "expected", "question"],
      "chat-golden.csv",
    ),
  ].slice(0, LIMIT);

  const results: string[] = [];
  let passed = 0;
  let cost = 0;

  for (const [k = "", expected = "", question = ""] of rows) {
    const ref = k.split("|")[0] ?? "";
    const id = ref.replace(/^budget:/, "");
    const want = expected === "" ? null : format(id, Number(expected), k);
    let text = "";
    const asked: string[] = [];
    const usage = await runChat({
      client,
      tools: {
        ...tools,
        run(name, input, ctx) {
          if (name === "get_metric")
            asked.push(...((input as { metrics?: string[] }).metrics ?? []));
          return tools.run(name, input, ctx);
        },
      },
      ctx: tools.defaults,
      turns: [{ role: "user", content: question }],
      emit: (e) => {
        if (e.type === "text") text += e.text;
      },
    });
    cost += usage.costUsd;
    // Passes on the figure: a right figure reached through a synonym id (e.g. loans of returning clients via
    // repeat_loans) is a right answer; the ids column shows ⚠ when the expected id was not among them.
    const quoted = want === null ? NA.test(text) : text.includes(want);
    const ok = quoted;
    if (ok && !asked.includes(id)) asked.push("⚠ expected " + id);
    if (ok) passed++;
    results.push(
      `| ${ok ? "✅" : "❌"} | ${k} | ${want ?? "n/a"} | ${asked.join(", ") || "—"} | ${text.replace(/\s+/g, " ").replace(/\|/g, "/").slice(0, 300)} |`,
    );
    process.stdout.write(ok ? "." : "x");
  }

  const day = new Date().toISOString().slice(0, 10);
  const out = new URL(`.log/report/${day}-chat-eval-${REPORT}.md`, ROOT);
  await writeFile(
    fileURLToPath(out),
    [
      `# ${REPORT} chat eval, ${day}`,
      "",
      `${passed} / ${rows.length} passed · $${cost.toFixed(4)} · model per run-chat.ts · scripts/chat-eval.ts ${REPORT}`,
      "",
      "| | key | expected | get_metric ids | answer |",
      "|---|---|---|---|---|",
      ...results,
      "",
    ].join("\n"),
  );
  console.log(
    `\n${passed} / ${rows.length} passed, $${cost.toFixed(4)}; table in ${fileURLToPath(out)}`,
  );
}

void main();
