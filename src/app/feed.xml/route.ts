import { getAllPosts } from "@/lib/content";
import { siteConfig } from "@/lib/site";

// RSS 2.0 feed built from published posts. No extra dependency — hand-rolled XML.
export const dynamic = "force-static";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET(): Response {
  const { url, name, description } = siteConfig;
  const posts = getAllPosts();

  const items = posts
    .map((post) => {
      const link = `${url}/blog/${post.slug}`;
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
<rss version="2.0">
  <channel>
    <title>${escapeXml(name)} — Blog</title>
    <link>${url}/blog</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${url}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
