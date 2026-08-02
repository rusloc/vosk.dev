import Link from "next/link";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { tagSlug } from "@/lib/tags";

/** A tag chip linking to its filter page. Sizing comes from the parent's text size. */
export function TagLink({ tag, locale }: { tag: string; locale: Locale }) {
  return (
    <Link
      href={localizedPath(locale, `/blog/tag/${tagSlug(tag)}`)}
      className="border-border hover:bg-muted hover:text-foreground block rounded-full border px-2.5 py-0.5 transition-colors"
    >
      {tag}
    </Link>
  );
}
