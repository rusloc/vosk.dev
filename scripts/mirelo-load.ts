import { isDeepStrictEqual } from "node:util";
import type { Sql } from "postgres";
import {
  allArtifactNames,
  resolveArtifact,
  runArtifact,
} from "@/lib/mirelo/artifacts";
import {
  DETAIL,
  FILES,
  detailIndexSchema,
  parseManifest,
} from "@/lib/mirelo/manifest";
import { readRows } from "@/lib/mirelo/parquet-columns";
import type { ColumnSpec, RowOf } from "@/lib/mirelo/parquet-columns";
import { batchInsert, parquetDir, runLoader } from "./lib/load-report";

// Loads data/mirelo/parquet (the files the report used to fetch from public/data/mirelo) into Supabase schema
// `mirelo_demo`, then verifies every artifact the server route serves against the Parquet it replaces: same rows,
// same values, same order. Run from the owner's machine only, as mirelo_loader (Session pooler):
//
//     node --env-file=.env.local --import tsx scripts/mirelo-load.ts            # truncate, load, verify
//     node --env-file=.env.local --import tsx scripts/mirelo-load.ts --verify   # verify only
//
// Node reads .env.local; this script never prints a value from it. Nothing here runs in the site. The connection, the
// exit codes and the batched insert are shared with the other reports' loaders (scripts/lib/load-report.ts).

const { bytes, json } = parquetDir(
  new URL("../data/mirelo/parquet/", import.meta.url),
);
const insert = batchInsert();
const rows = async <S extends ColumnSpec>(
  name: string,
  spec: S,
): Promise<RowOf<S>[]> => readRows(await bytes(name), spec, name);

const tableOf = (file: string) =>
  file.replace(/\.parquet$/, "").replace(/-/g, "_");
const specOf = (file: string): ColumnSpec =>
  file.startsWith("cohort-")
    ? DETAIL.cohort
    : file.startsWith("client-dim-")
      ? DETAIL.clients
      : DETAIL.loans;

async function load(sql: Sql): Promise<void> {
  const manifest = parseManifest(await json("manifest.json"));
  const index = detailIndexSchema.parse(await json(`${DETAIL.dir}/index.json`));
  const detailFiles = Object.keys(index.files).sort();

  await sql.begin(async (tx) => {
    await tx`truncate document, loan, client, ${tx(Object.values(FILES).map((f) => tableOf(f.file)))}`;
    await tx`insert into document ${tx(
      [
        { name: "manifest.json", doc: manifest },
        { name: `${DETAIL.dir}/index.json`, doc: index },
      ],
      "name",
      "doc",
    )}`;

    for (const f of Object.values(FILES)) {
      const data = await rows(f.file, f.columns);
      await insert(
        tx,
        tableOf(f.file),
        ["seq", ...Object.keys(f.columns)],
        data.map((r, seq) => ({ seq, ...r })),
      );
      console.log(`${tableOf(f.file)}: ${data.length} rows`);
    }

    const loanColumns = Object.keys(DETAIL.loans);
    let loans = 0;
    for (const file of detailFiles.filter((f) => f.startsWith("loans-"))) {
      const data = await rows(`${DETAIL.dir}/${file}`, DETAIL.loans);
      await insert(tx, "loan", loanColumns, data);
      loans += data.length;
    }
    console.log(`loan: ${loans} rows`);

    const summary = new Map<number, RowOf<typeof DETAIL.cohort>>();
    for (const file of detailFiles.filter((f) => f.startsWith("cohort-")))
      for (const r of await rows(`${DETAIL.dir}/${file}`, DETAIL.cohort))
        summary.set(r.client_id, r);
    const clients: Record<string, unknown>[] = [];
    for (const file of detailFiles.filter((f) => f.startsWith("client-dim-")))
      for (const r of await rows(`${DETAIL.dir}/${file}`, DETAIL.clients)) {
        const s = summary.get(r.client_id);
        clients.push({
          ...r,
          loans_to_date: s?.loans_to_date ?? null,
          principal_eur_to_date: s?.principal_eur_to_date ?? null,
          last_disbursed: s?.last_disbursed ?? null,
          last_status: s?.last_status ?? null,
        });
      }
    const clientColumns = [
      ...Object.keys(DETAIL.clients),
      "loans_to_date",
      "principal_eur_to_date",
      "last_disbursed",
      "last_status",
    ];
    await insert(tx, "client", clientColumns, clients);
    console.log(
      `client: ${clients.length} rows (${summary.size} with a cohort summary)`,
    );
  });
}

/** Every artifact the route can serve, compared with the Parquet file it replaces. Returns the names that differ. */
async function verify(sql: Sql): Promise<string[]> {
  const index = detailIndexSchema.parse(await json(`${DETAIL.dir}/index.json`));
  const names = allArtifactNames(Object.keys(index.files).sort());
  const failures: string[] = [];
  let checked = 0;
  for (const name of names) {
    const query = resolveArtifact(name);
    if (!query) {
      failures.push(`${name}: no query`);
      continue;
    }
    const expected =
      query.kind === "document"
        ? await json(name)
        : name.startsWith(`${DETAIL.dir}/`)
          ? await rows(name, specOf(name.slice(DETAIL.dir.length + 1)))
          : await rows(
              name,
              Object.values(FILES).find((f) => f.file === name)?.columns ?? {},
            );
    const actual = await runArtifact(sql, query);
    if (!isDeepStrictEqual(actual, expected)) {
      const n = Array.isArray(actual) ? actual.length : "?";
      const e = Array.isArray(expected) ? expected.length : "?";
      failures.push(`${name}: differs (${n} rows vs ${e} in Parquet)`);
    }
    checked += 1;
  }
  console.log(`verified ${checked} artifacts, ${failures.length} differ`);
  return failures;
}

runLoader({ envVar: "MIRELO_LOAD_DATABASE_URL", load, verify });
