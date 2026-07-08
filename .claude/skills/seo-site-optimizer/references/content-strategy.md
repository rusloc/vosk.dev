# Content Strategy & On-Page SEO Reference

Contents: [Search intent](#search-intent-first) · [Keyword research](#keyword--query-research) · [Topic clusters](#topic-clusters--site-architecture) · [On-page optimization](#on-page-optimization) · [Internal linking](#internal-linking) · [E-E-A-T](#e-e-a-t) · [Refresh & pruning](#content-refresh-decay--pruning) · [Programmatic SEO](#programmatic-seo) · [Links & digital PR](#backlinks--digital-pr) · [SaaS/startup playbook](#the-saasstartup-organic-playbook)

---

## Search Intent First

Every query has a dominant intent, and Google's results reveal it. Before writing or optimizing anything, **read the SERP**:

- **Informational** ("how does jwt authentication work") → guides, docs, videos rank. Monetization is indirect.
- **Commercial investigation** ("best auth providers 2026", "supabase vs firebase") → comparisons, listicles, review roundups rank. Highest-leverage for SaaS.
- **Transactional** ("supabase pricing", "buy X") → product/pricing pages.
- **Navigational** ("supabase login") → the brand wins; don't chase others' navigational queries.

The format test: if all top-10 results are listicles, a single-product landing page will not rank there no matter how optimized — build the format the SERP rewards or pick a different query. Also read the SERP features: an AI Overview + People Also Ask + video carousel above the fold means organic position 1 gets far fewer clicks than the raw volume suggests; factor that into prioritization.

## Keyword / Query Research

Process (tool-agnostic; works with Ahrefs/Semrush/GSC/free sources):

1. **Seed from reality**: your product's jobs-to-be-done, sales-call vocabulary, support tickets, competitor sitemaps, GSC queries you already get impressions for.
2. **Expand**: autocomplete, People Also Ask, related searches, Reddit/forum phrasing (how real people describe the problem — often different from industry jargon).
3. **Qualify each cluster** on three axes: search demand (volume is a rough proxy — long-tail with clear intent beats vague head terms), **business value** (would a searcher of this become a customer?), and **winnability** (who ranks now — can you realistically beat them on content depth + authority? A DR-20 site should not target queries where the top 10 are all DR-80 incumbents; find the adjacent long-tail those incumbents cover thinly).
4. **Map one primary query cluster → one URL.** Multiple pages targeting the same intent = cannibalization: they compete, splitting links and confusing selection. Detect it via GSC (one query, multiple ranking URLs alternating) and fix by consolidating (merge + 301) or differentiating intent.

Prioritization heuristic for a new site: bottom-of-funnel first (comparison, alternative, pricing, integration, use-case pages — low volume, high conversion, winnable), then expand upward into informational content that internally links down.

## Topic Clusters & Site Architecture

Organize content as **hub-and-spoke**: a pillar page targeting the broad head term ("Postgres performance tuning") linking to and from spoke pages on each subtopic ("index types", "EXPLAIN ANALYZE", "connection pooling"). This builds topical coverage Google can recognize, gives every page contextual internal links, and maps cleanly onto URL structure (`/guides/postgres-performance/` + children or siblings).

Coverage depth on a topic you can own beats scattered breadth. Ten excellent interlinked pages on one theme outrank fifty orphaned one-offs.

## On-Page Optimization

For a page targeting a chosen query cluster:

- **Title tag & H1**: primary phrase front-loaded in the title; H1 conveys the same topic (may differ in wording); exactly one H1.
- **First 100 words**: state plainly what the page covers and answer the core question early (extractability — for featured snippets and AI answers). Don't bury the lede under a 400-word throat-clearing intro.
- **Heading hierarchy as query map**: H2s should correspond to the subquestions searchers have (mine PAA); this structures the page for both humans, snippet extraction, and passage ranking (Google can rank a specific passage for long-tail queries).
- **Semantic completeness over keyword density**: cover the entities and subtopics that top-ranking pages cover (and the gaps they miss), use natural variants; never count keyword occurrences. If you're calculating density, you've lost the plot.
- **Media**: unique images/diagrams/screenshots (image search is a real channel — descriptive filenames + alt text that describes the image, not stuffed keywords); video embeds where the SERP shows video.
- **Answer-ready formatting**: definition sentences, tables for comparisons, ordered lists for processes — the formats featured snippets and AI Overviews extract.
- **Freshness where it matters**: queries with "query deserves freshness" behavior (anything with a year, "best X", pricing) need real updates, updated `dateModified`, and visible updated dates. Changing the date without changing content is detectable and does nothing.
- **Word count is not a factor.** Match the depth the intent demands — a 300-word answer that satisfies beats 3,000 words of padding, and vice versa for genuinely deep topics.

## Internal Linking

The most underused lever you fully control. Principles:

- **Equity flows through links**: pages with more internal links from important pages rank better. Your money pages should be the best internally-linked pages on the site — audit whether the footer's privacy-policy link count exceeds your top product page's.
- **Anchor text is a ranking hint**: descriptive, varied, natural anchors ("our Postgres indexing guide", not "click here", not the identical exact-match phrase 40 times).
- **Every new post links out to 2–5 relevant existing pages and receives links from relevant existing pages** — retrofitting old→new links is the step everyone skips; make it part of the publish checklist.
- **Click depth**: anything you want ranking well ≤3 clicks from the homepage. Fix with hub pages, related-content modules (contextual, not random), breadcrumbs, and curated footer/nav links.
- Orphan detection: pages in the sitemap with zero internal inlinks — crawl the site (Screaming Frog, or a script) and reconcile against the sitemap.

## E-E-A-T

Experience, Expertise, Authoritativeness, Trust — not a direct algorithm score but the rubric quality raters use and that core updates approximate. Concrete, implementable signals:

- **Real authors**: named humans with bio pages (credentials, links to their profiles/publications), `Person` schema, bylines on content. Especially critical for YMYL (health/finance/legal/safety) topics, where anonymous content struggles regardless of quality.
- **First-hand experience markers**: original screenshots, benchmarks you ran, "we tested/we built" evidence, real data. This is also your durable moat against AI-generated competitor content.
- **Trust infrastructure**: about page, contact page, physical address if applicable, privacy policy, HTTPS, editorial/review policy for content sites, citing primary sources.
- **Off-site corroboration**: the entity (brand, authors) being mentioned/linked on other credible sites; consistency between your claims and what the web says about you.

## Content Refresh, Decay & Pruning

Content decays: rankings erode as competitors publish and freshness fades. Quarterly workflow:

1. GSC: pages with declining clicks/impressions YoY that used to perform → **refresh queue**. Update facts, add missing subtopics (check what now ranks above you), improve extractability, update dateModified honestly. Refreshing a decayed winner is usually 5–10× more efficient than a new post.
2. Pages with near-zero impressions after 12+ months and no links/conversions → **prune queue**: improve, consolidate (merge into a stronger page + 301), or remove (410). Large volumes of indexed dead weight drag sitewide quality assessment — this is the practical meaning of "Crawled – currently not indexed" spreading.
3. Never delete a URL with backlinks or traffic without a 301 to the closest equivalent.

## Programmatic SEO

Template + dataset → pages at scale (`/tools/{x}-vs-{y}`, `/templates/{use-case}`, `/glossary/{term}`, `/integrations/{app}`). Legitimate and powerful when each page is **genuinely useful standalone**; a spam liability when it's mad-libs thin content — post-2024 "scaled content abuse" policies target exactly this, regardless of whether AI wrote it.

Requirements to stay on the right side:
- Each page needs **unique value beyond the substituted variable**: real data (specs, prices, benchmarks), genuinely different content per permutation, functional utility (calculator, generator).
- Only generate pages where search demand exists for the permutation — check before generating 50k pages; index bloat from zero-demand permutations poisons sitewide quality.
- Technical: `generateStaticParams` for the demand-bearing head, ISR for the tail, parameterized metadata with real per-page differentiation, hub pages linking into the set (don't rely on sitemap-only discovery), and monitor the "Crawled – not indexed" rate for the section — it's your quality gauge. Rising = thin; consolidate or improve.

## Backlinks & Digital PR

Links remain a major ranking input, especially for competitive queries. What actually works (vs. what gets penalized):

- **Linkable assets**: original research/data ("State of X" surveys, benchmarks), free tools/calculators, definitive reference pieces, open-source projects. Things journalists and bloggers cite because they're useful.
- **Digital PR**: pitch data/stories to publications covering your space; HARO-style expert commentary; podcast appearances (bio links).
- **Unlinked mention reclamation** and broken-link replacement in your topic.
- **Integrations/partnerships**: partner directories, "works with X" pages — natural, relevant links.
- What to refuse: bought link packages, PBNs, mass guest-posting on content farms, link exchanges at scale — link-spam penalties and devaluations make these negative-ROI.
- Anchor-text profile should be dominated by brand/URL anchors naturally; exact-match-heavy profiles are a spam pattern.

## The SaaS/Startup Organic Playbook

Standard proven page-type stack, roughly in build order:

1. **Homepage + product/feature pages** — target the category term and job-to-be-done phrasing.
2. **Pricing page** — high-intent navigational+transactional; FAQ section with schema.
3. **Comparison pages** (`/vs/competitor`, `/compare/x-vs-y`) and **alternatives pages** (`/alternatives/competitor`) — highest-converting SEO pages in SaaS; be factually fair (fairness ranks and converts better than strawmanning).
4. **Integration/use-case pages** (`/integrations/{tool}`, `/solutions/{persona}`) — long-tail transactional.
5. **Bottom-funnel blog** — "how to do {job} with {category}", migration guides from competitors.
6. **Programmatic layers** where data supports it (templates, glossary, tools).
7. **Top-funnel authority content** last — after the converting layers exist to link down to.
