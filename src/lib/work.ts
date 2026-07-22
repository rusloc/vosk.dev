/**
 * Work showcase data — client dashboards written up like case studies on /work.
 * Data lives here (not in the component) so pages stay thin renderers and a future
 * CMS/MDX swap is cheap. The list page shows concise cards; each links to a detail
 * page (/work/[slug]) with the write-up and the live report embedded. Two platforms:
 *  - Power BI  → "publish to web" embed URL (Service → File → Embed report → Publish to web).
 *  - Superset  → a public / guest dashboard URL.
 * `embedUrl` is what the detail-page iframe loads; `href` is the "open live dashboard" target.
 */
export type ShowcasePlatform = "power-bi" | "superset";

export type Showcase = {
  slug: string;
  title: string;
  summary: string; // concise — the list-card blurb
  platform: ShowcasePlatform;
  embedUrl: string;
  href: string;
  details: string[]; // paragraphs shown on the detail page, above the report
  metric?: string; // headline figure for the list-card report illustration (e.g. "$4.2M")
  articleSlug?: string; // optional /blog/<slug> write-up linked from the detail page
};

export const PLATFORM_LABEL: Record<ShowcasePlatform, string> = {
  "power-bi": "Power BI",
  superset: "Superset",
};

/**
 * DRAFT — one placeholder case study to populate the layout.
 * `embedUrl` is Microsoft's public Power BI sample (frameable, always live).
 * Replace it with a real client report's publish-to-web `?r=…` URL, and flesh out
 * `details` with the actual story (goal → data → what the dashboard changed).
 */
export const showcases: Showcase[] = [
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
      "A coal-mining company needed to see, at a glance, where a heavy-loader fleet's time actually goes. The funnel starts at 100% of the 24/7 clock and deducts each idle category in turn, with breakpoints marking equipment-readiness stages — \"ready for work,\" then \"effective work time.\"",
      "Every figure is a percentage of total available time, and a switcher flips between linear utilization and a weighted average (weighted by each excavator's ladle volume). It runs on Power BI's default stacked bar chart plus three DAX measures — all numbers here are altered to hide the client's real metrics.",
    ],
  },
];

export function getShowcaseSlugs(): string[] {
  return showcases.map((s) => s.slug);
}

export function getShowcase(slug: string): Showcase | undefined {
  return showcases.find((s) => s.slug === slug);
}
