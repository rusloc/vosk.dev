import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { platforms, type Platform, type SyndicationItem } from "./types";

/**
 * Syndication state lives in a committed JSON file, not a database — the repo is
 * deliberately DB-free (CLAUDE.md). Git is the state store: what has been posted
 * where is auditable in history, reviewable in a diff, and needs no infrastructure.
 * That choice is what forces the runner into GitHub Actions, since a Vercel
 * function cannot commit back to the repo (ADR-0004, decision 1).
 *
 * Keyed per item *per platform*, so a run where Dev.to succeeds and LinkedIn 401s
 * records the half that worked and retries only the half that didn't.
 */

const MANIFEST_PATH = path.join(process.cwd(), "syndication.json");

const recordSchema = z
  .object({
    at: z.iso.datetime(),
    url: z.string().optional(),
    externalId: z.string().optional(),
  })
  .strict();

const manifestSchema = z
  .object({
    version: z.literal(1),
    entries: z.record(
      z.string(),
      z.partialRecord(z.enum(platforms), recordSchema),
    ),
  })
  .strict();

export type Manifest = z.infer<typeof manifestSchema>;
export type SyndicationRecord = z.infer<typeof recordSchema>;

export const emptyManifest: Manifest = { version: 1, entries: {} };

export function readManifest(file = MANIFEST_PATH): Manifest {
  if (!fs.existsSync(file)) return structuredClone(emptyManifest);
  // `.parse` throws on a malformed manifest — a corrupt state file must stop the
  // run, not silently re-post everything it can no longer account for.
  return manifestSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
}

export function writeManifest(manifest: Manifest, file = MANIFEST_PATH): void {
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export function isSyndicated(
  manifest: Manifest,
  item: SyndicationItem,
  platform: Platform,
): boolean {
  return Boolean(manifest.entries[item.id]?.[platform]);
}

/** Returns a new manifest — the caller decides when state hits disk. */
export function record(
  manifest: Manifest,
  item: SyndicationItem,
  platform: Platform,
  entry: SyndicationRecord,
): Manifest {
  return {
    ...manifest,
    entries: {
      ...manifest.entries,
      [item.id]: { ...manifest.entries[item.id], [platform]: entry },
    },
  };
}

/** True on a never-run manifest — the runner refuses to bulk-post without `--backfill`. */
export function isEmpty(manifest: Manifest): boolean {
  return Object.keys(manifest.entries).length === 0;
}
