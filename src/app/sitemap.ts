import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { getAllPosts, getAllTags, getPostsByTag } from "@/lib/content";
import { getShowcaseSlugs } from "@/lib/work";
import { locales, localizedPath, type Locale } from "@/lib/i18n/config";

// Single manual lastmod for the static marketing routes. Bump when content
// meaningfully changes — a per-request `new Date()` here is a lastmod lie that
// trains crawlers to ignore the signal. Blog posts use their real frontmatter date.
const SITE_UPDATED = new Date("2026-07-08");

const abs = (locale: Locale, path: string) =>
  `${siteConfig.url}${localizedPath(locale, path)}`;

export default function sitemap(): MetadataRoute.Sitemap {
  // Logical, locale-agnostic paths — each is emitted once per locale below.
  const pages: Array<{ path: string; lastModified: Date; priority?: number }> = [
    { path: "/", lastModified: SITE_UPDATED, priority: 1 },
    { path: "/work", lastModified: SITE_UPDATED },
    { path: "/services", lastModified: SITE_UPDATED },
    { path: "/blog", lastModified: SITE_UPDATED },
    { path: "/contact", lastModified: SITE_UPDATED },
    ...getShowcaseSlugs().map((slug) => ({
      path: `/work/${slug}`,
      lastModified: SITE_UPDATED,
    })),
    ...getAllPosts().map((post) => ({
      path: `/blog/${post.slug}`,
      lastModified: new Date(post.date),
    })),
    // A tag page is as fresh as its newest post (`getPostsByTag` is newest-first,
    // and a tag only exists here because at least one post carries it).
    ...getAllTags().map(({ slug }) => ({
      path: `/blog/tag/${slug}`,
      lastModified: new Date(getPostsByTag(slug)[0]!.date),
    })),
  ];

  // One row per locale, each carrying the full hreflang set — the sitemap and
  // the per-page `alternates` from `buildMetadata` have to agree or neither counts.
  return pages.flatMap(({ path, lastModified, priority }) =>
    locales.map((locale) => ({
      url: abs(locale, path),
      lastModified,
      ...(priority !== undefined ? { priority } : {}),
      alternates: {
        languages: {
          ...Object.fromEntries(locales.map((l) => [l, abs(l, path)])),
          "x-default": abs("en", path),
        },
      },
    })),
  );
}
