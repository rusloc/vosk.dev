# Core Web Vitals for SEO Reference

Scope: CWV as a **search** concern — diagnosis and fixes framed by ranking/crawl impact. For deep front-end performance engineering, `front-end-web-dev-guru` is the heavier tool; this file keeps you self-sufficient for SEO work.

---

## How CWV actually affects rankings

- The ranking signal uses **CrUX field data** (real Chrome users, 28-day rolling, 75th percentile, per URL-group), NOT your Lighthouse score. A Lighthouse 100 with bad field data gains nothing; obsessing over lab score deltas is misallocated effort.
- It's a **tiebreaker-weight signal**, not a primary factor — relevance and links dominate. The realistic framing: failing CWV won't tank a strong page, but in competitive SERPs where content quality is comparable, passing all three thresholds is worth having, and *terrible* performance hurts indirectly everywhere: crawl-rate throttling (slow TTFB → Googlebot fetches less), higher bounce/abandonment (behavioral quality signals), and lower conversion of the traffic you do win.
- Thresholds ("good", at p75): **LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1**. All three must pass for the "good page experience" designation.

## Data sources, in order of authority

1. **Search Console → Core Web Vitals report** — CrUX grouped by URL pattern; this is what search sees. Start here.
2. **CrUX directly** (PageSpeed Insights field section, crux-api, treo.sh) — per-URL and per-origin field data.
3. **PageSpeed Insights / Lighthouse lab data** — diagnostic only; reproduces problems, doesn't measure reality.
4. **Your own RUM** (`web-vitals` npm package → analytics; Vercel Speed Insights) — highest resolution, catches what CrUX's URL grouping hides.

If GSC shows "poor" URL groups, get the *specific* failing metric per group before touching code.

## LCP (Largest Contentful Paint ≤ 2.5s)

Decompose: **TTFB → resource discovery → resource load → render**. Find which phase dominates (PSI shows the breakdown).

- **TTFB dominant** (server): move the route to SSG/ISR; cache data layer; check cold-start-prone serverless paths; Vercel edge caching (`Cache-Control: s-maxage`) for SSR. TTFB > 800ms makes 2.5s LCP nearly impossible.
- **Discovery dominant**: LCP image must be in the initial HTML (not CSS background, not client-rendered), never `loading="lazy"`, ideally `fetchpriority="high"` / Next.js `priority` prop. Preload if it's discovered late (e.g., behind a carousel component).
- **Load dominant**: properly sized responsive images (`next/image` handles srcset), modern formats (AVIF/WebP — automatic on Vercel image optimization), CDN proximity.
- **Render dominant**: render-blocking CSS/fonts. `font-display: swap` (or `optional` for the strictest); `next/font` self-hosts and inlines the @font-face automatically — use it, never a `<link>` to Google Fonts.

## INP (Interaction to Next Paint ≤ 200ms)

Replaced FID (March 2024); measures the *worst* (approx.) interaction latency across the page's life — so it catches jank FID never saw.

Main SEO-relevant causes in modern React/Next apps:
- **Hydration cost**: giant client bundles hydrating on load make early interactions terrible. Reduce client-component surface (server components by default), `next/dynamic` for below-fold interactive widgets, defer third-party scripts.
- **Long tasks on interaction**: expensive `onClick`→setState→large-re-render chains. Break up with `startTransition`, memoize heavy subtrees, virtualize long lists.
- **Third-party scripts** — the usual worst offender on *marketing* sites specifically: tag managers, chat widgets, A/B tools. Load with `next/script strategy="lazyOnload"` (or `afterInteractive` at most); audit whether each one earns its cost. Consider Partytown/web-worker offloading for analytics.

## CLS (Cumulative Layout Shift ≤ 0.1)

Almost always one of:
- **Unsized media**: every `<img>`/`<video>`/embed needs dimensions or `aspect-ratio` (`next/image` enforces this — raw `<img>` tags are the leak).
- **Late-injected content**: cookie banners, promo bars, ads pushing content down. Reserve the space (min-height placeholder) or overlay instead of inserting.
- **Web-font swap reflow**: `next/font` with `adjustFontFallback` (default on) generates size-matched fallbacks — solves it.
- **Client-side hydration mismatch** rendering different layout than SSR — also a React error; fix the mismatch, not the symptom.

## Workflow for an SEO-driven CWV fix

1. GSC CWV report → failing URL group + metric.
2. PSI on 2–3 representative URLs → field vs lab, phase breakdown.
3. Fix the dominant phase only; don't shotgun.
4. Verify in lab immediately; field data takes up to 28 days to reflect — note this expectation to the user, and use the GSC report's "validate fix" flow to track it.
