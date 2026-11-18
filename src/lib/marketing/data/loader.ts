import { artifactSources } from "@/lib/report-data/columns";
import { checkRows, readRows } from "./parquet-columns";
import type { ColumnSpec, RowOf } from "./parquet-columns";
import {
  CAMPAIGNS_FILES,
  FILES,
  FIRST_PAINT_FILES,
  JOURNEY_FILES,
  manifestSchema,
} from "./manifest";
import type { FileKey, Manifest } from "./manifest";

// Loader for the report's data (contract §2.3; ADR-0002 §2.2 pattern, as js-exec/lib/data/loader.ts): manifest.json through
// the strict Zod schema, then the Parquet files through the FILES specs, each checked against the manifest's row count.
// First paint = manifest + campaign-day + cohort-month + retention; the Journey files load on the first open of
// Journey, term-day on the first open of Campaigns. One promise per group per session; a failed read is evicted so the
// next call retries. Every file holds INT32 / DOUBLE only (the build converts INT64 / DATE), so readRows never meets a
// bigint or a Date (CAND-022).

export type { ReadArtifact } from "@/lib/report-data/columns";

// Since 2026-11-05 (vosk.dev) the browser reads the same artifacts from /api/marketing (Supabase, schema
// marketing_demo) while the tests and the load script read the Parquet in data/marketing/parquet; ArtifactSource is
// that seam, shared by the columnar reports in src/lib/report-data/columns.ts (why columns, not rows, is there).

/** Where the artifacts come from: Parquet bytes, or the server route's JSON. */
export interface ArtifactSource {
  json(name: string): Promise<unknown>;
  rows<S extends ColumnSpec>(
    name: string,
    spec: S,
    label: string,
  ): Promise<RowOf<S>[]>;
}

/** `parquetSource(read)` for the tests and the load script; `columnsSource(fetchJson)` for `/api/marketing/<name>`. */
export const { parquetSource, columnsSource } = artifactSources<ArtifactSource>(
  { readRows, checkRows },
);

export type FileRows<K extends FileKey> = RowOf<(typeof FILES)[K]["columns"]>[];

export interface CoreFiles {
  manifest: Manifest;
  campaignDay: FileRows<"campaignDay">;
  cohortMonth: FileRows<"cohortMonth">;
  retention: FileRows<"retention">;
}
export interface JourneyFiles {
  journeyDay: FileRows<"journeyDay">;
  trafficPageDay: FileRows<"trafficPageDay">;
  segmentDay: FileRows<"segmentDay">;
}
export interface CampaignsFiles {
  termDay: FileRows<"termDay">;
}

export interface MarketingLoader {
  core(): Promise<CoreFiles>;
  journey(): Promise<JourneyFiles>;
  campaigns(): Promise<CampaignsFiles>;
}

function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= load();
    pending.catch(() => (pending = undefined));
    return pending;
  };
}

export function createLoader(source: ArtifactSource): MarketingLoader {
  const manifest = once(async () =>
    manifestSchema.parse(await source.json("manifest.json")),
  );

  async function file<K extends FileKey>(key: K): Promise<FileRows<K>> {
    const m = await manifest();
    const { file: name, columns } = FILES[key];
    const rows = await source.rows(name, columns, name);
    if (rows.length !== m.files[key].rows)
      throw new Error(
        `${name}: ${rows.length} rows, manifest says ${m.files[key].rows}`,
      );
    return rows as FileRows<K>; // RowOf of the same spec; the cast only restores the key → spec pairing
  }

  const group = <const K extends readonly FileKey[]>(keys: K) =>
    once(async () => {
      const rows = await Promise.all(keys.map((k) => file(k)));
      return Object.fromEntries(keys.map((k, i) => [k, rows[i]])) as {
        [P in K[number]]: FileRows<P>;
      };
    });

  const coreFiles = group(FIRST_PAINT_FILES);
  return {
    core: once(async () => ({
      manifest: await manifest(),
      ...(await coreFiles()),
    })),
    journey: group(JOURNEY_FILES),
    campaigns: group(CAMPAIGNS_FILES),
  };
}
