import type { z } from "zod";
import { checkRows, readRows } from "./parquet-columns";
import type { ColumnSpec, RowOf } from "./parquet-columns";
import { FILES, manifestSchema, unfilteredManifestSchema } from "./manifest";
import type { FileKey, Manifest, UnfilteredManifest } from "./manifest";

// Loader for public/data (contract §2.3; pattern of js-marketing/lib/data/loader.ts): manifest.json through the strict
// Zod schema, then the Parquet files through the FILES specs, each checked against the manifest's row count. First paint
// = manifest + time-week + plan-month + rock-week; plan-week loads on the first pick of Plan type = Week. One promise per
// group per session; a failed read is evicted so the next call retries.

/** Reads one Parquet / JSON artifact by file name as bytes (`fs` in the Node tests and the load script). */
export type ReadArtifact = (name: string) => Promise<ArrayBuffer>;

// Since 2026-11-09 (vosk.dev) the browser reads the same artifacts from /api/trucks (Supabase, schema trucks_demo) while
// the tests and the load script read the Parquet in data/trucks/parquet; ArtifactSource is that seam (the ACME Marketing
// pattern, lib/marketing/data/loader.ts). The route sends a table as columns, not rows.

/** Where the artifacts come from: Parquet bytes, or the server route's JSON. */
export interface ArtifactSource {
  json(name: string): Promise<unknown>;
  rows<S extends ColumnSpec>(
    name: string,
    spec: S,
    label: string,
  ): Promise<RowOf<S>[]>;
}

export function parquetSource(read: ReadArtifact): ArtifactSource {
  return {
    json: async (name) =>
      JSON.parse(new TextDecoder().decode(await read(name))) as unknown,
    rows: async (name, spec, label) => readRows(await read(name), spec, label),
  };
}

/** A table as the route sends it: one array per column, all of one length. */
export type Columns = Record<string, unknown[]>;

export function toColumns(
  rows: readonly Record<string, unknown>[],
  names: readonly string[],
): Columns {
  return Object.fromEntries(names.map((c) => [c, rows.map((r) => r[c])]));
}

/** Rows back from columns; every value is then checked against its kind (checkRows). */
export function fromColumns(
  json: unknown,
  spec: ColumnSpec,
  label: string,
): unknown[] {
  if (json === null || typeof json !== "object" || Array.isArray(json))
    throw new Error(`${label}: expected an object of columns`);
  const cols = json as Record<string, unknown>;
  const names = Object.keys(spec);
  const arrays = names.map((c) => {
    const a = cols[c];
    if (!Array.isArray(a)) throw new Error(`${label}: column ${c} missing`);
    return a as unknown[];
  });
  const n = arrays[0]?.length ?? 0;
  if (arrays.some((a) => a.length !== n))
    throw new Error(`${label}: columns of different lengths`);
  return Array.from({ length: n }, (_, i) =>
    Object.fromEntries(names.map((c, k) => [c, arrays[k]?.[i]])),
  );
}

/** The browser's source: `/api/trucks/<name>` answers with the document, or the table as columns. */
export function columnsSource(
  fetchJson: (name: string) => Promise<unknown>,
): ArtifactSource {
  return {
    json: fetchJson,
    rows: async (name, spec, label) =>
      checkRows(fromColumns(await fetchJson(name), spec, label), spec, label),
  };
}

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

function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= load();
    pending.catch(() => (pending = undefined));
    return pending;
  };
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
