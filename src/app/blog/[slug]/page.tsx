import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { mdxComponents } from "@/components/mdx-components";
import { buildMetadata } from "@/lib/metadata";
import { blogPostingGraph } from "@/lib/structured-data";
import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/content";
import styles from "../title-bar.module.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not found", robots: { index: false } };

  const base = buildMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${slug}`,
  });
  return {
    ...base,
    openGraph: { ...base.openGraph, type: "article", publishedTime: post.date },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { content } = await compileMDX({
    source: post.content,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            { behavior: "wrap", properties: { className: ["heading-anchor"] } },
          ],
          [rehypePrettyCode, { theme: "github-light", keepBackground: true }],
        ],
      },
    },
  });

  // Prev/next from the newest-first list: newer = earlier index, older = later.
  const all = getAllPosts();
  const idx = all.findIndex((p) => p.slug === slug);
  const newer = idx > 0 ? all[idx - 1] : null;
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <Container className="py-16 sm:py-20">
      <JsonLd data={blogPostingGraph(post)} />

      <Link
        href="/blog"
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
        Back to blog
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="relative inline-block">
            <span aria-hidden="true" className={styles.titleBar} />
            <span className="relative">{post.title}</span>
          </span>
        </h1>
        {/* Date (YYYY-MM-DD) and tags under the title, pipe-separated — mirrors
            the blog list. Read time dropped. */}
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
      </header>

      <article className="mdx mt-8 max-w-2xl">{content}</article>

      {(newer || older) && (
        <nav className="border-border mt-16 flex justify-between gap-4 border-t pt-8 text-sm">
          {older ? (
            <Link
              href={`/blog/${older.slug}`}
              className="group max-w-[45%]"
              rel="prev"
            >
              <span className="text-muted-foreground block text-xs">
                Older
              </span>
              <span className="group-hover:text-primary transition-colors">
                {older.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link
              href={`/blog/${newer.slug}`}
              className="group max-w-[45%] text-right"
              rel="next"
            >
              <span className="text-muted-foreground block text-xs">Newer</span>
              <span className="group-hover:text-primary transition-colors">
                {newer.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </Container>
  );
}
