import type { Metadata } from "next";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { localize, showcases } from "@/lib/work";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ShowcaseCard } from "./showcase-card";
import { ShowcaseList } from "./showcase-list";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
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
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).work;

  return (
    <Container className="py-10 sm:py-12">
      {/* Matches the blog benchmark height on desktop; cards stretch to fill. */}
      <div className="flex flex-col lg:min-h-[660px]">
        <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
          {t.intro.lead}
          <strong className="text-foreground font-medium">
            {t.intro.powerbi}
          </strong>
          {t.intro.and}
          <strong className="text-foreground font-medium">
            {t.intro.superset}
          </strong>
          {t.intro.tail}
        </p>

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
