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
  const q = query.trim().toLowerCase();
  const filtered = q
    ? posts.filter((p) =>
        [p.title, p.description, ...p.tags].join(" ").toLowerCase().includes(q),
      )
    : posts;

  return (
    <>
      {/* Search — a full-width white pill that replaces the sub-header title. */}
      <div className="relative mt-4">
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

      {filtered.length === 0 ? (
        <p className="text-muted-foreground mt-12">
          No posts match “{query.trim()}”.
        </p>
      ) : (
        <ul className="mt-12 space-y-6">
          {filtered.map((post) => (
            <li key={post.slug}>
              <article className="border-border rounded-lg border p-6">
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
