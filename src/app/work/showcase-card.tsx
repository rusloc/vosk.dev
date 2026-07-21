import Link from "next/link";
import { PLATFORM_LABEL, type Showcase } from "@/lib/work";

// Decorative accent block bleeding off the right of each card. Dusty-pink
// placeholder for now — swap for real per-showcase art later.
const ACCENT_COLOR = "#d8a7b0";

/**
 * Concise showcase card for the /work list — mirrors the blog list item: title +
 * arrow-link on one row, a short summary, and a platform badge. No iframe here;
 * the live report lives on the detail page (/work/[slug]) this links to.
 *
 * A 16:9 accent block (~20% of the width) sits at the right edge, faded via a
 * left-to-right mask (transparent at the left, opaque at the right) so it tucks in
 * behind the arrow circle without competing with the text.
 */
export function ShowcaseCard({ showcase }: { showcase: Showcase }) {
  const { slug, title, summary, platform } = showcase;
  const href = `/work/${slug}`;

  return (
    <article className="border-border relative overflow-hidden rounded-lg border">
      {/* Accent block — right-aligned, 16:9, masked so it fades out toward the left. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-0 aspect-video w-1/5 -translate-y-1/2"
        style={{
          backgroundColor: ACCENT_COLOR,
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
