import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

// Single manual lastmod for the static marketing routes. Bump when content
// meaningfully changes — a per-request `new Date()` here is a lastmod lie that
// trains crawlers to ignore the signal. Blog `[slug]` entries get real dates
// once the content pipeline (Goal 2) lands.
const SITE_UPDATED = new Date("2026-07-08");

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; priority?: number }> = [
    { path: "/", priority: 1 },
    { path: "/work" },
    { path: "/services" },
    { path: "/blog" },
    { path: "/contact" },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${siteConfig.url}${path === "/" ? "" : path}`,
    lastModified: SITE_UPDATED,
    ...(priority !== undefined ? { priority } : {}),
  }));
}
