import Link from "next/link";
import { PLATFORM_LABEL, type Showcase } from "@/lib/work";

// Decorative accent block bleeding off the right of each card. Dusty-pink
// placeholder for now — swap for real per-showcase art later.
const ACCENT_COLOR = "#d8a7b0";

// Sigmoid (ease-in-out) fade mask — many stops approximate an eased curve, which
// reads far smoother than a plain linear transparent→opaque ramp.
const FADE_MASK =
  "linear-gradient(to right," +
  " rgba(0,0,0,0) 0%, rgba(0,0,0,0.013) 8.1%, rgba(0,0,0,0.049) 15.5%," +
  " rgba(0,0,0,0.104) 22.5%, rgba(0,0,0,0.175) 29%, rgba(0,0,0,0.259) 35.3%," +
  " rgba(0,0,0,0.352) 41.2%, rgba(0,0,0,0.45) 47.1%, rgba(0,0,0,0.55) 52.9%," +
  " rgba(0,0,0,0.648) 58.8%, rgba(0,0,0,0.741) 64.7%, rgba(0,0,0,0.825) 71%," +
  " rgba(0,0,0,0.896) 77.5%, rgba(0,0,0,0.951) 84.5%, rgba(0,0,0,0.987) 91.9%," +
  " rgba(0,0,0,1) 100%)";

/**
 * Concise showcase card for the /work list — mirrors the blog list item: title +
 * arrow-link on one row, a short summary, and a platform badge. No iframe here;
 * the live report lives on the detail page (/work/[slug]) this links to.
 *
 * An accent block (~20% of the width, full card height) sits at the right edge,
 * faded via a left-to-right mask (transparent at the left, opaque at the right) so
 * it tucks in behind the arrow circle without competing with the text.
 */
export function ShowcaseCard({ showcase }: { showcase: Showcase }) {
  const { slug, title, summary, platform } = showcase;
  const href = `/work/${slug}`;

  return (
    <article className="border-border relative overflow-hidden rounded-lg border">
      {/* Accent block — right-aligned, full height, eased fade toward the left. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-[42%]"
        style={{
          backgroundColor: ACCENT_COLOR,
          WebkitMaskImage: FADE_MASK,
          maskImage: FADE_MASK,
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
