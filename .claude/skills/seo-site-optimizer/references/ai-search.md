# AI Search & Answer Engine Visibility Reference

Being cited by AI Overviews, ChatGPT, Perplexity, Claude, and Copilot is a growing acquisition channel as classic SERP clicks shrink. Treat claims here with humility — this space moves monthly and vendors change behavior without notice; verify current bot behavior when it matters.

---

## The landscape

- **Google AI Overviews / AI Mode**: generated from Google's index using Gemini; sources drawn heavily (not exclusively) from top-ranking pages for the query and its fan-out subqueries. **Classic SEO is the qualifying round** — you generally can't be cited if you can't rank. No separate opt-in; `nosnippet`/`max-snippet` limit inclusion (and also your regular snippets).
- **ChatGPT (search)**: Bing index + OpenAI's own crawl (OAI-SearchBot for search surfacing; GPTBot for training). Being indexed in **Bing** matters here — verify in Bing Webmaster Tools, a step most teams skip.
- **Perplexity**: own crawler (PerplexityBot) + downstream indexes; strongly favors pages that answer crisply with citable statements, and recently-updated content.
- **Claude**: ClaudeBot (training) / Claude-User & Claude-SearchBot (user-triggered fetch/search).

Key technical fact: **most of these crawlers execute little or no JavaScript.** Server-rendered HTML is even more mandatory for AI visibility than for Google. If `curl` doesn't show your content, AI engines mostly can't cite it.

## Crawler policy decision

Make an explicit robots.txt decision per bot class — don't inherit a default:

| Bot | Purpose | Blocking means |
|---|---|---|
| `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended` | Model **training** | Content excluded from future training; no effect on current citations |
| `OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot` | **Search/answer surfacing** | You disappear from that engine's citations |
| `Claude-User`, `ChatGPT-User` | Live user-requested fetch | User-initiated retrieval of your page fails |

For a startup marketing site, the usual right answer is: allow everything (visibility > training concerns). For content businesses whose content *is* the product, training-bot blocking is a legitimate business decision — separate it from search-bot policy.

`llms.txt` (a proposed `/llms.txt` markdown index of your key pages for LLM consumption): low adoption by major providers so far, near-zero cost to add, occasionally consumed by smaller tools — fine to include, don't expect measurable impact.

## What gets cited (extractability engineering)

AI engines cite passages, not pages. Optimize the passage level:

- **Answer-first structure**: each H2 section opens with a 1–3 sentence direct, self-contained answer, then elaborates. A quotable sentence that stands alone without the surrounding context is what gets lifted.
- **Claims with attribution surface**: specific numbers, dates, named comparisons ("X costs $Y/mo vs Z's $W as of July 2026") are far more citable than vague prose — and they force the engine to cite *you* as the source of the datum.
- **Original data is the top currency**: benchmarks, surveys, and datasets you produced get cited because the engine has nowhere else to source the fact.
- **Definitional ownership**: a clean "X is …" definition paragraph for terms in your niche wins the "what is X" answer slot across engines.
- **Tables and structured comparisons** extract cleanly.
- **Freshness with honest dateModified** — Perplexity in particular skews recent.
- **Consistent entity footprint**: your brand described consistently across your site, LinkedIn/Crunchbase/GitHub/Wikipedia-if-warranted, schema.org `Organization` + `sameAs` — models resolve entities across sources; inconsistency dilutes.
- **Third-party corroboration**: LLM answers for "best X" lean heavily on listicles, review sites, Reddit, and comparison content in their index. Being present (legitimately — real reviews, real community participation, pitching real inclusions) in the sources engines synthesize from often does more than on-site tweaks. Astroturfing Reddit is both against Reddit's rules and increasingly detected; don't.

## Measurement

- Referrer-based analytics: segment traffic from `chat.openai.com`/`chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`. Note AI-driven visits are undercounted (answers without clicks) — treat as a floor.
- Log-file monitoring of AI-bot crawl activity (are they even fetching you?).
- Prompt sampling: periodically run your money queries through the major engines, record citation presence — manual or via the growing tool category (Profound, Peec, etc.). Keep it simple: a spreadsheet of 20 queries × 4 engines monthly reveals the trend.
- GSC now attributes AI Overview appearances within the normal Performance report (impressions/clicks include AIO) — you can't fully isolate them, but watch for pages with rising impressions + falling CTR: the AIO-absorbed pattern. Response: strengthen the parts an answer box can't replace (tools, data, depth) and target being the citation.
