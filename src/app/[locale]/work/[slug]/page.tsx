import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { SupersetEmbed } from "@/components/superset-embed";
import { buildMetadata } from "@/lib/metadata";
import { PLATFORM_LABEL, getShowcase, getShowcaseSlugs } from "@/lib/work";
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
  const showcase = getShowcase(slug);
  if (!showcase) return { title: "Not found", robots: { index: false } };

  return buildMetadata({
    title: showcase.title,
    description: showcase.summary,
    path: `/work/${slug}`,
    locale: l,
  });
}

export default async function ShowcasePage({ params }: Props) {
  const { locale, slug } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).work;
  const showcase = getShowcase(slug);
  if (!showcase) notFound();

  const { title, platform, details, articleSlug } = showcase;

  return (
    <Container className="py-16 sm:py-20">
      <Link
        href={localizedPath(l, "/work")}
        className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-2 text-sm transition-colors"
      >
        <span className="bg-foreground text-background inline-flex h-7 w-7 items-center justify-center rounded-full transition-opacity group-hover:opacity-90">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 12H5M11 6l-6 6 6 6"
            />
          </svg>
        </span>
        {t.backToShowcase}
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <div className="text-muted-foreground mt-3 text-xs">
          <span className="border-border rounded-full border px-2.5 py-0.5">
            {PLATFORM_LABEL[platform]}
          </span>
        </div>
      </header>

      <div className="text-muted-foreground mt-8 max-w-2xl space-y-4">
        {details.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {articleSlug && (
        <Link
          href={localizedPath(l, `/blog/${articleSlug}`)}
          className="text-primary mt-6 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
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

      {/* Example report — embedded live. Power BI loads a public URL straight into a lazy
          iframe; Superset has no public URL, so the SDK mints a guest token per viewer and
          there is no "open live dashboard" target to offer (ADR-0002). */}
      <figure className="mt-10">
        {showcase.platform === "superset" ? (
          <SupersetEmbed
            slug={showcase.slug}
            embedId={showcase.embedId}
            title={`${title} — live ${PLATFORM_LABEL[platform]} dashboard`}
            loadingLabel={t.dashboardLoading}
            errorLabel={t.dashboardError}
          />
        ) : (
          <>
            <div className="border-border bg-muted aspect-video w-full overflow-hidden rounded-lg border">
              <iframe
                src={showcase.embedUrl}
                title={`${title} — live ${PLATFORM_LABEL[platform]} dashboard`}
                loading="lazy"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
            <figcaption className="mt-3">
              <a
                href={showcase.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
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
            </figcaption>
          </>
        )}
      </figure>
    </Container>
  );
}
