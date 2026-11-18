/**
 * i18n config — the single source of truth for which locales exist and how they
 * map to URLs. The default locale carries no prefix (so existing URLs and their
 * SEO are preserved) and every other locale would be prefixed. The proxy
 * enforces this; the [locale] segment renders it.
 *
 * The site is English-only. Russian was removed from `locales` rather than torn
 * out of the codebase: `ru.ts` is intact and this list is the one edit that
 * brings it back. Everything downstream — static params, the sitemap, hreflang
 * alternates, the feed — derives from this array, so nothing else has to change
 * to re-add a locale. What does NOT come back automatically is the switcher UI
 * (deleted from the footer) and the `/ru` redirect in `proxy.ts`.
 */
export const locales = ["en"] as const;
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

/** The `[locale]` route param as a `Locale`, falling back to the default (was written out in every page). */
export function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : defaultLocale;
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
 *
 * The DEFAULT locale's prefix is stripped too, even though it never appears in
 * the browser. The proxy *rewrites* an unprefixed URL to "/en/…" internally, so
 * `usePathname()` reports "/en/blog" while a page is being prerendered — leaving
 * "/en" attached made every nav item fail its active check and pointed the
 * language switch at "/ru/en/blog".
 */
export function logicalPath(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  if (first && isLocale(first)) {
    return `/${rest.join("/")}`.replace(/\/$/, "") || "/";
  }
  return pathname;
}
