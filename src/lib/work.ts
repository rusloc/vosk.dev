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
];

export function getShowcaseSlugs(): string[] {
  return showcases.map((s) => s.slug);
}

export function getShowcase(slug: string): Showcase | undefined {
  return showcases.find((s) => s.slug === slug);
}
