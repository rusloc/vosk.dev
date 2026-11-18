// The columnar seam of the custom JS reports (ACME Marketing, ACME Trucks, Nordmark; Mirelo's Parquet side). The
// browser reads a report's artifacts from /api/<report> (Supabase, schema <report>_demo) while the tests and the load
// scripts read the Parquet in data/<report>/parquet; ArtifactSource is that seam. The route sends a table as columns,
// not rows: ACME Marketing's term-day as rows of JSON is 7.2 MB, over a Vercel Function's 4.5 MB response limit; as
// columns it is 1.8 MB. Each report keeps its own vendored parquet-columns.ts (ADR-0013 (h)) and its own ArtifactSource
// interface, which carries that file's spec → row typing; the code here only moves values.

/** Reads one Parquet / JSON artifact by file name as bytes (`fs` in the Node tests and the load scripts). */
export type ReadArtifact = (name: string) => Promise<ArrayBuffer>;

/** A table as the route sends it: one array per column, all of one length. */
export type Columns = Record<string, unknown[]>;

/** A column spec as this module sees it: only its keys (the column names, in order) matter here. */
type AnySpec = Readonly<Record<string, unknown>>;

/** Rows (as the database returns them) → columns, the wire shape. */
export function toColumns(
  rows: readonly Record<string, unknown>[],
  names: readonly string[],
): Columns {
  return Object.fromEntries(names.map((c) => [c, rows.map((r) => r[c])]));
}

/** Rows back from columns; every value is then checked against its kind (the report's checkRows). */
export function fromColumns(
  json: unknown,
  spec: AnySpec,
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

/**
 * A report's vendored readRows / checkRows (its parquet-columns.ts), seen without their generics: their spec → row
 * typing lives in the report's own ArtifactSource interface. `spec: never` accepts any spec type.
 */
export interface RowCodec {
  readRows(file: ArrayBuffer, spec: never, label: string): Promise<unknown[]>;
  checkRows(json: unknown, spec: never, label: string): unknown[];
}

/** The shape every report's ArtifactSource has, seen without its generics. */
interface AnySource {
  json(name: string): Promise<unknown>;
  rows(name: string, spec: never, label: string): Promise<unknown[]>;
}

/**
 * The two sources of a report's artifacts, built on its codec: Parquet bytes (tests, load scripts) and the server
 * route's JSON, a table as columns (the browser, the chat route). `Source` is the report's ArtifactSource interface.
 */
export function artifactSources<Source extends AnySource>(codec: RowCodec) {
  // The report's interface restores the spec → row typing its codec gives; these objects are that interface.
  const source = (
    json: (name: string) => Promise<unknown>,
    rows: (name: string, spec: AnySpec, label: string) => Promise<unknown[]>,
  ) => ({ json, rows }) as unknown as Source;

  return {
    parquetSource: (read: ReadArtifact): Source =>
      source(
        async (name) =>
          JSON.parse(new TextDecoder().decode(await read(name))) as unknown,
        async (name, spec, label) =>
          codec.readRows(await read(name), spec as never, label),
      ),
    /** The browser's source: `/api/<report>/<name>` answers with the document, or the table as columns. */
    columnsSource: (fetchJson: (name: string) => Promise<unknown>): Source =>
      source(fetchJson, async (name, spec, label) =>
        codec.checkRows(
          fromColumns(await fetchJson(name), spec, label),
          spec as never,
          label,
        ),
      ),
  };
}
