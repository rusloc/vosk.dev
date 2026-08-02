import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { Container } from "@/components/container";
import {
  defaultLocale,
  isLocale,
  localizedPath,
  LOCALE_HEADER,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * The only 404 surface this app reaches.
 *
 * `[locale]/layout.tsx` sets `dynamicParams = false`, so an unmatched param 404s
 * at the routing layer before any segment mounts — a segment-level
 * `not-found.tsx` never renders. Reading a dynamic API in one is worse than
 * useless: it taints the whole `[locale]` loader tree and drops every page out
 * of static generation.
 *
 * This file compiles into the separate `/_not-found` entry, so `headers()` here
 * makes only that route dynamic. Bypassing the layout means supplying our own
 * `<html>`/`<body>`, styles and fonts. It takes no props — the locale comes from
 * the header the proxy stamps on every forwarded request.
 */
async function resolveLocale() {
  const value = (await headers()).get(LOCALE_HEADER) ?? "";
  return isLocale(value) ? value : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await resolveLocale()).notFound;
  return { title: t.title };
}

export default async function GlobalNotFound() {
  const locale = await resolveLocale();
  const t = getDictionary(locale).notFound;

  return (
    <html lang={locale} className={`${fontVariables} h-full`}>
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans antialiased">
        <Container className="py-32 text-center">
          <p className="text-primary text-sm font-medium">{t.code}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-4">{t.body}</p>
          <Link
            href={localizedPath(locale, "/")}
            className="border-border hover:bg-muted mt-8 inline-flex h-11 items-center justify-center rounded-md border px-6 text-sm font-medium transition-colors"
          >
            {t.back}
          </Link>
        </Container>
      </body>
    </html>
  );
}
