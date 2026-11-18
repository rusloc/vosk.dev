import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { HomeBackdrop } from "@/components/home-backdrop";
import { CodeTyper } from "@/components/code-typer";
import { HeroButton } from "@/components/hero-button";
import { JsonLd } from "@/components/json-ld";
import { homeGraph } from "@/lib/structured-data";
import { ga } from "@/lib/analytics";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { getAllPosts } from "@/lib/content";
import { getPublishedServices } from "@/lib/services";
import { localize, showcases } from "@/lib/work";
import { localizedPath, resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ShowcaseCard } from "./work/showcase-card";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  return buildMetadata({ path: "/", locale: l });
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const dict = getDictionary(l);
  const t = dict.home;
  // Out of draft only (SEO spec T-04); the section is absent while every service page is a draft.
  const services = getPublishedServices();
  // The three newest indexable case studies; `showcases` is newest first and already env-gated.
  const cases = showcases.filter((s) => !s.noindex).slice(0, 3);
  const posts = getAllPosts().slice(0, 3);

  return (
    <>
      <JsonLd data={homeGraph()} />
      <HomeBackdrop />
      <CodeTyper />
      <Container className="py-20 sm:py-28">
        <div className="max-w-3xl">
          {/* The H1 carries the topic words (SEO spec T-03, 11-18); the headline, brand voice that names nothing
              searchable, is the line under it, styled as before. */}
          <h1 className="text-muted-foreground text-sm font-semibold tracking-[0.14em] uppercase">
            {t.h1}
          </h1>
          <p className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            {t.headline.lead}
            <span className="text-primary italic">{t.headline.em1}</span>
            {t.headline.mid}
            <span className="text-primary italic">{t.headline.em2}</span>
            {t.headline.tail}
          </p>

          <p className="text-muted-foreground mt-6 max-w-2xl text-lg">
            {t.lede}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <HeroButton
              href={localizedPath(l, "/work")}
              label={t.cta}
              ga={ga("cta_click", undefined, "work")}
            />
            <HeroButton
              href={localizedPath(l, "/services")}
              label={t.ctaSecondary}
              ga={ga("cta_click", undefined, "services")}
            />
          </div>

          {/* Proof bar: what a visitor can check. Further items only from the owner (I-04). */}
          <ul className="text-muted-foreground mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <a
                href={siteConfig.dp600Url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline underline-offset-4"
              >
                {t.proofDp600}
              </a>
            </li>
            <li>{t.proofHours}</li>
          </ul>
        </div>
      </Container>

      {/* Below the hero: opaque, so the page scrolls over the fixed backdrop bars and the code typer. Server-rendered,
          no client components (the home page's Lighthouse 100 stays). Testimonials join only when the owner has
          them (I-05): no placeholder. */}
      <div className="bg-background">
        <Container className="space-y-16 py-16">
          {services.length > 0 && (
            <section>
              <h2 className={H2}>{t.servicesTitle}</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-3">
                {services.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={localizedPath(l, `/services/${s.slug}`)}
                      className="border-border hover:border-foreground block h-full rounded-lg border p-5 transition-colors"
                    >
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-muted-foreground mt-2 block text-sm">
                        {s.h1}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <SectionHead
              title={t.casesTitle}
              href={localizedPath(l, "/work")}
              more={t.casesAll}
            />
            <div className="mt-4 grid gap-4">
              {cases.map((c) => (
                <ShowcaseCard
                  key={c.slug}
                  showcase={localize(c, l)}
                  locale={l}
                  dataLabel={dict.work.dataLabel[c.data]}
                />
              ))}
            </div>
          </section>

          <section>
            <SectionHead
              title={t.pricingTitle}
              href={localizedPath(l, "/services")}
              more={t.pricingLink}
            />
            <ul className="mt-4 grid gap-4 sm:grid-cols-3">
              {dict.services.subscription.tiers.map((tier) => (
                <li
                  key={tier.name}
                  className="border-border rounded-lg border p-5"
                >
                  <span className="font-semibold">{tier.name}</span>
                  <span className="mt-3 block">
                    <span className="text-2xl font-bold tracking-tight">
                      {tier.price}
                    </span>{" "}
                    <span className="text-muted-foreground text-xs">
                      {tier.unit}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-3 text-sm">
              {t.pricingBody}
            </p>
          </section>

          <section>
            <SectionHead
              title={t.postsTitle}
              href={localizedPath(l, "/blog")}
              more={t.postsAll}
            />
            <ul className="mt-4 grid gap-6 sm:grid-cols-3">
              {posts.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={localizedPath(l, `/blog/${p.slug}`)}
                    className="hover:text-primary font-semibold transition-colors"
                  >
                    {p.title}
                  </Link>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {p.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-border border-t pt-10">
            <h2 className={H2}>{t.contactTitle}</h2>
            <p className="text-muted-foreground mt-2 max-w-prose">
              {t.contactBody}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <HeroButton
                href={localizedPath(l, "/contact")}
                label={t.contactLink}
                ga={ga("cta_click", undefined, "home_contact")}
              />
              {siteConfig.bookingUrl && (
                <a
                  href={siteConfig.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline"
                  {...ga("booking_click", undefined, "home")}
                >
                  {dict.contact.bookCall}
                </a>
              )}
            </div>
          </section>
        </Container>
      </div>
    </>
  );
}

const H2 = "text-2xl font-semibold tracking-tight";

function SectionHead({
  title,
  href,
  more,
}: {
  title: string;
  href: string;
  more: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className={H2}>{title}</h2>
      <Link href={href} className="text-primary text-sm hover:underline">
        {more}
      </Link>
    </div>
  );
}
