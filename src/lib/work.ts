/**
 * Work showcase data — the live client dashboards embedded on /work.
 * Data lives here (not in the component) so the page stays a thin renderer and a
 * future CMS/MDX swap is cheap. Two platforms are supported:
 *  - Power BI  → "publish to web" embed URL (Service → File → Embed report → Publish to web).
 *  - Superset  → a public / guest dashboard URL.
 * `embedUrl` is what the preview iframe loads; `href` is where the "open live
 * dashboard" link points (usually the same, but can differ, e.g. a full-screen view).
 */
export type ShowcasePlatform = "power-bi" | "superset";

export type Showcase = {
  slug: string;
  title: string;
  blurb: string; // the "little text" under the preview
  platform: ShowcasePlatform;
  embedUrl: string;
  href: string;
};

export const PLATFORM_LABEL: Record<ShowcasePlatform, string> = {
  "power-bi": "Power BI",
  superset: "Apache Superset",
};

/**
 * DRAFT — one placeholder showcase to populate the layout for now.
 * The `embedUrl` below is Microsoft's public Power BI sample report (frameable,
 * always live). Replace it with a real client report's publish-to-web `?r=…` URL,
 * then add real entries (Power BI + Superset) as the portfolio fills out.
 */
export const showcases: Showcase[] = [
  {
    slug: "sample-report",
    title: "Sample report (placeholder)",
    blurb:
      "A live Power BI report embedded straight from the service — filter, drill down, and explore it in place. Swap this for a real client dashboard.",
    platform: "power-bi",
    embedUrl: "https://playground.powerbi.com/sampleReportEmbed",
    href: "https://playground.powerbi.com/sampleReportEmbed",
  },
];
