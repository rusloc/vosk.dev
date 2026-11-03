import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { JsReportLazy } from "@/components/js-report-lazy";
import { REPORT_QUERY_KEYS } from "@/lib/js-reports";
import { ReportDialog } from "@/components/report-dialog";
import { SalesDashboardLazy } from "@/components/sales-dashboard-lazy";
import { SupersetEmbed } from "@/components/superset-embed";
import { getPostBySlug } from "@/lib/content";
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
    // The showcase's own card from ./opengraph-image.tsx, as posts do: showcase links
    // are what profiles and outreach share, and the generic card says nothing.
    images: [
      {
        url: `/work/${slug}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: showcase.title,
      },
    ],
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
  // The long-form story. Null for a draft or a missing post, so no dead link ships.
  const article = showcase.articleSlug
    ? getPostBySlug(showcase.articleSlug)
    : null;
  const trail = [
    { name: t.breadcrumbHome, path: "/" },
    { name: t.title, path: "/work" },
    { name: title },
  ];

  const reportTitle = `${title} — ${PLATFORM_LABEL[platform]}`;

  return (
    <Container className="py-6">
      <JsonLd data={breadcrumbGraph(l, trail)} />
      {!showcase.noindex && (
        <JsonLd
          data={showcaseGraph(l, {
            slug: showcase.slug,
            title,
            summary: showcase.summary,
            platform,
            platformLabel: PLATFORM_LABEL[platform],
            articleSlug: article?.slug,
          })}
        />
      )}

      {/* One way back, not a crumb trail. The breadcrumb JSON-LD above still
          describes the same Home → Showcase → title hierarchy this link walks up. */}
      <BackLink href={localizedPath(l, "/work")} label={t.backToShowcase} />

      <header className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <span className="text-muted-foreground border-border rounded-full border px-2.5 py-0.5 text-xs">
          {PLATFORM_LABEL[platform]}
        </span>
      </header>

      {/* Every showcase is a text page with a button: the report opens in a popup on
          request (owner's call, 10-22), so the page is the story a crawler can read.
          Power BI's public URL doubles as the no-JS fallback; Superset has no public
          URL — the SDK mints a guest token per viewer (ADR-0002) — and Cube is drawn
          from rows queried right here, server-side, handed to a client component as
          plain props, so the browser never sees Cube or its token. The JS report
          needs nothing from the server: it loads its own static data on open. A JS
          showcase whose Power BI flavour is published gets two buttons, "Power BI"
          and "Custom" (owner, 10-31); until then only the custom one, under the
          generic label. */}
      <div className="mt-5 flex flex-wrap gap-3">
        {showcase.platform === "js" && showcase.powerBi && (
          <ReportDialog
            label={t.openPowerBi}
            title={`${title} — ${PLATFORM_LABEL["power-bi"]}`}
            closeLabel={t.closeReport}
            href={showcase.powerBi.href}
          >
            <iframe
              src={showcase.powerBi.embedUrl}
              title={`${title} — ${PLATFORM_LABEL["power-bi"]}`}
              allowFullScreen
              className="h-full w-full border-0"
            />
          </ReportDialog>
        )}
        {/* The same public report in its own window (owner, 11-03): a plain link, no popup. */}
        {showcase.platform === "js" && showcase.powerBi && (
          <a
            href={showcase.powerBi.href}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border hover:bg-muted inline-flex h-10 items-center gap-1.5 rounded-md border px-5 text-sm font-medium whitespace-nowrap transition-colors"
          >
            {t.openPowerBiNewWindow}
            <span aria-hidden="true">↗</span>
          </a>
        )}
        <ReportDialog
          label={
            showcase.platform === "js" && showcase.powerBi
              ? t.openCustom
              : t.openLiveReport
          }
          title={reportTitle}
          closeLabel={t.closeReport}
          href={showcase.platform === "power-bi" ? showcase.href : undefined}
          openOnQuery={
            showcase.platform === "js"
              ? REPORT_QUERY_KEYS[showcase.report]
              : undefined
          }
        >
          {showcase.platform === "cube" ? (
            <div className="p-4 sm:p-6">
              <SalesDashboardLazy
                data={await getSalesDashboardData()}
                labels={dict.salesDashboard}
              />
            </div>
          ) : showcase.platform === "js" ? (
            <JsReportLazy report={showcase.report} />
          ) : showcase.platform === "superset" ? (
            <SupersetEmbed
              slug={showcase.slug}
              embedId={showcase.embedId}
              title={reportTitle}
              loadingLabel={t.dashboardLoading}
              errorLabel={t.dashboardError}
            />
          ) : (
            <iframe
              src={showcase.embedUrl}
              title={reportTitle}
              allowFullScreen
              className="h-full w-full border-0"
            />
          )}
        </ReportDialog>
      </div>

      <section className="mt-8 max-w-prose">
        <h2 className="text-lg font-semibold tracking-tight">
          {t.aboutHeading}
        </h2>
        <div className="text-foreground/85 mt-3 space-y-4 leading-relaxed">
          {details.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
          {/* The long-form story, linked by its own title as the anchor. */}
          {article && (
            <p>
              {t.writeUp}:{" "}
              <Link
                href={localizedPath(l, `/blog/${article.slug}`)}
                className="text-primary font-medium hover:underline"
              >
                {article.title}
              </Link>
            </p>
          )}
        </div>
      </section>
    </Container>
  );
}
