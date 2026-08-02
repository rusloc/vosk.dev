import Link from "next/link";
import { Container } from "@/components/container";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LangSwitcher } from "@/components/lang-switcher";
import { siteConfig } from "@/lib/site";

export function SiteFooter({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      {/* Site links. The nav was the only place every page was linked from, so
          deep pages sat one hop from a single source; a footer set doubles that
          and puts the same links at the bottom of every scroll. */}
      <Container className="border-border border-b py-6">
        <nav aria-label={dict.footer.sitemap}>
          <ul className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs tracking-wider uppercase">
            {[
              { path: "/", label: dict.nav.home },
              { path: "/work", label: dict.nav.work },
              { path: "/blog", label: dict.nav.blog },
              { path: "/services", label: dict.nav.services },
              { path: "/contact", label: dict.nav.contact },
            ].map(({ path, label }) => (
              <li key={path}>
                <Link
                  href={localizedPath(locale, path)}
                  className="hover:text-foreground transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      {/* Three columns so the language switch stays centered regardless of the
          side content (the availability line is hidden below `sm`). */}
      <Container className="text-muted-foreground grid grid-cols-3 items-center py-8 font-mono text-xs tracking-wider uppercase">
        {/* Legal name, not the brand name: it's the accountable person behind
            VOSK. Same string in every locale. */}
        <p className="flex items-center justify-self-start">
          © <span className="hidden sm:inline">&nbsp;VOSK</span>
          &nbsp;{year}
          <span className="hidden md:inline">
            &nbsp;· {siteConfig.author.legalName}
          </span>
        </p>

        <div className="justify-self-center">
          <LangSwitcher locale={locale} label={dict.langSwitcher.label} />
        </div>

        <div className="flex items-center gap-4 justify-self-end">
          {/* Plain anchor, not `Link`: /feed.xml is a route handler, and
              prefetching it would pull the XML on hover. */}
          <a
            href={localizedPath(locale, "/feed.xml")}
            title={dict.footer.rss}
            className="hover:text-foreground transition-colors"
          >
            RSS
          </a>

          <p className="hidden items-center gap-2 sm:flex">
            <span aria-hidden="true" className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            {dict.footer.available}
          </p>
        </div>
      </Container>
    </footer>
  );
}
