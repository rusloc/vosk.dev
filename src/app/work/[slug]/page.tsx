import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { PLATFORM_LABEL, getShowcase, getShowcaseSlugs } from "@/lib/work";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getShowcaseSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const showcase = getShowcase(slug);
  if (!showcase) return { title: "Not found", robots: { index: false } };

  return buildMetadata({
    title: showcase.title,
    description: showcase.summary,
    path: `/work/${slug}`,
  });
}

export default async function ShowcasePage({ params }: Props) {
  const { slug } = await params;
  const showcase = getShowcase(slug);
  if (!showcase) notFound();

  const { title, platform, embedUrl, href, details, articleSlug } = showcase;

  return (
    <Container className="py-16 sm:py-20">
      <Link
        href="/work"
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </span>
        Back to showcase
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
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
          href={`/blog/${articleSlug}`}
          className="text-primary mt-6 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          Read the full write-up on the blog
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}

      {/* Example report — embedded live, lazy so it loads only when scrolled into view. */}
      <figure className="mt-10">
        <div className="border-border bg-muted aspect-video w-full overflow-hidden rounded-lg border">
          <iframe
            src={embedUrl}
            title={`${title} — live ${PLATFORM_LABEL[platform]} dashboard`}
            loading="lazy"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
        <figcaption className="mt-3">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            Open live dashboard
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
        </figcaption>
      </figure>
    </Container>
  );
}
