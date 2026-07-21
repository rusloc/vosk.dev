import { PLATFORM_LABEL, type Showcase } from "@/lib/work";

/**
 * One dashboard showcase: a live iframe preview (16:9), a platform badge, a short
 * blurb, and a link out to the full interactive dashboard. Server Component — the
 * iframe is plain markup, so no client JS is shipped for this.
 */
export function ShowcaseCard({ showcase }: { showcase: Showcase }) {
  const { title, blurb, platform, embedUrl, href } = showcase;

  return (
    <article className="border-border overflow-hidden rounded-lg border">
      {/* Preview — the actual report, lazy so off-screen dashboards don't load upfront. */}
      <div className="bg-muted aspect-video w-full">
        <iframe
          src={embedUrl}
          title={`${title} — live ${PLATFORM_LABEL[platform]} dashboard`}
          loading="lazy"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="min-w-0 text-xl font-semibold tracking-tight">{title}</h2>
          <span className="border-border text-muted-foreground shrink-0 rounded-full border px-2.5 py-0.5 text-xs">
            {PLATFORM_LABEL[platform]}
          </span>
        </div>

        <p className="text-muted-foreground mt-2 max-w-2xl">{blurb}</p>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
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
      </div>
    </article>
  );
}
