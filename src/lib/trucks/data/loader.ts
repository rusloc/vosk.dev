import type { z } from "zod";
import { artifactSources } from "@/lib/report-data/columns";
import { once } from "@/lib/report-data/once";
import { checkRows, readRows } from "./parquet-columns";
import type { ColumnSpec, RowOf } from "./parquet-columns";
import { FILES, manifestSchema, unfilteredManifestSchema } from "./manifest";
import type { FileKey, Manifest, UnfilteredManifest } from "./manifest";

// Loader for public/data (contract §2.3; pattern of js-marketing/lib/data/loader.ts): manifest.json through the strict
// Zod schema, then the Parquet files through the FILES specs, each checked against the manifest's row count. First paint
// = manifest + time-week + plan-month + rock-week; plan-week loads on the first pick of Plan type = Week. One promise per
// group per session; a failed read is evicted so the next call retries.

export type { ReadArtifact } from "@/lib/report-data/columns";

// Since 2026-11-09 (vosk.dev) the browser reads the same artifacts from /api/trucks (Supabase, schema trucks_demo)
// while the tests and the load script read the Parquet in data/trucks/parquet; ArtifactSource is that seam, shared by
// the columnar reports in src/lib/report-data/columns.ts. The route sends a table as columns, not rows.

/** Where the artifacts come from: Parquet bytes, or the server route's JSON. */
export interface ArtifactSource {
  json(name: string): Promise<unknown>;
  rows<S extends ColumnSpec>(
    name: string,
    spec: S,
    label: string,
  ): Promise<RowOf<S>[]>;
}

/** `parquetSource(read)` for the tests and the load script; `columnsSource(fetchJson)` for `/api/trucks/<name>`. */
export const { parquetSource, columnsSource } = artifactSources<ArtifactSource>(
  { readRows, checkRows },
);

export type FileRows<K extends FileKey> = RowOf<(typeof FILES)[K]["columns"]>[];

export interface CoreFiles<M = Manifest> {
  manifest: M;
  timeWeek: FileRows<"timeWeek">;
  planMonth: FileRows<"planMonth">;
  rockWeek: FileRows<"rockWeek">;
}

export interface TrucksLoader<M = Manifest> {
  core(): Promise<CoreFiles<M>>;
  planWeek(): Promise<FileRows<"planWeek">>;
}

function build<M extends Pick<Manifest, "files">>(
  source: ArtifactSource,
  schema: z.ZodType<M>,
): TrucksLoader<M> {
  const manifest = once(async () =>
    schema.parse(await source.json("manifest.json")),
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

  const core = once(async () => {
    const [timeWeek, planMonth, rockWeek] = await Promise.all([
      file("timeWeek"),
      file("planMonth"),
      file("rockWeek"),
    ]);
    return { manifest: await manifest(), timeWeek, planMonth, rockWeek };
  });
  return { core, planWeek: once(() => file("planWeek")) };
}

export const createLoader = (source: ArtifactSource): TrucksLoader =>
  build(source, manifestSchema);

/** The `--keep-excluded` fixture set (tests only). */
export const createUnfilteredLoader = (
  source: ArtifactSource,
): TrucksLoader<UnfilteredManifest> => build(source, unfilteredManifestSchema);
