import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";
import { locales } from "@/lib/i18n/config";
import {
  PLATFORM_LABEL,
  getShowcase,
  getShowcaseSlugs,
  localize,
} from "@/lib/work";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getShowcaseSlugs().map((slug) => ({ locale, slug })),
  );
}

// Per-showcase share card — the blog card's layout, with the platform in the eyebrow.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "VOSK showcase";

export default async function ShowcaseOgImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const source = getShowcase(slug);
  const showcase = source ? localize(source, "en") : null;
  const title = showcase?.title ?? siteConfig.title;
  // A JS report with a published Power BI flavour is both (11-17 SEO check)
  const formats = showcase
    ? showcase.platform === "js" && showcase.powerBi
      ? `${PLATFORM_LABEL["power-bi"]} · ${PLATFORM_LABEL.js}`
      : PLATFORM_LABEL[showcase.platform]
    : "";
  const eyebrow = showcase
    ? `${siteConfig.author.name} · Showcase · ${formats}`
    : siteConfig.author.name;

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
        {eyebrow}
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
