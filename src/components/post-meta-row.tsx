import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { TagLink } from "@/components/tag-link";

/**
 * Date + tag chips, shared by the blog list card and the post header (the two
 * were byte-identical). The tag group stays hidden below `sm` to keep the mobile
 * meta row compact — the blog index carries a full tag row that is visible at
 * every width, so the filter pages are never unreachable.
 *
 * `showTags={false}` drops the chips entirely; the post header passes it, the
 * list cards want them. Tag pages keep their entry point either way, via the
 * blog index row above.
 *
 * `author` and `updated` are the post header's byline (SEO spec T-05): the name linked to `/about`, and the update
 * date when the frontmatter has one. The list cards pass neither.
 */
export function PostMetaRow({
  date,
  tags,
  locale,
  showTags = true,
  author,
  updated,
}: {
  date: string;
  tags: string[];
  locale: Locale;
  showTags?: boolean;
  author?: { name: string; href: string };
  updated?: { label: string; date: string };
}) {
  return (
    <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs">
      <time dateTime={date}>{date}</time>
      {author && (
        <>
          <span aria-hidden="true">·</span>
          <Link
            href={author.href}
            rel="author"
            className="hover:text-foreground"
          >
            {author.name}
          </Link>
        </>
      )}
      {updated && (
        <>
          <span aria-hidden="true">·</span>
          <span>
            {updated.label} <time dateTime={updated.date}>{updated.date}</time>
          </span>
        </>
      )}
      {showTags && tags.length > 0 && (
        <div className="hidden items-center gap-2 sm:flex">
          <span aria-hidden="true">|</span>
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag}>
                <TagLink tag={tag} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
