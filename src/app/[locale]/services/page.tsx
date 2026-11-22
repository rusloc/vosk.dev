import type { Metadata } from "next";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { buildMetadata } from "@/lib/metadata";
import { serviceGraph } from "@/lib/structured-data";
import { resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ServiceGroups } from "./service-groups";
import Link from "next/link";
import { getPublishedServices } from "@/lib/services";
import { localizedPath } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
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
  const l = resolveLocale(locale);
  const t = getDictionary(l).services;
  const published = getPublishedServices();

  return (
    <Container className="py-6 sm:py-12">
      <JsonLd
        data={serviceGraph(l, {
          name: t.title,
          description: t.metaDescription,
          groups: [t.subscription, t.project, t.other],
        })}
      />

      {/* Title matches the blog / showcase pages: plain, no highlight. `heading` is the H1; `title` stays the nav label
          and the breadcrumb name (SEO spec T-07). No intro under it since 11-19 (owner). */}
      <PageHeader title={t.heading} />

      <ServiceGroups
        groups={[t.subscription, t.project, t.other]}
        conditions={t.conditions}
      />

      {/* One link per service page out of draft, the service name as the anchor text (SEO spec T-04). */}
      {published.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            {t.pagesTitle}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {published.map((s) => (
              <li key={s.slug}>
                <Link
                  href={localizedPath(l, `/services/${s.slug}`)}
                  className="text-primary hover:underline"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
