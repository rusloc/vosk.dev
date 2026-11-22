import Link from "next/link";
import { Container } from "@/components/container";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getPublishedServices } from "@/lib/services";
import { siteConfig } from "@/lib/site";

// Profiles, in the Contacts card's order; an empty URL is skipped.
const PROFILES = [
  ["LinkedIn", siteConfig.social.linkedin],
  ["Upwork", siteConfig.social.upwork],
  ["GitHub", siteConfig.social.github],
] as const;

export function SiteFooter({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const year = new Date().getFullYear();
  const link = "hover:text-foreground transition-colors";
  // Internal links (SEO spec T-09, 11-19): service pages out of draft, then About, Contact, Privacy (R-06).
  const pages = [
    ...getPublishedServices().map((s) => ({
      href: `/services/${s.slug}`,
      label: s.name,
    })),
    { href: "/about", label: dict.footer.about },
    { href: "/contact", label: dict.footer.contact },
    { href: "/privacy", label: dict.footer.privacy },
  ];

  return (
    <footer className="border-border border-t">
      {/* One row: ©, the links (they wrap inside their own column on a phone), availability. The home page fits
          between nav and footer with no scroll (CLAUDE.md "Landing page"), so the footer stays short: check the five
          sizes after a change (a third line on a 360 px phone made the home page scroll, 11-19). */}
      <Container className="text-muted-foreground flex items-center justify-between gap-x-6 py-5 font-mono text-xs tracking-wider uppercase sm:py-6">
        <p className="flex items-center">
          {/* One space each side whether or not "VOSK" shows (11-17: it read "©  VOSK"). */}
          ©<span className="hidden sm:inline">&nbsp;VOSK</span>&nbsp;{year}
        </p>

        <nav aria-label="Footer" className="min-w-0 flex-1">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-center">
            {pages.map((p) => (
              <li key={p.href}>
                <Link href={localizedPath(locale, p.href)} className={link}>
                  {p.label}
                </Link>
              </li>
            ))}
            {PROFILES.filter(([, url]) => url).map(([name, url]) => (
              <li key={name}>
                <a
                  href={url}
                  target="_blank"
                  rel="me noopener noreferrer"
                  className={link}
                >
                  {name}
                </a>
              </li>
            ))}
            <li>
              {/* Plain anchor, not `Link`: /feed.xml is a route handler, and
                  prefetching it would pull the XML on hover. */}
              <a
                href={localizedPath(locale, "/feed.xml")}
                title={dict.footer.rss}
                className={link}
              >
                RSS
              </a>
            </li>
          </ul>
        </nav>

        <p className="hidden items-center gap-2 sm:flex">
          <span aria-hidden="true" className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          {dict.footer.available}
        </p>
      </Container>
    </footer>
  );
}
