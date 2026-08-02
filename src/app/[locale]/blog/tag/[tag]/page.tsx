import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { getAllTags, getPostsByTag } from "@/lib/content";
import {
  locales,
  isLocale,
  localizedPath,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { BlogList } from "../../blog-list";

type Props = { params: Promise<{ locale: string; tag: string }> };

// The [locale] layout sets `dynamicParams = false`, so every reachable tag URL
// has to be enumerated here or it 404s.
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getAllTags().map(({ slug }) => ({ locale, tag: slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, tag } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).blog;
  const summary = getAllTags().find((x) => x.slug === tag);
  if (!summary) return { title: "Not found", robots: { index: false } };

  return buildMetadata({
    title: `${t.tagged}: ${summary.tag}`,
    description: t.metaDescription,
    path: `/blog/tag/${tag}`,
    locale: l,
  });
}

export default async function TagPage({ params }: Props) {
  const { locale, tag } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).blog;
  const summary = getAllTags().find((x) => x.slug === tag);
  if (!summary) notFound();
  const posts = getPostsByTag(tag);

  return (
    <Container className="py-10 sm:py-12">
      {/* Same benchmark height as the blog list so the two pages don't jump. */}
      <div className="flex flex-col lg:min-h-[660px]">
        <BackLink href={localizedPath(l, "/blog")} label={t.backToBlog} />

        <p className="text-muted-foreground mt-6 font-mono text-xs tracking-wider uppercase">
          {t.tagged}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {summary.tag}
        </h1>

        <BlogList posts={posts} locale={l} t={t} />
      </div>
    </Container>
  );
}
