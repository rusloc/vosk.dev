import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { isLocale, localizedPath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ServiceCard } from "./service-card";
import { ServiceCarousel } from "./service-carousel";
import type { IconName } from "./service-icons";
import titleStyles from "../blog/title-bar.module.css";

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

function ColumnHeading({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-foreground mb-3 text-xs font-semibold tracking-[0.12em] uppercase">
      {n} · {label}
    </div>
  );
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).services;

  const carouselAria = {
    prevAria: t.prevAria,
    nextAria: t.nextAria,
    goToAria: t.goToAria,
  };

  return (
    <Container className="py-16 sm:py-20">
      {/* Header — title (highlighted) left, intro right on wide screens. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          <span className="relative inline-block">
            <span aria-hidden="true" className={titleStyles.titleBar} />
            <span className="relative">{t.title}</span>
          </span>
        </h1>
        <p className="text-muted-foreground max-w-lg text-sm leading-relaxed sm:text-right">
          {t.subtitle}
        </p>
      </div>

      {/* Three engagement models. */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* 1 — Urgent (single, fixed scope) */}
        <div className="flex flex-col">
          <ColumnHeading n={1} label={t.urgent.eyebrow} />
          <div className="flex min-h-[340px] flex-1 flex-col">
            <div className="flex-1">
              <ServiceCard
                icon="zap"
                title={t.urgent.name}
                desc={t.urgent.desc}
                price={t.urgent.price}
                unit={t.urgent.unit}
              />
            </div>
            <div className="text-muted-foreground mt-4 text-center text-xs">
              {t.urgent.note}
            </div>
          </div>
        </div>

        {/* 2 — Subscription (carousel) */}
        <div className="flex flex-col">
          <ColumnHeading n={2} label={t.subscription.eyebrow} />
          <div className="flex min-h-[340px] flex-1 flex-col">
            <ServiceCarousel
              {...carouselAria}
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
          </div>
        </div>

        {/* 3 — Project work (carousel) */}
        <div className="flex flex-col">
          <ColumnHeading n={3} label={t.project.eyebrow} />
          <div className="flex min-h-[340px] flex-1 flex-col">
            <ServiceCarousel
              {...carouselAria}
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
          </div>
        </div>
      </div>

      {/* CTA banner → contact */}
      <div className="bg-foreground mt-8 flex flex-col gap-4 rounded-2xl px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-background text-xl font-semibold tracking-tight">
            {t.cta.title}
          </div>
          <div className="mt-1 text-sm text-[#b8b0a0]">{t.cta.body}</div>
        </div>
        <Link
          href={localizedPath(l, "/contact")}
          className="bg-background text-foreground inline-flex shrink-0 items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          {t.cta.button} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Container>
  );
}
