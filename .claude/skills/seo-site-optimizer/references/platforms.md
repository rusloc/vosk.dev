# Hosting Platforms & Frameworks Reference

SEO problems that look like "content" or "Google" problems are often host-configuration problems: a preview domain that got indexed, a bot-protection rule silently 403ing Googlebot, redirects defined in the wrong layer. This file maps where the SEO-critical levers live on each major SaaS host, and the platform-specific bugs to check first.

Contents: [Universal host triage](#universal-host-triage) · [Vercel](#vercel) · [Netlify](#netlify) · [Cloudflare Pages / Workers](#cloudflare-pages--workers) · [Webflow](#webflow) · [Shopify](#shopify) · [Wix, Squarespace, Framer](#wix-squarespace-framer) · [Frameworks beyond Next.js](#frameworks-beyond-nextjs) · [Cross-platform pitfalls](#cross-platform-pitfalls)

---

## Universal Host Triage

For any host, locate these five levers before recommending fixes — the answer changes per platform and the wrong layer causes silent conflicts:

1. **Where do redirects live?** (config file, dashboard UI, framework code, edge function — and what's the precedence order when several exist)
2. **Where do response headers live?** (`X-Robots-Tag` here can noindex the whole site invisibly — it never shows in the HTML)
3. **Is the HTML pre-rendered?** `curl -A "Googlebot" https://site.com/page | grep -i "<h1"` — the answer for the *production* URL, not localhost.
4. **What non-production domains exist, and are they indexable?** Preview/staging/branch/platform subdomains are the #1 source of duplicate-content leaks.
5. **Is anything between the crawler and the origin?** (bot protection, WAF, challenge pages, aggressive caching) — verify with Search Console's Live URL test, which uses real Googlebot infrastructure.

---

## Vercel

Next.js specifics (Metadata API, `sitemap.ts`, middleware) are in `references/nextjs-seo.md`. Host-level facts that apply to *any* framework on Vercel:

- **Preview deployments are auto-protected**: Vercel sends `X-Robots-Tag: noindex` on `*.vercel.app` preview URLs. But if a **custom domain is assigned to a branch**, that protection does not apply — staging domains with custom domains must set noindex themselves.
- **The production `*.vercel.app` URL stays live** alongside the custom domain. It also gets `X-Robots-Tag: noindex` automatically — verify with `curl -sI https://project.vercel.app | grep -i robots`, since older projects or unusual configs can differ. If it's indexable, canonical or redirect it.
- **Redirects for non-Next frameworks** go in `vercel.json` (`redirects`, `headers`, `cleanUrls`, `trailingSlash`). `"permanent": true` = 308, `false` = 307 — both preserve method and are treated as 301/302 equivalents by Google; don't burn time "fixing" 308s to 301s.
- **`cleanUrls` / `trailingSlash` changes on a live site** re-redirect every URL. Fine once with consistent internal links; toggling repeatedly is a self-inflicted migration.
- **Vercel firewall / Attack Challenge Mode** can challenge crawlers. If enabled during an incident and left on, watch Search Console crawl stats for a fetch-error spike.
- **ISR/CDN cache** can serve stale metadata after a fix. Verify fixes with `?vercel-no-cache=1`... doesn't exist — instead check the `x-vercel-cache` header (`HIT`/`STALE`) and redeploy or `revalidatePath` to purge.

## Netlify

- **Redirects**: `_redirects` file in the publish directory or `[[redirects]]` in `netlify.toml`. File rules run top-to-bottom, first match wins; `_redirects` takes precedence over `netlify.toml`. Default status is **301** unless specified — but a common bug is SPA-fallback `/* /index.html 200` placed *above* real redirects, swallowing them and mass-producing soft 404s (every unknown URL returns 200 with the app shell). The fallback must be the **last** rule.
- **Headers**: `_headers` file or `netlify.toml`. Check for a site-wide `X-Robots-Tag` someone added for a launch and forgot.
- **Branch deploys & Deploy Previews** live at `branch--site.netlify.app` / `deploy-preview-N--site.netlify.app`. Netlify serves `X-Robots-Tag: noindex` on these **only when the site has a custom domain configured**; a site still on the bare `*.netlify.app` production domain has indexable previews. Also: password-protect or noindex any branch subdomain mapped to a custom domain.
- **The bare `*.netlify.app` production URL** remains reachable after adding a custom domain; Netlify 301s it to the primary domain automatically — verify once with `curl -I`.
- **Prerendering**: Netlify's legacy prerendering service is deprecated/unreliable — never recommend it. Client-rendered SPAs on Netlify need a framework-level fix (SSG/SSR) not a host toggle.
- **Netlify Forms / asset optimization** injecting or rewriting markup is mostly historical, but if HTML looks different in production than in the build output, check post-processing settings.

## Cloudflare Pages / Workers

Cloudflare is both a host and a proxy layer, so it can break SEO for sites hosted *anywhere behind it* — always check these when Cloudflare is in the stack:

- **Bot Fight Mode / Super Bot Fight Mode** can challenge or block verified search crawlers depending on settings ("definitely automated" should allow verified bots, but misconfigurations and custom WAF rules regularly 403 Googlebot). Diagnose with Search Console Live Test + Security Events log filtered to Googlebot ASNs. This is the first suspect for "Google suddenly can't crawl us" on any Cloudflare site.
- **Rocket Loader** rewrites script loading and can break rendering of JS-injected content; **Email Obfuscation** and **Mirage** inject scripts into HTML. If rendered DOM issues appear only in production, toggle these off first.
- **Pages redirects/headers**: `_redirects` and `_headers` files (same format family as Netlify; `_redirects` supports 301/302/307/308, first match wins, max line/rule limits apply). Dynamic or bulk needs → Bulk Redirects (dashboard) or a Worker. Precedence: Bulk/Single Redirects (edge rules) run **before** Pages `_redirects` — a forgotten edge rule overrides the repo file, which is maddening to debug from the repo alone.
- **`*.pages.dev`**: production and preview deployments are all reachable there. Cloudflare does not reliably noindex these — add an `X-Robots-Tag: noindex` header rule scoped to `*.pages.dev` (or a Worker) and canonical to the custom domain. Search `site:pages.dev yourproject` to check for existing leakage.
- **Caching**: "Cache Everything" page rules can pin stale HTML (old titles/meta/canonicals) for days after a fix ships. After any SEO fix behind Cloudflare, purge cache and re-verify with `curl` checking the `cf-cache-status` header.
- **Workers as SEO tools**: a Worker is the right place for host-level 301 maps, `X-Robots-Tag` on path patterns, edge-side canonical enforcement (apex→www), and serving `robots.txt`/`sitemap.xml` for static hosts that can't.

## Webflow

Levers live in the dashboard, not a repo — audit via **Site settings → SEO / Publishing** and per-page settings:

- **The `.webflow.io` staging subdomain is indexable by default.** Site settings → SEO → "Disable Webflow subdomain indexing" must be ON (it serves a noindex robots meta on staging). Check `site:yoursite.webflow.io` — staging leakage is the most common Webflow SEO bug.
- **Robots.txt and sitemap** are edited/toggled in Site settings → SEO. Webflow auto-generates a sitemap; verify it excludes utility pages (password, 404, search) and that draft/paginated CMS URLs behave. Custom robots.txt replaces the default entirely — a client "cleaning it up" can wipe the sitemap line.
- **Canonicals**: set the **Global canonical tag URL** (Site settings → SEO) to the production origin — this makes Webflow emit correct self-referencing canonicals site-wide. Without it, pages ship with no canonical.
- **301 redirects**: Site settings → Publishing → 301 redirects UI. Supports wildcard patterns (`/old/(.*)` → `/new/%1`). Webflow offers no 302s and no header control — anything needing response headers (`X-Robots-Tag`, HSTS beyond default) needs Cloudflare in front or a proxy.
- **CMS collection pages**: title/meta set per-collection with field bindings — audit the *template*, one bad pattern duplicates across every item. Collection list pagination generates `?page=N` query URLs; ensure they're not competing (Webflow handles rel-canonical to self on them; check they're not in the sitemap as duplicates).
- **Custom code limits**: head code is capped (site-wide and per-page character limits), which constrains JSON-LD. Put shared schema site-wide, page-specific schema in per-page head code, and bind CMS fields into it for collection templates.
- **Rendering**: Webflow serves static HTML — content is crawlable. The exception is anything added via custom JS/embeds fetching client-side.

## Shopify

Shopify's SEO surface is mostly theme + a few unlockable files. The platform handles a lot correctly by default; the recurring problems:

- **Duplicate product URLs**: products render at `/products/handle` AND `/collections/collection-handle/products/handle`. Shopify canonicalizes the collection-scoped version to the base product URL, but **many themes link internally to the collection-scoped URL** — internal links should point at the canonical `/products/` path (edit `product-card` snippets to use `product.url` without the collection scope: `{{ product.url }}` vs `{{ product.url | within: collection }}` — remove `within`).
- **`robots.txt.liquid`**: editable since 2021 (Online Store → themes → edit code → add `templates/robots.txt.liquid`). Default blocks `/search`, `/cart`, tag-filtered collection URLs (`/collections/*+*`), etc. — the default is good; only extend it, don't replace wholesale.
- **The `myshopify.com` domain** canonicals/redirects to the primary domain when one is set ("Traffic from all your domains redirects to this primary domain" must be enabled). Verify with `curl -I https://store.myshopify.com`.
- **Tag pages** (`/collections/all/tag`) create thin near-duplicate crawl surface at scale; default robots.txt disallows `+`-combined tags but single-tag pages are crawlable — noindex them via theme logic if they're thin, or invest in them as merchandised pages if they match real queries.
- **Sitemap** is auto-generated at `/sitemap.xml`, not editable; control inclusion by publishing/unpublishing and via metafield `seo.hidden = 1` (hides from sitemap AND adds noindex).
- **Structured data**: most themes ship Product JSON-LD, often incomplete or duplicated by apps. Audit rendered output — a page with two conflicting Product schemas (theme + review app) risks losing rich results. Prefer one source of truth in the theme, with `offers`, `aggregateRating`, and `image` populated.
- **Apps and CWV**: each app injects render-blocking JS; Shopify sites fail INP/LCP mostly from app bloat. Audit installed apps against the loaded-scripts list before micro-optimizing the theme.
- **URL structure is fixed** (`/products/`, `/collections/`, `/pages/`, `/blogs/`) — don't promise clients custom paths; plan keyword strategy within the fixed prefixes.

## Wix, Squarespace, Framer

All three server-render their pages — crawlability of native content is fine; the work is in settings hygiene:

- **Wix**: SEO settings under "SEO" panel + per-page SEO tab; supports editable robots.txt, URL slug control, canonical overrides, structured-data injection per page, and pattern-based defaults ("SEO settings" templates for page types). Old prejudice about Wix and SEO is outdated — audit settings, not the platform.
- **Squarespace**: per-page SEO tab for title/description; canonical and clean URLs handled automatically; `robots.txt` NOT editable (blocks some system paths by default); redirects via Settings → Developer tools → URL mappings (`/old -> /new 301`, one per line). Built-in template heading structure is sometimes decorative (multiple h1s) — check rendered headings. No response-header control.
- **Framer**: publishes as static HTML with good CWV defaults; per-page settings for title/description/social image; site-wide settings for sitemap/robots toggles; redirects in Site settings → Redirects (supports wildcards). Watch for: content inside interactive components/variants that only mounts on interaction, and the `*.framer.app`/`framer.website` staging domain — set the custom domain as canonical and keep staging noindexed (Framer noindexes free-plan subdomains via robots; verify on paid custom setups).

For all closed platforms: when a needed lever doesn't exist (response headers, edge redirects, log access), the honest recommendation is Cloudflare-in-front or accepting the limitation — not fragile JS workarounds (a JS-injected canonical or noindex is unreliable; Google may process it, other engines won't).

## Frameworks Beyond Next.js

Same principles as `nextjs-seo.md` — full HTML in the response, metadata as code, sitemap/robots generated — mapped to each framework's idiom:

- **Astro**: static-first — ideal for content sites. Canonical via `new URL(Astro.url.pathname, Astro.site)` in a base layout (requires `site` in `astro.config`); sitemap via `@astrojs/sitemap`; robots.txt as a static file or endpoint. Islands hydrate client-side but their *initial* HTML is prerendered — content inside islands is crawlable; content *fetched* client-side inside an island is not.
- **Nuxt 3**: `useSeoMeta()` for typed meta (prefer over raw `useHead` for flat OG/Twitter fields), `nuxt-seo` / `@nuxtjs/sitemap` + `@nuxtjs/robots` modules, `nitro.prerender` for SSG routes, `routeRules` for per-path hybrid rendering and redirects (`redirect: { to, statusCode: 301 }`). SPA mode (`ssr: false`) has the same empty-shell hazard as any CSR app.
- **SvelteKit**: `<svelte:head>` per page for meta; `export const prerender = true` in `+layout.ts`/`+page.ts` for static routes; sitemap/robots as server endpoints (`src/routes/sitemap.xml/+server.ts`); redirects via `redirect(301, loc)` in load functions or `handle` hook. `adapter-static` requires prerender on all routes or a fallback that soft-404s — check status codes.
- **Remix / React Router v7**: `meta` export per route for title/OG; `headers` export for `X-Robots-Tag` and caching; sitemap/robots as resource routes; redirects via `redirect()` in loaders with explicit 301 (default is 302 — the classic Remix mistake for permanent moves).
- **Gatsby**: SSG by default; `Head` export (v4.19+) replaces react-helmet; `gatsby-plugin-sitemap`. Legacy Gatsby sites often hydrate stale content — verify build freshness and that client-only routes (`matchPath`) aren't expected to rank.
- **Plain SPA (Vite + React/Vue) on any static host**: no server rendering means no reliable indexing of unique per-route content. The fix is architectural (migrate the indexable surface to SSG/SSR, or prerender at build with something like `vite-ssg`) — not meta tags via react-helmet, which only paper over an empty shell.

## Cross-Platform Pitfalls

The bugs that recur regardless of host — check these on every platform-related audit:

1. **Indexed non-production surfaces**: staging/preview/branch/platform subdomains. Query `site:` for `.vercel.app`, `.netlify.app`, `.pages.dev`, `.webflow.io`, `.myshopify.com`, `.framer.website` variants of the brand. Fix with `X-Robots-Tag`/meta noindex on the surface + canonical on production; then remove stragglers via Search Console removal for the fastest cleanup. **Don't robots.txt-block an already-indexed staging domain** — blocking prevents Google from seeing the noindex.
2. **Redirect logic split across layers** (DNS/registrar forwarding, CDN edge rules, host config file, framework code) with no documented precedence. Consolidate into one layer; test the full matrix: `http/https × apex/www × trailing/non-trailing` should resolve in **one hop** to the canonical form.
3. **Bot protection blocking crawlers**: any WAF/challenge product (Cloudflare, Vercel Firewall, Kasada, DataDome). Symptom: crawl-stats fetch errors climb while the site "works fine." Verify with Search Console Live Test; allowlist verified bots by validation, not user-agent string (UA spoofing is why naive UA allowlists get disabled by security teams).
4. **Edge/CDN cache serving stale SEO fixes**: after shipping metadata/canonical/redirect fixes, purge and re-verify with `curl -sI` on the production URL; trust cache-status headers over the browser.
5. **Platform migration without a redirect map**: moving Webflow→Next.js or Shopify theme swaps change URL casing/slugs subtly. Crawl the old site for the full URL inventory *before* cutover; map every 200-status URL; anything unmapped is equity thrown away. (Full migration protocol: `references/audit-playbook.md`.)
