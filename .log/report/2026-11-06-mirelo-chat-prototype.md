# Mirelo AI chat — prototype setup, tools, flow

- **Date:** 2026-11-06 · **For:** the owner · **Builds on:** `.log/report/2026-11-05-ai-chat-in-reports-plan.md` (archi, 11-05)
- **Status:** step 1 built 10:43; **step 2 built 11:20** (route `/api/chat/mirelo`, loop `src/lib/chat/run-chat.ts`, the Ask AI button + chat popup on the Mirelo page, behind `CHAT_ENABLED`), verified end to end locally. Owner's request 11:08 changed §4: the chat has **its own glowing button and popup**, not a panel inside the report popup; it asks with the report defaults as context. Steps 3 (beside Power BI) and 4 (hardening) open.
- **Changes from the 11-05 plan:** the tools run **on the server**, not in the browser. The one dependency is the
  official LLM SDK, not the Vercel AI SDK. `temperature` is dropped: the chosen model rejects it. The panel copy loses
  "synthetic" (owner's rule, 11-05).

## 1. What the spike showed (10:40)

The engine's view models are already the tool output. Every figure is formatted by the report itself, so the model
never does arithmetic. A view snapshot (KPI cards with both comparators, plus the view's table) measured:

| View | Characters | Example line |
|---|---|---|
| Overview | 543 | `Loans issued: 24.4k (€9.6m) · vs Budget ▲ +0.4% · vs PY ▲ +15.2%` |
| Loans | 839 | `Approval rate: 53.8% · vs PY ▲ +1.3pp` + agent leaderboard top 6 |
| Clients | 804 | `New clients: 9,796` + acquisition by channel (4 rows) |
| Portfolio | 849 | `30+ DPD %: 4.6%` + overdue by product (5 rows) |
| Revenue | 745 | `Revenue: €1.3m · vs Budget ▼ −3.2% · vs PY ▲ +28.3%` + stream × market |

All five are under the 1,600-character cap per tool result. Closed months run Jan 2024 → Sep 2026. The URL codec gives the
"Open in report" link for free (`view=revenue&market=pl&cmp=py`).

## 2. Setup

| Piece | Choice | Why |
|---|---|---|
| Model | **Claude Haiku 5.5** (`claude-haiku-5-5`), $0.10 in / $0.50 out per 1M tokens (prompts ≤ 100k) | Strong tool calling at the lowest price; ≈ $0.0006 a turn (4.3k in + 260 out), ≈ $2 a month at 3,000 turns. |
| Model settings | `output_config.effort: "low"`, `max_tokens` 400, no `temperature` (a non-default value is a 400 on this model), no prefill | Chat-shaped work; low effort = fewer, tighter tool calls. |
| Dependency | **`@anthropic-ai/sdk`**, exact version pinned at the build | The official SDK: typed streaming, tool-use blocks, typed errors. Needs the owner's yes (stack rule). |
| Where tools run | **Server**, in the route: the engine is built from `mirelo_reader` through the existing `readArtifact` → `jsonSource` → `createSalesLoader` → `createSalesEngine`, cached per instance | One POST per question; tool results can't be forged by the client; the Power BI popup needs no dataset download. Cost: a cold instance reads the 10 base artifacts once (≈ 1.2 s, measured 11-03). |
| Route | `POST /api/chat/mirelo`, `runtime = "nodejs"`, `maxDuration = 60`, streams SSE | Same shape as the report routes. |
| Env (Vercel, server-only; the owner sets them) | `CHAT_LLM_API_KEY`, `CHAT_ENABLED` (kill switch), `CHAT_DAILY_CAP_USD` (soft cap, default 0.50) | No `NEXT_PUBLIC_`; the agent never reads `.env*`. |
| Hard cap | **$10 / month spend limit in the provider console** | The only control traffic can't get round. Owner's step. |

## 3. Tools (4, closed set, strict schemas)

Arguments are the report's own state, validated with Zod `.strict()`. Unknown values are rejected with a readable reason.

| Tool | Arguments | Returns | Covers |
|---|---|---|---|
| `report_snapshot` | `view` (overview · loans · clients · portfolio · revenue), `market` (ALL · PL · RO · PT), `from`, `to` (YYYY-MM, closed months), `cmp` (BUD · PY) | That view's KPI cards (value, vs Budget, vs PY, status) + its table's top 6 rows + the link | Most questions: "how did revenue do in Q3?", "best agent last month?" |
| `metric_trend` | `metric` (a card id from the catalogue), `market`, `months` (≤ 13, ending at `to`) | One line per month: value and both comparators | "How did approval rate move this year?" |
| `compare_markets` | `view`, `from`, `to`, `cmp` | The view's KPI cards for PL, RO and PT side by side | "Which market grew most vs last year?" |
| `explain_metric` | `metric` | The card's ⓘ text: what it is, why it matters, the formula | "What is roll rate 30→60?" |

The system prompt carries the catalogue (views → card ids and labels, markets, the closed range, the comparators;
≈ 600 tokens) and the rules: answer only from tool results, quote the figures as given, say which period, market and
comparator the answer covers, one short paragraph, decline off-topic questions in one sentence.

## 4. Flow of one question

```
visitor types ─► panel ─ POST {messages ≤ 10, sel?} ─► /api/chat/mirelo
                                                        │ validate · rate limit · kill switch · daily cap
                                                        │ engine (cached) + system prompt + 4 tools
                                                        ▼
                                              LLM (stream) ── tool_use ──► engine tool (ms, server)
                                                   ▲                          │
                                                   └──── tool_result ◄────────┤── SSE "figures" ─► panel card
                                                        ≤ 4 tool calls, ≤ 3 model calls
                                              final text ── SSE "text" ─► panel (streams)
                                              usage ─► log line (hashed IP, tokens, cost, tools, ms; no text)
```

- `sel` is the report's current state; a question with no period ("how are we doing?") defaults to what the visitor
  is looking at.
- The panel shows the streamed answer, under it a **figures card** (the tool result as the model saw it, with the
  period, market and comparator echoed) and **Open in report**. In the web popup that link sets the board's state; on
  the Power BI popup it opens the web report in that state (the iframe can't be driven).
- States: streaming, busy (429), resting for the day (503), off-topic, error.

## 5. Prototype steps

| Step | What | Needs | Days |
|---|---|---|---|
| 1 | `src/lib/mirelo/chat-tools.ts`: the 4 tools, the catalogue, Zod arguments, comparator labels; tests over the Parquet (every output equals the engine's view; caps hold) | nothing (no dependency, no key) | 1 |
| 2 | The route + the SDK loop + a panel in the web-report popup, behind `CHAT_ENABLED`; tried locally with the key in `.env.local`, then on a preview | owner: SDK yes, LLM key in `.env.local` and Vercel, $10 cap | 2–2.5 |
| 3 | The same panel beside the Power BI iframe | — | 0.5–1 |
| 4 | Hardening (hunter): oversized bodies, injected `system` role, tool-name spoofing, 429/503, mobile; a 30-minute abuse run on the preview | — | 1 |

## 6. Decisions left (down from 10)

1. **The SDK dependency** (`@anthropic-ai/sdk`, pinned). Default: yes.
2. **Model + caps:** Haiku 5.5, $10/month hard cap, $0.50/day soft cap. Default: yes.
3. **Tools on the server** (this note) instead of in the browser (11-05 plan). Default: server.
4. **Panel copy:** "AI assistant · answers come from this report's data; the figures sit under each answer." No vendor
   or model name. English only in v1.

The rest take the 11-05 defaults: Mirelo first; Power BI = option F (the site's own panel beside the iframe, no Fabric
capacity); no question text in logs; ADR-0005 written with step 1. The 11-05 decision 9 (vendor the P&L chat loop)
drops: the SDK carries the loop.

## 7. Caveats

- The prompt prefix (≈ 1.5k tokens) may sit below the model's minimum cacheable length, so caching may not apply. At this
  price it doesn't matter (a turn costs well under a tenth of a cent either way).
- Haiku has no server-side refusal fallback; a `refusal` stop is answered with one fixed line.
- The price comes from the SDK reference cached 2026-10-06; re-check it on the provider page before setting the cap.
