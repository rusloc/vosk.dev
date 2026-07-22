import type { Metadata } from "next";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { getAllPosts } from "@/lib/content";
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

  return (
    <Container className="py-10 sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>

      {posts.length === 0 ? (
        <p className="text-muted-foreground mt-12">{t.empty}</p>
      ) : (
        <BlogList posts={posts} locale={l} t={t} />
      )}
    </Container>
  );
}
