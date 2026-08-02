import Link from "next/link";
import { localizedPath, type Locale } from "@/lib/i18n/config";

export type Crumb = { name: string; path?: string };

/**
 * Visible breadcrumb trail for pages below the home page. Pair it with
 * `breadcrumbGraph()` from lib/structured-data — the JSON-LD has to mirror
 * something a visitor can actually see, and it doubles as the second crawlable
 * path back up the tree (the site's nav is otherwise the only internal linking).
 *
 * The last crumb is the current page: rendered as text, not a self-link, and
 * marked `aria-current`.
 */
export function Breadcrumbs({
  locale,
  trail,
  className = "",
}: {
  locale: Locale;
  trail: readonly Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
        {trail.map((crumb, i) => (
          <li key={crumb.name} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden="true" className="opacity-50">
                /
              </span>
            )}
            {crumb.path ? (
              <Link
                href={localizedPath(locale, crumb.path)}
                className="hover:text-foreground transition-colors"
              >
                {crumb.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {crumb.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
