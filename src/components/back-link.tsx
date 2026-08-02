import Link from "next/link";

/** Circled left-arrow + label. Used by the post page and the tag filter page. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-2 text-sm transition-colors"
    >
      <span className="bg-foreground text-background inline-flex h-7 w-7 items-center justify-center rounded-full transition-opacity group-hover:opacity-90">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-3.5 w-3.5"
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
