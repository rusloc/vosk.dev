import { ImageResponse } from "next/og";
import { getAllPosts, getPostBySlug } from "@/lib/content";
import { siteConfig } from "@/lib/site";
import { locales } from "@/lib/i18n/config";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getAllPosts().map(({ slug }) => ({ locale, slug })),
  );
}

// Per-post share card — post title on the cream theme, VOSK wordmark footer.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "VOSK blog post";

export default async function PostOgImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.title ?? siteConfig.title;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 96,
        background: "#fff8e7",
        color: "#1f1b16",
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 600, color: "#6f6a5f" }}>
        {`${siteConfig.author.name} · Blog`}
      </div>
      <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>
        {title}
      </div>
      <div style={{ fontSize: 44, fontWeight: 700, color: "#4f46e5" }}>
        VOSK
      </div>
    </div>,
    size,
  );
}
