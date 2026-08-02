import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_HEADER } from "@/lib/i18n/config";

/**
 * Locale routing — "English at root, Russian under /ru".
 *
 *  - `/ru/…`  → passed through to the [locale] route as-is.
 *  - `/en/…`  → redirected to the unprefixed URL (the default locale never shows
 *               a prefix, so there's one canonical URL per page).
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

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  const locale = isLocale(first) ? first : defaultLocale;

  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, locale);
  const forward = { request: { headers } };

  if (METADATA_ROUTES.has(pathname)) return NextResponse.next(forward);

  if (isLocale(first)) {
    // Explicit default-locale prefix → redirect to the canonical unprefixed URL.
    if (first === defaultLocale) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.slice(`/${defaultLocale}`.length) || "/";
      // 308, not the default 307: this is permanent canonicalization, and a
      // temporary redirect tells crawlers to keep the prefixed URL indexed.
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next(forward);
  }

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
  matcher: ["/((?!_next/|_vercel/|api/|.*\\..*).*)"],
};
