"use client";

import { useState } from "react";
import Link from "next/link";
import type { PostMeta } from "@/lib/content";
import styles from "./title-bar.module.css";

/**
 * Client-side blog list with keyword search (title / description / tags). The
 * search field replaces the sub-header line; posts render as bordered cards.
 * Tags are hidden below `sm` to keep the mobile meta row compact.
 */
export function BlogList({ posts }: { posts: PostMeta[] }) {
  const [query, setQuery] = useState("");
  const [asc, setAsc] = useState(false); // false = newest first (default)
  const q = query.trim().toLowerCase();
  const filtered = q
    ? posts.filter((p) =>
        [p.title, p.description, ...p.tags].join(" ").toLowerCase().includes(q),
      )
    : posts;
  // `posts` arrives newest-first; reversing the filtered slice flips to oldest-first.
  const ordered = asc ? [...filtered].reverse() : filtered;

  return (
    <>
      {/* Search + sort on one row: input fills the width, sort keeps its label. */}
      <div className="mt-4 flex items-stretch gap-2">
        {/* Search — a white pill that replaces the sub-header title. */}
        <div className="relative flex-1">
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts by keyword…"
            aria-label="Search blog posts"
            className="border-border focus:border-primary focus:ring-primary/30 w-full rounded-full border bg-white py-2.5 pr-4 pl-11 text-sm text-black outline-none focus:ring-2"
          />
        </div>

        {/* Sort toggle — flips date order between newest- and oldest-first. */}
        <button
          type="button"
          onClick={() => setAsc((v) => !v)}
          aria-label={`Sorted by date, ${asc ? "oldest" : "newest"} first — click to toggle`}
          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
        >
          {/* Both labels share one grid cell so the pill width stays constant
              regardless of which is shown — no layout shift on toggle. */}
          <span className="grid">
            <span className={`col-start-1 row-start-1 ${asc ? "invisible" : ""}`}>
              Newest first
            </span>
            <span className={`col-start-1 row-start-1 ${asc ? "" : "invisible"}`}>
              Oldest first
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
      </div>

      {ordered.length === 0 ? (
        <p className="text-muted-foreground mt-12">
          No posts match “{query.trim()}”.
        </p>
      ) : (
        <ul className="mt-12 space-y-6">
          {ordered.map((post) => (
            <li key={post.slug}>
              <article className="bg-background border-border rounded-lg border p-6 transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(31,27,22,0.3)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                {/* Title + arrow-link on one row, vertically centred together. */}
                <div className="flex items-center justify-between gap-4">
                  <h2 className="min-w-0 text-xl font-semibold tracking-tight">
                    <span className="relative inline-block">
                      <span aria-hidden="true" className={styles.titleBar} />
                      <Link
                        href={`/blog/${post.slug}`}
                        className="hover:text-primary relative transition-colors"
                      >
                        {post.title}
                      </Link>
                    </span>
                  </h2>

                  <Link
                    href={`/blog/${post.slug}`}
                    aria-label={`Read “${post.title}”`}
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

                <p className="text-muted-foreground mt-2 max-w-2xl">
                  {post.description}
                </p>

                {/* Date (YYYY-MM-DD); tags + pipe join it from `sm` up. */}
                <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <time dateTime={post.date}>{post.date}</time>
                  {post.tags.length > 0 && (
                    <div className="hidden items-center gap-2 sm:flex">
                      <span aria-hidden="true">|</span>
                      <ul className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <li
                            key={tag}
                            className="border-border rounded-full border px-2.5 py-0.5"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
