import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { buildMetadata, englishOnlyPosture } from "@/lib/metadata";
import { breadcrumbGraph, collectionGraph } from "@/lib/structured-data";
import { getAllTags, getPostsByTag } from "@/lib/content";
import { tagLabel } from "@/lib/tags";
import { locales, isLocale, type Locale } from "@/lib/i18n/config";
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
  const label = tagLabel(summary.tag);

  return buildMetadata({
    title: `${label} — ${t.title}`,
    // Composed per tag: every tag page used to ship the generic blog
    // description, so ten pages competed on one identical snippet.
    description: t.tagMetaDescription.replace("{tag}", label),
    path: `/blog/tag/${tag}`,
    locale: l,
    ...englishOnlyPosture(l),
  });
}

export default async function TagPage({ params }: Props) {
  const { locale, tag } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).blog;
  const summary = getAllTags().find((x) => x.slug === tag);
  if (!summary) notFound();
  const posts = getPostsByTag(tag);
  const label = tagLabel(summary.tag);
  const trail = [
    { name: t.breadcrumbHome, path: "/" },
    { name: t.title, path: "/blog" },
    { name: label },
  ];

  return (
    <Container className="py-10 sm:py-12">
      <JsonLd data={breadcrumbGraph(l, trail)} />
      <JsonLd
        data={collectionGraph(l, {
          name: `${label} — ${t.title}`,
          description: t.tagMetaDescription.replace("{tag}", label),
          path: `/blog/tag/${tag}`,
          posts,
        })}
      />

      {/* Same benchmark height as the blog list so the two pages don't jump. */}
      <div className="flex flex-col lg:min-h-[660px]">
        <Breadcrumbs locale={l} trail={trail} />

        <p className="text-muted-foreground mt-6 font-mono text-xs tracking-wider uppercase">
          {t.tagged}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{label}</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          {t.tagIntro.replace("{tag}", label)}
        </p>

        <BlogList posts={posts} locale={l} t={t} />
      </div>
    </Container>
  );
}
