import type { Metadata } from "next";
import { Container } from "@/components/container";
import { SendMessageButton } from "@/components/send-message-button";
import { buildMetadata } from "@/lib/metadata";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ServiceCard } from "./service-card";
import { ServiceCarousel } from "./service-carousel";
import type { IconName } from "./service-icons";

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

const PROJECT_ICONS: IconName[] = ["flag", "map", "route"];
const OTHER_ICONS: IconName[] = ["zap", "clock", "graduation-cap"];

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const dict = getDictionary(l);
  const t = dict.services;
  const aria = { prevAria: t.prevAria, nextAria: t.nextAria };

  return (
    <Container className="py-16 sm:py-24">
      {/* Title matches the blog / showcase pages: plain, no highlight, no intro. */}
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>

      {/* Three engagement models, each a single-slide carousel. */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <ServiceCarousel
          {...aria}
          number={1}
          label={t.subscription.eyebrow}
          slides={t.subscription.tiers.map((tier, i) => (
            <ServiceCard
              key={i}
              icon="refresh-cw"
              eyebrow={t.subscription.kicker}
              title={tier.name}
              desc={tier.desc}
              price={tier.price}
              unit={tier.unit}
              priceAccent
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
              icon={PROJECT_ICONS[i] ?? "flag"}
              title={tier.name}
              badge={tier.duration}
              desc={tier.desc}
              price={tier.price}
              unit={tier.unit}
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
              icon={OTHER_ICONS[i] ?? "zap"}
              title={tier.name}
              desc={tier.desc}
              price={tier.price}
              unit={tier.unit}
            />
          ))}
        />
      </div>

      {/* CTA banner — the button opens the same message popup as the nav. */}
      <div className="bg-foreground mt-8 flex flex-col gap-4 rounded-2xl px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
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
    </Container>
  );
}
