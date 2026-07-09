import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { getAllPosts } from "@/lib/content";
import styles from "./title-bar.module.css";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description: "Notes on BI, analytics, and data engineering.",
  path: "/blog",
});

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <Container className="py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
      <p className="text-muted-foreground mt-4">
        Notes on business intelligence, analytics, and data engineering.
      </p>

      {posts.length === 0 ? (
        <p className="text-muted-foreground mt-12">Articles coming soon.</p>
      ) : (
        <ul className="mt-12 space-y-6">
          {posts.map((post) => (
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

                {/* Date (YYYY-MM-DD) and tags share one row, pipe-separated. */}
                <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <time dateTime={post.date}>{post.date}</time>
                  {post.tags.length > 0 && (
                    <>
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
                    </>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
