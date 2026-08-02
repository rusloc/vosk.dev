import type { Locale } from "@/lib/i18n/config";
import { TagLink } from "@/components/tag-link";

/**
 * Date + tag chips, shared by the blog list card and the post header (the two
 * were byte-identical). The tag group stays hidden below `sm` to keep the mobile
 * meta row compact — the blog index carries a full tag row that is visible at
 * every width, so the filter pages are never unreachable.
 */
export function PostMetaRow({
  date,
  tags,
  locale,
}: {
  date: string;
  tags: string[];
  locale: Locale;
}) {
  return (
    <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-xs">
      <time dateTime={date}>{date}</time>
      {tags.length > 0 && (
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
