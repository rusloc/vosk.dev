import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

/**
 * Locale routing — "English at root, Russian under /ru".
 *
 *  - `/ru/…`  → passed through to the [locale] route as-is.
 *  - `/en/…`  → redirected to the unprefixed URL (the default locale never shows
 *               a prefix, so there's one canonical URL per page).
 *  - `/…`     → rewritten internally to `/en/…` (URL stays unprefixed) so it
 *               resolves against the [locale] segment.
 *
 * Top-level metadata routes (opengraph-image, icon, …) have no file extension,
 * so the matcher can't exclude them by dot — they're skipped explicitly here.
 */
const METADATA_ROUTES = new Set(["/opengraph-image", "/icon", "/apple-icon"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (METADATA_ROUTES.has(pathname)) return NextResponse.next();

  const first = pathname.split("/")[1] ?? "";

  if (isLocale(first)) {
    // Explicit default-locale prefix → redirect to the canonical unprefixed URL.
    if (first === defaultLocale) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.slice(`/${defaultLocale}`.length) || "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Unprefixed path → serve the default locale without changing the URL.
  const url = req.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Run on everything except Next internals, API routes, and files with an
  // extension (sitemap.xml, robots.txt, feed.xml, manifest.webmanifest, images, …).
  // `api/` has to be named explicitly: API paths carry no extension, so the
  // dot rule doesn't cover them and they'd be rewritten under /en and 404.
  matcher: ["/((?!_next/|_vercel/|api/|.*\\..*).*)"],
};
