# Technical SEO Reference

Contents: [Crawling](#crawling--crawl-budget) · [Robots.txt](#robotstxt) · [Sitemaps](#xml-sitemaps) · [Indexation](#indexation-debugging) · [Canonicals](#canonicalization) · [Redirects & status codes](#redirects--status-codes) · [URL architecture](#url-architecture) · [Pagination & faceted nav](#pagination--faceted-navigation) · [JS rendering](#javascript-rendering) · [International SEO](#international-seo--hreflang)

---

## Crawling & Crawl Budget

Googlebot discovers URLs via links, sitemaps, and redirects, then schedules fetches based on **crawl demand** (how much Google wants your content) and **crawl capacity** (how much your server tolerates). Crawl budget only genuinely constrains sites with roughly 10k+ URLs or heavy parameter/facet sprawl — for a small marketing site, "crawl budget optimization" is a distraction; indexation problems there are almost always quality or directive problems.

Where crawl budget is real, the waste usually comes from:
- Infinite URL spaces: calendars, faceted filters, search-results pages, session/tracking parameters.
- Redirect chains and 404 farms Googlebot keeps re-checking.
- Slow responses — Googlebot throttles itself when TTFB degrades; sustained 5xx cuts crawl rate sharply.

Diagnosis: **Search Console → Settings → Crawl Stats** (requests/day, avg response time, by response code and file type), plus server logs filtered to verified Googlebot (reverse-DNS check, or Vercel log drains). Look for: what % of crawls hit non-indexable or parameterized URLs? Is the crawled set the set you want indexed?

Fixes, in order of preference: eliminate the URL generation (don't emit links to filtered variants), `robots.txt` disallow for infinite spaces, canonicalize parameters, `nofollow` on facet links as a last resort.

## Robots.txt

Lives at the origin root (`https://example.com/robots.txt`); scoped per protocol+host (subdomains need their own).

```
User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /*?*sort=
Allow: /api/og/          # OG image endpoints must stay crawlable

Sitemap: https://example.com/sitemap.xml
```

Critical semantics people get wrong:
- **Disallow ≠ noindex.** A blocked URL can still be indexed (as a bare URL, "no information available") if linked externally. To remove from the index, allow crawling and serve `noindex`, or return 404/410. Blocking AND noindexing is self-defeating — Google can't see the noindex.
- Robots.txt blocking of **JS/CSS assets breaks rendering** — Google renders pages; blocked resources can make content invisible. Never block `/_next/`.
- Longest-match rule wins between Allow/Disallow; `*` wildcards and `$` end-anchors are supported by Google.
- A 5xx robots.txt for 30+ days → Google may treat the whole site as unavailable. A 404 robots.txt = crawl everything (fine).

## XML Sitemaps

The sitemap is a **statement of intent**: only canonical, indexable, 200-status URLs. Every noindexed/redirected/canonicalized-away URL in it sends contradictory signals and pollutes coverage reporting.

- Limits: 50,000 URLs / 50MB per file; use a sitemap index for more. Split by page type (`/sitemap/products.xml`, `/sitemap/blog.xml`) even when under the limit — it makes Search Console coverage debugging dramatically easier because you can see index rates per section.
- `<lastmod>` matters and Google uses it **if it's honest** — set it to real content-change dates, not build time. A sitemap where every URL's lastmod updates on every deploy trains Google to ignore it. `<priority>` and `<changefreq>` are ignored; drop them.
- Include image/video extensions for media-heavy sites; separate news sitemap (last 48h of articles) for publishers.
- Submit in Search Console and reference from robots.txt. Coverage report will show "Submitted vs Indexed" per sitemap — the single most useful indexation ratio you get.

## Indexation Debugging

Pipeline: **Discovered → Crawled → Rendered → Indexed → Served**. Search Console's Page Indexing report names the failure stage:

| GSC status | Meaning | Usual root cause / action |
|---|---|---|
| Discovered – currently not crawled | Google knows the URL, hasn't fetched | Crawl-budget or perceived low value; improve internal linking, reduce URL bloat, check server speed |
| Crawled – currently not indexed | Fetched, judged not index-worthy | **Quality problem.** Thin/duplicative content, weak internal links. Not a technical fix — improve or consolidate the page |
| Duplicate without user-selected canonical | Google picked a different canonical than you did (or you set none) | Differentiate the pages or canonicalize deliberately |
| Duplicate, Google chose different canonical than user | Your canonical was overridden | Your canonical signal conflicts with stronger signals (links, redirects, near-identical content) — align them |
| Excluded by 'noindex' | Explicit directive | Verify it's intentional; grep for stray `noindex` in headers AND meta |
| Blocked by robots.txt | Can't crawl | Intentional? If it must be indexed, unblock |
| Soft 404 | 200 response, but Google reads it as "not found" | Empty states, "0 results" pages, JS error pages — return real 404s or add real content |

Per-URL: **URL Inspection tool** → shows Google's chosen canonical, last crawl, rendered HTML, and "Test Live URL". This is the ground truth; use it before theorizing.

`site:example.com` searches are rough discovery tools only — counts are estimates; don't debug from them.

Getting indexed faster: internal links from crawled-often pages (homepage), honest lastmod, URL Inspection → Request Indexing for one-offs. The Indexing API is officially only for JobPosting/BroadcastEvent — using it for regular content works inconsistently and is against policy.

## Canonicalization

`<link rel="canonical">` is a **hint**, not a directive — Google weighs it against redirects (strongest signal), internal links, sitemap inclusion, hreflang, and content similarity. When your canonical loses, it's because other signals contradict it.

Rules:
- Absolute URLs, always. Self-referencing canonical on every indexable page (defends against parameter/scraper duplication).
- One canonical per page — duplicate canonical tags (e.g., one from the framework, one from a CMS plugin) → Google ignores both.
- Canonical target must be: 200 status, indexable, and the URL you actually link to internally. Canonicalizing to a redirecting or noindexed URL breaks the chain.
- Cross-domain canonicals work (syndication: partner canonicalizes to you).
- Canonical + noindex on the same page is contradictory (you're saying "this equals X" and "delete this") — Google historically resolves it unpredictably; pick one.
- HTTP header variant (`Link: <url>; rel="canonical"`) for PDFs/non-HTML.

Consolidate host/protocol variants with 301s, not canonicals: `http→https`, `www`↔apex (pick one), and enforce one trailing-slash convention and lowercase paths at the edge (Next.js `trailingSlash` config + middleware, or Vercel redirects).

## Redirects & Status Codes

- **301** permanent — passes ~full equity, updates Google's canonical. Default for moved content.
- **302/307** temporary — long-lived 302s eventually get treated as 301s, but don't rely on it; use the honest code.
- **308** = permanent + method-preserving (Next.js `permanent: true` emits 308 — fine for SEO, equivalent to 301).
- **410 Gone** — drops from index slightly faster than 404; use for deliberately removed content. 404 is fine and not a "penalty"; only fix 404s that have inbound links or traffic (redirect those to the *most relevant equivalent*, not the homepage — homepage mass-redirects are treated as soft 404s).
- **Chains**: each hop leaks latency and crawl budget; Google follows up to ~10 hops but stops passing patience well before. Flatten to single-hop, and update internal links to point directly at final destinations (internal links through redirects are pure waste you control).
- **Migrations** (domain/URL structure changes): full old→new URL map, 1:1 redirects, updated internal links, both sitemaps live temporarily (old one helps Google discover redirects), Search Console Change of Address for domain moves, keep redirects for 1+ year (Google's guidance) — realistically forever if the old URLs have links. Expect weeks of ranking turbulence even in a perfect migration; see audit-playbook.md for the full protocol.

## URL Architecture

- Short, lowercase, hyphen-separated, human-readable, keyword-bearing without stuffing: `/blog/nextjs-seo-guide` not `/blog/post?id=8123` nor `/blog/the-complete-ultimate-guide-to-nextjs-seo-in-2026`.
- Stability beats elegance: **every URL change is a redirect you maintain forever.** Don't put mutable data (dates, categories that might change) in URLs unless you're committed.
- Depth: keep money pages ≤3 clicks from the homepage. Folder depth in the path matters far less than click depth.
- Parameters: fine for genuinely stateful views (`?page=2`), poison when they create indexable duplicates. Tracking params (`utm_*`, `fbclid`, `gclid`) should never appear in internal links and should be canonicalized away.

## Pagination & Faceted Navigation

`rel=prev/next` is dead (Google ignored it since 2019). Current best practice for paginated listings:
- Each page (`/blog?page=2` or `/blog/page/2`) self-canonicalizes (NOT canonical-to-page-1 — that hides deep items from crawling), is indexable, and links to a reasonable window of other pages plus first/last.
- Don't noindex page 2+ — noindexed-long-enough pages eventually get crawled less and their outbound links devalued, orphaning deep content. Exception: if items are all reachable via sitemap AND the paginated pages have zero search value, noindex is acceptable.
- "Load more"/infinite scroll must have paginated URL fallbacks (real `<a href>` links, pushState updating the URL) or items beyond page 1 are undiscoverable.

Faceted navigation (filters/sorts on category pages) is the classic crawl-explosion source. Strategy tiers:
1. **Facet has search demand** (e.g., `/laptops/16gb-ram` — people search "16gb ram laptop"): make it a real indexable page — static path, self-canonical, unique title/H1/copy, in the sitemap.
2. **Facet is useful but not searched** (sort orders, price sliders): keep as parameters, canonical to the unfiltered page, exclude from sitemap.
3. **Combinatorial junk** (3+ stacked filters): block via robots.txt pattern or don't render as crawlable links (button + JS, not `<a href>`).

## JavaScript Rendering

Google renders JS in a two-phase process (crawl HTML → queue → render in headless Chromium). It works, but: rendering can lag crawling, errors fail silently, and other search engines + most AI crawlers (GPTBot, ClaudeBot, PerplexityBot) render little or no JS. **Anything you care about ranking should be in the server-delivered HTML.**

Rules:
- Critical content, `<title>`, meta, canonical, structured data, and links: present in initial HTML (SSR/SSG/ISR). Verify with `curl https://page | grep -i 'title\|canonical\|h1'` — if curl can't see it, treat it as at-risk.
- Links must be real `<a href="/path">` elements. `onClick` router pushes, `<div>`s with handlers, and `<button>` navigation are invisible to crawlers.
- Never vary content by user-agent for Googlebot specifically (cloaking). Dynamic rendering (prerender-for-bots) is officially deprecated as a long-term solution — use SSR/SSG.
- Lazy-load below-the-fold content with IntersectionObserver is fine; content that requires *interaction* (click a tab) is rendered by Google only if it's in the DOM (hidden-but-present content is indexed; mounted-on-click is not).
- Error boundaries: a client-side exception that blanks the page can index as a soft 404. Monitor rendered output, not just build success.

Verification: URL Inspection → View rendered HTML; or `curl` with and without JS comparison via a headless browser.

## International SEO & hreflang

Structure options: ccTLDs (strongest geo-signal, most expensive), subdirectories `/tr/`, `/de/` (recommended default — consolidates authority), subdomains (weakest of the three, splits authority). Never use IP-based auto-redirects that trap users/bots — geo-*suggest* with a banner, don't force.

hreflang rules (this is the most error-prone spec in SEO):
- Format: `language` or `language-REGION` — ISO 639-1 + ISO 3166-1 alpha-2. `en`, `en-GB`, `tr-TR`. Common bug: `en-UK` (invalid — it's `en-GB`) and using country alone (`tr` is the language; there is no region-only form).
- **Bidirectional requirement**: if page A lists B as alternate, B must list A back, or the pair is ignored. Every page in a cluster lists ALL members including itself.
- Include `x-default` pointing at the language-selector or default-market page.
- Absolute URLs; alternates must be indexable, 200, and canonical (hreflang to a redirected or canonicalized-away URL is discarded).
- Delivery: HTML `<link rel="alternate" hreflang>` tags, HTTP headers, or the sitemap (sitemap is the sanest at scale — one place to maintain).
- hreflang solves *serving the right version*; it does not merge ranking signals. Same-language variants (en-US vs en-GB) with near-identical content are fine — hreflang prevents them from being treated as duplicates *only when implemented correctly*.
- Translate metadata and slugs, not just body copy. Don't hreflang-link pages that are actually different content.

In Next.js: emit via `alternates.languages` in the Metadata API (see nextjs-seo.md) or generate in `sitemap.ts`.
