import type { Metadata } from "next";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { buildMetadata } from "@/lib/metadata";
import { localize, showcases } from "@/lib/work";
import { resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ShowcaseCard } from "./showcase-card";
import { ShowcaseList } from "./showcase-list";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).work;
  return buildMetadata({
    title: t.metaTitle,
    description: t.metaDescription,
    path: "/work",
    locale: l,
  });
}

export default async function WorkPage({ params }: Props) {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).work;

  return (
    <Container className="py-10 sm:py-12">
      {/* Matches the blog benchmark height on desktop; cards stretch to fill. */}
      <div className="flex flex-col lg:min-h-[660px]">
        {/* wider than the default intro, so the topics list takes two rows on desktop (11-26) */}
        <PageHeader title={t.title} introClassName="max-w-3xl">
          {t.intro.lead}
          {t.intro.topics.map((topic, i) => (
            <span key={topic}>
              {i > 0 && " | "}
              <strong className="text-foreground font-medium">{topic}</strong>
            </span>
          ))}
        </PageHeader>

        {showcases.length === 0 ? (
          <p className="text-muted-foreground mt-6">{t.empty}</p>
        ) : (
          <ShowcaseList
            label={t.paginationAria}
            cards={showcases.map((showcase) => (
              <ShowcaseCard
                key={showcase.slug}
                showcase={localize(showcase, l)}
                locale={l}
              />
            ))}
          />
        )}
      </div>
    </Container>
  );
}
