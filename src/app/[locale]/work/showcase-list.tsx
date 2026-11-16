"use client";

import type { ReactNode } from "react";
import { Pagination, useListPage } from "@/components/pagination";

// Showcases per page — keeps the list within one screen; the page menu appears
// only when there are more. 4 since 11-16 (owner), with the cards cut to a title and two lines.
const PAGE_SIZE = 4;

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
  // Remembered across navigations: back from a showcase lands on the same page.
  const [stored, setPage] = useListPage("work");
  const pageCount = Math.ceil(cards.length / PAGE_SIZE);
  const page = Math.min(stored, Math.max(0, pageCount - 1));
  const first = page * PAGE_SIZE;

  return (
    <>
      {/* Every card is rendered and the off-page ones are hidden with CSS rather
          than sliced away: a `useState` slice keeps overflow entries out of the
          served HTML entirely, so their titles and links exist nowhere a crawler
          reads. Same content, same visible result. */}
      <ul className="mt-6 space-y-4">
        {cards.map((card, i) => (
          <li key={i} className={i >= first && i < first + PAGE_SIZE ? "" : "hidden"}>
            {card}
          </li>
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
