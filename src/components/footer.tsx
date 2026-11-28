import Link from "next/link";
import { Container } from "@/components/container";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * The site footer (owner, 11-28; the 11-19 one was removed on 11-22): ©, one link to Privacy, availability. Nothing
 * else: the pages are in the nav, the profiles on /about. Not on the /lp/* landing pages, which have a layout of
 * their own. The live chat launcher lifts above it (components/livechat/live-chat.tsx finds it as `body > footer`).
 */
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
      {/* One short row. The home page fits between nav and footer with no scroll (CLAUDE.md "Landing page"): check
          it at the usual sizes and a 360 px phone after any change here. */}
      <Container className="text-muted-foreground flex items-center justify-between gap-x-6 py-5 font-mono text-xs tracking-wider uppercase sm:py-6">
        <p className="flex items-center">
          {/* One space each side whether or not "VOSK" shows (11-17: it read "©  VOSK"). */}
          ©<span className="hidden sm:inline">&nbsp;VOSK</span>&nbsp;{year}
        </p>

        <Link
          href={localizedPath(locale, "/privacy")}
          className="hover:text-foreground transition-colors"
        >
          {dict.footer.privacy}
        </Link>

        {/* Hidden on phones: the three items do not fit one row at 390 px. */}
        <p className="hidden items-center gap-2 sm:flex">
          <span aria-hidden="true" className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          {dict.footer.available}
        </p>
      </Container>
    </footer>
  );
}
