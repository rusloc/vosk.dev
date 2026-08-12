"use client";

import { useState } from "react";
import Link from "next/link";
import type { PostMeta } from "@/lib/content";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Pagination } from "@/components/pagination";
import { PostMetaRow } from "@/components/post-meta-row";
import { TagLink } from "@/components/tag-link";
import styles from "./title-bar.module.css";

// Posts per page — the blog list is the benchmark for page height, so it caps at
// three; the page menu appears below when there are more.
const PAGE_SIZE = 3;

/**
 * Client-side blog list with keyword search (title / description / tags). The
 * search field replaces the sub-header line; posts render as bordered cards.
 * Tags are hidden below `sm` to keep the mobile meta row compact.
 */
export function BlogList({
  posts,
  locale,
  t,
  // Chips for the filter bar. The blog index passes the full tag set; the tag
  // page passes nothing, because a tag row on a tag page is a link back to where
  // the visitor already is.
  tags = [],
}: {
  posts: PostMeta[];
  locale: Locale;
  t: Dictionary["blog"];
  tags?: readonly { tag: string; slug: string }[];
}) {
  const [query, setQuery] = useState("");
  const [asc, setAsc] = useState(false); // false = newest first (default)
  const [page, setPage] = useState(0);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? posts.filter((p) =>
        [p.title, p.description, ...p.tags].join(" ").toLowerCase().includes(q),
      )
    : posts;
  // `posts` arrives newest-first; reversing the filtered slice flips to oldest-first.
  const ordered = asc ? [...filtered].reverse() : filtered;

  const pageCount = Math.ceil(ordered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));

  return (
    <>
      {/* One filter bar: search, sort and the tag chips. The chips had their own
          row until the page had to fit 900px; folding them in here costs nothing
          visually (they are 22px pills inside a 42px row) and saves the row plus
          its margin. `flex-wrap` lets them drop to a second line on narrow
          viewports, which is what they did before anyway. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Search — a white pill that replaces the sub-header title. */}
        <div className="relative min-w-64 flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchAria}
            className="border-border focus:border-primary focus:ring-primary/30 w-full rounded-full border bg-white py-2.5 pr-4 pl-11 text-sm text-black outline-none focus:ring-2"
          />
        </div>

        {/* Sort toggle — flips date order between newest- and oldest-first. */}
        <button
          type="button"
          onClick={() => {
            setAsc((v) => !v);
            setPage(0);
          }}
          aria-label={`Sorted by date, ${asc ? "oldest" : "newest"} first — click to toggle`}
          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
        >
          {/* Both labels share one grid cell so the pill width stays constant
              regardless of which is shown — no layout shift on toggle. */}
          <span className="grid">
            <span className={`col-start-1 row-start-1 ${asc ? "invisible" : ""}`}>
              {t.newestFirst}
            </span>
            <span className={`col-start-1 row-start-1 ${asc ? "" : "invisible"}`}>
              {t.oldestFirst}
            </span>
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`h-3.5 w-3.5 transition-transform ${asc ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 5v14M6 13l6 6 6-6"
            />
          </svg>
        </button>

        {tags.length > 0 && (
          <ul className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            {tags.map(({ tag, slug }) => (
              <li key={slug}>
                <TagLink tag={tag} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Every post is rendered and the off-page ones are hidden with CSS rather
          than sliced away: a `useState` slice keeps overflow posts out of the
          served HTML entirely, so the fourth post's title, description and link
          existed nowhere a crawler reads. Same visible result. */}
      {ordered.length === 0 ? (
        <p className="text-muted-foreground mt-6">
          {t.noMatch} “{query.trim()}”.
        </p>
      ) : (
        /* All pages are stacked into ONE grid cell, so the wrapper is always as
           tall as the FULLEST page and the menu below sits at the same y on every
           page. The obvious fix — `grow` on the list — does nothing here: the
           column is already taller than its `lg:min-h-[660px]`, so there is no
           free space to distribute and the menu still rode up 140px on page 2.

           `invisible` (visibility: hidden), not `hidden` (display: none): the
           off-page markup has to keep its box, because that box is what reserves
           the height. It still drops out of the a11y tree and the tab order, and
           every post stays in the served HTML for crawlers either way. */
        <div className="mt-4 grid">
          {Array.from({ length: pageCount }, (_, p) => (
            <ul
              key={p}
              className={`col-start-1 row-start-1 space-y-2 ${
                p === safePage ? "" : "invisible"
              }`}
            >
              {ordered.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE).map((post) => (
                <li key={post.slug}>
                  <article className="bg-background border-border rounded-lg border p-4 transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(31,27,22,0.3)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                    {/* Title + arrow-link on one row, vertically centred together. */}
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="min-w-0 text-xl font-semibold tracking-tight">
                        <span className="relative inline-block">
                          <span
                            aria-hidden="true"
                            className={styles.titleBar}
                          />
                          <Link
                            href={localizedPath(locale, `/blog/${post.slug}`)}
                            className="hover:text-primary relative transition-colors"
                          >
                            {post.title}
                          </Link>
                        </span>
                      </h2>

                      <Link
                        href={localizedPath(locale, `/blog/${post.slug}`)}
                        aria-label={`${post.title}`}
                        className="bg-foreground text-background inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-90"
                      >
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
                            d="M5 12h14M13 6l6 6-6 6"
                          />
                        </svg>
                      </Link>
                    </div>

                    {/* `line-clamp-2` is the structural guarantee, not the copy:
                        the descriptions are written to fit two rows at this width,
                        but a narrow viewport would still wrap a third. Cards stay
                        the same height either way. */}
                    <p className="text-muted-foreground mt-2 line-clamp-2 max-w-2xl">
                      {post.description}
                    </p>

                    <PostMetaRow
                      date={post.date}
                      tags={post.tags}
                      locale={locale}
                    />
                  </article>
                </li>
              ))}
            </ul>
          ))}
        </div>
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        onGo={setPage}
        label={t.paginationAria}
      />
    </>
  );
}
