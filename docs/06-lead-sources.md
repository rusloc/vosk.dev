# Lead Sources Catalog — Remote BI Opportunities

> **Reference appendix to [`05-lead-engine.md`](05-lead-engine.md)**, which is the single design doc.
> This file is *data*, not design: it says where leads come from and how to reach each source. It does
> not describe architecture, schema or hosting, so it cannot contradict the design doc — which is why
> it survives as a separate file rather than being folded in.
>
> Moved from the repo root on 2026-08-28. Previously `LEADS-SRC.md`.

> ## ⚠️ FULL SWEEP, 2026-08-28 — every source probed. 7 of 16 do not work.
>
> Every 🟢 in this file was originally catalogued from documentation, not from a request.
> **All 16 have now been asked for BI jobs and the results counted.** Seven failed. The three
> highest-density sources were all ranked too low, and the ATS sweep — #3 in the old build
> order — turns out to be the *weakest* option, not the third-best.
>
> ### Works, measured
>
> | Source | Access | Yield, measured | Notes |
> |---|---|---|---|
> | **Telegram** `t.me/s/{ch}` | keyless HTML | **`datajob` 20 posts → 5 BI (25%)** | **Best density found.** RU/KZ market, Russian-language. Paging via `?before=` verified: 0 overlap, IDs descend |
> | **HN "Who is hiring?"** | keyless, Algolia | **240 posts → 21 BI/month** | 2 requests per thread, whole tree in one ~450KB call |
> | **Himalayas** ✅ shipped | keyless API | 96k corpus, ~3% BI | No server-side search; page size hard-capped at 20 |
> | **Greenhouse** | keyless API | **1592 jobs / 6 boards → 12 BI (0.75%)** | Per-company; needs a curated slug list |
> | **Ashby** | keyless API | **1163 jobs / 5 boards → 11 BI (0.95%)** | Per-company; needs a curated slug list |
> | **Lever** | keyless API | 2 of 18 slugs live; 103 jobs → 1 BI | API fine, **slug discovery is the real cost** |
> | **Wellfound** | HTML only | data sits in `__NEXT_DATA__` | No API, no JSON-LD. ToS-sensitive, fragile |
> | **Adzuna** | **needs a key** | **not probed** | The one remaining unknown. User-gated |
>
> ### Broken — do not build
>
> | Source | Catalogued as | Actually, on 2026-08-28 |
> |---|---|---|
> | **hh.kz** | "anonymous search works for basics" | **403 on `/vacancies`** — needs a registered app. `/areas` and `/dictionaries` still 200, so the endpoint is gated, not the client |
> | **RemoteOK** | "filter tags `bi`" | Latest 100 jobs, no filtering. **100 postings → 0 BI** |
> | **Remotive** | "category=data" | **19-job sample; `category`/`search`/`q`/`limit` accepted and ignored.** 19 jobs → 1 BI |
> | **WeWorkRemotely** | "RSS per category" | **`remote-data-jobs.rss` 301s to itself — there is no Data category.** General feed is a ~10-per-category sample: **89 items → 0 BI** |
> | **Arbeitsagentur** | "free public API" | **403** with and without the documented `X-API-Key` |
> | **Upwork** | "Official API + RSS for saved searches" | **RSS returns HTTP 410 Gone**, serving a "404: Page Not Found" page. The public feed is retired |
> | **HN "Freelancer?"** | (my own hypothesis) | **Apr–Aug 2026: 102 posts, 2 seeking a freelancer, 0 BI.** Almost all are freelancers advertising themselves |
> | **Seek** | "structured crawling" | **308 permanent-redirect wall** on both the site and the internal search API — bot-blocked before any parsing question arises |
>
> **The lesson is about the test, not the sources.** Reachability (HTTP 200 + a big payload) is
> not usefulness — Remotive was recommended for Phase 1 on exactly that mistake and withdrawn one
> probe later; WeWorkRemotely repeated it verbatim months on. **Two traps recur and both return
> HTTP 200:** `t.me/s/{anything}` answers 200 for channels that do not exist (only `posts > 0`
> proves existence), and Telegram/HN postings *parse* far more reliably than they parse
> *correctly*. **Ask a source for BI jobs and count what comes back.**
>
> ### ⚠️ The finding that outranks the ranking
>
> **The two best sources — Telegram (25%) and HN (21/month) — are the two with no structured
> company field.** Everything with a clean `company` (Himalayas, Greenhouse, Ashby, Lever, Adzuna)
> is 1–3% BI density and skews permanent-FTE at large employers. So `enrich`'s
> `raw_payload._company_id` requirement is not an HN inconvenience — **it is a wall standing in
> front of the entire high-density half of the catalog.** Costing that change once buys both
> sources; skipping it forecloses both.

Target regions: US + Canada, Europe, Australia + NZ, Kazakhstan. Each source below: what it is, why it matters for BI leads, exactly how to access the data, and connector notes.

Access legend: 🟢 official API / feed · 🟡 structured but unofficial · 🔴 manual-assist only ·
**⛔ verified broken 2026-08-28**

---

## Tier 1 — Official APIs & Feeds

### 1. hh.kz / HeadHunter 🟢
- **Region:** Kazakhstan + CIS
- **What it is:** The dominant job board for KZ and the wider CIS market. Very active BI/analytics segment; postings often include salary ranges and direct employer contacts.
- **Why for you:** Easiest connector of all (real documented API), culturally close market, short sales cycles. Postings are mostly in Russian.
- **Access:**
  - Public REST API, docs at `api.hh.ru` (GitHub: `hhru/api`)
  - Anonymous search works for basic queries; register an app + OAuth for extended fields
  - Example: `GET https://api.hh.ru/vacancies?text=business intelligence OR power bi&area=40` (`area=40` = Kazakhstan)
  - Clean JSON: title, company, salary, description, published date
- **Connector notes:** Use `id` as `external_id` for idempotent upserts. Run daily. Pass Russian text straight to the LLM — it translates + extracts in one call.

### 2. Greenhouse job boards 🟢
- **Region:** US, EU, AU — thousands of companies
- **What it is:** ATS platform; companies host their careers page on it. The board content is exposed as public JSON per company.
- **Why for you:** One connector covers thousands of mid-size and startup employers who never post to aggregators. Remote flags included.
- **Access:**
  - No API key needed: `GET https://boards-api.greenhouse.io/v1/boards/{company_slug}/jobs?content=true`
  - Full description HTML, departments, offices, `location.name`
  - **Slug discovery:** seed the list via Google (`site:boards.greenhouse.io "business intelligence"`), job aggregators that link out to Greenhouse, or curated public lists of companies-by-ATS; grow it over time
- **Connector notes:** Store slugs in your `sources.metadata`. Sweep the slug list daily; new-job detection by posting `id`.
- **✅ Probed 2026-08-28 — the API works keylessly, exactly as described.** `stripe` 572 jobs, `cloudflare` 312, `gitlab` 219, `airbnb` 174, `figma` 162, `reddit` 153. Bad slugs 404 cleanly (`doordash`), so slug validity is cheap to test.
- **⚠️ But the yield is the problem: 1592 jobs across 6 boards produced 12 BI titles — 0.75%.** And they are large-employer permanent roles (`Data Analyst` at Stripe, `Senior Data Engineer` at Cloudflare). **This is the Himalayas viability problem in its most acute form** — the biggest sweep in the catalog for the least freelance-shaped output. Ranked #3 in the original build order; **it belongs far lower.**

### 3. Lever job boards 🟢
- **Region:** Same footprint as Greenhouse
- **What it is:** Another major ATS with public per-company JSON.
- **Access:**
  - `GET https://api.lever.co/v0/postings/{company_slug}?mode=json`
  - Fields: title, categories (team, location, commitment), description, apply URL
  - Same slug-discovery approach (`site:jobs.lever.co ...`)
- **Connector notes:** Share the sweep scheduler with the Greenhouse connector — same shape, different fetcher.
- **⚠️ Probed 2026-08-28: the API is alive but slug discovery is far harder than Greenhouse's.** Only **2 of 18** tried slugs resolved — `spotify` (89 jobs) and `matillion` (14). Everything else 404'd, including companies that plainly run Lever elsewhere. Worse, `lever` and `mistral` returned **HTTP 200 with an empty array**, so a 200 is not proof a slug is real. Combined BI yield across both live boards: **1**.
- **Consequence: Lever is the weakest of the three ATSes**, not an equal partner. Build it last inside the sweep family, if at all.

### 4. Ashby job boards 🟢
- **Region:** US/EU, skews to newer startups
- **What it is:** Fast-growing ATS; boards expose a posting API. Compensation ranges appear more often than on other ATSes.
- **Access:**
  - `GET https://api.ashbyhq.com/posting-api/job-board/{company_slug}` (JSON; a GraphQL surface also exists)
  - Includes `isRemote`, employment type, compensation when published
- **Connector notes:** Third member of the shared ATS-sweep connector family.
- **✅ Probed 2026-08-28 — works keylessly and is the best-behaved of the three.** `openai` 756 jobs, `ramp` 138, `notion` 132, `vanta` 108, `linear` 29. Unknown slugs return 200 with an empty `jobs` array rather than 404 (`deel`), so **treat empty-vs-missing as the same case**.
- **⚠️ Same yield problem as Greenhouse: 1163 jobs across 5 boards → 11 BI (0.95%).** If the ATS sweep gets built, **Ashby is the one to build first** — best slug behaviour, highest per-board volume.

### 5. RemoteOK 🟢
- **Region:** Global remote, US-heavy
- **What it is:** One of the largest remote-only boards. Every posting is remote by definition — zero location noise.
- **Access:**
  - Official JSON feed: `GET https://remoteok.com/api`
  - First array element is a legal/attribution notice — they require linking back to the posting; keep the URL in your lead record
  - Filter client-side by tags: `bi`, `analytics`, `data`, `sql`
- **Connector notes:** Full feed each fetch; dedupe by `id`. Heavy syndication overlap with WWR/ATS boards — your pgvector dedup earns its keep here.

### 6. WeWorkRemotely ⛔ **verified broken 2026-08-28**
- **Region:** Global remote
- **What it is:** Curated remote board; paid postings, so quality per posting is higher than aggregators.
- **Access:**
  - ~~RSS per category: `https://weworkremotely.com/categories/remote-data-jobs.rss`~~ — **301s to itself, an infinite redirect. There is no Data category.** The live category list is: Full-Stack / Back-End / Front-End Programming, DevOps and Sysadmin, Design, Product, Sales and Marketing, Management and Finance, Customer Support, All Other Remote.
  - General feed `https://weworkremotely.com/remote-jobs.rss` returns **200 and 89 items** — but that is a **~10-per-category sample, not the board**.
- **⛔ Probed 2026-08-28: 89 items, 0 genuine BI roles.** Two title matches were the *company* Databricks, not the stack; eleven full-text matches were all false positives (`CX Partner Manager`, `Director, GTM Finance`, `Customer Success Manager`) hit on description boilerplate.
- **The failure is the same one the box at the top of this file is about.** This entry was catalogued as 🟢 from documentation, survived the Phase 1 audit because nobody asked it for BI jobs, and was recommended as the keyless second connector on that basis. **It took one probe to disqualify.** Reachability is not usefulness.

### 7. Remotive 🟢
- **Region:** Global remote, EU-friendly
- **What it is:** Remote board with an explicit **candidate location restriction** field per posting.
- **Why for you:** That field maps directly onto your `hires_international` score — no LLM guessing needed for this source.
- **Access:**
  - Official API: `GET https://remotive.com/api/remote-jobs?category=data` (also `?search=business intelligence`)
  - JSON: title, company, `candidate_required_location`, salary when present, full description
- **Connector notes:** Treat `candidate_required_location` containing "Worldwide" / your regions as a scoring green flag at the connector level.

### 8. Himalayas 🟢
- **Region:** Global remote
- **What it is:** Remote job board with unusually structured company profiles (size, funding, tech stack).
- **Access:**
  - Public API: `https://himalayas.app/jobs/api` (paginated JSON)
  - Company profile data enriches your `companies` table for free
- **Connector notes:** Use it for both leads *and* company enrichment in one pass.

### 9. Adzuna 🟢
- **Region:** US, CA, AU, NZ, DE, NL, FR, PL, and more — one API, many countries
- **What it is:** Job aggregator with a proper developer API and salary data.
- **Why for you:** Single connector covers your AU/NZ + CA gap without building a Seek crawler on day one.
- **Access:**
  - Free API key at `developer.adzuna.com`
  - `GET https://api.adzuna.com/v1/api/jobs/{country}/search/1?app_id=...&app_key=...&what=business intelligence&where=remote`
  - Country codes per market: `us`, `ca`, `au`, `nz`, `de`, `nl`, `fr`, `pl`
  - Free tier is rate-limited — schedule country sweeps across the day
- **Connector notes:** Aggregated postings link out to the original board; store both URLs. Expect duplicates with everything else — dedup layer handles it.

### 10. Arbeitsagentur Jobsuche API 🟢
- **Region:** Germany
- **What it is:** Official German federal employment agency job board. Mittelstand postings that never reach LinkedIn or aggregators.
- **Why for you:** German mid-size companies pay well for BI contractors; API is free and official.
- **Access:**
  - Public API, community docs at GitHub `bundesAPI/jobsuche-api`
  - Keyword search endpoint; requires a static client-id header documented there
  - No reliable "remote" filter — filter description text for `remote|homeoffice|100% mobil`
- **Connector notes:** German-language postings; LLM translate+extract handles it. Score down office-attached postings hard.

### 11. Telegram channels 🟢
- **Region:** KZ/CIS primarily; some EU/global freelancer channels
- **What it is:** Active job/freelance channels where gigs are posted directly by decision-makers — often before (or instead of) any job board.
- **Why for you:** Direct-contact leads with no application funnel; KZ business culture runs on Telegram.
- **Access:**
  - ~~**Telethon** (MTProto, user session) to join and stream *public* channels~~ — **not needed.** See below.
  - Or Bot API if a bot is invited into a group
  - Regex prefilter before spending LLM tokens: `BI|Power BI|Tableau|аналитик|дашборд|хранилище`
- ~~**Connector notes:** Long-running listener process, not a cron job.~~ Store `channel_id:message_id` as `external_id`. Seed channels: KZ/RU analytics & vacancy channels, remote-work channels; grow the list as you see reposts.

**✅ Probed 2026-08-28 — and this entry was wrong in the direction that matters: it is a plain cron collector, not a listener.**

The public web preview `https://t.me/s/{channel}` returns rendered channel posts over ordinary HTTP with **no key, no session, no MTProto, and no always-on process** — which matters because `05-lead-engine.md` §2 rejects any worker box or container. The old note ("long-running listener process, not a cron job") would have demanded exactly the infrastructure the architecture exists to avoid. **It does not.**

Everything a collector needs is present and verified:

| Need | How | Verified |
|---|---|---|
| Posts | `<div class="tgme_widget_message_text">` | 20 per page |
| `external_id` | `data-post="datajob/2770"` | stable, monotonic |
| `url` | `https://t.me/{channel}/{id}` | permalink |
| `posted_at` | `<time datetime="…">` | ISO 8601 + TZ |
| Paging | `?before={oldest_id}` | **0 overlap, IDs descend** |

**Measured yield — the best in the catalog:**

| Channel | Posts | BI | BI + contract-ish |
|---|---|---|---|
| `datajob` | 20 | **5 (25%)** | 1 |
| `it_jobs_remote` | 20 | 2 | 0 |
| `datasciencejobs` | 19 | 1 | 1 |
| `analytics_jobs` | 20 | 0 | 0 |
| `analyst_job` | 2 | 0 | 0 |

Real postings, in Russian, from the KZ/RU market — `Data/BI analyst · 150 000 ₽ · Loyalty Labs`, `Data Engineer (DataLens / ClickHouse / BI Migration) · Cinimex`. **`enrich` already translates and sets `original_language`, so this needs no new enrichment work.**

**⚠️ Three caveats, all load-bearing:**
1. **`t.me/s/{anything}` returns HTTP 200 even for channels that do not exist** — `bi_jobs`, `data_jobs` and `getitjob` all answered 200 with zero posts. **Only `posts > 0` proves a channel is real.** Status code is worthless here, which is the file's own recurring lesson in a new place.
2. **Cadence is irregular.** `datajob`'s 20 most recent posts span 2026-07-27 → 2026-08-11, i.e. **nothing for 17 days** at time of probe. Good density, bursty supply — do not size a schedule assuming a steady feed.
3. **No structured company field**, same as HN. Blocked behind the same `enrich` change — see the box at the top of this file.

---

## Tier 2 — Structured Crawling (build second)

### 12. Seek (seek.com.au / seek.co.nz) 🟡
- **Region:** Australia + New Zealand
- **What it is:** The dominant AU/NZ job board; strong contractor day-rates for BI.
- **Why for you:** Your timezone overlaps AU/NZ mornings — a genuine selling point worth surfacing in outreach.
- **Access:**
  - No public API
  - Server-rendered pages embed structured JSON (`window.SEEK_REDUX_DATA` / JSON-LD job postings)
  - Search URL params: keyword + `?worktype=...&where=Remote`
  - Crawl politely: low rate, off-peak AU time, honest user agent, respect robots.txt, cache pages
- **Connector notes:** Build after Adzuna proves AU/NZ demand — Adzuna may cover enough of this market to skip Seek entirely.
- **⛔ Probed 2026-08-28: unreachable before any parsing question arises.** Both `https://www.seek.com.au/business-intelligence-jobs` and the internal `chalice-search/v4` endpoint return **HTTP 308 with a redirect that does not resolve** — a bot wall, not a moved page. Following it lands on the same 308.
- **So the "server-rendered pages embed structured JSON" plan is untestable, let alone buildable.** The entry above describes markup nobody here has ever been served. **Adzuna is now the only route to AU/NZ**, which raises the cost of it staying unprobed.

### 13. Company career pages 🟡
- **Region:** Any
- **What it is:** Direct crawling of career pages for companies already in your `companies` table (or a curated target list).
- **Why for you:** Cleanest legal ground — their own public website. Catches companies not on any ATS or board.
- **Access:**
  - Discovery: sitemap.xml → URLs matching `/careers|/jobs|/karriere|/vacancies`
  - Playwright for JS-rendered pages
  - **No per-site parsers:** feed raw page text to the LLM, let it extract postings — this is what makes the connector generic
- **Connector notes:** Weekly sweep is enough. Store a page-content hash to skip unchanged pages and save LLM calls.

### 14. Hacker News "Who is hiring?" + YC Work at a Startup 🟡 **probed 2026-08-28 — works**
- **Region:** US-heavy startups
- **What it is:** Monthly HN mega-thread of direct founder/team postings; YC's own job board.
- **Why for you:** Founders answer DMs; contract arrangements are normal; postings state remote/timezone policy explicitly.
- **Access:**
  - **Algolia, not Firebase, for discovery** — `search_by_date?tags=story,author_whoishiring` returns the monthly threads newest-first in one call. `hn.algolia.com/api/v1/items/{id}` then returns the entire comment tree in a single ~450KB response, so a thread costs **two requests, no paging, no key**.
  - ⚠️ Plain `search?query=…` sorts by *relevance* and returns threads from 2013–2016. Use `search_by_date`.
  - YC Work at a Startup: public structured pages, crawl politely
- **✅ Measured on Aug 2026 (`49156683`): 240 top-level postings, 21 BI keyword hits, 23 contract-ish, 1 both.** That is roughly 3× the BI volume Himalayas has produced, at monthly cadence.
- **⚠️ There is no structured company field, and the pipe convention cannot be trusted to supply one.** Of the 21 BI postings, 20 split into ≥2 fields on `|` — but `Data analyst | Chicago, IL or Washington DC only` leads with the **role**, and `Snout  https://snout.com/ | …` glues the URL into field 0. A splitter cannot tell those from a real company, so it writes a junk `companies` row instead of erroring. **95% "parse rate" is not 95% correct.**
- **Consequence for the build order: this connector needs `enrich` to name the company**, since `persist()` currently hard-requires `raw_payload._company_id` from the collector. That is a Phase 2 contract change, not just a new connector — cost it accordingly.

### 14b. HN "Freelancer? Seeking freelancer?" ⛔ **verified dead 2026-08-28**
The monthly thread still exists (`author_whoishiring`, posted alongside the other two), and on paper it is the perfect source: contract work by construction, keyless, same API.

**It is empty. Five months sampled — Apr–Aug 2026: 102 posts, of which 2 were SEEKING FREELANCER, of which 0 were BI.** Almost every post is a freelancer advertising *themselves*, which is the opposite side of the market. Recorded so nobody rediscovers it — the hypothesis was reasonable and the data killed it.

### 15. Wellfound (ex-AngelList Talent) 🟡
- **Region:** US/EU startups
- **What it is:** Startup job board showing salary/equity ranges and remote filters.
- **Access:**
  - No public API; logged-in scraping violates ToS
  - Use logged-out public listing pages only, conservatively — or treat as manual-assist
- **Connector notes:** Low priority; the ATS connectors already reach most of these companies.
- **⚠️ Probed 2026-08-28: reachable, but only as HTML.** `/role/r/data-analyst` returns 200 and ~490KB. The job data is in the Next.js `__NEXT_DATA__` hydration payload — **no JSON-LD, no `JobPosting` schema**, so any connector is parsing a private client-side blob whose shape can change without notice. The "low priority" call stands, and the ToS caution above is the deciding factor, not the tech.

### 16. Upwork ⛔ **RSS verified retired 2026-08-28**
- **Region:** Global
- **What it is:** Freelance marketplace. Use it as a *signal source*: companies repeatedly posting BI gigs also hire off-platform.
- **Access:**
  - ~~Official API + RSS feeds for saved searches~~ — **`/ab/feed/jobs/rss` returns HTTP 410 Gone**, serving a page titled "404: Page Not Found". 410 is deliberate: the feed was removed, not moved. The undocumented `api/profiles/v1/search/jobs.json` 404s too.
  - What remains is the **official partner API, which requires an approved application** — a heavier gate than "requires an account".
- **⚠️ This one stings more than the other failures**, because Upwork is the only catalogued source whose postings are *contract by construction* — precisely the gap Phase 2 exposed. Its retirement is why no source in this file currently solves the freelance-vs-FTE problem outright, and why Adzuna's `contract_time` filter carries so much weight.
- **Connector notes:** If the partner API is ever approved, feed postings into the same pipeline but tag the company "hires freelancers" — that flag boosts the score of any *other* lead from the same company.

---

## Tier 3 — Manual-Assist Only (agent enriches, never scrapes)

### 17. LinkedIn 🔴
- **Why not automated:** ToS explicitly prohibits scraping; aggressive bot detection; litigation precedent. Not worth your account or the legal exposure.
- **Workflow instead:**
  1. Create LinkedIn **job alerts** (BI + remote + your regions) delivered to a dedicated mailbox
  2. A small IMAP parser reads that mailbox and feeds postings into the normal pipeline — technically an email connector, fully compliant
  3. Interesting posts/profiles you see while browsing: paste into a "quick add" box in your UI → Claude enriches + scores like any other lead

### 18. Facebook groups 🔴
- **Why not automated:** Same ToS problem; groups are login-walled.
- **Workflow instead:** Manual paste-in via the quick-add box. If a group is consistently valuable, check whether the same postings appear on an accessible channel (many cross-post to Telegram).

### 19. Yellow pages / business registries 🔴
- **Why not a lead source:** A directory listing carries no hiring signal.
- **Workflow instead:** Enrichment only — once a company becomes a lead, the worker looks up size, industry, website, and locale data to fill the `companies` row and sharpen scoring.

---

## Keyword Set (all connectors)

- **English:** business intelligence, BI analyst, BI developer, Power BI, Tableau, Qlik, Looker, data analyst, analytics engineer, dbt, Snowflake, DWH, data warehouse
- **Russian (hh.kz, Telegram):** аналитик, BI-аналитик, дашборд, хранилище данных, Power BI
- **German (Arbeitsagentur):** Datenanalyst, Business Intelligence, Berichtswesen, Datenbanken

## Suggested Build Order

**Revised 2026-08-28 against what the APIs actually return.** The original order is kept below it,
struck through, because the reason it changed is worth more than the order itself.

**Re-revised 2026-08-28 after the full sweep.** Density beat coverage; the order below is sorted by
measured BI-per-request, not by how official the source looks.

1. ✅ **Himalayas — shipped as Phase 1.** The only keyless source with a real corpus (96k+) and
   working pagination. No server-side search, so the collector pages newest-first and
   keyword-filters itself; a run scans 200 postings and stops early once it catches up.
2. **Adzuna** — still the highest-value next connector, and now for a sharper reason. It is the only
   remaining candidate with genuine multi-country **search**, it covers US/CA/AU/NZ/DE/NL/FR/PL, and
   after Seek's bot wall it is **the only route to AU/NZ that exists**. It also has the catalog's only
   surviving `contract_time` filter. **Needs a free API key (user-gated) and is the last unprobed
   source in this file** — probe before building, per every lesson above.
3. **Telegram + HN, as one decision.** Both are keyless, both are cron-shaped, both beat everything
   else on density (25% and 21/month), and **both are blocked behind the same `enrich` change** —
   `raw_payload._company_id` must become optional so the model names the company. Pay that cost once,
   get both. Telegram first: higher density and the only KZ/RU coverage left after hh.kz.
4. **hh.kz** — blocked until an app is registered at dev.hh.ru; the `sources` row already carries the
   reason and re-enabling is one field. **Still the richest source for the KZ market — a deferral,
   not a demotion.**
5. **Ashby, then Greenhouse** (one shared ATS-sweep connector). **Demoted from #3 on measurement:**
   0.75–0.95% BI density across 2755 jobs, skewed to large-employer permanent roles — the most work
   for the least freelance-shaped output. Ashby first (best slug behaviour, highest per-board volume).
   **Lever last or never** — 2 of 18 slugs live, 1 BI between them.
6. Career-page crawler · 7. ~~Seek~~ **(bot-walled — removed)** · 8. Wellfound (HTML-only, ToS-sensitive)

**Dropped from the build order:** RemoteOK (100 postings, 0 BI), Remotive (19-job share feed),
Arbeitsagentur (403), WeWorkRemotely (89-item sample, 0 BI), HN's freelancer thread (2
seeking-freelancer posts in 5 months, 0 BI), **Upwork (RSS 410 Gone)**, **Seek (308 bot wall)**.
Not worth a connector each for what they return.

> **⚠️ Every source in this file has now been asked for BI jobs and the answers counted. 7 of 16
> failed.** The catalog was written from documentation and was wrong about **seven** entries —
> including the two that were recommended as "next" on separate occasions (Remotive, then
> WeWorkRemotely). Probing all sixteen took under an hour; **each wrong entry that reached the build
> order cost more than that.** Run the test before writing a connector, not after.
>
> **And the sweep changed the plan, which is the point of running it.** The ATS trio fell from #3 to
> #5 on measured density, Telegram rose from #7 to #3 *and* shed the always-on listener the design
> could not host, Seek left the list entirely, and the `_company_id` refactor turned out to gate the
> two best sources rather than one awkward one.

> ~~1. hh.kz (day one — real API, validates the pipeline)~~
> ~~2. Greenhouse + Lever + Ashby (one shared ATS-sweep connector)~~
> ~~3. RemoteOK + WWR + Remotive + Himalayas (feeds — an afternoon)~~
> ~~4. Adzuna (multi-country coverage incl. AU/NZ/CA)~~
> ~~5. Telegram listener · 6. Arbeitsagentur · 7. HN monthly thread · 8. Career-page crawler · 9. Seek~~
