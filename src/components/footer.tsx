import { Container } from "@/components/container";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

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
      {/* Two columns since the language switch came out. The middle column it
          used to centre is gone rather than left empty — an empty grid cell would
          have kept the footer's old height for no content. */}
      <Container className="text-muted-foreground flex items-center justify-between py-8 font-mono text-xs tracking-wider uppercase">
        <p className="flex items-center">
          {/* One space each side whether or not "VOSK" shows (11-17: it read "©  VOSK"). */}
          ©<span className="hidden sm:inline">&nbsp;VOSK</span>&nbsp;{year}
        </p>

        <div className="flex items-center gap-4">
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
