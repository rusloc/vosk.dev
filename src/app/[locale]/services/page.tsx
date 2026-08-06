import type { Metadata } from "next";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { buildMetadata } from "@/lib/metadata";
import { serviceGraph } from "@/lib/structured-data";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ServiceCarousel } from "./service-carousel";

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
  const aria = { prevAria: t.prevAria, nextAria: t.nextAria };

  return (
    <Container className="py-10 sm:py-12">
      <JsonLd
        data={serviceGraph(l, {
          name: t.title,
          description: t.metaDescription,
          groups: [t.subscription, t.project, t.other],
        })}
      />

      {/* Matches the blog benchmark height on desktop; the three columns and
          their cards stretch to fill the space below the title. */}
      <div className="flex flex-col lg:min-h-[660px]">
        {/* Title matches the blog / showcase pages: plain, no highlight. The
            intro under it is the page's only prose — without it the page is nine
            price cards and nothing describing what's being sold. */}
        <PageHeader title={t.title}>{t.intro}</PageHeader>

        {/* Heading for the three engagement columns. The tier names inside the
            carousels are h3s, so without this they'd skip a level straight from
            the page h1. */}
        <h2 className="sr-only">{t.engagementsHeading}</h2>

        {/* Three engagement models, each a single-slide carousel. */}
        <div className="mt-6 flex flex-1 flex-col gap-6 lg:flex-row">
          <ServiceCarousel
            {...aria}
            number={1}
            label={t.subscription.eyebrow}
            tiers={t.subscription.tiers}
            conditions={t.conditions}
          />

          <ServiceCarousel
            {...aria}
            number={2}
            label={t.project.eyebrow}
            tiers={t.project.tiers}
            conditions={t.conditions}
          />

          <ServiceCarousel
            {...aria}
            number={3}
            label={t.other.eyebrow}
            tiers={t.other.tiers}
            conditions={t.conditions}
          />
        </div>

        {/* What every subscription plan covers — a boxed dot list under the plans. */}
        <div className="border-border mt-6 rounded-2xl border bg-white p-6">
          <h2 className="text-foreground text-xs font-semibold tracking-[0.12em] uppercase">
            {t.subscription.servicesTitle}
          </h2>
          <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {t.subscription.services.map((s, i) => (
              <li
                key={i}
                className="text-muted-foreground flex items-start gap-2.5 text-sm"
              >
                <span
                  aria-hidden="true"
                  className="bg-primary mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full"
                />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
}
