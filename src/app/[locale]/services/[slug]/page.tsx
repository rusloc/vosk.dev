import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { buildMetadata } from "@/lib/metadata";
import { getService, getServiceLinks, services } from "@/lib/services";
import { breadcrumbGraph, serviceDetailGraph } from "@/lib/structured-data";
import { localize } from "@/lib/work";
import { ga } from "@/lib/analytics";
import { locales, localizedPath, resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import cta from "@/components/cta-button.module.css";
import { ShowcaseCard } from "../../work/showcase-card";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

// Drafts build too: reachable on preview deploys for the owner's review, but noindex and linked from nowhere.
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    services.map(({ slug }) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = resolveLocale(locale);
  const entry = getService(slug);
  if (!entry) return {};
  return buildMetadata({
    title: entry.title,
    description: entry.description,
    path: `/services/${slug}`,
    locale: l,
    ...(entry.draft ? { robots: { index: false, follow: true } } : {}),
  });
}

/**
 * One service page (SEO spec T-04, 11-18), in the spec's order: who it's for, what you get, the price, two case
 * studies, how it runs, five questions as text, one way to the contact page.
 */
export default async function ServicePage({ params }: Props) {
  const { locale, slug } = await params;
  const l = resolveLocale(locale);
  const entry = getService(slug);
  if (!entry) notFound();

  const dict = getDictionary(l);
  const t = dict.serviceDetail;
  const tiers = dict.services[entry.pricing.group].tiers;
  const { cases, posts } = getServiceLinks(entry);
  const trail = [
    { name: dict.work.breadcrumbHome, path: "/" },
    { name: dict.services.title, path: "/services" },
    { name: entry.name },
  ];
  const h2 = "text-xl font-semibold tracking-tight";

  return (
    <Container className="py-10 sm:py-12">
      <JsonLd
        data={serviceDetailGraph(l, {
          slug,
          name: entry.name,
          description: entry.description,
          tiers,
        })}
      />
      <JsonLd data={breadcrumbGraph(l, trail)} />
      <Breadcrumbs locale={l} trail={trail} />

      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
        {entry.h1}
      </h1>

      <section className="mt-8 max-w-prose">
        <h2 className={h2}>{t.audienceTitle}</h2>
        <p className="mt-3">{entry.audience}</p>
      </section>

      <section className="mt-10 max-w-prose">
        <h2 className={h2}>{t.deliverablesTitle}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {entry.deliverables.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className={h2}>{t.pricingTitle}</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {tiers.map((tier) => (
            <li
              key={tier.name}
              className="border-border flex flex-col rounded-xl border bg-white p-5"
            >
              <span className="font-semibold">{tier.name}</span>
              <span className="text-muted-foreground mt-2 text-sm">
                {tier.desc}
              </span>
              <span className="mt-auto pt-4">
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
      </section>

      <section className="mt-10">
        <h2 className={h2}>{t.casesTitle}</h2>
        <div className="mt-4 grid grid-cols-1 gap-4">
          {cases.map((c) => (
            <ShowcaseCard key={c.slug} showcase={localize(c, l)} locale={l} />
          ))}
        </div>
      </section>

      <section className="mt-10 max-w-prose">
        <h2 className={h2}>{t.stepsTitle}</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5">
          {entry.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="mt-10 max-w-prose">
        <h2 className={h2}>{t.faqTitle}</h2>
        <dl className="mt-3 space-y-5">
          {entry.faq.map(({ q, a }) => (
            <div key={q}>
              <dt className="font-semibold">{q}</dt>
              <dd className="text-muted-foreground mt-1">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 max-w-prose">
        <h2 className={h2}>{t.postsTitle}</h2>
        <ul className="mt-3 space-y-1.5">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={localizedPath(l, `/blog/${p.slug}`)}
                className="text-primary hover:underline"
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-border mt-12 max-w-prose border-t pt-8">
        <h2 className={h2}>{t.ctaTitle}</h2>
        <p className="text-muted-foreground mt-2">{t.ctaBody}</p>
        <Link
          href={localizedPath(l, "/contact")}
          className={`${cta.cta} ${cta.accent} mt-5`}
          {...ga("cta_click", slug, "service_contact")}
        >
          {t.ctaContact}
        </Link>
      </section>
    </Container>
  );
}
