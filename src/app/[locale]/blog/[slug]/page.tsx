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
import { siteConfig } from "@/lib/site";
import { blogPostingGraph, breadcrumbGraph } from "@/lib/structured-data";
import {
  getAllPosts,
  getPostBySlug,
  getPostSlugs,
  getRelatedPosts,
} from "@/lib/content";
import {
  locales,
  isLocale,
  localizedPath,
  type Locale,
} from "@/lib/i18n/config";
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
    // The post's own card from ./opengraph-image.tsx. `buildMetadata` sets
    // `openGraph`, which replaces the file-convention image, so it has to be
    // named here or every post would share the generic site card.
    images: [
      {
        url: `/blog/${slug}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: post.title,
      },
    ],
  });
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: post.date,
      ...(post.updated ? { modifiedTime: post.updated } : {}),
      authors: [siteConfig.author.name],
    },
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
  const related = getRelatedPosts(slug);
  const trail = [
    { name: t.breadcrumbHome, path: "/" },
    { name: t.title, path: "/blog" },
    { name: post.title },
  ];

  return (
    <Container className="py-16 sm:py-20">
      <JsonLd data={blogPostingGraph(l, post)} />
      <JsonLd data={breadcrumbGraph(l, trail)} />

      {/* One way back, not a crumb trail — same treatment the showcase page got.
          The breadcrumb JSON-LD above still describes the full Home → Blog → title
          hierarchy, which this link walks up one step of. */}
      <BackLink href={localizedPath(l, "/blog")} label={t.backToBlog} />

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="relative inline-block">
            <span aria-hidden="true" className={styles.titleBar} />
            <span className="relative">{post.title}</span>
          </span>
        </h1>
        {/* Date only. The list cards keep their tag chips; on the post itself the
            chips read as navigation the reader has already finished using. */}
        <PostMetaRow
          date={post.date}
          tags={post.tags}
          locale={l}
          showTags={false}
        />
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

      {/* Topical neighbours, unlike the chronological prev/next above. Also the
          only thing linking posts to each other by subject. */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-sm font-semibold tracking-tight">{t.related}</h2>
          <ul className="mt-3 space-y-2">
            {related.map((p) => (
              <li key={p.slug}>
                <Link
                  href={localizedPath(l, `/blog/${p.slug}`)}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The only crawlable path from a post to a money page — posts previously
          dead-ended into prev/next. */}
      <aside className="border-border bg-muted/40 mt-12 rounded-lg border p-6">
        <h2 className="text-base font-semibold tracking-tight">{t.ctaTitle}</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          {t.ctaBody}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
          <Link
            href={localizedPath(l, "/services")}
            className="text-primary hover:underline"
          >
            {t.ctaServices} →
          </Link>
          <Link
            href={localizedPath(l, "/contact")}
            className="text-primary hover:underline"
          >
            {t.ctaContact} →
          </Link>
        </div>
      </aside>
    </Container>
  );
}
