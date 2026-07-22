import Link from "next/link";
import { PLATFORM_LABEL, type Showcase } from "@/lib/work";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { ReportMock } from "./report-mock";
import titleStyles from "../blog/title-bar.module.css";

/**
 * Showcase list card — the block styling mirrors the blog list item (blurred
 * orange title-bar highlight, arrow-link, one platform tag) and adds a decorative
 * report illustration on the right. The whole card lifts a few pixels with a soft
 * shadow on hover. No iframe here; the live report lives on /work/[slug].
 */
export function ShowcaseCard({
  showcase,
  locale,
}: {
  showcase: Showcase;
  locale: Locale;
}) {
  const { slug, title, summary, platform, metric } = showcase;
  const href = localizedPath(locale, `/work/${slug}`);

  return (
    <article className="group bg-background border-border relative flex gap-6 rounded-lg border p-5 transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(31,27,22,0.3)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Left — title, summary, single platform tag (same rhythm as the blog card) */}
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

        <p className="text-muted-foreground mt-2 max-w-md">{summary}</p>

        <div className="mt-3">
          <span className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs">
            {PLATFORM_LABEL[platform]}
          </span>
        </div>
      </div>

      {/* Middle — report illustration (hidden on small screens) */}
      <div className="hidden shrink-0 self-center md:block md:w-[170px] lg:w-[190px]">
        <ReportMock metric={metric} />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </article>
  );
}
