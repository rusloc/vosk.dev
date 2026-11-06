# ADR-0005 — AI chat over the report engines: closed tools, run on the server

- **Status:** accepted 2026-11-06 (owner: "ok, start building"); tools, relay route and panel built and live 11-06
  (`27c6f68`); how it works: `docs/mirelo/ai-chat.md`. ACME Marketing's chat added 11-06 on the same loop and a shared
  route (`src/lib/chat/route.ts`), its own tools in `src/lib/marketing/chat-tools.ts`
- **Date:** 2026-11-06
- **Relates to:** the 11-02 data rule in `CLAUDE.md` (report data lives in Supabase, read by `<report>_reader`);
  `.log/report/2026-11-05-ai-chat-in-reports-plan.md` (assessment); `.log/report/2026-11-06-mirelo-chat-prototype.md`
  (setup, tools, flow)

## Context

The owner wants visitors to chat with the data of a public report, in both flavours: the custom JS report and the
Power BI one. The attached brief proposed Parquet in the build, DuckDB-WASM in the browser and LLM-written SQL. Three
facts decided against it:

- The report data lives in Supabase and does not ship in the build (11-02 rule).
- The JS reports already have an engine that defines and formats every figure. A second definition in SQL can disagree with
  the cards, and on a portfolio site a wrong number costs more than a missing answer.
- Microsoft's own chat (Copilot, Q&A, data agents) is not available to anonymous visitors of a published-to-web report
  at any sensible price (11-05 assessment, §3).

## Decision

1. **The model answers through a closed set of tools over the report engine** (Mirelo first: `report_snapshot`,
   `metric_trend`, `compare_markets`, `explain_metric`). A tool's arguments are the report's own state (view, market,
   closed months, comparator), validated with strict Zod schemas. Its result is the engine's view model as text, capped
   at 1,600 characters, so every figure is the string the card shows. **No free SQL, no text-to-SQL.**
2. **The tools run on the server**, in the relay route, on an engine built from the report's `<report>_reader` through
   the existing loader (`readArtifact` → `jsonSource` → `createSalesLoader`). They do not run in the browser, as the 11-05
   plan proposed. Each question is one request; a client cannot forge a tool result; the panel beside the Power BI
   iframe needs no dataset download.
3. **One relay route per report** (`POST /api/chat/<report>`, Node runtime, streamed). It holds the LLM key (server-only
   env) and enforces the caps: request schema, per-IP rate limit, at most 4 tool calls and 3 model calls per question,
   a daily soft cap, a kill switch, and a hard monthly limit in the provider console.
4. **The Power BI flavour gets the site's own panel beside its iframe**, answering from the same data. The panel never
   claims to be Microsoft's chat.
5. **The tool module is framework-free and SDK-free** (`chat-tools.ts`): the definitions come from the same schemas as
   the validation (`z.toJSONSchema`), so the model and the validator never disagree.

## Consequences

- The chat answers only what the tools cover. That is deliberate; a new question type is a new tool with tests.
- A cold server instance reads the report's base artifacts once (≈ 1.2 s for Mirelo, measured 11-03), then serves from memory.
- A second report adds one tool file and one route; the panel, the caps and the loop are shared.
- No message text is logged; the log line carries a hashed IP, tokens, cost, tool names and latency.
- Rejected: DuckDB-WASM + Parquet in `public/`, text-to-SQL, tools in the browser, Fabric capacity for Copilot, a
  self-hosted model VM.
