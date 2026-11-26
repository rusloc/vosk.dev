import { artifactSources } from "@/lib/report-data/columns";
import {
  checkRows,
  readRows,
  type ColumnSpec,
  type RowOf,
} from "@/lib/cashflow/data/parquet-columns";
import { buildDataset, type Dataset, type Files } from "../engine/data";
import { FILES, FILE_KEYS, manifestSchema } from "./manifest";

// Data enters only here (CF-ARC-06): the manifest through the strict Zod schema, each table through its column spec and
// the manifest's row count. Any failure throws an error that names the file, and the page shows that instead of a
// partial board. All files load at first paint (D-3). The browser reads /api/cashflow/<name> (Supabase, schema
// cashflow_demo, as columns); the tests and the load script read data/cashflow/parquet.

export interface ArtifactSource {
  json(name: string): Promise<unknown>;
  rows<S extends ColumnSpec>(
    name: string,
    spec: S,
    label: string,
  ): Promise<RowOf<S>[]>;
}

export const { parquetSource, columnsSource } = artifactSources<ArtifactSource>(
  { readRows, checkRows },
);

const named = (file: string, e: unknown) =>
  new Error(`${file}: ${e instanceof Error ? e.message : String(e)}`);

export async function loadDataset(source: ArtifactSource): Promise<Dataset> {
  let manifest;
  try {
    manifest = manifestSchema.parse(await source.json("manifest.json"));
  } catch (e) {
    throw named("manifest.json", e);
  }
  const m = manifest;
  const entries = await Promise.all(
    FILE_KEYS.map(async (k) => {
      const { file, columns } = FILES[k];
      try {
        const rows = await source.rows(file, columns, file);
        const want = m.files.find((f) => f.name === file);
        if (!want) throw new Error("not listed in the manifest");
        if (rows.length !== want.rows)
          throw new Error(`${rows.length} rows, manifest says ${want.rows}`);
        return [k, rows] as const;
      } catch (e) {
        throw named(file, e);
      }
    }),
  );
  return buildDataset(m, Object.fromEntries(entries) as unknown as Files);
}

/** The browser's loader: /api/cashflow/<name>. */
export const browserSource = (base = "/api/cashflow") =>
  columnsSource(async (name) => {
    const res = await fetch(`${base}/${name}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<unknown>;
  });
