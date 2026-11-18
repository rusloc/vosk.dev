import type { Metadata } from "next";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { buildMetadata } from "@/lib/metadata";
import { getShowcasePlatformLabels, localize, showcases } from "@/lib/work";
import { resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ShowcaseCard } from "./showcase-card";
import { ShowcaseList } from "./showcase-list";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).work;
  const platforms = new Intl.ListFormat(l, { type: "conjunction" }).format(
    getShowcasePlatformLabels(),
  );
  return buildMetadata({
    title: t.metaTitle,
    description: t.metaDescription.replace("{platforms}", platforms),
    path: "/work",
    locale: l,
  });
}

export default async function WorkPage({ params }: Props) {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).work;
  // The intro names the platforms of the showcases actually listed, so it can't drift
  // from the cards (a hidden Superset entry once left it promising Superset).
  const platforms = new Intl.ListFormat(l, {
    type: "conjunction",
  }).formatToParts(getShowcasePlatformLabels());

  return (
    <Container className="py-10 sm:py-12">
      {/* Matches the blog benchmark height on desktop; cards stretch to fill. */}
      <div className="flex flex-col lg:min-h-[660px]">
        <PageHeader title={t.title}>
          {t.intro.lead}
          {platforms.map((part, i) =>
            part.type === "element" ? (
              <strong key={i} className="text-foreground font-medium">
                {part.value}
              </strong>
            ) : (
              part.value
            ),
          )}
          {t.intro.tail}
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
                dataLabel={t.dataLabel[showcase.data]}
              />
            ))}
          />
        )}
      </div>
    </Container>
  );
}
