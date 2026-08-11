import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { SupersetEmbed } from "@/components/superset-embed";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbGraph, showcaseGraph } from "@/lib/structured-data";
import {
  PLATFORM_LABEL,
  getShowcase,
  getShowcaseSlugs,
  localize,
} from "@/lib/work";
import {
  locales,
  isLocale,
  localizedPath,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getShowcaseSlugs().map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const source = getShowcase(slug);
  if (!source) return { title: "Not found", robots: { index: false } };
  const showcase = localize(source, l);

  return buildMetadata({
    title: showcase.title,
    description: showcase.summary,
    path: `/work/${slug}`,
    locale: l,
    // Reachable but unindexed while the write-up is still placeholder copy —
    // see the `noindex` flag in lib/work.ts.
    ...(showcase.noindex
      ? { robots: { index: false, follow: true } as const }
      : {}),
  });
}

export default async function ShowcasePage({ params }: Props) {
  const { locale, slug } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).work;
  const source = getShowcase(slug);
  if (!source) notFound();

  const showcase = localize(source, l);
  const { title, platform, details, articleSlug } = showcase;
  const trail = [
    { name: t.breadcrumbHome, path: "/" },
    { name: t.title, path: "/work" },
    { name: title },
  ];

  return (
    /* One screen, no page scroll: viewport minus the site chrome, with the report as
       the only child allowed to grow into what's left.

       9.125rem is measured, not derived — sticky nav 57px (`h-14` + 1px border) plus
       footer 89px (1px border + `py-8` + a 24px line). `h-full` would be the tidier
       expression but does not work here: <main> is `flex-1` under a `min-h-full` body,
       so its height is never definite and the percentage silently falls back to auto,
       collapsing the report to a ~150px default iframe box. If the nav or footer
       height changes, this number has to change with it.

       Locked from `lg` up only: squeezing a BI dashboard into a phone viewport makes
       it unreadable, so below that the page falls back to ordinary flow. */
    <Container className="flex flex-col py-6 lg:h-[calc(100dvh-9.125rem)]">
      <JsonLd data={breadcrumbGraph(l, trail)} />
      {!showcase.noindex && (
        <JsonLd
          data={showcaseGraph(l, {
            slug: showcase.slug,
            title,
            summary: showcase.summary,
            platform,
            platformLabel: PLATFORM_LABEL[platform],
          })}
        />
      )}

      <Breadcrumbs locale={l} trail={trail} />

      {/* Title and platform pill share one row — stacked, they cost the report
          a line of height for no added meaning. */}
      <header className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <span className="text-muted-foreground border-border rounded-full border px-2.5 py-0.5 text-xs">
          {PLATFORM_LABEL[platform]}
        </span>
      </header>

      {/* The report is the hero: `flex-1 min-h-0` hands it every pixel the rest of
          the page doesn't claim, and lets it shrink instead of pushing the page
          taller than the viewport. Both section headings are sr-only — the outline
          still reads correctly to crawlers and screen readers, but two 1.75rem
          headings are height the dashboard should have.

          Power BI loads a public URL straight into a lazy iframe; Superset has no
          public URL, so the SDK mints a guest token per viewer and there is no
          "open live dashboard" target to offer (ADR-0002). */}
      <h2 className="sr-only">{t.liveReportHeading}</h2>
      <figure className="border-border bg-muted mt-3 aspect-video w-full overflow-hidden rounded-lg border lg:aspect-auto lg:min-h-0 lg:flex-1">
        {showcase.platform === "superset" ? (
          <SupersetEmbed
            slug={showcase.slug}
            embedId={showcase.embedId}
            title={`${title} — live ${PLATFORM_LABEL[platform]} dashboard`}
            loadingLabel={t.dashboardLoading}
            errorLabel={t.dashboardError}
          />
        ) : (
          <iframe
            src={showcase.embedUrl}
            title={`${title} — live ${PLATFORM_LABEL[platform]} dashboard`}
            loading="lazy"
            allowFullScreen
            className="h-full w-full border-0"
          />
        )}
      </figure>

      {/* Everything that used to run down the page, folded into one band under the
          report: description + its two links on the left, the onward CTA on the
          right. Case studies used to dead-end at the embed with no path to the
          things a visitor who liked it would buy — that path survives the squeeze. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-8">
        <section>
          <h2 className="sr-only">{t.aboutHeading}</h2>
          <div className="text-muted-foreground space-y-1 text-sm">
            {details.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium">
            {articleSlug && (
              <Link
                href={localizedPath(l, `/blog/${articleSlug}`)}
                className="text-primary inline-flex items-center gap-1.5 hover:underline"
              >
                {t.readWriteUp}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 12h14M13 6l6 6-6 6"
                  />
                </svg>
              </Link>
            )}

            {showcase.platform === "power-bi" && (
              <a
                href={showcase.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1.5 hover:underline"
              >
                {t.openLiveDashboard}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 17 17 7M9 7h8v8"
                  />
                </svg>
              </a>
            )}
          </div>
        </section>

        <aside className="border-border bg-muted/40 rounded-lg border p-4 lg:max-w-xs">
          <h2 className="text-sm font-semibold tracking-tight">{t.ctaTitle}</h2>
          <p className="text-muted-foreground mt-1 text-xs">{t.ctaBody}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
            <Link
              href={localizedPath(l, "/services")}
              className="text-primary hover:underline"
            >
              {t.ctaServices} →
            </Link>
            <Link
              href={localizedPath(l, "/contact")}
              className="text-primary hover:underline"
            >
              {t.ctaContact} →
            </Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}
