import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { getAllPosts } from "@/lib/content";

// Single manual lastmod for the static marketing routes. Bump when content
// meaningfully changes — a per-request `new Date()` here is a lastmod lie that
// trains crawlers to ignore the signal. Blog posts use their real frontmatter date.
const SITE_UPDATED = new Date("2026-07-08");

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; priority?: number }> = [
    { path: "/", priority: 1 },
    { path: "/work" },
    { path: "/services" },
    { path: "/blog" },
    { path: "/contact" },
  ];

  const staticEntries: MetadataRoute.Sitemap = routes.map(
    ({ path, priority }) => ({
      url: `${siteConfig.url}${path === "/" ? "" : path}`,
      lastModified: SITE_UPDATED,
      ...(priority !== undefined ? { priority } : {}),
    }),
  );

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  return [...staticEntries, ...postEntries];
}
