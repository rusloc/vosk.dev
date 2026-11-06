import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getAllPosts, getAllTags, getPostsByTag } from "@/lib/content";
import { getIndexableShowcaseSlugs } from "@/lib/work";
import { locales, type Locale } from "@/lib/i18n/config";

// Single manual lastmod for the static marketing routes. Bump when content
// meaningfully changes — a per-request `new Date()` here is a lastmod lie that
// trains crawlers to ignore the signal. Blog posts use their real frontmatter date.
const SITE_UPDATED = new Date("2026-11-05"); // 11-04/05: showcase titles and About bullets, ACME Marketing added

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
  // Logical, locale-agnostic paths — each is emitted once per locale below.
  const pages: Page[] = [
    { path: "/", lastModified: SITE_UPDATED, priority: 1 },
    { path: "/work", lastModified: SITE_UPDATED },
    { path: "/services", lastModified: SITE_UPDATED },
    { path: "/contact", lastModified: SITE_UPDATED },
    {
      path: "/blog",
      lastModified: newestPost
        ? new Date(newestPost.updated ?? newestPost.date)
        : SITE_UPDATED,
    },
    ...getIndexableShowcaseSlugs().map((slug) => ({
      path: `/work/${slug}`,
      lastModified: SITE_UPDATED,
    })),
    ...getAllPosts().map((post) => ({
      path: `/blog/${post.slug}`,
      lastModified: new Date(post.updated ?? post.date),
    })),
    // A tag page is as fresh as its newest post (`getPostsByTag` is newest-first,
    // and a tag only exists here because at least one post carries it).
    ...getAllTags().map(({ slug }) => {
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
