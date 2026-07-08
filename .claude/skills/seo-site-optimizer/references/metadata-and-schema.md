# Metadata & Structured Data Reference

Contents: [Title tags](#title-tags) · [Meta descriptions](#meta-descriptions) · [Open Graph & Twitter](#open-graph--twitter-cards) · [Other head tags](#other-head-tags) · [JSON-LD fundamentals](#json-ld-fundamentals) · [Schema templates](#schema-templates-by-page-type) · [Rich results & testing](#rich-result-eligibility--testing)

---

## Title Tags

The single highest-leverage on-page element: a direct ranking input AND the ad copy of your organic listing.

- **Length**: ~50–60 characters (the real limit is ~580px rendered width; capitals and W/M eat more). Over-length titles get truncated with "…" or rewritten entirely.
- **Google rewrites titles** it judges poor (~30%+ of the time): boilerplate-heavy, keyword-stuffed, duplicated across pages, or mismatched to the query. You minimize rewrites by writing titles that are unique, descriptive, and match the H1's meaning (not necessarily verbatim).
- **Structure**: primary query phrase front-loaded, then differentiation, then brand. `Primary Keyword: Compelling Differentiator | Brand`. Drop the brand suffix on long titles before dropping the differentiator; drop nothing on the homepage (homepage title = brand + one-line category definition).
- Per-template uniqueness: parameterize (`{Product} Review: {Rating} After {N} Weeks | Brand`) but audit for collisions — duplicate titles across hundreds of pages is a template bug and a "Crawled – not indexed" precursor.
- Write for the click: numbers, current year (only if you'll maintain it), concrete outcomes, brackets `[Free Template]`. But never bait that the page doesn't pay off — pogo-sticking users are a quality signal against you.

## Meta Descriptions

Not a ranking factor; purely a CTR lever — and Google replaces them with page snippets for the majority of queries. Still write them: they win for navigational/brand queries and the homepage, and a missing description guarantees a machine-generated one.

- ~150–160 chars (~990px). Front-load the value proposition; include the target phrase once (it gets bolded in the SERP when it matches the query, drawing the eye).
- Active voice, specific claim, implicit or explicit call to action. It's ad copy: "what does the searcher get by clicking, stated concretely."
- Unique per page; for templates, compose from real page data (price, rating, count) rather than one static sentence.

## Open Graph & Twitter Cards

Zero direct ranking effect; enormous indirect effect — shares without OG render as bare gray links and die. Also increasingly what AI chat interfaces display when citing you.

Minimum viable set per page:

```html
<meta property="og:title" content="...(can be punchier than the SEO title)" />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://example.com/og/page.png" />  <!-- absolute URL, 1200×630, <300KB -->
<meta property="og:url" content="https://example.com/page" />           <!-- the canonical -->
<meta property="og:type" content="website|article" />
<meta property="og:site_name" content="Brand" />
<meta name="twitter:card" content="summary_large_image" />
```

- `og:image` is the one that matters most. 1200×630 (1.91:1), text-safe margins, readable at thumbnail size. Generate dynamically per page where possible (Next.js `ImageResponse` — see nextjs-seo.md).
- `article:published_time` / `article:modified_time` for articles feed date displays in SERPs and AI citations.
- Validate: opengraph.xyz, or each platform's debugger (LinkedIn Post Inspector, Facebook Sharing Debugger — which also busts their cache after you fix an image).

## Other Head Tags

- `<link rel="canonical">` — see technical-seo.md.
- `<meta name="robots">` — `index,follow` is the default (never needs stating). Useful values: `noindex`, `nofollow`, `max-snippet:-1`, `max-image-preview:large` (allows large image thumbnails in Discover/SERPs — set it), `noarchive`. Also settable via `X-Robots-Tag` header (the only way for PDFs/images — and the place accidental site-wide noindex ships from staging configs; always check headers, not just HTML).
- `<meta name="viewport" content="width=device-width, initial-scale=1">` — mobile-first indexing means its absence is an SEO bug, not just a UX one.
- Favicon set + `<link rel="icon">` — shown in mobile SERPs next to your result; a missing favicon is a CTR leak.
- `<html lang="tr">` — set it correctly; assists language detection.
- Things that do nothing and should be deleted on sight: `<meta name="keywords">`, `revisit-after`, generator tags, duplicate charset declarations.

## JSON-LD Fundamentals

JSON-LD in a `<script type="application/ld+json">` is Google's preferred structured-data format (over microdata/RDFa). Purpose: rich-result eligibility, disambiguation for the Knowledge Graph, and increasingly, machine-readability for AI answer engines.

Rules that prevent 90% of problems:
- **Markup must mirror visible content.** Structured data describing things not on the page (invented reviews, hidden ratings) is a manual-action offense.
- One `@graph` or multiple script tags both work; use `@id` anchors to connect entities (`"@id": "https://example.com/#organization"`) instead of duplicating them.
- Required vs recommended properties per type are defined by **Google's search gallery docs**, not schema.org (schema.org validates vocabulary; Google decides rich-result eligibility). Missing required props = no rich result, silently.
- Server-render it. Client-injected JSON-LD is subject to the rendering queue and invisible to most AI crawlers.
- Dates in ISO 8601 with timezone. Prices as numbers with separate `priceCurrency`. Images as absolute URLs, ideally multiple aspect ratios (1:1, 4:3, 16:9) for Article.

## Schema Templates by Page Type

**Sitewide (emit once, on every page or at least the homepage):**

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://example.com/#org",
      "name": "Brand",
      "url": "https://example.com",
      "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" },
      "sameAs": ["https://twitter.com/brand", "https://linkedin.com/company/brand", "https://github.com/brand"]
    },
    {
      "@type": "WebSite",
      "@id": "https://example.com/#website",
      "url": "https://example.com",
      "name": "Brand",
      "publisher": { "@id": "https://example.com/#org" }
    }
  ]
}
```

`sameAs` is your entity-disambiguation tool — link every authoritative profile. For local businesses use `LocalBusiness` (or a subtype) instead of `Organization`, adding `address`, `geo`, `openingHoursSpecification`, `telephone` — this powers the map pack alongside the Google Business Profile.

**Article / BlogPosting** (blog posts, guides):
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Post Title (max 110 chars)",
  "image": ["https://example.com/img-16x9.jpg", "https://example.com/img-1x1.jpg"],
  "datePublished": "2026-07-01T09:00:00+03:00",
  "dateModified": "2026-07-05T10:30:00+03:00",
  "author": { "@type": "Person", "name": "Full Name", "url": "https://example.com/authors/name" },
  "publisher": { "@id": "https://example.com/#org" },
  "mainEntityOfPage": "https://example.com/blog/post-slug"
}
```
Author as a `Person` with a real profile URL is an E-E-A-T signal; anonymous or "Admin" authorship is a quality smell.

**Product** (the highest-value rich result — price, rating, availability in the SERP):
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "image": ["https://example.com/product.jpg"],
  "description": "…",
  "sku": "SKU123",
  "brand": { "@type": "Brand", "name": "Brand" },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": 4.6, "reviewCount": 128 },
  "offers": {
    "@type": "Offer",
    "price": 149.00,
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "url": "https://example.com/products/x",
    "priceValidUntil": "2026-12-31"
  }
}
```
Ratings must come from real, on-page reviews. Self-serving `Review`/`AggregateRating` on your own Organization (not products) is ineligible for stars.

**SoftwareApplication / SaaS**: `@type: SoftwareApplication` with `applicationCategory`, `operatingSystem: "Web"`, `offers` (including `price: 0` for free tiers), `aggregateRating`. For SaaS marketing pages this + Organization + FAQPage is the standard stack.

**FAQPage**: rich-result display is now restricted to well-known health/government sites, but the markup still aids AI-answer extraction — keep it on genuinely FAQ-structured pages, questions and answers verbatim from the visible page.

**HowTo**: rich result deprecated (2023); markup mostly not worth adding anymore. Structure how-to content with clear steps in HTML instead.

**BreadcrumbList** (every page below the homepage — replaces the URL in the SERP display with a readable trail):
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Blog", "item": "https://example.com/blog" },
    { "@type": "ListItem", "position": 2, "name": "Current Post" }
  ]
}
```

**Others worth knowing**: `JobPosting` (jobs surface — strict requirements + Indexing API eligible), `Event`, `Recipe`, `VideoObject` (required for video rich results / key moments), `Course`, `Person` (author pages).

## Rich Result Eligibility & Testing

- **Rich Results Test** (search.google.com/test/rich-results) — tests Google eligibility on the rendered page; use this, and use the URL mode (not code snippet) to catch rendering issues.
- **Schema.org validator** (validator.schema.org) — vocabulary correctness only.
- Search Console → Enhancements section reports per-type errors/warnings at scale post-deployment. Warnings = missing recommended props (rich result still possible); Errors = ineligible.
- Eligibility ≠ display: Google shows rich results when it chooses. No stars/price appearing despite valid markup usually means trust/quality thresholds, not markup bugs.
