import type { Metadata } from "next";
import { siteConfig } from "./site";

/** Build page metadata from the shared site defaults. */
export function buildMetadata({
  title,
  description = siteConfig.description,
  path = "/",
}: {
  title?: string;
  description?: string;
  path?: string;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
      types: { "application/rss+xml": "/feed.xml" },
    },
    openGraph: {
      title: title ? `${title} · ${siteConfig.name}` : siteConfig.title,
      description,
      url: path,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} · ${siteConfig.name}` : siteConfig.title,
      description,
    },
  };
}
