import Link from "next/link";
import {
  PLATFORM_LABEL,
  SHOWCASE_PLACEHOLDER_IMAGE,
  type Showcase,
} from "@/lib/work";

/**
 * Concise showcase card for the /work list — mirrors the blog list item: title +
 * arrow-link on one row, a short summary, and a platform badge. No iframe here;
 * the live report lives on the detail page (/work/[slug]) this links to.
 *
 * A decorative image bleeds off the right edge, faded via a left-to-right mask
 * (fully transparent at the left, fully opaque at the right) so it sits behind the
 * arrow circle without competing with the text.
 */
export function ShowcaseCard({ showcase }: { showcase: Showcase }) {
  const { slug, title, summary, platform } = showcase;
  const href = `/work/${slug}`;
  const image = showcase.image ?? SHOWCASE_PLACEHOLDER_IMAGE;

  return (
    <article className="border-border relative overflow-hidden rounded-lg border">
      {/* Background art — right-aligned, masked so it fades out toward the left. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-cover bg-right bg-no-repeat"
        style={{
          backgroundImage: `url(${image})`,
          WebkitMaskImage: "linear-gradient(to right, transparent, black)",
          maskImage: "linear-gradient(to right, transparent, black)",
        }}
      />

      <div className="relative p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="min-w-0 text-xl font-semibold tracking-tight">
            <Link href={href} className="hover:text-primary transition-colors">
              {title}
            </Link>
          </h2>

          <Link
            href={href}
            aria-label={`Open “${title}”`}
            className="bg-foreground text-background inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <p className="text-muted-foreground mt-2 max-w-2xl">{summary}</p>

        <div className="text-muted-foreground mt-3 text-xs">
          <span className="border-border rounded-full border px-2.5 py-0.5">
            {PLATFORM_LABEL[platform]}
          </span>
        </div>
      </div>
    </article>
  );
}
