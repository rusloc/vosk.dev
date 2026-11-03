import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsReportLazy } from "@/components/js-report-lazy";
import { PLATFORM_LABEL, getShowcase, localize, showcases } from "@/lib/work";

type Props = { params: Promise<{ slug: string }> };

/**
 * A JS report full-window at `/report/<showcase slug>`: what the "Web report" button on a
 * showcase with two formats opens in a new window (owner, 11-03). The report's own URL state
 * (F-37) lives here now: "Copy link" hands out this page plus the state, and such a link opens
 * the report in that state. Not indexed and not in the sitemap: the showcase page is the
 * content, this is the app.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return showcases
    .filter((s) => s.platform === "js")
    .map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const source = getShowcase(slug);
  if (!source || source.platform !== "js")
    return { title: "Not found", robots: { index: false } };
  const { title } = localize(source, "en");
  return {
    title: `${title} — ${PLATFORM_LABEL.js}`,
    robots: { index: false, follow: true },
  };
}

export default async function ReportPage({ params }: Props) {
  const { slug } = await params;
  const source = getShowcase(slug);
  if (!source || source.platform !== "js") notFound();
  return <JsReportLazy report={source.report} />;
}
