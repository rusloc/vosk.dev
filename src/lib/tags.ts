/**
 * Tag slugs. Lives outside `content.ts` because that module is `server-only`
 * and the tag chips render inside a client component.
 *
 * Tags are authored in frontmatter as display text ("power bi"); the slug is the
 * routing key ("power-bi"). `content.ts` constrains the allowed characters so
 * this stays a lossless, one-way-obvious mapping.
 */
export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}
