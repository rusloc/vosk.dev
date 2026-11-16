import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { JsReportLazy } from "@/components/js-report-lazy";
import { N8nWorkflow } from "@/components/n8n-workflow";
import { REPORT_HASHES, REPORT_QUERY_KEYS } from "@/lib/js-reports";
import { hasN8nFlow } from "@/lib/n8n-flows";
import { ReportDialog } from "@/components/report-dialog";
import {
  CEO_DIGEST_CHAT_COPY,
  CEO_DIGEST_SUGGESTIONS,
  askAiTrigger,
} from "@/components/chat/ask-ai";
import { ChatPanel } from "@/components/chat/chat-panel";
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
  isJsReportLive,
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
  // A JS report whose data is not wired yet (its reader URL unset) shows its Power BI flavour only. An n8n workflow
  // has no report: its one button opens the workflow's canvas instead (below).
  const webReport =
    showcase.platform === "js"
      ? isJsReportLive(showcase.report)
      : showcase.platform !== "automation";
  // The AI chat (ADR-0005, 11-06; the P&L and ACME Trucks 11-09, Nordmark 11-15): beside each live web report,
  // and only while CHAT_ENABLED is "1" at build.
  const chatReport =
    showcase.platform === "js" &&
    (showcase.report === "mirelo" ||
      showcase.report === "marketing" ||
      showcase.report === "pnl" ||
      showcase.report === "trucks") &&
    // Nordmark rejoins this list with its Supabase go-live (its chat route ships then; 11-16 hotfix).
    webReport &&
    process.env.CHAT_ENABLED === "1"
      ? showcase.report
      : null;
  const chat = chatReport !== null;
  // A data chat with no report beside it (the Tidewell showcase, 11-16), under the same build-time switch. Its
  // canvas button waits for the workflow's public copy (data/n8n/): an entry can ship before its export.
  const dataChat =
    showcase.platform === "automation" &&
    showcase.chat &&
    process.env.CHAT_ENABLED === "1"
      ? showcase.chat
      : null;
  const canvas =
    showcase.platform === "automation" && (await hasN8nFlow(showcase.workflow));

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

      {/* No platform pill beside the title (owner, 11-04): the buttons below name the format. */}
      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {/* The client type, stated plainly (owner, 11-15). */}
        <p className="text-muted-foreground mt-1.5">
          {t.clientLabel}:{" "}
          <span className="text-foreground font-medium">{showcase.client}</span>
        </p>
      </header>

      {/* Every showcase is a text page with a button: the report opens in a popup on
          request (owner's call, 10-22), so the page is the story a crawler can read.
          Power BI's public URL doubles as the no-JS fallback; Superset has no public
          URL — the SDK mints a guest token per viewer (ADR-0002) — and Cube is drawn
          from rows queried right here, server-side, handed to a client component as
          plain props, so the browser never sees Cube or its token. The JS report
          needs nothing from the server: it loads its own data on open. A showcase with
          two formats of the same report (a JS one whose Power BI flavour is published)
          gets two such buttons side by side, "Power BI" and "Web report" (owner, 10-31;
          labels 11-03), each opening its report in the same popup. Every showcase uses
          the same two names (owner, 11-04): "Power BI" for a Power BI report, "Web report"
          for everything drawn on the site (JS, Cube, Superset). */}
      <div className="mt-5 flex flex-wrap gap-3">
        {/* An n8n workflow (11-16): one button that opens its canvas, drawn by n8n's hosted preview (our server
            stays private). Owner's order, 11-16: this button, then "Try it yourself", then "About this project". */}
        {/* "Ask the data" (11-16): the chat alone in the narrow popup; it answers from the route, nothing loads before. */}
        {dataChat && (
          <ReportDialog
            label={t.askData}
            title={title}
            closeLabel={t.closeReport}
            trigger={askAiTrigger(t.askData)}
            size="panel"
          >
            <ChatPanel
              endpoint={`/api/chat/${dataChat}`}
              suggestions={CEO_DIGEST_SUGGESTIONS}
              standalone={CEO_DIGEST_CHAT_COPY}
            />
          </ReportDialog>
        )}
        {showcase.platform === "automation" && canvas && (
          <ReportDialog
            label={t.openWorkflow}
            title={`${title} — ${PLATFORM_LABEL.automation}`}
            closeLabel={t.closeReport}
          >
            <N8nWorkflow
              flow={showcase.workflow}
              loadingLabel={t.workflowLoading}
              errorLabel={t.workflowError}
            />
          </ReportDialog>
        )}
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
        {webReport && (
          <ReportDialog
            label={
              showcase.platform === "power-bi" ? t.openPowerBi : t.openWebReport
            }
            title={reportTitle}
            closeLabel={t.closeReport}
            href={showcase.platform === "power-bi" ? showcase.href : undefined}
            openOnQuery={
              showcase.platform === "js"
                ? REPORT_QUERY_KEYS[showcase.report]
                : undefined
            }
            openOnHash={
              showcase.platform === "js"
                ? REPORT_HASHES[showcase.report]
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
              <JsReportLazy report={showcase.report} chat={chat} />
            ) : showcase.platform === "superset" ? (
              <SupersetEmbed
                slug={showcase.slug}
                embedId={showcase.embedId}
                title={reportTitle}
                loadingLabel={t.dashboardLoading}
                errorLabel={t.dashboardError}
              />
            ) : showcase.platform === "power-bi" ? (
              <iframe
                src={showcase.embedUrl}
                title={reportTitle}
                allowFullScreen
                className="h-full w-full border-0"
              />
            ) : null}
          </ReportDialog>
        )}
        {/* Ask AI opens the web report with its chat already up (owner, 11-06): the chat then asks about the
            report's view, and a figures card's link applies in place, as from the report's own button. */}
        {chatReport && (
          <ReportDialog
            label={t.askAi}
            title={reportTitle}
            closeLabel={t.closeReport}
            trigger={askAiTrigger(t.askAi)}
          >
            <JsReportLazy report={chatReport} chat chatOpen />
          </ReportDialog>
        )}
      </div>

      {showcase.platform === "automation" && (
        <section className="mt-8 max-w-prose">
          <h2 className="text-lg font-semibold tracking-tight">
            {t.howToTestHeading}
          </h2>
          <ol className="text-foreground/85 marker:text-muted-foreground mt-3 list-decimal space-y-1.5 pl-5 leading-relaxed">
            {showcase.test.steps.map((step, i) => (
              <li key={i}>
                {step.split(/(\{email\})/).map((part, j) =>
                  part === "{email}" ? (
                    <a
                      key={j}
                      href={`mailto:${showcase.test.email}`}
                      className="text-primary font-medium break-all hover:underline"
                    >
                      {showcase.test.email}
                    </a>
                  ) : (
                    part
                  ),
                )}
              </li>
            ))}
          </ol>
          {/* The sample files in a compact dropdown (owner, 11-16): a native <details>, so no client JS. */}
          {showcase.test.samples && (
            <details className="border-border mt-4 w-fit rounded-md border px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium select-none">
                {t.samplesLabel}
              </summary>
              <ul className="mt-2 space-y-1">
                {showcase.test.samples.map((sample, i) => (
                  <li key={sample.href}>
                    <a
                      href={sample.href}
                      download
                      className="text-primary font-medium hover:underline"
                    >
                      {t.sampleName.replace("{n}", String(i + 1))}
                    </a>{" "}
                    <span className="text-muted-foreground">{sample.note}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <section className="mt-8 max-w-prose">
        <h2 className="text-lg font-semibold tracking-tight">
          {t.aboutHeading}
        </h2>
        <div className="text-foreground/85 mt-3 space-y-4 leading-relaxed">
          {/* A dry bullet summary (owner, 11-05): what the report shows and which metrics reveal the detail. */}
          <ul className="marker:text-muted-foreground list-disc space-y-1.5 pl-5">
            {details.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
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
