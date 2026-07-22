"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  locales,
  localizedPath,
  logicalPath,
  type Locale,
} from "@/lib/i18n/config";
import { cn } from "@/lib/cn";

/**
 * Two-language toggle. Maps the current page to its counterpart in the other
 * locale by swapping the URL prefix (slugs are shared across locales, so the
 * mapping is 1:1). Renders compact EN / RU pills.
 */
export function LangSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();
  const logical = logicalPath(pathname);

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={label}>
      {locales.map((l) => (
        <Link
          key={l}
          href={localizedPath(l, logical)}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
          className={cn(
            "rounded px-1.5 py-1 text-xs font-medium uppercase transition-colors",
            l === locale
              ? "text-foreground font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
