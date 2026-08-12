import Link from "next/link";

/**
 * Filled left-arrow + label — the one way back from a detail page. Used by the
 * showcase page and the blog post page, both of which replaced a crumb trail
 * with it; pair it with `breadcrumbGraph()`, which still describes the same
 * hierarchy this link walks up.
 *
 * `w-fit` is load-bearing: both call sites mount it inside a flex column, where
 * the default `align-items: stretch` would otherwise spread the link — and its
 * click target — across the full row.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground group inline-flex w-fit items-center gap-2 text-sm transition-colors"
    >
      <span className="bg-foreground text-background inline-flex h-8 w-8 items-center justify-center rounded-full transition-opacity group-hover:opacity-90">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 12H5M11 6l-6 6 6 6"
          />
        </svg>
      </span>
      {label}
    </Link>
  );
}
