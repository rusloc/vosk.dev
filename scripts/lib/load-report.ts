import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import postgres from "postgres";
import type { JSONValue, Sql } from "postgres";
import { tableOf } from "@/lib/report-data/artifacts";
import type { ArtifactQuery, Db } from "@/lib/report-data/artifacts";
import { fromColumns, toColumns } from "@/lib/report-data/columns";
import type { RowCodec } from "@/lib/report-data/columns";

// The shared body of the report load scripts (scripts/<report>-load.ts): each loads data/<report>/parquet into Supabase
// schema `<report>_demo` as `<report>_loader` (Session pooler), then verifies every artifact the server route serves
// against the Parquet it replaces. Run from the owner's machine only:
//
//     node --env-file=.env.local --import tsx scripts/<report>-load.ts            # truncate, load, verify
//     node --env-file=.env.local --import tsx scripts/<report>-load.ts --verify   # verify only
//
// Node reads .env.local; these scripts never print a value from it. Nothing here runs in the site.

/** A report's frozen files: Parquet as bytes, JSON parsed. */
export function parquetDir(dir: URL) {
  return {
    bytes: async (name: string): Promise<ArrayBuffer> => {
      const b = await readFile(fileURLToPath(new URL(name, dir)));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    },
    json: async (name: string): Promise<unknown> =>
      JSON.parse(await readFile(fileURLToPath(new URL(name, dir)), "utf8")),
  };
}

/** Inserts rows `batch` at a time. */
export const batchInsert =
  (batch = 1000) =>
  async (
    sql: Db,
    table: string,
    columns: string[],
    data: readonly Record<string, unknown>[],
  ): Promise<void> => {
    for (let i = 0; i < data.length; i += batch) {
      const slice = data.slice(i, i + batch);
      await sql`insert into ${sql(table)} ${sql(slice, ...columns)}`;
    }
  };

/**
 * Connects as `envVar`, loads (unless `--verify`), verifies, prints what differs and the database size, and exits:
 * 0 when every artifact matches, 1 when one differs or an error is thrown, 2 when `envVar` is unset.
 */
export function runLoader({
  envVar,
  load,
  verify,
}: {
  envVar: string;
  load: (sql: Sql) => Promise<void>;
  /** Returns the artifacts that differ. */
  verify: (sql: Sql) => Promise<string[]>;
}): void {
  async function main(): Promise<number> {
    const url = process.env[envVar];
    if (!url) {
      console.error(
        `${envVar} is not set: run with node --env-file=.env.local`,
      );
      return 2;
    }
    const sql = postgres(url, { max: 1, ssl: "require" });
    try {
      if (!process.argv.includes("--verify")) await load(sql);
      const failures = await verify(sql);
      for (const f of failures) console.error(`  ${f}`);
      const [size] = await sql<
        { size: string }[]
      >`select pg_size_pretty(pg_database_size(current_database())) as size`;
      console.log(`database size: ${size?.size ?? "?"}`);
      return failures.length === 0 ? 0 : 1;
    } finally {
      await sql.end();
    }
  }

  main().then(
    (code) => process.exit(code),
    (error: unknown) => {
      // A driver error can carry the host; never the password. Print the message only.
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}

/** A report's FILES entry as the loader sees it: the file name and its column spec. */
interface FileSpec {
  file: string;
  columns: Readonly<Record<string, unknown>>;
}

/**
 * The whole load script of a report whose artifacts are the manifest plus whole tables
 * (src/lib/report-data/artifacts.ts: ACME Marketing, ACME Trucks, Nordmark). The check covers the same rows, the same
 * values and the same order, and the same rows again after the route's columnar round trip.
 */
export function loadTableReport({
  dir,
  envVar,
  files,
  manifestSchema,
  artifacts,
  codec,
}: {
  /** data/<report>/parquet/, as a URL. */
  dir: URL;
  /** The loader role's connection string, e.g. MARKETING_LOAD_DATABASE_URL. */
  envVar: string;
  files: Readonly<Record<string, FileSpec>>;
  manifestSchema: { parse(json: unknown): JSONValue };
  /** The report's artifacts.ts: what the server route serves. */
  artifacts: {
    ARTIFACT_NAMES: readonly string[];
    resolveArtifact(name: string): ArtifactQuery | null;
    runArtifact(sql: Db, q: ArtifactQuery): Promise<unknown>;
  };
  /** The report's vendored parquet-columns.ts. */
  codec: RowCodec;
}): void {
  const { bytes, json } = parquetDir(dir);
  const insert = batchInsert();
  const specOf = (name: string) =>
    Object.values(files).find((f) => f.file === name)?.columns;
  const readRows = async (name: string, spec: FileSpec["columns"]) =>
    codec.readRows(await bytes(name), spec as never, name) as Promise<
      Record<string, unknown>[]
    >;

  async function load(sql: Sql): Promise<void> {
    const manifest = manifestSchema.parse(await json("manifest.json"));
    await sql.begin(async (tx) => {
      await tx`truncate document, ${tx(Object.values(files).map((f) => tableOf(f.file)))}`;
      await tx`insert into document ${tx([{ name: "manifest.json", doc: manifest }], "name", "doc")}`;
      for (const f of Object.values(files)) {
        const data = await readRows(f.file, f.columns);
        await insert(
          tx,
          tableOf(f.file),
          ["seq", ...Object.keys(f.columns)],
          data.map((r, seq) => ({ seq, ...r })),
        );
        console.log(`${tableOf(f.file)}: ${data.length} rows`);
      }
    });
  }

  /** Every artifact the route can serve, compared with the file it replaces. Returns the names that differ. */
  async function verify(sql: Sql): Promise<string[]> {
    const { ARTIFACT_NAMES, resolveArtifact, runArtifact } = artifacts;
    const failures: string[] = [];
    for (const name of ARTIFACT_NAMES) {
      const query = resolveArtifact(name);
      if (!query) {
        failures.push(`${name}: no query`);
        continue;
      }
      const actual = await runArtifact(sql, query);
      if (query.kind === "document") {
        if (!isDeepStrictEqual(actual, await json(name)))
          failures.push(`${name}: differs`);
        continue;
      }
      const spec = specOf(name) ?? {};
      const expected = await readRows(name, spec);
      // what the browser gets: rows → columns (the reader) → rows, checked (columnsSource)
      const wire = JSON.parse(
        JSON.stringify(
          toColumns(actual as Record<string, unknown>[], query.columns),
        ),
      ) as unknown;
      const received = codec.checkRows(
        fromColumns(wire, spec, name),
        spec as never,
        name,
      );
      if (!isDeepStrictEqual(actual, expected))
        failures.push(
          `${name}: differs (${(actual as unknown[]).length} rows vs ${expected.length} in Parquet)`,
        );
      else if (!isDeepStrictEqual(received, expected))
        failures.push(`${name}: differs after the columnar round trip`);
    }
    console.log(
      `verified ${ARTIFACT_NAMES.length} artifacts, ${failures.length} differ`,
    );
    return failures;
  }

  runLoader({ envVar, load, verify });
}
