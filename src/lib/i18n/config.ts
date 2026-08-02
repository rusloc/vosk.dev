/**
 * i18n config — the single source of truth for which locales exist and how they
 * map to URLs. Routing is "English at root, Russian under /ru": the default
 * locale carries no prefix (so existing URLs and their SEO are preserved) and
 * every other locale is prefixed. The proxy enforces this; the [locale]
 * segment renders it.
 */
export const locales = ["en", "ru"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * Request header the proxy stamps with the resolved locale, for the one place
 * that can't read the `[locale]` param: `app/global-not-found.tsx`.
 */
export const LOCALE_HEADER = "x-locale";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Map a logical, locale-agnostic path ("/", "/blog/x") to the URL for `locale`.
 * Default locale → unchanged; others → prefixed ("/ru", "/ru/blog/x").
 */
export function localizedPath(locale: Locale, path: string): string {
  const clean = path === "" ? "/" : path;
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/**
 * Inverse of {@link localizedPath}: strip a leading locale prefix to recover the
 * logical path. "/ru/blog/x" → "/blog/x"; "/blog/x" → "/blog/x".
 */
export function logicalPath(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  if (first && isLocale(first) && first !== defaultLocale) {
    return `/${rest.join("/")}`.replace(/\/$/, "") || "/";
  }
  return pathname;
}
