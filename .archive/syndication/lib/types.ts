/**
 * Syndication — cross-post new blog posts and showcases to external platforms.
 *
 * Shape follows the same instinct as the Preset → Superset swap (ADR-0003): every
 * platform sits behind one interface in its own file, so dropping a platform (or
 * adding Mastodon/Bluesky) touches one file and the adapter list, nothing else.
 *
 * X (Twitter) was scoped out at v1 — see ADR-0004.
 */

export const platforms = ["devto", "linkedin"] as const;
export type Platform = (typeof platforms)[number];

/**
 * What gets syndicated. Blog posts and showcases collapse to this single shape so
 * adapters never branch on where an item came from — they branch on whether a
 * `body` exists, which is the distinction that actually matters to them.
 */
export type SyndicationItem = {
  /** Stable manifest key, e.g. "blog/formatting-sql-for-readability". */
  id: string;
  kind: "blog" | "showcase";
  title: string;
  /** One- or two-sentence blurb. The link-card description and post commentary. */
  description: string;
  /** Absolute canonical URL on vosk.dev. Always English (blog bodies are EN-only). */
  url: string;
  /** Publication date, "YYYY-MM-DD". Showcases have none. */
  date?: string;
  tags: string[];
  /**
   * Full markdown body, JSX stripped. Present for blog posts only — showcases are
   * a title and two paragraphs, which is not an article. Adapters that need a body
   * (Dev.to) skip items without one rather than cross-posting a stub.
   */
  body?: string;
};

/** Outcome of one platform attempt. Only `ok` results are written to the manifest. */
export type PostResult =
  | { ok: true; url?: string; externalId?: string }
  | { ok: false; error: string };

export type Adapter = {
  platform: Platform;
  /** Human-readable reason this adapter is unconfigured, or null when ready. */
  configError(): string | null;
  /** False when this adapter structurally can't take the item (e.g. no body). */
  accepts(item: SyndicationItem): boolean;
  /** Exactly what would be sent, for `--dry-run`. Never performs I/O. */
  preview(item: SyndicationItem): string;
  publish(item: SyndicationItem): Promise<PostResult>;
};
