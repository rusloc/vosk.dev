"use client";

import { useState, type ReactNode } from "react";
import { Pagination } from "@/components/pagination";

// Showcases per page — keeps the list within one screen; the page menu appears
// only when there are more.
const PAGE_SIZE = 3;

/**
 * Paginated showcase list. Cards are rendered on the server (ShowcaseCard) and
 * passed in as `cards`; this wrapper only slices the current page and renders the
 * page menu below.
 */
export function ShowcaseList({
  cards,
  label,
}: {
  cards: ReactNode[];
  label: string;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(cards.length / PAGE_SIZE);
  const visible = cards.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <>
      <ul className="mt-6 space-y-4">
        {visible.map((card, i) => (
          <li key={i}>{card}</li>
        ))}
      </ul>

      <Pagination
        page={page}
        pageCount={pageCount}
        onGo={setPage}
        label={label}
      />
    </>
  );
}
