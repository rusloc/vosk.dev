import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * Open to everything except the API surface. AI crawlers (GPTBot, ClaudeBot,
 * PerplexityBot, …) are deliberately not blocked — citation in answer engines is
 * the same visibility goal as ranking, and this site has nothing to protect
 * from it.
 *
 * `/_next/` stays crawlable (blocking it breaks rendering), and so do the
 * metadata routes (`/opengraph-image`, `/icon`) — a blocked OG image is a blank
 * share card.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Not indexable content, and the token endpoint is POST-only anyway.
      disallow: ["/api/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
