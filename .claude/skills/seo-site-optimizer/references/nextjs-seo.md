# Next.js SEO Reference (App Router)

Contents: [Rendering strategy](#rendering-strategy-for-seo) · [Metadata API](#metadata-api) · [JSON-LD](#json-ld-in-nextjs) · [sitemap.ts](#sitemapts) · [robots.ts](#robotsts) · [OG images](#dynamic-og-images) · [Canonicals, redirects, middleware](#canonicals-redirects-middleware) · [i18n](#internationalization) · [Common Next.js SEO bugs](#common-nextjs-seo-bugs)

---

## Rendering Strategy for SEO

The question per route: **is the full content in the HTML response?** Verify with `curl`, not the browser.

| Strategy | SEO fitness | Use for |
|---|---|---|
| **SSG** (static, build-time) | Best — instant TTFB, full HTML | Marketing pages, docs, posts that change on deploy |
| **ISR** (`revalidate: N` or on-demand `revalidatePath`) | Best — static speed + freshness | Blogs, product pages, programmatic SEO at scale (pair with `generateStaticParams` for the head of the distribution + `dynamicParams: true` for the tail) |
| **SSR** (dynamic rendering) | Fine — full HTML, but TTFB is your ranking-adjacent cost | Truly per-request pages (search results, personalized) |
| **Client-only** (`'use client'` page with fetch-in-effect) | Hazard — empty shell HTML | Never for indexable content |
| **PPR** (partial prerendering) | Good — static shell streams immediately | Mixed static/dynamic pages; keep SEO-critical content in the static shell, not inside the Suspense boundaries |

Streaming/Suspense note: Googlebot waits for the full streamed response, so content inside Suspense boundaries IS indexed — but most AI crawlers and other bots take the initial flush only. Keep title/meta/H1/primary copy outside Suspense.

Rule of thumb for a marketing site + app combo: marketing/blog/docs routes SSG or ISR in a route group with static rendering; the authenticated app can be as client-heavy as it wants behind `noindex`.

## Metadata API

Never hand-write `<head>` tags or use `next/head` in App Router — use the Metadata API so Next dedupes and orders correctly.

**Static** (layouts and fixed pages):

```tsx
// app/layout.tsx — the base every page inherits/merges
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"), // makes all relative URLs below absolute — REQUIRED, set once
  title: {
    default: "Brand — One-line value proposition",
    template: "%s | Brand", // child pages set title: "Page Name" and get "Page Name | Brand"
  },
  description: "Default description for pages that don't set one.",
  openGraph: {
    siteName: "Brand",
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    googleBot: { "max-image-preview": "large", "max-snippet": -1 },
  },
};
```

**Dynamic** (`generateMetadata` — runs server-side, can fetch; fetches are deduped with the page's own via `cache`/fetch memoization, so it's free):

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug); // same cached call the page uses
  if (!post) return { title: "Not found", robots: { index: false } };

  const url = `/blog/${post.slug}`;
  return {
    title: post.seoTitle ?? post.title,           // hits the layout template
    description: post.excerpt,
    alternates: { canonical: url },               // resolved absolute via metadataBase
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: [{ url: `/blog/${post.slug}/opengraph-image`, width: 1200, height: 630 }],
    },
  };
}
```

Key behaviors:
- Metadata **merges shallowly** parent→child per top-level key: a child setting `openGraph: { title }` **wipes** the layout's `openGraph.siteName` etc. Re-spread shared OG fields or centralize a `buildMetadata()` helper.
- `alternates.canonical` on every indexable page (self-referencing). Dynamic routes: canonical must be the clean path, never echo query params.
- Noindex a route: `robots: { index: false, follow: true }`. For the authed app section, put it in that route group's layout metadata AND consider `X-Robots-Tag` in middleware as a belt-and-suspenders (layout metadata doesn't apply to non-HTML assets).
- 404s must actually `notFound()` — a "not found" UI returned with 200 is a soft-404 factory.

## JSON-LD in Next.js

Server component, rendered into the page (never injected client-side):

```tsx
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD is not HTML-parsed but escape < to prevent </script> breakout from user content
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

// in page.tsx (server component):
<JsonLd data={{ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, /* … */ }} />
```

Place in the page body (valid and Google-supported) rather than fighting to get it into `<head>`. Build typed helpers per schema type (`articleSchema(post)`, `productSchema(p)`) — or use `schema-dts` for full typing.

## sitemap.ts

```tsx
// app/sitemap.ts
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPublishedPosts(); // only indexable, canonical, 200 URLs

  return [
    { url: "https://example.com", lastModified: new Date(SITE_UPDATED_AT), changeFrequency: "weekly", priority: 1 },
    { url: "https://example.com/pricing", lastModified: PRICING_UPDATED_AT },
    ...posts.map((p) => ({
      url: `https://example.com/blog/${p.slug}`,
      lastModified: p.updatedAt, // REAL content date from the DB, not new Date()
    })),
  ];
}
```

- `lastModified: new Date()` on everything is the classic mistake — it's a lie that trains Google to ignore your lastmod. Pull real timestamps (Supabase `updated_at`).
- >50k URLs: `generateSitemaps()` returns `[{id}]` chunks → `/sitemap/[id].xml`. Also worth splitting by type below the limit for GSC diagnostics — implement as route handlers (`app/sitemap/blog.xml/route.ts`) emitting XML, plus an index.
- Never include: noindexed pages, redirecting URLs, parameterized variants, the authed app.

## robots.ts

```tsx
// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/app/", "/admin/"] },
      // Explicit AI-crawler policy — decide, don't default (see ai-search.md):
      // { userAgent: "GPTBot", allow: "/" },
    ],
    sitemap: "https://example.com/sitemap.xml",
  };
}
```

Never disallow `/_next/` (breaks rendering). Keep `/api/og` (or wherever OG images live) crawlable.

## Dynamic OG Images

File convention — `opengraph-image.tsx` in any route segment auto-wires the meta tags:

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Post cover";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column",
                    justifyContent: "center", padding: 80, background: "#0a0a0a", color: "#fff" }}>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{post.title}</div>
        <div style={{ fontSize: 28, marginTop: 24, opacity: 0.7 }}>brand.com</div>
      </div>
    ),
    size
  );
}
```

Uses Satori: flexbox-only subset of CSS, `display: flex` required on multi-child divs, custom fonts loadable via `fonts` option. Also works for `twitter-image.tsx` and static `icon.tsx`. Keep it fast — social scrapers time out around 3–5s.

## Canonicals, Redirects, Middleware

Host/protocol/format normalization — enforce ONE canonical URL shape at the edge:

- `next.config.js`: `trailingSlash: false` (pick one, forever), plus `redirects()` for legacy URL maps:
  ```js
  async redirects() {
    return [
      { source: "/old-blog/:slug", destination: "/blog/:slug", permanent: true }, // 308
    ];
  }
  ```
- Vercel handles apex↔www and https at the project domain level — configure the redirect there rather than in middleware.
- Middleware for the rest: lowercase paths, strip tracking params from canonical concerns (don't strip them from the actual URL — analytics needs them; canonical tag handles the dedup), inject `X-Robots-Tag: noindex` on preview deployments:
  ```ts
  // Vercel preview/branch deploys are a duplicate-content risk if discovered.
  // Vercel sets X-Robots-Tag: noindex on preview URLs automatically — but verify,
  // and never point a custom domain at a preview.
  ```
- Internal links: always `next/link` with the final canonical path — audit for links to redirecting URLs after any URL-structure change.

## Internationalization

App Router has no built-in i18n routing — implement `/[locale]/` segments (with `next-intl` or hand-rolled middleware). SEO requirements regardless of library:
- `generateMetadata` emits `alternates: { canonical, languages: { "en": "/en/page", "tr": "/tr/page", "x-default": "/page" } }` — bidirectional and complete per cluster (see technical-seo.md for hreflang rules).
- `<html lang={locale}>` in the locale layout.
- Locale-detection middleware must **rewrite/suggest, not hard-redirect** crawlers away from locale URLs; every locale version must be directly fetchable at its own URL with no cookie/header dependency.
- Translated slugs where feasible; per-locale sitemaps or hreflang-annotated sitemap entries.

## Common Next.js SEO Bugs

Scan any Next.js codebase for these:

1. **`metadataBase` missing** → relative OG/canonical URLs break or point at `localhost`/vercel.app. Symptom: warnings at build, broken share cards.
2. **OG merge wipe** — child `openGraph` object obliterating layout defaults (shallow merge). Centralize a metadata builder.
3. **Client-component pages for indexable content** — `'use client'` at the page level with data fetched in `useEffect`. Convert to server components.
4. **`vercel.app` domain indexed** alongside the custom domain — duplicate site. Fix: canonical tags cover it, but better: redirect the `.vercel.app` domain to the primary in middleware (check `host` header).
5. **Soft 404s**: dynamic route rendering an empty state with 200 instead of calling `notFound()`; `generateMetadata` not handling the missing-entity case.
6. **`lastModified: new Date()`** sitemap-wide.
7. **Draft/preview content leaking**: preview routes indexable, draftMode pages cached publicly.
8. **Route group confusion**: assuming `(marketing)` group layout metadata applies elsewhere; each group needs its own robots posture.
9. **Search pages indexable**: `/search?q=` generating infinite thin URLs — noindex + robots-block internal search results.
10. **Images**: `next/image` without meaningful `alt`; hero LCP image lazy-loaded (add `priority`); remote images unoptimized.
11. **redirect() misuse**: `redirect()` in server components emits 307 by default — use `permanentRedirect()` (308) for moved content.
12. **Trailing-slash flip-flop**: changing `trailingSlash` config on a live site without realizing it 308s every URL — fine once, catastrophic to toggle repeatedly.
