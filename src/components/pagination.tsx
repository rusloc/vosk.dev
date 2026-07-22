"use client";

import { cn } from "@/lib/cn";

/**
 * Numbered page menu. Presentational — the list owns the page state and passes
 * it in. Renders nothing for a single page, so it only appears when a list is
 * long enough to need paging.
 */
export function Pagination({
  page,
  pageCount,
  onGo,
  label,
}: {
  page: number;
  pageCount: number;
  onGo: (page: number) => void;
  label: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label={label}
      className="mt-6 flex flex-wrap items-center justify-center gap-2"
    >
      {Array.from({ length: pageCount }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onGo(i)}
          aria-current={i === page ? "page" : undefined}
          className={cn(
            "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md border px-2.5 text-sm transition-colors",
            i === page
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {i + 1}
        </button>
      ))}
    </nav>
  );
}
