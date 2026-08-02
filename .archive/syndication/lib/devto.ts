import { devtoTags } from "./items";
import { devtoTeaser } from "./summary";
import type { Adapter, PostResult, SyndicationItem } from "./types";

/**
 * Dev.to (Forem) adapter.
 *
 * Posts a **teaser**, not the full article: a hook, the opening prose, and a CTA
 * back to vosk.dev. The goal is the click-through, not a second copy of the post
 * living on someone else's domain. `canonical_url` is set regardless — a partial
 * duplicate still competes if it isn't.
 *
 * Credentials are read from `process.env` directly and deliberately NOT through
 * `lib/env.ts`: that module is reachable from client components, and anything in
 * its schema risks being bundled. Same reasoning as SUPERSET_SVC_*.
 */

const API = "https://dev.to/api/articles";

/** Forem caps the summary; longer descriptions are rejected outright. */
const MAX_DESCRIPTION = 250;

function apiKey(): string | undefined {
  return process.env.DEVTO_API_KEY?.trim() || undefined;
}

/**
 * The canonical URL is the whole reason this is safe to do. Without it the Dev.to
 * copy is a duplicate that outranks the original — the single most expensive
 * mistake available in this feature (ADR-0004, decision 5). Built here from the
 * item rather than passed in, so no caller can forget it.
 */
function payload(item: SyndicationItem) {
  return {
    article: {
      title: item.title,
      body_markdown: devtoTeaser(item),
      published: true,
      canonical_url: item.url,
      description: item.description.slice(0, MAX_DESCRIPTION),
      tags: devtoTags(item.tags),
    },
  };
}

export const devto: Adapter = {
  platform: "devto",

  configError() {
    return apiKey() ? null : "DEVTO_API_KEY is not set";
  },

  /**
   * Articles only. A showcase is a title, a summary and two paragraphs — posting
   * that as a Dev.to article would be a stub under the author's name, so showcases
   * are declined here and go to LinkedIn instead (ADR-0004, decision 3).
   */
  accepts(item) {
    return item.kind === "blog" && Boolean(item.body);
  },

  /**
   * Prints the body in full, not a character count. This is the text that gets
   * published irreversibly — a reviewer has to be able to read it, which is the
   * entire point of the dry run and the PR gate.
   */
  preview(item) {
    const { article } = payload(item);
    return [
      `title:         ${article.title}`,
      `canonical_url: ${article.canonical_url}`,
      `tags:          ${article.tags.join(", ") || "(none)"}`,
      `description:   ${article.description}`,
      "body:",
      article.body_markdown
        .split("\n")
        .map((l) => `  | ${l}`)
        .join("\n"),
    ].join("\n");
  },

  async publish(item): Promise<PostResult> {
    const key = apiKey();
    if (!key) return { ok: false, error: "DEVTO_API_KEY is not set" };

    const res = await fetch(API, {
      method: "POST",
      headers: {
        "api-key": key,
        "content-type": "application/json",
        accept: "application/vnd.forem.api-v1+json",
      },
      body: JSON.stringify(payload(item)),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `dev.to ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300)}`,
      };
    }

    const body: unknown = await res.json();
    const data = body as { id?: number; url?: string };
    return { ok: true, url: data.url, externalId: data.id?.toString() };
  },
};
