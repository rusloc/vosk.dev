import type { Metadata } from "next";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { buildMetadata } from "@/lib/metadata";
import { collectionGraph } from "@/lib/structured-data";
import { getAllPosts, getAllTags } from "@/lib/content";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { BlogList } from "./blog-list";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).blog;
  return buildMetadata({
    title: t.metaTitle,
    description: t.metaDescription,
    path: "/blog",
    locale: l,
  });
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).blog;
  const posts = getAllPosts();
  const tags = getAllTags();

  return (
    /* Same padding as /work, /services and /contact so the title and intro land at
       one height across the list pages. The 1440x900 fit is held by the trims in
       blog-list.tsx (tag chips folded into the filter bar, `mt-4` on the list
       grid), which stay. */
    <Container className="py-10 sm:py-12">
      <JsonLd
        data={collectionGraph(l, {
          name: t.metaTitle,
          description: t.metaDescription,
          path: "/blog",
          posts,
        })}
      />

      {/* Benchmark height for the list pages: blog with three posts. Showcase and
          services stretch to the same min-height on desktop. */}
      <div className="flex flex-col lg:min-h-[660px]">
        <PageHeader title={t.title}>{t.intro}</PageHeader>

        {/* The tag chips used to sit on their own row here. They now ride in
            BlogList's filter bar — one row instead of two, which is 38px of the
            122px this page had to lose. Still visible at every width, so they
            remain the only entry point to the filter pages on mobile (and for
            mobile crawlers). */}
        {posts.length === 0 ? (
          <p className="text-muted-foreground mt-12">{t.empty}</p>
        ) : (
          <BlogList posts={posts} locale={l} t={t} tags={tags} />
        )}
      </div>
    </Container>
  );
}
