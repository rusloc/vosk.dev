import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { JsReportLazy } from "@/components/js-report-lazy";
import { ContactChatLink } from "@/components/livechat/contact-chat-link";
import { N8nWorkflow } from "@/components/n8n-workflow";
import {
  CHAT_REPORTS,
  REPORT_HASHES,
  REPORT_QUERY_KEYS,
} from "@/lib/js-reports";
import { hasN8nFlow } from "@/lib/n8n-flows";
import { ReportDialog } from "@/components/report-dialog";
import {
  CEO_DIGEST_CHAT_COPY,
  CEO_DIGEST_SUGGESTIONS,
  askAiTrigger,
} from "@/components/chat/ask-ai";
import { ChatPanelLazy } from "@/components/chat/chat-panel-lazy";
import { SalesDashboardLazy } from "@/components/sales-dashboard-lazy";
import { SupersetEmbedLazy } from "@/components/superset-embed-lazy";
import { env } from "@/lib/env";
import { getPostBySlug } from "@/lib/content";
import { ga } from "@/lib/analytics";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { getSalesDashboardData } from "@/lib/sales-dashboard";
import { breadcrumbGraph, showcaseGraph } from "@/lib/structured-data";
import {
  PLATFORM_LABEL,
  getShowcase,
  getShowcaseSlugs,
  isJsReportLive,
  localize,
  showcases,
} from "@/lib/work";
import { locales, localizedPath, resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ReportMock } from "../report-mock";
import cta from "@/components/cta-button.module.css";

/** A line of showcase copy with its `**key phrases**` in bold (lib/work.ts, 11-16). */
function withBold(text: string) {
  return text.split(/\*\*(.+?)\*\*/).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-foreground font-semibold">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

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
  const l = resolveLocale(locale);
  const source = getShowcase(slug);
  if (!source) return { title: "Not found", robots: { index: false } };
  const showcase = localize(source, l);

  return buildMetadata({
    title: showcase.title,
    description: showcase.description ?? showcase.summary,
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
  const l = resolveLocale(locale);
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
  // The AI chat (ADR-0005): beside each live web report listed in CHAT_REPORTS, and only while CHAT_ENABLED is "1"
  // at build.
  const chatReport =
    showcase.platform === "js" &&
    CHAT_REPORTS.has(showcase.report) &&
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
  // The next two indexable showcases after this one in list order, wrapping round (the cards' order, newest first).
  const listed = showcases.filter((s) => !s.noindex);
  const at = listed.findIndex((s) => s.slug === slug);
  const related = [1, 2]
    .map((k) => listed[(at + k) % listed.length])
    .filter((s): s is NonNullable<typeof s> => !!s && s.slug !== slug)
    .map((s) => localize(s, l));

  // A way on from a showcase (11-17 SEO check: the page linked only back): contact and services, then the next
  // showcases on the list, wrapping round. The call to action in a box (owner, 11-18): one sentence, then the buttons.
  // "Book a free call" and its sentence appear only once `siteConfig.bookingUrl` is set: no promise of a call before a
  // scheduler exists. Always under About on the left (owner, 11-27); on a page with "Try it yourself" its "Contact me"
  // carries the landing pages' flare (owner, 11-27).
  const contactBox = (
    <section className="border-accent/50 bg-accent/10 max-w-prose rounded-xl border p-5 sm:p-6 lg:px-5 lg:py-4">
      <h2 className="text-lg font-semibold tracking-tight">
        {siteConfig.bookingUrl ? t.nextCtaBooking : t.nextCta}
      </h2>
      <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium lg:mt-3">
        {siteConfig.bookingUrl && (
          <a
            href={siteConfig.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={CTA_PRIMARY}
            {...ga("booking_click", slug, "showcase")}
          >
            {t.nextBook}
          </a>
        )}
        {/* Opens the live chat when it is on (owner, 11-27); the contact page otherwise, and without JS. */}
        <ContactChatLink
          href={localizedPath(l, "/contact")}
          className={`${siteConfig.bookingUrl ? CTA_SECONDARY : CTA_PRIMARY}${showcase.platform === "automation" ? ` ${cta.flare}` : ""}`}
          {...ga("cta_click", slug, "showcase_contact")}
        >
          {t.nextContact}
        </ContactChatLink>
        <Link
          href={localizedPath(l, "/services")}
          className={CTA_SECONDARY}
          {...ga("cta_click", slug, "showcase_pricing")}
        >
          {t.nextServices}
        </Link>
      </div>
    </section>
  );

  // "More case studies": always under the contact box on the left (owner, 11-27).
  const relatedBox = (
    <section className="max-w-prose">
      {related.length > 0 && (
        <>
          <h2 className="text-base font-semibold tracking-tight">
            {t.relatedTitle}
          </h2>
          {/* Stacked, one title per line (owner, 11-27). */}
          <ul className="mt-2 space-y-1.5 lg:mt-1 lg:space-y-0.5">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={localizedPath(l, `/work/${r.slug}`)}
                  title={r.title}
                  className="text-primary font-medium hover:underline"
                  {...ga("select_content", r.slug, "related_showcase")}
                >
                  {r.title}
                </Link>
                {/* Titles only on desktop, so the page fits one screen (11-25). */}
                <span className="text-muted-foreground lg:hidden">
                  {" "}
                  · {r.summary}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );

  return (
    <Container className="pt-6 pb-6 lg:pb-2">
      <JsonLd data={breadcrumbGraph(l, trail)} />
      {!showcase.noindex && (
        <JsonLd
          data={showcaseGraph(l, {
            slug: showcase.slug,
            title,
            description: showcase.description ?? showcase.summary,
            platform,
            // every format the page opens: a JS report with a published Power BI flavour is both (11-17 SEO check)
            formats: [
              PLATFORM_LABEL[platform],
              ...(showcase.platform === "js" && showcase.powerBi
                ? [PLATFORM_LABEL["power-bi"]]
                : []),
            ],
            articleSlug: article?.slug,
          })}
        />
      )}

      {/* One way back, not a crumb trail. The breadcrumb JSON-LD above still
          describes the same Home → Showcase → title hierarchy this link walks up. */}
      <BackLink href={localizedPath(l, "/work")} label={t.backToShowcase} />

      {/* One screen, no scroll, on desktop (owner, 11-25). The title and the buttons across the page, then the grid
          below (owner's sketch, 11-27). */}
      <div className="mt-3 lg:mt-2">
        {/* No platform pill beside the title (owner, 11-04): the buttons below name the format. */}
        <header>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {/* The client type, stated plainly (owner, 11-15). */}
          <p className="text-muted-foreground mt-1.5">
            {t.clientLabel}:{" "}
            <span className="text-foreground font-medium">
              {showcase.client}
            </span>
          </p>
          {/* Where the figures come from (11-17, spec C4), as on the card. */}
          <p className="text-muted-foreground mt-1 text-sm">
            {t.dataLabel[showcase.data]}
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
        <div className="mt-5 flex flex-wrap gap-3 lg:mt-4">
          {/* An n8n workflow (11-16): one button that opens its canvas, drawn by n8n's hosted preview (our server
            stays private). Owner's order, 11-16: this button, then "Try it yourself", then "About this project". */}
          {/* "Ask AI" (owner, 11-16): a 16:9 popup, the chat on the right and on the left an empty slot, a dull report
            picture over "Your APP or BI REPORT here", where a client's own app would sit. Below `lg` the chat alone. It
            answers from the route; nothing loads before. */}
          {dataChat && (
            <ReportDialog
              label={t.askAi}
              title={title}
              closeLabel={t.closeReport}
              trigger={askAiTrigger(t.askAi)}
              size="wide"
              ga={ga("chat_open", slug)}
            >
              <div className="flex h-full">
                <div className="bg-muted hidden min-w-0 flex-1 flex-col items-center justify-center gap-5 p-10 lg:flex">
                  <div className="w-full max-w-[420px] opacity-40 grayscale">
                    <ReportMock metric="" />
                  </div>
                  <p className="text-muted-foreground text-lg font-medium tracking-tight">
                    {t.chatAppSlot}
                  </p>
                </div>
                <div className="border-border min-w-0 flex-1 lg:w-[420px] lg:flex-none lg:border-l">
                  <ChatPanelLazy
                    endpoint={`/api/chat/${dataChat}`}
                    suggestions={CEO_DIGEST_SUGGESTIONS}
                    standalone={CEO_DIGEST_CHAT_COPY}
                  />
                </div>
              </div>
            </ReportDialog>
          )}
          {showcase.platform === "automation" && canvas && (
            <ReportDialog
              label={t.openWorkflow}
              title={`${title} — ${PLATFORM_LABEL.automation}`}
              closeLabel={t.closeReport}
              ga={ga("report_open", slug, "n8n_workflow")}
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
              ga={ga("report_open", slug, "power_bi")}
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
                showcase.platform === "power-bi"
                  ? t.openPowerBi
                  : t.openWebReport
              }
              title={reportTitle}
              closeLabel={t.closeReport}
              href={
                showcase.platform === "power-bi" ? showcase.href : undefined
              }
              ga={ga(
                "report_open",
                slug,
                showcase.platform === "power-bi" ? "power_bi" : "web_report",
              )}
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
                <SupersetEmbedLazy
                  domain={env.NEXT_PUBLIC_SUPERSET_DOMAIN}
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
              ga={ga("chat_open", slug)}
            >
              <JsReportLazy report={chatReport} chat chatOpen />
            </ReportDialog>
          )}
        </div>
      </div>

      {/* One grid on every showcase (owner's sketch, 11-27), two equal columns from lg. Row one: About on the left,
          "Try it yourself" on the right. The right cell is there on every page and empty where a page has no steps (the
          reports). Under About, in the left column: the contact box, then "More case studies". One column below lg. */}
      <div className="mt-6 lg:mt-4 lg:grid lg:grid-cols-2 lg:gap-x-14 lg:gap-y-3">
        <section className="max-w-prose lg:col-start-1 lg:row-start-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {t.aboutHeading}
          </h2>
          <div className="text-foreground/85 mt-3 space-y-4 leading-relaxed lg:mt-2 lg:space-y-2 lg:text-[15px] lg:leading-normal">
            {/* A dry bullet summary (owner, 11-05): what the report shows and which metrics reveal the detail. */}
            <ul className="marker:text-muted-foreground list-disc space-y-1.5 pl-5 lg:space-y-1">
              {details.map((point, i) => (
                <li key={i}>{withBold(point)}</li>
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

        {/* Row one, right: the steps to try it, only on a page that has them; otherwise an empty cell that keeps the grid. */}
        {showcase.platform === "automation" ? (
          <div className="mt-8 lg:col-start-2 lg:row-start-1 lg:mt-0">
            <section className="max-w-prose">
              {/* The heading and, on its right, the sample files: a native <details> (no client JS, owner 11-16) whose
              list opens over the content below, so the column stays short enough for one screen (11-26). */}
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold tracking-tight">
                  {t.howToTestHeading}
                </h2>
                {showcase.test.samples && (
                  <details className="border-border bg-background relative rounded-md border px-3 py-1 text-sm">
                    <summary className="cursor-pointer font-medium select-none">
                      {t.samplesLabel}
                    </summary>
                    <ul className="border-border bg-background absolute top-full right-0 z-10 mt-1 w-max max-w-xs space-y-1 rounded-md border px-3 py-2 shadow-md">
                      {showcase.test.samples.map((sample, i) => (
                        <li key={sample.href}>
                          <a
                            href={sample.href}
                            download
                            className="text-primary font-medium hover:underline"
                          >
                            {t.sampleName.replace("{n}", String(i + 1))}
                          </a>{" "}
                          <span className="text-muted-foreground">
                            {sample.note}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              <ol className="text-foreground/85 marker:text-muted-foreground mt-3 list-decimal space-y-1.5 pl-5 leading-relaxed lg:mt-2 lg:space-y-1 lg:text-[15px] lg:leading-normal">
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
                        withBold(part)
                      ),
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : (
          <div
            aria-hidden
            className="hidden lg:col-start-2 lg:row-start-1 lg:block"
          />
        )}

        {/* Rows two and three, left column, under About (owner, 11-27). */}
        <div className="mt-6 space-y-6 lg:col-start-1 lg:mt-0 lg:space-y-3">
          {contactBox}
          {relatedBox}
        </div>
      </div>
    </Container>
  );
}

// Orange, and white for the secondary, both with the blue wipe of the black CTAs (owner, 11-25).
const CTA_PRIMARY = `${cta.cta} ${cta.accent}`;
const CTA_SECONDARY = `${cta.cta} ${cta.outline}`;
