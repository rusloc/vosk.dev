import { env } from "./env";

/**
 * Work showcase data — client dashboards written up like case studies on /work.
 * Data lives here (not in the component) so pages stay thin renderers and a future
 * CMS/MDX swap is cheap. The list page shows concise cards; each links to a detail
 * page (/work/[slug]) with the write-up and the live report embedded.
 *
 * Two platforms, and they embed differently enough to be separate shapes (ADR-0002):
 *  - Power BI  → a public "publish to web" URL, dropped into an iframe as-is.
 *  - Superset  → no public URL at all; an embed UUID for which the server mints a
 *                short-lived guest token per viewer (see lib/superset.ts).
 */
export type ShowcasePlatform = "power-bi" | "superset";

type ShowcaseBase = {
  slug: string;
  title: string;
  summary: string; // concise — the list-card blurb
  details: string[]; // paragraphs shown on the detail page, above the report
  metric?: string; // headline figure for the list-card report illustration (e.g. "$4.2M")
  articleSlug?: string; // optional /blog/<slug> write-up linked from the detail page
};

/**
 * A discriminated union rather than one shape with optional fields: `embedUrl`/`href`
 * are meaningless for a guest-token dashboard, and `embedId` is meaningless for Power BI.
 * The union forces the detail page to branch instead of rendering an empty iframe.
 */
export type Showcase =
  | (ShowcaseBase & { platform: "power-bi"; embedUrl: string; href: string })
  | (ShowcaseBase & { platform: "superset"; embedId: string });

export const PLATFORM_LABEL: Record<ShowcasePlatform, string> = {
  "power-bi": "Power BI",
  superset: "Superset",
};

/** Placeholder marker — an entry still carrying this is not publishable. */
const UNSET_EMBED_ID = "REPLACE-WITH-EMBED-UUID";

/**
 * DRAFT — placeholder case studies to populate the layout.
 * `embedUrl` on the first entry is Microsoft's public Power BI sample (frameable, always live).
 * Replace it with a real client report's publish-to-web `?r=…` URL, and flesh out
 * `details` with the actual story (goal → data → what the dashboard changed).
 */
const allShowcases: Showcase[] = [
  {
    slug: "retail-sales",
    title: "Retail sales performance",
    platform: "power-bi",
    summary:
      "Revenue sliced by region, product and time. Filter, cross-highlight and drill down exactly as the client does.",
    metric: "$4.2M",
    embedUrl: "https://playground.powerbi.com/sampleReportEmbed",
    href: "https://playground.powerbi.com/sampleReportEmbed",
    details: [
      "This is a placeholder case study. Replace it with a real engagement: the client's goal, the data sources behind it, and what the dashboard let them decide.",
      "The report below is embedded live from the Power BI service — filter, drill down, and interact with it exactly as the client does day to day.",
    ],
  },
  {
    slug: "mining-time-utilization",
    title: "Mining fleet time utilization",
    platform: "power-bi",
    summary:
      "A top-down waterfall funnel for a coal-mining fleet — total 24/7 time deducted category by category down to effective work, with linear and ladle-weighted views.",
    metric: "100%",
    embedUrl:
      "https://app.powerbi.com/view?r=eyJrIjoiY2M3YzU2MjAtNjdlOC00NGU2LThlMTItMzc2MTE2Yjk0MDlkIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9&embedImagePlaceholder=true",
    href: "https://app.powerbi.com/view?r=eyJrIjoiY2M3YzU2MjAtNjdlOC00NGU2LThlMTItMzc2MTE2Yjk0MDlkIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9&embedImagePlaceholder=true",
    articleSlug: "power-bi-time-utilization-funnel",
    details: [
      'A coal-mining company needed to see, at a glance, where a heavy-loader fleet\'s time actually goes. The funnel starts at 100% of the 24/7 clock and deducts each idle category in turn, with breakpoints marking equipment-readiness stages — "ready for work," then "effective work time."',
      "Every figure is a percentage of total available time, and a switcher flips between linear utilization and a weighted average (weighted by each excavator's ladle volume). It runs on Power BI's default stacked bar chart plus three DAX measures — all numbers here are altered to hide the client's real metrics.",
    ],
  },
  {
    slug: "finance-pl-overview",
    title: "Finance P&L overview",
    platform: "superset",
    summary:
      "Budget versus actual, margin waterfall and cost-centre breakdown across three fiscal years — built in Apache Superset on a Postgres warehouse.",
    metric: "$18.4M",
    embedId: UNSET_EMBED_ID,
    details: [
      "A finance team's monthly close, rebuilt as a single self-serve dashboard: budget versus actual by account and cost centre, a margin waterfall from revenue down to operating profit, and a variance view that surfaces the handful of lines actually worth explaining.",
      "The dashboard below is live — filter by fiscal year, scenario and cost centre exactly as the client does. It runs on Apache Superset against a Postgres star schema; the figures shown here are synthetic, generated from the versioned SQL in this repo, so no client data is exposed.",
    ],
  },
];

/**
 * Superset entries are hidden until the instance is configured and the entry carries a
 * real embed UUID — an unconfigured embed would render a dead frame on a page whose whole
 * job is to demonstrate competence. Filtering here (rather than at the call site) keeps
 * the list page, generateStaticParams, the sitemap and the 404 path automatically in sync.
 */
export const showcases: Showcase[] = allShowcases.filter(
  (s) =>
    s.platform !== "superset" ||
    (!!env.NEXT_PUBLIC_SUPERSET_DOMAIN && s.embedId !== UNSET_EMBED_ID),
);

export function getShowcaseSlugs(): string[] {
  return showcases.map((s) => s.slug);
}

export function getShowcase(slug: string): Showcase | undefined {
  return showcases.find((s) => s.slug === slug);
}
