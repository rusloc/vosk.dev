# ACME Trucks: the web report and its chat

The "Truck time utilization" custom JS report behind the **Web report** and **Ask AI** buttons of
`/work/mining-time-utilization`, beside its Power BI flavour. Added 2026-11-09 from the pack in
`C:\__PBI\PNL\.sync\acme-trucks\js-app`; its README is [`pack-readme-2026-11-09.md`](pack-readme-2026-11-09.md).

## Where it lives

| Path | What |
|---|---|
| `src/lib/trucks/engine/`, `data/` | The pack's engine and data contract. `loader.ts` gained the source seam (Parquet or `/api/trucks`) |
| `src/components/trucks/` | The UI. `trucks.css` is the pack's stylesheet nested under `.acme-trucks` |
| `data/trucks/parquet/` | The pack's data, the loader's input. **Real operating figures**, aggregated, under anonymised names (pack README) |
| `data/trucks/sql/` | Schema `trucks_demo`, roles `trucks_loader` and `trucks_reader` |
| `scripts/trucks-load.ts` | Loads the Parquet into `trucks_demo` and verifies every artifact against it |
| `src/app/api/trucks/[...path]`, `src/app/api/chat/trucks` | The data route and the chat route |
| `src/lib/trucks/chat-metrics.ts`, `chat-tools.ts` | The metric catalogue (40 metrics) and five closed tools |
| `data/trucks/checks/` | `trucks-pinned.csv` (from the pack) and `chat-golden.csv` (the chat's answer key) |

The web button shows once `TRUCKS_DATABASE_URL` is set at build (Session pooler, port 5432). Until then the page shows
the Power BI button only.

## The chat

Five tools over the report's own engine: `report_snapshot`, `time_structure`, `biggest_gaps`, `get_metric` (optionally
split by office, week, work type or loader) and `explain_metric`. The figures are strings the report formats, so the
model quotes and never computes. The tool results, aggregated figures from this report, go to the LLM provider.

Hours (`<row>_hours`) are marked derived: no tile or table cell shows them. Under Weighted they are a bucket-volume
weighted average per loader, under Linear a plain sum.

## The answer key

The expected values come from the Power BI model (the pack's parity file), never from the JS engine.

| Level | What | Where |
|---|---|---|
| 1. numbers | every WF / KPI / HRS figure the catalogue can read, across the seven selections the shipped data answers, plus 51 golden questions | `chat-metrics.test.ts`, in `pnpm test` |
| 2. the model | each golden question through the real chat loop | `scripts/chat-eval.ts trucks`, by hand |

Re-freeze the key after a data re-issue with `node --import tsx scripts/trucks-golden.ts`. "Which loss is furthest from plan?" is a ranking, so `biggest_gaps` is
covered by `chat-tools.test.ts`, not by a golden figure.

## Differences from the pack

Fonts come from the site's shared `next/font` modules. The stylesheet is scoped, the board sits in `ReportBoard`
(`fill`), the tooltip divides by the board's scale, and the app's CSP and iframe embedding are not used: it is a client
component in the site's popup, like the other reports. The six parity tests the pack skips stay skipped here.
