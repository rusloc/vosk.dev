/**
 * Live report embed for blog posts — any publicly reachable report URL (a Power BI
 * "publish to web" link) dropped straight into an article. Same figure treatment as
 * the /work detail page: a lazy iframe in a bordered 16:9 frame with an optional
 * "open live report" link underneath. Used from MDX as
 * <ReportEmbed src="…" href="…" title="…" />.
 *
 * Not usable for Superset: those dashboards have no public URL and need a guest
 * token minted per viewer — see <SupersetEmbed> and ADR-0001.
 */
export function ReportEmbed({
  src,
  href,
  title,
}: {
  src: string;
  href?: string;
  title: string;
}) {
  return (
    <figure className="my-8">
      <div className="border-border bg-muted aspect-video w-full overflow-hidden rounded-lg border">
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
      {href && (
        <figcaption className="mt-3">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            Open the live report
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
      )}
    </figure>
  );
}
