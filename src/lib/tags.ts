/**
 * The closed set of blog tags: frontmatter value → display copy. Single source
 * of truth — `content.ts` validates frontmatter against these keys with
 * `z.enum`, so an unlisted tag fails the build rather than minting a tag page
 * with no editorial home.
 *
 * Lives outside `content.ts` because that module is `server-only` and the tag
 * chips render inside a client component.
 */
export const TAGS = {
  "power bi": "Power BI",
  superset: "Superset",
  sql: "SQL",
  python: "Python",
  js: "JS",
} as const;

export type Tag = keyof typeof TAGS;

/** Non-empty tuple form, which is what `z.enum` wants. */
export const tagValues = Object.keys(TAGS) as [Tag, ...Tag[]];

/**
 * Frontmatter value → routing key ("power bi" → "power-bi"). Every key in
 * {@link TAGS} is lowercase alphanumerics and single spaces, so this stays a
 * lossless, one-way-obvious mapping.
 */
export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Display copy for a tag — chips, the tag page `<h1>` and its `<title>`. An
 * `<h1>` reading "power bi" is the lowercase-frontmatter convention leaking
 * into the SERP.
 */
export function tagLabel(tag: string): string {
  return TAGS[tag as Tag] ?? tag;
}
