import { getAllPosts } from "./content";
import { siteConfig } from "./site";
import { localizedPath, type Locale } from "./i18n/config";
import { getDictionary } from "./i18n/dictionaries";

/**
 * RSS 2.0 feed, one per locale. Hand-rolled XML — no extra dependency.
 *
 * Channel metadata is localized and item links point at that locale's URLs, so a
 * Russian subscriber lands on `/ru/blog/…`. The post bodies themselves are still
 * English (`content/blog/*.mdx` is single-language); `<language>` describes the
 * edition being served, not the prose.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildFeed(locale: Locale): Response {
  const { url, name } = siteConfig;
  const t = getDictionary(locale).blog;
  const abs = (path: string) => `${url}${localizedPath(locale, path)}`;

  const items = getAllPosts()
    .map((post) => {
      const link = abs(`/blog/${post.slug}`);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(name)} — ${escapeXml(t.title)}</title>
    <link>${abs("/blog")}</link>
    <description>${escapeXml(t.metaDescription)}</description>
    <language>${locale}</language>
    <atom:link href="${abs("/feed.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
