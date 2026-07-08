# SEO Audit & Incident Playbook

Contents: [Audit workflow](#the-audit-workflow) · [Prioritization](#prioritization--reporting) · [Traffic-drop forensics](#traffic-drop-forensics) · [Migration protocol](#site-migration-protocol) · [Measurement stack](#measurement-stack--gsc-fluency) · [Launch checklist](#new-site-launch-checklist)

---

## The Audit Workflow

Audit in pipeline order — **Crawl → Render → Index → Rank → Click** — because failures upstream make downstream findings moot. Gather inputs first: Search Console access (or its exports), the codebase if available, the sitemap URL, and 3–5 URLs that matter most to the business. Without GSC, you can still do the code/live-site layers; say what you can't verify.

### Layer 0 — Five-minute triage (always do this first)

```bash
# Is the site fundamentally visible? Run against 2-3 key pages:
curl -sI https://example.com | grep -i 'HTTP\|x-robots\|location'   # status, header noindex, redirect sanity
curl -s https://example.com | grep -iE '<title>|rel="canonical"|name="robots"|<h1'
curl -s https://example.com/robots.txt
curl -sI https://example.com/sitemap.xml
```

Check: 200 status; no stray `X-Robots-Tag: noindex`; title/H1/canonical present in raw HTML (rendering health); robots.txt not blocking the site or `/_next/`; sitemap resolves. Also: `http://` and non-canonical host 301 to canonical; a garbage path returns a real 404. A shocking fraction of "why aren't we ranking" cases die right here.

### Layer 1 — Crawlability & indexation
- GSC Page Indexing report: indexed vs excluded breakdown; read every exclusion category with >1% of URLs (interpretation table in technical-seo.md).
- Sitemap hygiene: only canonical/200/indexable URLs; honest lastmod; per-section sitemaps' submitted-vs-indexed ratios.
- Crawl the site (Screaming Frog if the user has it; otherwise a scripted crawl of the sitemap + link graph) reconciled three ways: pages in sitemap not internally linked (orphans), linked but not in sitemap, indexed but neither (rogue URLs).
- Parameter/duplicate surface, redirect chains, internal links to redirects/404s.

### Layer 2 — Rendering
- `curl` vs rendered-DOM comparison on each template type (home, category, detail, article). Anything meaningful that's client-only is a finding.
- GSC URL Inspection on key templates: Google's chosen canonical matches yours? Rendered screenshot complete?

### Layer 3 — On-page & metadata
- Per template: title/description uniqueness and quality, H1 presence/uniqueness, heading hierarchy, canonical correctness, OG completeness, structured data validity (Rich Results Test) and GSC Enhancements errors.
- Duplicate-title report across the site (template collision detector).

### Layer 4 — Content & ranking
- GSC Performance: top queries/pages; cannibalization scan (same query, multiple URLs alternating); pages with impressions but CTR far below position-expected (title/snippet problem); striking-distance queries (positions 5–15 — the refresh goldmine).
- Coverage vs the intent map: which valuable intents have no page? Which pages target no real intent?
- Thin/decayed/orphaned content inventory → refresh/consolidate/prune queues (content-strategy.md).
- E-E-A-T surface: authorship, about/contact, originality markers.

### Layer 5 — Authority & off-site
- Backlink profile shape (any tool available, or at minimum GSC Links report): referring-domain trend, top linked pages (is equity landing on money pages or dead URLs? — reclaim via 301), anchor sanity, toxic patterns.
- Competitor gap: who ranks for your target queries and what do they have that you don't (content depth, links, page types)?

### Layer 6 — Experience
- CWV field data per URL group (performance-cwv.md), mobile rendering, intrusive-interstitial check, HTTPS everywhere.

## Prioritization & Reporting

Score each finding **Impact × Confidence ÷ Effort**, but apply the veto rule first: pipeline-upstream blockers (noindex, robots block, rendering failure, canonical chaos) outrank everything downstream regardless of score — a perfect content plan is worthless on an uncrawlable site.

Report format:

```
# SEO Audit — example.com — 2026-07-08

## Executive summary (3-5 sentences: overall health, the 2-3 things that matter, expected impact)

## Findings
| # | Severity | Finding | Evidence | Fix | Verify with |
|---|----------|---------|----------|-----|-------------|
| 1 | BLOCKER  | ...     | ...      | ... | ...         |

## Detail on top findings (only the top 3-7)
## 30/60/90-day plan
```

Severity: **Blocker** (prevents indexing/ranking outright) · **High** (material ranking/traffic loss) · **Medium** (meaningful but bounded) · **Low** (hygiene). Resist the temptation to pad with lows.

## Traffic-Drop Forensics

Establish facts before theories:

1. **Verify the drop is real**: analytics tracking change? (Compare GSC clicks vs analytics sessions — if GSC is stable and analytics dropped, it's a measurement bug.) Seasonality? (YoY compare.) One page/section or sitewide? Brand or non-brand queries? Which date, precisely?
2. **Correlate the date**:
   - Deploy/release history — the #1 real cause. What shipped that week? (Check especially: robots/noindex changes, URL changes, canonical/template changes, migration to a new framework, CMS plugin updates.)
   - **Google update calendar** — check Google's Search Status Dashboard for confirmed core/spam updates around the date. Core-update losses are quality reassessments: no single fix; the response is systematic content/E-E-A-T improvement and waiting for the next update cycle. Say this honestly.
   - GSC Manual Actions & Security Issues tabs (rare, but check first — it's 10 seconds).
3. **Pattern-match the shape**:
   - Cliff overnight, sitewide → technical (noindex/robots/server) or manual action.
   - Cliff on update date → algorithmic reassessment.
   - Slow bleed over months → content decay + competitors; refresh program.
   - Rankings stable, clicks down → SERP-feature absorption (AI Overview appeared for your queries) or title/snippet regression; check impressions-vs-CTR.
   - One section dropped → template or section-level quality issue.
4. **Check the index**: are the affected URLs still indexed (URL Inspection)? Still the canonical? Rendered correctly?
5. Only then prescribe. Include the recovery-time reality: technical fixes reflect in days–weeks; quality/core-update recovery typically requires the next update to be reassessed (months).

## Site Migration Protocol

(Domain change, URL restructure, or framework replatform — the highest-risk SEO events.)

**Before**: full URL inventory (crawl + GSC + analytics + backlink tools); 1:1 redirect map (old→new, most-relevant-equivalent, no homepage dumping); benchmark rankings/traffic for the top pages; stage the new site behind noindex/auth and verify parity (content, metadata, canonicals, structured data render identically or better).

**Launch day**: remove staging noindex (verify with curl — the #1 launch bug is shipping the staging noindex); deploy redirects (spot-test the top 100 URLs); new sitemap submitted; old sitemap temporarily retained (helps Google discover redirects); GSC Change of Address for domain moves; internal links updated to final URLs (not through redirects).

**After**: monitor GSC coverage + crawl stats daily for 2 weeks (crawl spike on old URLs then decline = healthy); fix redirect gaps as 404 reports surface; keep redirects ≥1 year (with backlinks: indefinitely). Expect turbulence of days–weeks even when perfect; a URL-preserving replatform should be near-seamless — if rankings crater, diff rendering (Layer 2) between old and new stacks.

## Measurement Stack & GSC Fluency

- **Search Console is the primary instrument.** Key workflows: Performance (queries/pages/CTR — filter regex is your friend, e.g. non-brand = `-brand.*`), Page Indexing (pipeline health), URL Inspection (per-URL ground truth), Enhancements (structured data), Crawl Stats (under Settings), Links, Manual Actions. Data caveats: 16-month retention (export monthly if history matters), sampled long-tail, position = average when shown.
- **Bing Webmaster Tools**: 5 minutes to set up, covers Bing + DuckDuckGo + ChatGPT-search surfacing. Do it.
- Rank tracking for a chosen query set (any tool, or minimally GSC position monitoring); log-file or Vercel-drain bot monitoring for crawl behavior; the CWV sources in performance-cwv.md.
- Baseline everything before changes; annotate deploy dates in analytics. SEO attribution without a timeline of what changed when is astrology.

## New Site Launch Checklist

Condensed pre-flight for a new marketing site (each item is detailed in the other references):

1. One canonical origin (https + one host), all variants 301.
2. robots.txt sane; sitemap live, submitted, honest.
3. Every indexable page: unique title/description, one H1, self-canonical, OG set, viewport, lang.
4. Structured data: Organization + WebSite sitewide; per-type schema on templates; Rich Results Test passing.
5. SSR/SSG for all indexable routes (curl test); real 404s; no staging noindex remnants.
6. GSC + Bing WMT verified; analytics with deploy annotations.
7. Internal-link pass: money pages ≤3 clicks, no orphans in sitemap.
8. CWV lab check on templates; LCP image `priority`; fonts via `next/font`.
9. AI-crawler robots policy decided explicitly.
10. Redirects from any predecessor site mapped 1:1.
