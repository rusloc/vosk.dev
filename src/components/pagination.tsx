"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

// The page each list was last on. The App Router keeps this module alive across
// client navigations, so a list that remounts (browser Back, the detail page's
// back link, the nav) opens on the page the visitor left. A full reload starts
// at page 1 again, which also keeps server and client markup equal on hydration.
const lastPage = new Map<string, number>();

export const rememberPage = (list: string, page: number) => {
  lastPage.set(list, page);
};
export const recallPage = (list: string) => lastPage.get(list) ?? 0;

/** `useState` for a list's page that survives the list unmounting. */
export function useListPage(list: string): [number, (page: number) => void] {
  const [page, setPage] = useState(() => recallPage(list));
  return [
    page,
    (next) => {
      rememberPage(list, next);
      setPage(next);
    },
  ];
}

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
      className="mt-4 flex flex-wrap items-center justify-center gap-2"
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
