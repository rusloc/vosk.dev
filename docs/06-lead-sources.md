# Lead Sources Catalog — Remote BI Opportunities

> **Reference appendix to [`05-lead-engine.md`](05-lead-engine.md)**, which is the single design doc.
> This file is *data*, not design: it says where leads come from and how to reach each source. It does
> not describe architecture, schema or hosting, so it cannot contradict the design doc — which is why
> it survives as a separate file rather than being folded in.
>
> Moved from the repo root on 2026-08-28. Previously `LEADS-SRC.md`.

> ## ⚠️ Verified against the live APIs, 2026-08-28 — four Tier-1 entries are wrong
>
> Every 🟢 below was catalogued from documentation, not from a request. When Phase 1 was
> built, **four of them did not behave as described.** Corrections are inline at each entry;
> the summary:
>
> | # | Source | Catalogued as | Actually, on 2026-08-28 |
> |---|---|---|---|
> | 1 | **hh.kz** | "anonymous search works for basics" | **403 on `/vacancies`** — needs a registered app. `/areas` and `/dictionaries` still 200, so it is the endpoint that is gated, not the client |
> | 5 | **RemoteOK** | "remote-only postings, tags, filter tags `bi`" | Returns the **latest 100 jobs, no filtering**. BI matches ≈ 0 |
> | 7 | **Remotive** | "category=data, location-restriction field" | **Fixed 19-job sample; `category`, `search`, `q`, `limit` are all accepted and ignored.** Its own legal notice calls it a share feed |
> | 8 | **Himalayas** | "public API" | ✅ **Works, and is the one that does** — 96k+ postings, cursor pagination. But **no server-side search either**; page size is hard-capped at 20 |
> | 10 | **Arbeitsagentur** | "free public API" | **403** with and without the documented `X-API-Key` |
>
> **The lesson is about the test, not the sources.** Reachability (HTTP 200 + a big payload)
> is not usefulness — Remotive was recommended for Phase 1 on exactly that mistake and had to
> be withdrawn one probe later. **Test a source by asking it for BI jobs and counting what
> comes back.**
>
> **Consequence for the build order at the bottom of this file: hh.kz is not day one.**
> Phase 1 shipped on Himalayas.

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

### 3. Lever job boards 🟢
- **Region:** Same footprint as Greenhouse
- **What it is:** Another major ATS with public per-company JSON.
- **Access:**
  - `GET https://api.lever.co/v0/postings/{company_slug}?mode=json`
  - Fields: title, categories (team, location, commitment), description, apply URL
  - Same slug-discovery approach (`site:jobs.lever.co ...`)
- **Connector notes:** Share the sweep scheduler with the Greenhouse connector — same shape, different fetcher.

### 4. Ashby job boards 🟢
- **Region:** US/EU, skews to newer startups
- **What it is:** Fast-growing ATS; boards expose a posting API. Compensation ranges appear more often than on other ATSes.
- **Access:**
  - `GET https://api.ashbyhq.com/posting-api/job-board/{company_slug}` (JSON; a GraphQL surface also exists)
  - Includes `isRemote`, employment type, compensation when published
- **Connector notes:** Third member of the shared ATS-sweep connector family.

### 5. RemoteOK 🟢
- **Region:** Global remote, US-heavy
- **What it is:** One of the largest remote-only boards. Every posting is remote by definition — zero location noise.
- **Access:**
  - Official JSON feed: `GET https://remoteok.com/api`
  - First array element is a legal/attribution notice — they require linking back to the posting; keep the URL in your lead record
  - Filter client-side by tags: `bi`, `analytics`, `data`, `sql`
- **Connector notes:** Full feed each fetch; dedupe by `id`. Heavy syndication overlap with WWR/ATS boards — your pgvector dedup earns its keep here.

### 6. WeWorkRemotely 🟢
- **Region:** Global remote
- **What it is:** Curated remote board; paid postings, so quality per posting is higher than aggregators.
- **Access:**
  - RSS per category: `https://weworkremotely.com/categories/remote-data-jobs.rss` (also check the general programming/business categories for BI titles)
  - Standard RSS: title, company, link, description snippet — fetch the linked page for full text
- **Connector notes:** RSS gives snippets; do one polite page fetch per new item for the full description before enrichment.

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
  - **Telethon** (MTProto, user session) to join and stream *public* channels — legal for public content
  - Or Bot API if a bot is invited into a group
  - Regex prefilter before spending LLM tokens: `BI|Power BI|Tableau|аналитик|дашборд|хранилище`
- **Connector notes:** Long-running listener process, not a cron job. Store `channel_id:message_id` as `external_id`. Seed channels: KZ/RU analytics & vacancy channels, remote-work channels; grow the list as you see reposts.

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

### 13. Company career pages 🟡
- **Region:** Any
- **What it is:** Direct crawling of career pages for companies already in your `companies` table (or a curated target list).
- **Why for you:** Cleanest legal ground — their own public website. Catches companies not on any ATS or board.
- **Access:**
  - Discovery: sitemap.xml → URLs matching `/careers|/jobs|/karriere|/vacancies`
  - Playwright for JS-rendered pages
  - **No per-site parsers:** feed raw page text to the LLM, let it extract postings — this is what makes the connector generic
- **Connector notes:** Weekly sweep is enough. Store a page-content hash to skip unchanged pages and save LLM calls.

### 14. Hacker News "Who is hiring?" + YC Work at a Startup 🟡
- **Region:** US-heavy startups
- **What it is:** Monthly HN mega-thread of direct founder/team postings; YC's own job board.
- **Why for you:** Founders answer DMs; contract arrangements are normal; postings state remote/timezone policy explicitly.
- **Access:**
  - **Official HN Firebase API** (`https://hacker-news.firebaseio.com/v0/`) — find the monthly thread, fetch child comments, filter for BI/data + remote/worldwide
  - YC Work at a Startup: public structured pages, crawl politely
- **Connector notes:** Runs once a month (thread appears on the 1st). High signal density per run.

### 15. Wellfound (ex-AngelList Talent) 🟡
- **Region:** US/EU startups
- **What it is:** Startup job board showing salary/equity ranges and remote filters.
- **Access:**
  - No public API; logged-in scraping violates ToS
  - Use logged-out public listing pages only, conservatively — or treat as manual-assist
- **Connector notes:** Low priority; the ATS connectors already reach most of these companies.

### 16. Upwork 🟡
- **Region:** Global
- **What it is:** Freelance marketplace. Use it as a *signal source*: companies repeatedly posting BI gigs also hire off-platform.
- **Access:**
  - Official API + RSS feeds for saved searches (requires an account; some features are plan-gated)
- **Connector notes:** Feed postings into the same pipeline but tag the company "hires freelancers" — that flag boosts the score of any *other* lead from the same company.

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

1. ✅ **Himalayas — shipped as Phase 1.** The only keyless source with a real corpus (96k+) and
   working pagination. No server-side search, so the collector pages newest-first and
   keyword-filters itself; a run scans 200 postings and stops early once it catches up.
2. **Adzuna** — now the highest-value next connector, not the fourth. It is the only remaining
   candidate with genuine multi-country **search**, and it covers US/CA/AU/NZ/DE/NL/FR/PL —
   three of the four target regions in one connector. Needs a free API key (user-gated).
3. **Greenhouse + Lever + Ashby** (one shared ATS-sweep connector). Keyless and unlimited, but
   per-company: needs a curated slug list before it returns anything relevant.
4. **hh.kz** — moves here from day one. Blocked until an app is registered at dev.hh.ru; the
   `sources` row already carries the reason and re-enabling is one field. **Still the richest
   source for the KZ market — this is a deferral, not a demotion.**
5. HN monthly thread · 6. Career-page crawler · 7. Telegram listener ·
   8. Seek (only if Adzuna's AU/NZ coverage proves insufficient)

**Dropped from the build order:** RemoteOK (latest 100, no filter), Remotive (19-job share feed),
Arbeitsagentur (403). Not worth a connector each for what they return.

> ~~1. hh.kz (day one — real API, validates the pipeline)~~
> ~~2. Greenhouse + Lever + Ashby (one shared ATS-sweep connector)~~
> ~~3. RemoteOK + WWR + Remotive + Himalayas (feeds — an afternoon)~~
> ~~4. Adzuna (multi-country coverage incl. AU/NZ/CA)~~
> ~~5. Telegram listener · 6. Arbeitsagentur · 7. HN monthly thread · 8. Career-page crawler · 9. Seek~~
