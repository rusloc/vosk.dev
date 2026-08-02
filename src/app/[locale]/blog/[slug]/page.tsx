import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import { BackLink } from "@/components/back-link";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { mdxComponents } from "@/components/mdx-components";
import { PostMetaRow } from "@/components/post-meta-row";
import { buildMetadata } from "@/lib/metadata";
import { blogPostingGraph } from "@/lib/structured-data";
import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/content";
import { locales, isLocale, localizedPath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import styles from "../title-bar.module.css";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getPostSlugs().map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not found", robots: { index: false } };

  const base = buildMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${slug}`,
    locale: l,
  });
  return {
    ...base,
    openGraph: { ...base.openGraph, type: "article", publishedTime: post.date },
  };
}

export default async function PostPage({ params }: Props) {
  const { locale, slug } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).blog;
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

      <BackLink href={localizedPath(l, "/blog")} label={t.backToBlog} />

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="relative inline-block">
            <span aria-hidden="true" className={styles.titleBar} />
            <span className="relative">{post.title}</span>
          </span>
        </h1>
        {/* Date and tags under the title — mirrors the blog list. Read time dropped. */}
        <PostMetaRow date={post.date} tags={post.tags} locale={l} />
      </header>

      <article className="mdx mt-8 max-w-2xl">{content}</article>

      {(newer || older) && (
        <nav className="border-border mt-16 flex justify-between gap-4 border-t pt-8 text-sm">
          {older ? (
            <Link
              href={localizedPath(l, `/blog/${older.slug}`)}
              className="group max-w-[45%]"
              rel="prev"
            >
              <span className="text-muted-foreground block text-xs">
                {t.older}
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
              href={localizedPath(l, `/blog/${newer.slug}`)}
              className="group max-w-[45%] text-right"
              rel="next"
            >
              <span className="text-muted-foreground block text-xs">
                {t.newer}
              </span>
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
