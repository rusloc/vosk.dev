import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { getAllPosts, formatDate } from "@/lib/content";

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
        <ul className="mt-12 space-y-10">
          {posts.map((post) => (
            <li key={post.slug}>
              <article>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingTime}</span>
                </div>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                  {post.description}
                </p>
                {post.tags.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <li
                        key={tag}
                        className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
