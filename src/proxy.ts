import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_HEADER } from "@/lib/i18n/config";

/**
 * Locale routing. The site is English-only, served unprefixed.
 *
 *  - `/en/…`  → redirected to the unprefixed URL (the default locale never shows
 *               a prefix, so there's one canonical URL per page).
 *  - `/ru/…`  → redirected to the unprefixed URL. Russian is gone, but those URLs
 *               were live and in the sitemap, so they are retired with a 308
 *               rather than left to 404 — an indexed URL that starts 404ing loses
 *               whatever equity it had and dead-ends anyone holding the link.
 *  - `/…`     → rewritten internally to `/en/…` (URL stays unprefixed) so it
 *               resolves against the [locale] segment.
 *
 * Named `proxy` (not `middleware`): Next 16 renamed the file convention, and
 * keeping both names is a build error.
 *
 * Every forwarded request carries the resolved locale in `LOCALE_HEADER`. Pages
 * read the `[locale]` param instead — the header exists for
 * `app/global-not-found.tsx`, which compiles into its own entry and so never
 * receives params. It is set unconditionally, overwriting any client value.
 *
 * Top-level metadata routes (opengraph-image, icon, …) have no file extension,
 * so the matcher can't exclude them by dot — they're skipped explicitly here.
 */
const METADATA_ROUTES = new Set(["/opengraph-image", "/icon", "/apple-icon"]);

// Locale prefixes that no longer exist but were once published. Retired with the
// same 308 the default-locale prefix gets, to the same logical path — every /ru
// page had an English counterpart at the unprefixed URL, so none of these lands
// on the home page as a catch-all.
const RETIRED_PREFIXES = ["ru"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  const locale = isLocale(first) ? first : defaultLocale;

  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, locale);
  const forward = { request: { headers } };

  if (METADATA_ROUTES.has(pathname)) return NextResponse.next(forward);

  // 308, not the default 307, in both branches below: this is permanent
  // canonicalization, and a temporary redirect tells crawlers to keep the
  // prefixed URL indexed.
  if (first === defaultLocale || RETIRED_PREFIXES.includes(first)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(`/${first}`.length) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (isLocale(first)) return NextResponse.next(forward);

  // Unprefixed path → serve the default locale without changing the URL.
  const url = req.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, forward);
}

export const config = {
  // Run on everything except Next internals, API routes, and files with an
  // extension (sitemap.xml, robots.txt, feed.xml, manifest.webmanifest, images, …).
  // `api/` has to be named explicitly: API paths carry no extension, so the
  // dot rule doesn't cover them and they'd be rewritten under /en and 404.
  // `lp/` (11-20): the ad-only landing pages live outside `[locale]`, with a layout of their own (`app/lp/`).
  matcher: ["/((?!_next/|_vercel/|api/|lp/|.*\\..*).*)"],
};
