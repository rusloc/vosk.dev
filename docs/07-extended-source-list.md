# Extended Source List — compiled 2026-08-28, for 08-29

> **What this file is.** A merge of [`06-lead-sources.md`](06-lead-sources.md) (16 sources, **all
> probed today, 7 fail**) and [`lead-sources-extended.md`](lead-sources-extended.md) (360
> source-region entries, **243 unique domains, none probed**). It exists because the two lists barely
> overlap, and the reason they barely overlap is a strategy question, not a cataloguing one.
>
> **Read §1 before §4.** The ranking is downstream of a decision that has not been made yet.

---

## 1. ⚠️ The two files disagree about what a lead *is*

This is not a longer version of the old list. It is a different funnel.

| | `06-lead-sources.md` — **what is built** | `lead-sources-extended.md` — **what is proposed** |
|---|---|---|
| A lead is | **a job posting** you might take | **a company account** with an analytics problem |
| You are | a freelance BI analyst seeking contracts | a **BI consultancy** selling projects + monthly capacity |
| Regions | US/CA, EU, AU/NZ, **KZ** | Europe, US+Canada, **UAE** — no KZ, no AU/NZ |
| Sources | 16 job boards / ATS | 243 domains across 12 categories |
| Scoring | 4 components; `engagement_fit` 0-25 kills FTE | 5 components `0.25F + 0.35I + 0.15T + 0.15R + 0.10O` + hard gates |
| Compliance | none | GDPR / ePrivacy / CASL / CAN-SPAM gate, `do_not_contact`, lawful basis |

**Measured overlap: 3 of 16.** Only **Greenhouse**, **Lever** and **Wellfound** appear in both.
Ashby, Adzuna, Himalayas, Telegram, HN, Seek, Upwork, hh.kz, RemoteOK, WWR and Remotive get **zero
mentions** in the extended doc. The lists are close to disjoint because they are answering different
questions.

### ⚠️ The reframe, and it is provable against live rows

Today's blocking finding was: *Himalayas is a jobs board, everything on it is permanent FTE, so the
engine cannot find contract work.* The extended doc dissolves that problem rather than solving it —
**a BI job posting is not a gig to apply for, it is evidence that a company has an analytics backlog
and a budget.** That is its "BI hiring substitution" play.

Checked against the three `dead` leads in the database right now:

| Company | Score | `engagement_fit` | With that component full |
|---|---:|---:|---|
| Bryant Park Consulting | 39 | **3** / 25 | **61 — clears** |
| Spokeo | 35 | **2** / 25 | **58 — clears** |
| Jackpot.com | 22 | **2** / 25 | **45 — clears** |

**All three die solely on the freelance-vs-FTE axis.** Every one clears `MIN_SCORE` if that single
component is scored the other way. So the "wrong source" conclusion reached at 18:38 and reaffirmed
all evening is **conditional on a positioning choice that predates the engine** — and the extended
doc argues the opposite choice.

**This is a decision for the owner, not an implementation detail.** It changes `engagement_fit`, the
`dead` threshold, the target regions and every source ranking below. Nothing in §4 should be built
until it is made.

---

## 2. What the extended doc actually contains

| Measure | Count |
|---|---:|
| Source-region entries | 360 |
| Unique domains | **243** |
| Marked as offering an **API** | 31 |
| Marked **Paid** | 100 |
| Marked **Manual** | 287 |
| Marked **Scrape\*** (conditional) | 17 |

Twelve categories, priority-ranked by the doc itself: **A** — job postings, LinkedIn/Crunchbase/
Wellfound, technographics, events/exhibitors. **B+** — trade associations, partner directories,
procurement portals. **B** — industry directories, review sites, SaaS marketplaces. **C+** —
registries. **C-as-source / A-as-enrichment** — data brokers.

---

## 3. ⚠️ Every one of those 243 domains is unverified

`lead-sources-extended.md` is a **research document**. Its claims carry `citeturn…` search
markers — it was compiled from search results, not from requests. **That is precisely the mode that
produced `06-lead-sources.md`, and today all 16 of those entries were probed and 7 failed — a 44%
error rate**, including the two sources recommended as "next" on two separate occasions.

There is no reason to expect a better rate here, and two reasons to expect worse: the extended list
is 15× larger, and much of it is directory/marketplace HTML rather than documented APIs.

**Treat §4 as a hypothesis queue. Nothing on it is a source until it answers a probe.**

---

## 4. The merged list, ranked for automation

Ranked by *can this be measured tomorrow*, not by the extended doc's sales priority.

### Tier 0 — already probed, evidence in hand

| Source | State | Evidence |
|---|---|---|
| **Himalayas** | ✅ **shipped**, `*/30` | 96k corpus, ~3% BI |
| **Telegram** `t.me/s/` | ✅ best density | `datajob` 20 posts → **5 BI (25%)**, paging verified |
| **HN who-is-hiring** | ✅ works | 240 posts → 21 BI/month, 2 requests |
| **Ashby** | ✅ works keyless | 1163 jobs → 11 BI (0.95%) |
| **Greenhouse** | ✅ works keyless | 1592 jobs → 12 BI (0.75%) — **in both docs** |
| **Lever** | ⚠️ weak | 2 of 18 slugs live → 1 BI — **in both docs** |
| **Wellfound** | ⚠️ HTML only | `__NEXT_DATA__`, no API — **in both docs** |
| **Adzuna** | ❓ **key-gated** | The last unprobed source from the old list |
| hh.kz · RemoteOK · Remotive · WWR · Arbeitsagentur · Upwork · Seek · HN-freelancer | ⛔ | **7 failed today** — do not revisit |

### Tier 1 — probe first: claimed API, claimed free

The eight entries in the extended doc that claim a programmatic interface **and** no paid tier. This
is tomorrow's queue.

| Source | Claimed access | Why it matters | Probe |
|---|---|---|---|
| **TED** (EU tenders) | API + open data | Explicit analytics procurements — the doc's highest-intent signal | Search BI/MIS/dashboard terms, count |
| **UK Contracts Finder** | API + open data | **Lower-value UK contracts — SME-sized**, unlike Find a Tender | Same |
| **USASpending** | API + open data | Awards → who repeatedly wins → operational complexity | Same |
| **SAM.gov** | API (key may be needed) | US federal opportunities | Check whether the key is free |
| **UK Companies House** | free API | Verification + officers; the doc's dedupe anchor | Entity lookup by name |
| **SEC EDGAR** | free API | Doc rates it **L-M for SME** — low expectations | Skip unless cheap |
| **Crunchbase** | API | Funding/growth/headcount filters | **Check if any free tier exists** |
| **Dealroom** | API | European growth companies | Same |

⚠️ **The doc's own tender advice, worth keeping:** do not monitor `"Power BI"` alone. Use
`business intelligence`, `MIS`, `management information system`, `dashboard`, `data warehouse`,
`reporting`, `analytics`, `ETL`, `data integration`, `Microsoft Fabric`, `decision support`, `KPI`.

### Tier 2 — paid, defer until Tier 1 proves the funnel

Technographics (**BuiltWith**, **Wappalyzer**, **TheirStack**, **Store Leads**), brokers (**Apollo**,
**Cognism**, **People Data Labs**, **ZoomInfo**, **Lusha**, **Coresignal**, **RocketReach**,
**Creditsafe**, **D&B**). All Paid/API.

⚠️ The doc is explicit that brokers are **enrichment, not origin** — using them to generate "every CFO
at 50–200-person companies" produces a low-context funnel and raises privacy exposure. **It also warns
that internal Power BI/Fabric adoption is usually invisible from a public website**, so technographics
are proxies to confirm, never conclusions.

### Tier 3 — manual research, not connectors

Chambers and associations (Eurochambres, SMEunited, NFIB, CFIB, UAE chambers), exhibitor lists
(HANNOVER MESSE, GITEX, Gulfood, Big 5, IMTS, MODEX), registries (EU BRIS, KVK, CVR, KRS, DMCC, ADGM),
review sites (G2, Capterra, Clutch), marketplaces (Microsoft, Odoo, Zoho, Shopify, NetSuite), partner
directories. **287 "Manual" mentions across the file.**

These are genuinely valuable and **none of them is a cron job.** They belong in a research workflow,
not the Edge Function pipeline. Do not let their volume distort the build order.

### ⛔ Do not automate

**LinkedIn** — appears throughout the extended doc as priority A and is explicitly flagged there:
LinkedIn's User Agreement prohibits scraping with scripts or robots. Sales Navigator is a **manual,
paid research layer**. `06-lead-sources.md` already files LinkedIn as 🔴 manual-assist. **Both
documents agree; there is no tension here.** Meetup member rosters: same, per the doc.

---

## 5. Tomorrow — the concrete queue

1. **Get the positioning decision** (§1). One question, and it re-ranks everything below.
2. **Probe Tier 1** with the standing test — *ask it for BI work and count what comes back.* Eight
   sources, roughly the effort of today's sixteen.
3. **Adzuna**, if the key arrives — still the only route to AU/NZ and the only surviving
   `contract_time` filter.
4. **Then, and only then, build.** The `_company_id` change still gates Telegram and HN, which
   remain the two best measured sources in either document.

**Do not** import the 243 domains into `sources`. A row there asserts something has been verified;
243 unverified rows would rebuild the exact defect this file exists to warn about.
