import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import {
  getAllPosts,
  getAllTags,
  getPostsByTag,
  isTagIndexable,
} from "@/lib/content";
import { getIndexableShowcases } from "@/lib/work";
import { getPublishedServices } from "@/lib/services";
import { locales, type Locale } from "@/lib/i18n/config";

// Single manual lastmod for the static marketing routes. Bump when content
// meaningfully changes — a per-request `new Date()` here is a lastmod lie that
// trains crawlers to ignore the signal. Blog posts use their real frontmatter date.
const SITE_UPDATED = new Date("2026-11-27"); // 11-27: "Worked with" logo row on /about; 11-26: /work subtitle names topics (owner), showcase cards one size; 11-22: "freelance" > "consultant" in titles, H1, descriptions, OG card, JSON-LD jobTitle (R-11); 11-19: home back to the hero only (owner: clean, no scroll); 11-18: SEO Block 1 (titles, home sections, /about, all plans on /services, showcase CTA box); 11-17: showcase search descriptions and data labels, P&L title, Power BI on the executive dashboard, services and contact copy; 11-16: two n8n workflow showcases on /work; 11-15: showcase copy rewritten, client type on every showcase; 11-09: DP-600 link on Contacts; 11-06: "Coal mining" title, ACME Marketing Ask AI; 11-04/05: showcase titles and About bullets, ACME Marketing added

function newestOf(page: Date, ...entries: { updated: string }[]): Date {
  return new Date(
    Math.max(page.getTime(), ...entries.map((e) => Date.parse(e.updated))),
  );
}

type Page = {
  path: string;
  lastModified: Date;
  priority?: number;
  // Restricts a path to a subset of `locales`. Nothing sets it while the site is
  // English-only — it is what a partially-translated path would use.
  locales?: readonly Locale[];
};

export default function sitemap(): MetadataRoute.Sitemap {
  // The blog index changes with every post, so it is as fresh as the newest one.
  const newestPost = getAllPosts()[0];
  const indexable = getIndexableShowcases();
  // Logical, locale-agnostic paths — each is emitted once per locale below.
  const pages: Page[] = [
    { path: "/", lastModified: SITE_UPDATED, priority: 1 },
    // As fresh as the newest case study or the page itself, whichever is later.
    { path: "/work", lastModified: newestOf(SITE_UPDATED, ...indexable) },
    { path: "/services", lastModified: SITE_UPDATED },
    { path: "/contact", lastModified: SITE_UPDATED },
    { path: "/about", lastModified: SITE_UPDATED },
    // Service pages out of draft only (SEO spec T-04): a draft is noindex, and the sitemap lists no noindexed URL.
    ...getPublishedServices().map(({ slug }) => ({
      path: `/services/${slug}`,
      lastModified: SITE_UPDATED,
    })),
    {
      path: "/blog",
      lastModified: newestPost
        ? new Date(newestPost.updated ?? newestPost.date)
        : SITE_UPDATED,
    },
    // Each case study carries its own date (SEO spec T-14), so one edit doesn't restamp all of them.
    ...indexable.map(({ slug, updated }) => ({
      path: `/work/${slug}`,
      lastModified: new Date(updated),
    })),
    ...getAllPosts().map((post) => ({
      path: `/blog/${post.slug}`,
      lastModified: new Date(post.updated ?? post.date),
    })),
    // A tag page is as fresh as its newest post (`getPostsByTag` is newest-first,
    // and a tag only exists here because at least one post carries it).
    // Thin tags (fewer than MIN_INDEXED_TAG_POSTS posts) are noindex, and the sitemap lists no noindexed URL.
    ...getAllTags()
      .filter(isTagIndexable)
      .map(({ slug }) => {
        const newest = getPostsByTag(slug)[0]!;
        return {
          path: `/blog/tag/${slug}`,
          lastModified: new Date(newest.updated ?? newest.date),
        };
      }),
  ];

  // One row per locale the path is published in, each carrying the hreflang set
  // for exactly those locales — the sitemap and the per-page `alternates` from
  // `buildMetadata` have to agree or neither counts. A single-locale path gets no
  // `alternates` at all rather than a cluster pointing at itself.
  return pages.flatMap(({ path, lastModified, priority, locales: only }) => {
    const published = only ?? locales;

    return published.map((locale) => ({
      url: absoluteUrl(locale, path),
      lastModified,
      ...(priority !== undefined ? { priority } : {}),
      ...(published.length > 1
        ? {
            alternates: {
              languages: {
                ...Object.fromEntries(
                  published.map((l) => [l, absoluteUrl(l, path)]),
                ),
                "x-default": absoluteUrl("en", path),
              },
            },
          }
        : {}),
    }));
  });
}
