import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import postgres from "postgres";
import type { Sql } from "postgres";
import {
  ARTIFACT_NAMES,
  resolveArtifact,
  runArtifact,
  tableOf,
} from "@/lib/marketing/artifacts";
import type { Db } from "@/lib/marketing/artifacts";
import { fromColumns, toColumns } from "@/lib/marketing/data/loader";
import { FILES, manifestSchema } from "@/lib/marketing/data/manifest";
import { checkRows, readRows } from "@/lib/marketing/data/parquet-columns";

// Loads data/marketing/parquet (the pack's public/data, 2026-11-05) into Supabase schema `marketing_demo`, then
// verifies every artifact the server route serves against the Parquet it replaces: same rows, same values, same
// order, and the same rows again after the route's columnar round trip. Run from the owner's machine only, as
// marketing_loader (Session pooler):
//
//     node --env-file=.env.local --import tsx scripts/marketing-load.ts            # truncate, load, verify
//     node --env-file=.env.local --import tsx scripts/marketing-load.ts --verify   # verify only
//
// Node reads .env.local; this script never prints a value from it. Nothing here runs in the site. Mirelo's loader
// (scripts/mirelo-load.ts) is the pattern.

const DIR = new URL("../data/marketing/parquet/", import.meta.url);
const BATCH = 1000;
const VERIFY_ONLY = process.argv.includes("--verify");

const bytes = async (name: string): Promise<ArrayBuffer> => {
  const b = await readFile(fileURLToPath(new URL(name, DIR)));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const json = async (name: string): Promise<unknown> =>
  JSON.parse(await readFile(fileURLToPath(new URL(name, DIR)), "utf8"));
const specOf = (name: string) =>
  Object.values(FILES).find((f) => f.file === name)?.columns;

async function insert(
  sql: Db,
  table: string,
  columns: string[],
  data: readonly Record<string, unknown>[],
): Promise<void> {
  for (let i = 0; i < data.length; i += BATCH) {
    const slice = data.slice(i, i + BATCH);
    await sql`insert into ${sql(table)} ${sql(slice, ...columns)}`;
  }
}

async function load(sql: Sql): Promise<void> {
  const manifest = manifestSchema.parse(await json("manifest.json"));
  await sql.begin(async (tx) => {
    await tx`truncate document, ${tx(Object.values(FILES).map((f) => tableOf(f.file)))}`;
    await tx`insert into document ${tx([{ name: "manifest.json", doc: manifest }], "name", "doc")}`;
    for (const f of Object.values(FILES)) {
      const data = await readRows(await bytes(f.file), f.columns, f.file);
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
    const expected = await readRows(await bytes(name), spec, name);
    // what the browser gets: rows → columns (server.ts) → rows, checked (columnsSource)
    const wire = JSON.parse(
      JSON.stringify(
        toColumns(actual as Record<string, unknown>[], query.columns),
      ),
    ) as unknown;
    const received = checkRows(fromColumns(wire, spec, name), spec, name);
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

async function main(): Promise<number> {
  const url = process.env.MARKETING_LOAD_DATABASE_URL;
  if (!url) {
    console.error(
      "MARKETING_LOAD_DATABASE_URL is not set: run with node --env-file=.env.local",
    );
    return 2;
  }
  const sql = postgres(url, { max: 1, ssl: "require" });
  try {
    if (!VERIFY_ONLY) await load(sql);
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
