import type { EntityCode, OpsColumns, PlColumns } from "../engine/types";
import { OPS_FILE, PL_FILES, parseManifest } from "./manifest";
import type { Manifest } from "./manifest";
import { readOpsColumns, readPlColumns } from "./parquet-loader";

/** Everything the engine reads (ADR-0002 §2.3). Entity files are loaded on demand (Group needs both). */
export interface Dataset {
  manifest: Manifest;
  pl: ReadonlyMap<EntityCode, PlColumns>;
  ops: OpsColumns; // both entities, small (first-load budget, build-data.ts): units, GMV, merchants for the Vitals view
}

/** Reads one data artifact by file name as bytes (`fs` in Node tests and the load script). */
export type ReadArtifact = (name: string) => Promise<ArrayBuffer>;

/**
 * Where the data comes from (2026-11-09): the Parquet files (tests, the load script, the chat eval) or the server
 * route's JSON columns (the browser and the chat route, from Supabase schema `pnl_demo`; columns-loader.ts).
 */
export interface DatasetSource {
  manifest(): Promise<unknown>;
  pl(entity: EntityCode, m: Manifest): Promise<PlColumns>;
  ops(m: Manifest): Promise<OpsColumns>;
}

export function parquetSource(read: ReadArtifact): DatasetSource {
  return {
    manifest: async () =>
      JSON.parse(new TextDecoder().decode(await read("manifest.json"))),
    pl: async (entity, m) => readPlColumns(await read(PL_FILES[entity]), m),
    ops: async (m) => readOpsColumns(await read(OPS_FILE), m),
  };
}

/** Loader with a per-session in-memory cache; a failed read is evicted so the next call retries. */
export function createDatasetLoader(source: DatasetSource) {
  let manifest: Promise<Manifest> | undefined;
  const pl = new Map<EntityCode, Promise<PlColumns>>();
  let ops: Promise<OpsColumns> | undefined;

  function cached<T>(promise: Promise<T>, evict: () => void): Promise<T> {
    promise.catch(evict);
    return promise;
  }

  function loadManifest(): Promise<Manifest> {
    manifest ??= cached(
      source.manifest().then(parseManifest),
      () => (manifest = undefined),
    );
    return manifest;
  }

  function loadPl(entity: EntityCode, m: Manifest): Promise<PlColumns> {
    let p = pl.get(entity);
    if (!p) {
      p = cached(source.pl(entity, m), () => pl.delete(entity));
      pl.set(entity, p);
    }
    return p;
  }

  function loadOps(m: Manifest): Promise<OpsColumns> {
    ops ??= cached(source.ops(m), () => (ops = undefined));
    return ops;
  }

  return {
    /** The manifest and the named entities' rows (plus ops), from the cache where already loaded. */
    async load(entities: readonly EntityCode[]): Promise<Dataset> {
      const m = await loadManifest();
      const [columns, opsColumns] = await Promise.all([
        Promise.all(entities.map((e) => loadPl(e, m))),
        loadOps(m),
      ]);
      return {
        manifest: m,
        pl: new Map(entities.map((e, i) => [e, columns[i] as PlColumns])),
        ops: opsColumns,
      };
    },
  };
}
