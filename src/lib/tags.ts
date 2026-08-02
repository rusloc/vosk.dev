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

/**
 * Proper casing for a tag used as page copy — an `<h1>` and a `<title>` reading
 * "power bi" is the lowercase-frontmatter convention leaking into the SERP.
 * Anything not listed is title-cased word by word ("data modeling" → "Data
 * Modeling"); acronyms and product names need an entry.
 */
const TAG_DISPLAY: Record<string, string> = {
  "power-bi": "Power BI",
  sql: "SQL",
  postgresql: "PostgreSQL",
  dax: "DAX",
  python: "Python",
  "microsoft-fabric": "Microsoft Fabric",
  "data-modeling": "Data Modeling",
  "code-quality": "Code Quality",
  automation: "Automation",
  workflow: "Workflow",
};

export function tagLabel(tag: string): string {
  const slug = tagSlug(tag);
  return (
    TAG_DISPLAY[slug] ??
    tag
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}
