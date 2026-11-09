# P&L "Ask AI": how the chat works

The AI chat in the management P&L web report (`/work/pnl-suite`), built 2026-11-09 on the Mirelo recipe
([`../mirelo/ai-chat.md`](../mirelo/ai-chat.md) explains the loop, the panel, the limits and the cost; nothing of that
changed). The decision is [ADR-0005](../architecture/decisions/ADR-0005-ai-chat-over-report-engines.md). The list of
what finance executives ask, and what the chat answers, is `.log/report/2026-11-09-pnl-exec-metrics.md`.

## What is different from Mirelo and ACME Marketing

- **The data is a P&L**, so the chat's unit of answer is a statement line or a ratio, for a company, a period, a base
  version and a currency, compared with Budget, latest estimate or prior year. Amounts are signed as the statement
  (costs negative) and a positive change is favourable on every line; the prompt tells the model to say "the cost grew"
  when a signed value fell.
- **Five tools** (`src/lib/pnl/chat-tools.ts`), all over the report's own engine and the metric catalogue:

  | Tool | Answers | From |
  |---|---|---|
  | `report_snapshot` | the Vitals of one company (net revenue, adj. EBITDA, operating profit, gross margin %, opex %, the five drivers, the FY outlook), each with its Δ vs Budget and prior year and its status; for the Group, the key statement lines | `engine.vitals` |
  | `statement` | chosen statement lines (default the eight key ones) with Budget, prior year, latest estimate and the FY outlook | the catalogue |
  | `get_metric` | 1–4 catalogue metrics for a company, period, base, currency, FX basis, one slice member, or a breakdown `by` region / channel / line / segment; value, each comparator with its change, status vs Budget, formula | `src/lib/pnl/chat-metrics.ts` |
  | `top_variances` | the largest variances of one company vs Budget / LE / PY, leaf line by leaf line, with FX share and the allocation flag, optionally within one slice member | `engine.variances` |
  | `explain_metric` | formula, companies, cuts, comparators and where the report shows it | the catalogue |

- **The report state** sent with each question is the P&L's own query string (`selection-schema.ts`: company, fiscal
  year, month, time view, base, comparators, slices, currency, FX basis, view), up to 600 characters. The chat reads it
  through the same codec as the report, so a figures card's "Show in the report" link applies in place.
- **The Group** is answered at statement-line level only (the engine's Group view and slices are not built in Track C);
  a question about a Group slice or driver is refused with the reason.
- **The engine on the server** is built from the same JSON chunks the browser reads (`/api/pnl`, `pnl_reader`), both
  companies, once per instance (≈ 3 MB of columns; a cold start reads 19 chunks).
- **The button** sits in the P&L's toolbar before "Copy link", in the Ledger palette: the toolbar's 36 px buttons with
  8 px corners, the glow and the sparkle in the company colour (`--acc-rgb`, `theme.ts`) instead of red and orange
  (`ask-ai.module.css` `.pnl`). The showcase page's Ask AI opens the web report with the chat up, as for the other two.

## The metric catalogue and the answer key

`src/lib/pnl/chat-metrics.ts` lists **61 metrics**: the 23 statement lines and 6 ratio rows of the spine, 8 cost ratios
(opex %, gross-to-net %, cost of revenue / variable selling / S&M / R&D / G&A % of NR, A&P % of NR), 3 growth figures
(reported, organic at constant currency, EBITDA), 10 drivers (units, NR per unit, A&P spend; GMV, take rate, active
merchants, GMV per merchant, ARR run-rate, subscriptions and payments share), 6 FY outlook figures (LE, Budget and
attainment of net revenue and EBITDA), 3 FX effects and 3 shares of the company total. Each has an id, a name, other
names (EN + RU), the formula in words, the companies and cuts it exists for, which comparators make sense and whether
it is **derived** (on no card or statement row; the answer says so). The catalogue (ids, names, companies) is in the
cached system prompt (≈ 9k characters with the slice members).

Every value comes from the engine's own scans (`slices.ts`, `aggregate.ts`, `spine.ts`): the same translation per
month × currency, the same version plans (an actual base drops months after the last close; comparators cover exactly
the base months; the LE is actuals plus the latest forecast; prior year is the same months a year earlier), the same
allocation of lines below contribution margin by net-revenue share under a channel / line / segment cut, the same
consolidation for the Group.

**The answer key** keeps the chat honest; visitors do not see it:

| Level | What | Where | Cost |
|---|---|---|---|
| 1. numbers | the generator's 552 control totals (P / S / Group × Actual / Budget / LE × 4 windows × 23 lines) read through the catalogue, within $0.01; and 63 golden rows for what they do not carry (EUR / GBP, constant currency, MTD / QTD / LTM, slices and their allocation, Budget / PY / LE columns, drivers, FY outlook, the Group, shares, five traps that must read n/a), computed by `scripts/pnl-golden.ts` with plain loops over the Parquet written from the data contract, not from the engine | `src/lib/pnl/chat-metrics.test.ts`; `data/pnl/checks/chat-golden.csv` | free, in `pnpm test` |
| 2. the model | every golden question through the real chat loop; passes when the answer quotes the expected figure as the report formats it (a right figure reached through a synonym id is flagged, not failed) | `scripts/chat-eval.ts pnl` → `.log/report/<day>-chat-eval-pnl.md` | ≈ $0.001 a question, run by hand |

Adding a metric: a definition in `chat-metrics.ts`, its formula in `scripts/pnl-golden.ts` with a question row, re-run
the script to freeze `chat-golden.csv`, then both levels. Once `pnl_demo` holds the rows, the same questions can be
re-run as SQL over its lookup tables (`dict_code`, `dim_month`, `dim_account`, `dim_region`, `fact_fx_rate`).

## Environment

| Variable | Role |
|---|---|
| `PNL_DATABASE_URL` | the `pnl_reader` connection the data route and the chat read through (Session pooler, port 5432); without it the page shows no web report and no chat |
| `CHAT_ENABLED`, `CHAT_LLM_API_KEY`, `CHAT_DAILY_CAP_USD`, `CHAT_IP_HASH_SALT` | as for the other chats; `/api/chat/pnl` keeps its own daily cap, so three chats can spend up to 3 × the cap a day |
