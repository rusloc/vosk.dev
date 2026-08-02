import { getAllPosts, getPostBySlug } from "../content";
import { showcases, localize } from "../work";
import { siteConfig } from "../site";
import { localizedPath } from "../i18n/config";
import type { SyndicationItem } from "./types";

/**
 * Collects what is syndicatable from the existing content seams — `content.ts` for
 * blog posts, `work.ts` for showcases. Nothing here reads the filesystem directly;
 * that stays content.ts's job.
 *
 * Everything is English: blog MDX is single-language today, and posting Russian
 * copy to Dev.to would be wrong even once it isn't (see ADR-0004, decision 4).
 */

const LOCALE = "en" as const;

function absolute(path: string): string {
  return new URL(localizedPath(LOCALE, path), siteConfig.url).toString();
}

/**
 * Matches a block-level JSX element — `<WorkflowDiagram />` or a multi-line
 * `<ReportEmbed … />`. Anchored to line starts so inline `<` in prose and HTML
 * entities are left alone; the capture group backreference keeps `<Foo>…</Foo>`
 * from swallowing everything up to a later, unrelated closing tag.
 */
const JSX_BLOCK = /^<([A-Z][A-Za-z0-9.]*)\b[\s\S]*?(?:\/>|<\/\1>)$/gm;

/**
 * MDX is read straight off disk, and on Windows checkouts that means CRLF. Every
 * line-oriented rule downstream is written against `\n`: `$` in a multiline regex
 * matches before `\n` but sits after the `\r`, and paragraph splitting on `\n{2,}`
 * never fires on `\r\n\r\n` — which silently collapses a whole article into one
 * block. Normalising here means the same input produces the same post on a Windows
 * laptop and on a Linux CI runner.
 */
export function normalizeEol(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/**
 * MDX → markdown a third-party renderer can accept. Two of three posts embed React
 * components (a workflow diagram, a live report), and a full-text cross-post would
 * otherwise ship raw JSX into the syndicated article. Each block becomes a pointer
 * back to the original, which is where the interactive version actually works.
 */
export function toSyndicatedMarkdown(content: string, url: string): string {
  return normalizeEol(content)
    .replace(
      JSX_BLOCK,
      `> **This section is interactive.** [View it on ${siteConfig.name}](${url})`,
    )
    .trim();
}

/** Dev.to tags are alphanumeric and capped at four. "power bi" → "powerbi". */
export function devtoTags(tags: string[]): string[] {
  return tags
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .slice(0, 4);
}

/** Published blog posts, newest first, as syndication items with a full body. */
export function blogItems(): SyndicationItem[] {
  return getAllPosts().map((meta) => {
    const url = absolute(`/blog/${meta.slug}`);
    const post = getPostBySlug(meta.slug);
    return {
      id: `blog/${meta.slug}`,
      kind: "blog",
      title: meta.title,
      description: meta.description,
      url,
      date: meta.date,
      tags: meta.tags,
      body: post ? toSyndicatedMarkdown(post.content, url) : undefined,
    };
  });
}

/**
 * Showcases, as link-and-blurb items with no body. They are a title, a summary and
 * two paragraphs — not an article — so they carry no `body` and adapters that need
 * one will decline them (ADR-0004, decision 3).
 *
 * Two filters apply. `showcases` is already narrowed to publishable entries, so an
 * unconfigured Superset dashboard can't be announced before it exists; `draft`
 * entries are dropped here, so placeholder copy can't be announced at all.
 */
export function showcaseItems(): SyndicationItem[] {
  return showcases
    .filter((s) => !s.draft)
    .map((s) => {
      const view = localize(s, LOCALE);
      return {
        id: `work/${view.slug}`,
        kind: "showcase",
        title: view.title,
        description: view.summary,
        url: absolute(`/work/${view.slug}`),
        tags: [view.platform === "power-bi" ? "power bi" : "superset"],
      };
    });
}

export function allItems(): SyndicationItem[] {
  return [...blogItems(), ...showcaseItems()];
}
