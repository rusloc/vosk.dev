import { siteConfig } from "../site";
import { allItems } from "./items";
import { devto } from "./devto";
import { linkedin } from "./linkedin";
import {
  isEmpty,
  isSyndicated,
  readManifest,
  record,
  writeManifest,
  type Manifest,
} from "./manifest";
import type { Adapter, SyndicationItem } from "./types";

/**
 * The runner. Deliberately boring: work out what is unsent, show it, and only send
 * it when explicitly told to.
 *
 * Two safety properties matter more than anything else here, because posting is
 * public, irreversible and carries the site's whole credibility argument:
 *   1. `publish` defaults to false. Every path prints before it posts.
 *   2. A never-run manifest refuses to bulk-post without `--backfill`, so wiring
 *      this up cannot fire three years of blog posts in one burst.
 */

export const adapters: Adapter[] = [devto, linkedin];

export type RunOptions = {
  publish?: boolean;
  backfill?: boolean;
  /** Restrict to one platform, e.g. a Dev.to-only first run. */
  only?: string;
  manifestPath?: string;
};

export type Pending = { item: SyndicationItem; adapter: Adapter };

/** Every (item, platform) pair the manifest has no success record for. */
export function pending(
  manifest: Manifest,
  items: SyndicationItem[],
  list: Adapter[] = adapters,
): Pending[] {
  return items.flatMap((item) =>
    list
      .filter(
        (a) => a.accepts(item) && !isSyndicated(manifest, item, a.platform),
      )
      .map((adapter) => ({ item, adapter })),
  );
}

export type RunSummary = {
  posted: number;
  failed: number;
  skipped: number;
  lines: string[];
};

export async function run(options: RunOptions = {}): Promise<RunSummary> {
  const { publish = false, backfill = false, only, manifestPath } = options;
  const lines: string[] = [];
  const say = (s = "") => lines.push(s);

  /**
   * A localhost canonical URL would be baked into every syndicated copy and, on
   * Dev.to, permanently point search engines at nothing. Refuse rather than guess.
   */
  if (!/^https:\/\//.test(siteConfig.url)) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must be the public https origin, got "${siteConfig.url}"`,
    );
  }

  const list = only ? adapters.filter((a) => a.platform === only) : adapters;
  if (only && list.length === 0) {
    throw new Error(`unknown platform "${only}"`);
  }

  let manifest = readManifest(manifestPath);
  const firstRun = isEmpty(manifest);
  const queue = pending(manifest, allItems(), list);

  say(`mode:      ${publish ? "PUBLISH" : "dry-run"}`);
  say(`platforms: ${list.map((a) => a.platform).join(", ")}`);
  say(`pending:   ${queue.length}`);

  // Unconfigured adapters are reported once, up front, rather than as N identical
  // per-item failures.
  for (const adapter of list) {
    const problem = adapter.configError();
    if (problem) say(`  ! ${adapter.platform}: ${problem}`);
  }

  if (queue.length === 0) {
    say("\nNothing to do.");
    return { posted: 0, failed: 0, skipped: 0, lines };
  }

  /**
   * The bulk-post guard. On a first run everything ever published looks new, so
   * publishing is refused until the operator says so — or seeds the manifest with
   * `--publish --backfill` after reading the dry run.
   */
  if (publish && firstRun && !backfill && queue.length > 1) {
    throw new Error(
      `refusing to publish ${queue.length} items on a first run — review the dry run, then pass --backfill`,
    );
  }

  let posted = 0;
  let failed = 0;
  let skipped = 0;

  for (const { item, adapter } of queue) {
    say(`\n── ${adapter.platform} ← ${item.id}`);
    say(adapter.preview(item));

    if (!publish) {
      skipped += 1;
      continue;
    }

    const problem = adapter.configError();
    if (problem) {
      say(`   SKIPPED: ${problem}`);
      skipped += 1;
      continue;
    }

    /**
     * Failure isolation (ADR-0004, decision 8): one platform erroring must not
     * stop the others and must not mark the item as syndicated — leaving it
     * pending is what makes the next run a retry.
     */
    const result = await adapter.publish(item);
    if (result.ok) {
      manifest = record(manifest, item, adapter.platform, {
        at: new Date().toISOString(),
        url: result.url,
        externalId: result.externalId,
      });
      writeManifest(manifest, manifestPath);
      posted += 1;
      say(`   POSTED: ${result.url ?? "(no url returned)"}`);
    } else {
      failed += 1;
      say(`   FAILED: ${result.error}`);
    }
  }

  say(`\nposted ${posted}, failed ${failed}, skipped ${skipped}`);
  return { posted, failed, skipped, lines };
}
