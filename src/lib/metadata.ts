import type { Metadata } from "next";
import { siteConfig } from "./site";
import { defaultLocale, localizedPath, type Locale } from "./i18n/config";

/**
 * Build page metadata from the shared site defaults. `path` is the logical,
 * locale-agnostic path ("/blog"); `locale` decides the canonical URL and the
 * OpenGraph locale. Every page gets `hreflang` alternates for both languages
 * plus an `x-default` pointing at English.
 */
export function buildMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  locale = defaultLocale,
}: {
  title?: string;
  description?: string;
  path?: string;
  locale?: Locale;
}): Metadata {
  const canonical = localizedPath(locale, path);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: localizedPath("en", path),
        ru: localizedPath("ru", path),
        "x-default": localizedPath("en", path),
      },
      types: { "application/rss+xml": "/feed.xml" },
    },
    openGraph: {
      title: title ? `${title} · ${siteConfig.name}` : siteConfig.title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: locale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} · ${siteConfig.name}` : siteConfig.title,
      description,
    },
  };
}
