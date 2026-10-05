import type { Metadata } from "next";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { buildMetadata } from "@/lib/metadata";
import { serviceGraph } from "@/lib/structured-data";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ServiceGroups } from "./service-groups";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).services;
  return buildMetadata({
    title: t.metaTitle,
    description: t.metaDescription,
    path: "/services",
    locale: l,
  });
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).services;

  return (
    <Container className="py-6 sm:py-12">
      <JsonLd
        data={serviceGraph(l, {
          name: t.title,
          description: t.metaDescription,
          groups: [t.subscription, t.project, t.other],
        })}
      />

      {/* Floor matching the blog benchmark height on desktop. The featured
          card's content alone takes the page past 660px, so the floor is inert
          rather than a source of dead space. */}
      <div className="flex flex-col lg:min-h-[660px]">
        {/* Title matches the blog / showcase pages: plain, no highlight. The
            intro under it is the page's only prose — without it the page is nine
            price cards and nothing describing what's being sold. */}
        <PageHeader title={t.title} introClassName="text-sm sm:text-base">
          {t.intro}
        </PageHeader>

        {/* Heading for the three engagement columns. The tier names inside the
            carousels are h3s, so without this they'd skip a level straight from
            the page h1. */}
        <h2 className="sr-only">{t.engagementsHeading}</h2>

        {/* Three engagement models, each a single-slide carousel: on desktop a
            featured subscription card with the other two stacked beside it; on
            mobile a pill row picks one at a time. */}
        <ServiceGroups
          groups={[t.subscription, t.project, t.other]}
          conditions={t.conditions}
          nextAria={t.nextAria}
        />
      </div>
    </Container>
  );
}
