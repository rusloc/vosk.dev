import Link from "next/link";
import type { LocalizedShowcase } from "@/lib/work";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { FlowMock, ReportMock } from "./report-mock";
import titleStyles from "../blog/title-bar.module.css";

/**
 * Showcase list card — the block styling mirrors the blog list item (blurred
 * orange title-bar highlight, arrow-link; no platform pill since 11-04) and adds a decorative
 * report illustration on the right. The whole card lifts a few pixels with a soft
 * shadow on hover. No iframe here; the live report lives on /work/[slug].
 */
export function ShowcaseCard({
  showcase,
  locale,
  clientLabel,
}: {
  showcase: LocalizedShowcase;
  locale: Locale;
  clientLabel: string;
}) {
  const { slug, title, summary, client, metric } = showcase;
  const href = localizedPath(locale, `/work/${slug}`);

  return (
    <article className="group bg-background border-border relative flex gap-6 rounded-lg border p-5 transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(31,27,22,0.3)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Left — title and summary */}
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold tracking-tight">
          <span className="relative inline-block">
            <span aria-hidden="true" className={titleStyles.titleBar} />
            <Link
              href={href}
              className="hover:text-primary relative transition-colors"
            >
              {title}
            </Link>
          </span>
        </h2>

        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">{clientLabel}:</span>{" "}
          <span className="font-medium">{client}</span>
        </p>
        <p className="text-muted-foreground mt-1 max-w-md">{summary}</p>
      </div>

      {/* Middle — report illustration (hidden on small screens) */}
      <div className="hidden shrink-0 self-center md:block md:w-[170px] lg:w-[190px]">
        {showcase.platform === "automation" ? (
          <FlowMock />
        ) : (
          <ReportMock metric={metric} />
        )}
      </div>

      {/* Right — arrow link, same style/size as the blog list card */}
      <Link
        href={href}
        aria-label={`Open “${title}”`}
        className="bg-foreground text-background inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center self-start rounded-full transition-opacity hover:opacity-90"
      >
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
            d="M5 12h14M13 6l6 6-6 6"
          />
        </svg>
      </Link>
    </article>
  );
}
