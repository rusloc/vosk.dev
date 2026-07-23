import type { Metadata } from "next";
import { Container } from "@/components/container";
import { SendMessageButton } from "@/components/send-message-button";
import { buildMetadata } from "@/lib/metadata";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ServiceCard } from "./service-card";
import { ServiceCarousel } from "./service-carousel";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).services;
  return buildMetadata({
    title: t.title,
    description: t.metaDescription,
    path: "/services",
    locale: l,
  });
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const dict = getDictionary(l);
  const t = dict.services;
  const aria = { prevAria: t.prevAria, nextAria: t.nextAria };

  return (
    <Container className="py-10 sm:py-12">
      {/* Matches the blog benchmark height on desktop; the three columns and
          their cards stretch to fill the space between the title and the CTA. */}
      <div className="flex flex-col lg:min-h-[660px]">
        {/* Title matches the blog / showcase pages: plain, no highlight, no intro. */}
        <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>

        {/* Three engagement models, each a single-slide carousel. */}
        <div className="mt-6 flex flex-1 flex-col gap-6 lg:flex-row">
          <ServiceCarousel
            {...aria}
            number={1}
            label={t.subscription.eyebrow}
            slides={t.subscription.tiers.map((tier, i) => (
              <ServiceCard
                key={i}
                title={tier.name}
                hours={tier.hours}
                desc={tier.desc}
                price={tier.price}
                unit={tier.unit}
                conditions={t.conditions}
              />
            ))}
          />

          <ServiceCarousel
            {...aria}
            number={2}
            label={t.project.eyebrow}
            slides={t.project.tiers.map((tier, i) => (
              <ServiceCard
                key={i}
                title={tier.name}
                desc={tier.desc}
                price={tier.price}
                unit={tier.unit}
                conditions={t.conditions}
              />
            ))}
          />

          <ServiceCarousel
            {...aria}
            number={3}
            label={t.other.eyebrow}
            slides={t.other.tiers.map((tier, i) => (
              <ServiceCard
                key={i}
                title={tier.name}
                desc={tier.desc}
                price={tier.price}
                unit={tier.unit}
                conditions={t.conditions}
              />
            ))}
          />
        </div>

        {/* What every subscription plan covers — a plain dot list under the plans. */}
        <div className="mt-6">
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

        {/* CTA banner — the button opens the same message popup as the nav. */}
        <div className="bg-foreground mt-6 flex flex-col gap-4 rounded-2xl px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-background text-xl font-semibold tracking-tight">
            {t.cta.title}
          </div>
          <div className="mt-1 text-sm text-[#b8b0a0]">{t.cta.body}</div>
        </div>
        <SendMessageButton
          locale={l}
          dict={dict}
          label={t.cta.button}
          variant="inverse"
          className="shrink-0"
        />
      </div>
      </div>
    </Container>
  );
}
