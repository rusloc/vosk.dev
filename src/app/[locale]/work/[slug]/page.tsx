import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { SalesDashboardLazy } from "@/components/sales-dashboard-lazy";
import { SupersetEmbed } from "@/components/superset-embed";
import { cn } from "@/lib/cn";
import { buildMetadata } from "@/lib/metadata";
import { getSalesDashboardData } from "@/lib/sales-dashboard";
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

// ISR, for the Cube showcase: queried at build, re-queried at most once a day and in the
// background — a visitor is always served the cached page, so Cube's free tier (1,000
// requests/day, cold start after 30 idle minutes) is never visitor-facing (docs/08 §3).
// The iframe showcases fetch nothing, so for them this is a no-op rebuild.
export const revalidate = 86400;

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
  const dict = getDictionary(l);
  const t = dict.work;
  const source = getShowcase(slug);
  if (!source) notFound();

  const showcase = localize(source, l);
  const { title, platform, details } = showcase;
  const trail = [
    { name: t.breadcrumbHome, path: "/" },
    { name: t.title, path: "/work" },
    { name: title },
  ];

  // A native dashboard, not an iframe: it has its own intrinsic height and reads in
  // ordinary page flow, so the one-screen lock below does not apply to it. It also gets
  // no About text (owner's call, 09-27): the header alone sits above it so the whole
  // dashboard fits a laptop screen, and its own footnote says "synthetic data".
  const isNative = platform === "cube";

  const about = (
    <section>
      <h2 className="sr-only">{t.aboutHeading}</h2>
      <div className="text-muted-foreground space-y-1 text-sm">
        {details.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </section>
  );

  return (
    /* One screen, no page scroll: viewport minus the site chrome, with the report as
       the only child allowed to grow into what's left.

       8.625rem is measured, not derived — sticky nav 57px (`h-14` + 1px border) plus
       footer 81px (1px border + `py-8` + a 16px line). It was 9.125rem while the
       footer carried the language switcher, whose `py-1` pills made that line 24px;
       removing the switcher took 8px off the footer and this number with it.
       Re-measured over CDP, not adjusted by arithmetic. `h-full` would be the tidier
       expression but does not work here: <main> is `flex-1` under a `min-h-full` body,
       so its height is never definite and the percentage silently falls back to auto,
       collapsing the report to a ~150px default iframe box. If the nav or footer
       height changes, this number has to change with it.

       Locked from `lg` up only: squeezing a BI dashboard into a phone viewport makes
       it unreadable, so below that the page falls back to ordinary flow. */
    <Container
      className={cn(
        "flex flex-col py-6",
        !isNative && "lg:h-[calc(100dvh-8.625rem)]",
      )}
    >
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

      {/* One way back, not a crumb trail. The breadcrumb JSON-LD above still
          describes the same Home → Showcase → title hierarchy this link walks up. */}
      <BackLink href={localizedPath(l, "/work")} label={t.backToShowcase} />

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
          "open live dashboard" target to offer (ADR-0002).

          Cube is neither: the rows are queried right here, server-side, and handed to a
          client component as plain props — the browser never sees Cube or its token. */}
      <h2 className="sr-only">{t.liveReportHeading}</h2>
      {showcase.platform === "cube" ? (
        <div className="mt-4">
          <SalesDashboardLazy
            data={await getSalesDashboardData()}
            labels={dict.salesDashboard}
          />
        </div>
      ) : (
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
      )}

      {/* Description left, dashboard link right — same row, so the link sits directly
          under the report's bottom-right corner instead of costing its own line.
          `items-start` keeps it level with the first description line. */}
      {!isNative && (
        <div className="mt-3 flex items-start justify-between gap-6">
          {about}

          {showcase.platform === "power-bi" && (
            <a
              href={showcase.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex shrink-0 items-center gap-1.5 text-sm font-medium hover:underline"
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
      )}
    </Container>
  );
}
