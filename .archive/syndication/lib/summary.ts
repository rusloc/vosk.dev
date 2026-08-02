import { normalizeEol } from "./items";
import type { SyndicationItem } from "./types";

/**
 * Teaser copy. Syndicated posts are not cross-posts of the article — they are a
 * hook: enough to be worth reading on its own, ending in a call to action back to
 * vosk.dev. The reader gets the gist on the platform they are already on, and the
 * click-through is the point.
 *
 * Generation is deliberately **deterministic** — the hand-written `description`
 * plus a trimmed excerpt of the opening prose. No LLM: this text publishes
 * irreversibly under the author's name, a diff of it has to be reviewable before
 * it goes out, and the same input must produce the same post on a re-run. If that
 * trade is ever revisited, this module is the only thing that changes.
 */

/** LinkedIn collapses a post behind "…see more" early, so the hook goes first. */
const LINKEDIN_EXCERPT = 400;
const DEVTO_EXCERPT = 900;

/** A teaser is a taste, not a compressed article. Hard cap regardless of budget. */
const MAX_PARAGRAPHS = 3;

/** Markdown blocks that are not prose and make poor teaser material. */
function isProse(block: string): boolean {
  return !/^(#{1,6}\s|```|~~~|>\s|\||!\[|<|\s*[-*+]\s|\s*\d+\.\s)/.test(block);
}

/** `[text](url)` → `text`, and drop emphasis/code markers. Links belong in the CTA. */
function stripInline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The opening prose of an article, trimmed to `max` characters at a sentence
 * boundary — a teaser that stops mid-clause reads like a bug, not a hook. Returns
 * "" when there is no usable prose (e.g. a showcase, which has no body).
 */
export function excerpt(markdown: string | undefined, max: number): string {
  if (!markdown) return "";

  const prose: string[] = normalizeEol(markdown)
    // Fenced code is removed before paragraph-splitting, not filtered after: a
    // fence containing a blank line splits into several blocks, and the inner
    // ones no longer start with ``` so they'd read as prose.
    .replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, "")
    // Heading lines go the same way. They are their own block only when the
    // author left a blank line around them, which is not guaranteed.
    .replace(/^#{1,6}\s.*$/gm, "")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && isProse(b))
    .map(stripInline)
    .filter(Boolean);

  const [firstParagraph] = prose;
  if (firstParagraph === undefined) return "";

  const kept: string[] = [];
  let length = 0;
  for (const paragraph of prose) {
    // A paragraph ending in a colon introduces something — a code block, a list,
    // a table — that the filters above just removed. Everything past it reads as
    // a non-sequitur, so the teaser stops here rather than welding fragments
    // together into a summary of nothing.
    if (paragraph.endsWith(":")) break;
    if (kept.length >= MAX_PARAGRAPHS) break;
    if (length + paragraph.length > max) break;
    kept.push(paragraph);
    length += paragraph.length + 2;
  }

  if (kept.length > 0) return kept.join("\n\n");

  // Nothing fit whole — take the first paragraph and cut it back to a sentence.
  const first = firstParagraph.slice(0, max);
  const stop = Math.max(
    first.lastIndexOf(". "),
    first.lastIndexOf("? "),
    first.lastIndexOf("! "),
  );
  return stop > max * 0.4 ? first.slice(0, stop + 1) : `${first.trimEnd()}…`;
}

/** The call to action. Phrased for what the reader is about to get, not "click here". */
export function cta(item: SyndicationItem): string {
  return item.kind === "blog"
    ? "Read the full write-up"
    : "See the live dashboard";
}

export function hashtags(tags: string[]): string {
  return tags
    .map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`)
    .filter((t) => t.length > 1)
    .join(" ");
}

/**
 * LinkedIn post text: title, the hand-written hook, a taste of the article, then
 * the CTA and tags. The URL is repeated in the text even though the ARTICLE media
 * block already carries it — the link card is not always tappable in every client,
 * and the CTA should never be a dead end.
 */
export function linkedinTeaser(item: SyndicationItem): string {
  return [
    item.title,
    "",
    item.description,
    "",
    excerpt(item.body, LINKEDIN_EXCERPT),
    "",
    `${cta(item)} → ${item.url}`,
    "",
    hashtags(item.tags),
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n")
    .trim();
}

/**
 * Dev.to article body. Same teaser shape in markdown, with the CTA as the closing
 * line and an explicit "originally published" note — belt and braces alongside the
 * `canonical_url` field, which is what actually protects the original's ranking.
 */
export function devtoTeaser(item: SyndicationItem): string {
  const body = excerpt(item.body, DEVTO_EXCERPT);

  return [
    `> ${item.description}`,
    "",
    body,
    "",
    "---",
    "",
    `**[${cta(item)} on vosk.dev →](${item.url})**`,
    "",
    `*Originally published at [vosk.dev](${item.url}).*`,
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n")
    .trim();
}
