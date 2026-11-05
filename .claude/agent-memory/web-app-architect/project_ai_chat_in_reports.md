---
name: ai-chat-in-reports
description: 2026-11-05 assessment of the owner's "AI chat in the two demo reports" idea + DuckDB-WASM brief; plan in .log/report, ten owner decisions pending
type: project
---

The owner's AI-chat-in-reports idea was assessed on 2026-11-05 (report: `.log/report/2026-11-05-ai-chat-in-reports-plan.md`). Nothing is built. Recommendation: Mirelo first, closed tools over the engine run in the browser, one streaming Node relay, Claude Haiku 5.5 primary / OVH gpt-oss-20b fallback, Power BI side = publish-to-web iframe + the site's own panel over the same `mirelo_demo` data. Rejected from the brief: Parquet in `public/`, DuckDB-WASM, text-to-SQL in the MVP, any Fabric capacity.

**Why:** the owner deferred the P&L chat on 2026-10-28 (PNL side) and revived the idea 11-05 with a brief that contradicts the 11-02 data rule; Copilot/Q&A/data agents are not reachable for anonymous visitors without F2 (≈ $321/mo West Europe) *and* signed-in licensed viewers.

**How to apply:** if the owner comes back with decisions 1–10 (report, pattern, model, the `ai` SDK dependency, Power BI option F, caps, logging, copy, PNL pack re-issue with `lib/chat/`, ADR-0005), build in the phase order of §6. Do not re-open DuckDB-WASM unless the owner overrides the data rule explicitly. The P&L's generic chat loop (`runner.ts`, `limits.ts`, 46 tests) exists upstream in rusloc/pnl `js-report/lib/chat/` and should be vendored, not rewritten.

**Expires:** 2027-01-05 (re-confirm whether the decisions were taken).
