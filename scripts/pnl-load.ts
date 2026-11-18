import { isDeepStrictEqual } from "node:util";
import type { Sql } from "postgres";
import { resolveArtifact, runArtifact } from "@/lib/pnl/artifacts";
import {
  OPS_COLUMNS,
  OPS_NAME,
  PL_COLUMNS,
  opsFromColumns,
  plChunkNames,
  plFromChunks,
  toColumns,
} from "@/lib/pnl/data/columns-loader";
import { OPS_FILE, PL_FILES, parseManifest } from "@/lib/pnl/data/manifest";
import type { Manifest } from "@/lib/pnl/data/manifest";
import { readOpsColumns, readPlColumns } from "@/lib/pnl/data/parquet-loader";
import type { EntityCode, OpsColumns, PlColumns } from "@/lib/pnl/engine/types";
import { batchInsert, parquetDir, runLoader } from "./lib/load-report";

// Loads data/pnl/parquet (the files the report used to fetch from public/data/pnl) into Supabase schema `pnl_demo`,
// then verifies every chunk the server route serves against the Parquet it replaces: the same typed arrays the
// browser builds (columns-loader.ts) from the chunks, compared with the ones parquet-loader.ts builds from the files.
// Run from the owner's machine only, as pnl_loader (Session pooler):
//
//     node --env-file=.env.local --import tsx scripts/pnl-load.ts            # truncate, load, verify
//     node --env-file=.env.local --import tsx scripts/pnl-load.ts --verify   # verify only
//
// Node reads .env.local; this script never prints a value from it. Nothing here runs in the site. Mirelo's and ACME
// Marketing's loaders (scripts/mirelo-load.ts, scripts/marketing-load.ts) are the pattern; the connection, the exit
// codes and the batched insert are shared with them (scripts/lib/load-report.ts).

const { bytes, json } = parquetDir(
  new URL("../data/pnl/parquet/", import.meta.url),
);
const insert = batchInsert(2000);

/** Typed arrays → one row object per index, in file order (the `seq`). */
function rowsOf(
  arrays: Record<string, Int32Array | Float64Array>,
  n: number,
): Record<string, unknown>[] {
  const names = Object.keys(arrays);
  const out: Record<string, unknown>[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const r: Record<string, unknown> = { seq: i };
    for (const c of names) r[c] = arrays[c]![i];
    out[i] = r;
  }
  return out;
}

const plArrays = (pl: PlColumns) => ({
  month_idx: pl.monthIdx,
  version: pl.version,
  region: pl.region,
  channel: pl.channel,
  line: pl.line,
  segment: pl.segment,
  account: pl.account,
  counterparty: pl.counterparty,
  cents: pl.cents,
});
const opsArrays = (o: OpsColumns) => ({
  entity: o.entity,
  month_idx: o.monthIdx,
  version: o.version,
  region: o.region,
  channel: o.channel,
  line: o.line,
  segment: o.segment,
  units: o.units,
  gmv_cents: o.gmvCents,
  merchants: o.merchants,
});

async function readAll(m: Manifest) {
  const pl = new Map<EntityCode, PlColumns>();
  for (const e of ["P", "S"] as const)
    pl.set(e, await readPlColumns(await bytes(PL_FILES[e]), m));
  return { pl, ops: await readOpsColumns(await bytes(OPS_FILE), m) };
}

async function load(sql: Sql, m: Manifest): Promise<void> {
  const { pl, ops } = await readAll(m);
  await sql.begin(async (tx) => {
    await tx`truncate document, pl_p, pl_s, ops, dict_code, dim_month, dim_account, dim_region, fact_fx_rate`;
    await tx`insert into document ${tx([{ name: "manifest.json", doc: m }], "name", "doc")}`;
    for (const e of ["P", "S"] as const) {
      const cols = pl.get(e)!;
      const table = e === "P" ? "pl_p" : "pl_s";
      await insert(
        tx,
        table,
        ["seq", ...PL_COLUMNS],
        rowsOf(plArrays(cols), cols.n),
      );
      console.log(`${table}: ${cols.n} rows`);
    }
    await insert(
      tx,
      "ops",
      ["seq", ...OPS_COLUMNS],
      rowsOf(opsArrays(ops), ops.n),
    );
    console.log(`ops: ${ops.n} rows`);

    // The lookups, from the manifest (for SQL over the facts; the report reads the document).
    const dict = Object.entries(m.dict).flatMap(([name, codes]) =>
      codes.map((code, idx) => ({ dict: name, idx, code })),
    );
    await insert(tx, "dict_code", ["dict", "idx", "code"], dict);
    await insert(
      tx,
      "dim_month",
      [
        "month_index",
        "month_key",
        "fiscal_year",
        "quarter",
        "month_number",
        "is_closed",
      ],
      m.tables.dim_month.map((d) => ({
        month_index: d.month_index,
        month_key: d.month_key,
        fiscal_year: d.fiscal_year,
        quarter: d.quarter,
        month_number: d.month_number,
        is_closed: d.is_closed,
      })),
    );
    await insert(
      tx,
      "dim_account",
      [
        "account_code",
        "account_name",
        "block_code",
        "is_below_cm",
        "is_intercompany",
        "natural_sign",
      ],
      m.tables.dim_account.map((a) => ({
        account_code: a.account_code,
        account_name: a.account_name,
        block_code: a.block_code,
        is_below_cm: a.is_below_cm,
        is_intercompany: a.is_intercompany,
        natural_sign: a.natural_sign,
      })),
    );
    await insert(
      tx,
      "dim_region",
      ["region_code", "region_name", "functional_currency"],
      m.tables.dim_region.map((r) => ({
        region_code: r.region_code,
        region_name: r.region_name,
        functional_currency: r.functional_currency,
      })),
    );
    await insert(
      tx,
      "fact_fx_rate",
      ["currency_code", "month_key", "rate_type", "local_per_usd"],
      m.tables.fact_fx_rate.map((r) => ({ ...r })),
    );
    console.log(
      `lookups: ${dict.length} dict codes, ${m.tables.dim_month.length} months, ${m.tables.dim_account.length} accounts, ${m.tables.fact_fx_rate.length} FX rates`,
    );
  });
}

/** What the browser gets, built from the route's answers the way columns-loader.ts builds it. */
async function fetchJson(sql: Sql, name: string): Promise<unknown> {
  const query = resolveArtifact(name);
  if (!query) throw new Error(`${name}: no query`);
  const body = await runArtifact(sql, query);
  const wire =
    query.kind === "document"
      ? body
      : toColumns(body as Record<string, unknown>[], query.columns);
  return JSON.parse(JSON.stringify(wire)) as unknown; // the JSON round trip, as over HTTP
}

const same = (a: Int32Array | Float64Array, b: Int32Array | Float64Array) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** Every artifact the route can serve, compared with the Parquet it replaces. Returns what differs. */
async function verify(sql: Sql, m: Manifest, raw: unknown): Promise<string[]> {
  const failures: string[] = [];
  if (!isDeepStrictEqual(await fetchJson(sql, "manifest.json"), raw))
    failures.push("manifest.json: differs");
  const { pl, ops } = await readAll(m);
  for (const e of ["P", "S"] as const) {
    const names = plChunkNames(m, e);
    const chunks: unknown[] = [];
    for (const name of names) chunks.push(await fetchJson(sql, name));
    const got = plFromChunks(chunks, m, `pl-${e}`);
    const want = pl.get(e)!;
    // Chunks come version-major, the file is in its own order: compare as sorted rows.
    const key = (a: ReturnType<typeof plArrays>, i: number) =>
      PL_COLUMNS.map((c) => a[c][i]).join(",");
    const gotKeys = Array.from({ length: got.n }, (_, i) =>
      key(plArrays(got), i),
    ).sort();
    const wantKeys = Array.from({ length: want.n }, (_, i) =>
      key(plArrays(want), i),
    ).sort();
    if (got.n !== want.n || gotKeys.some((k, i) => k !== wantKeys[i]))
      failures.push(
        `pl-${e}: differs (${got.n} rows from ${names.length} chunks vs ${want.n} in Parquet)`,
      );
    else console.log(`pl-${e}: ${got.n} rows in ${names.length} chunks match`);
  }
  const gotOps = opsFromColumns(await fetchJson(sql, OPS_NAME), m);
  const a = opsArrays(gotOps);
  const b = opsArrays(ops);
  if (
    gotOps.n !== ops.n ||
    (Object.keys(a) as (keyof typeof a)[]).some((c) => !same(a[c], b[c]))
  )
    failures.push(
      `${OPS_NAME}: differs (${gotOps.n} rows vs ${ops.n} in Parquet)`,
    );
  else console.log(`${OPS_NAME}: ${gotOps.n} rows match`);
  return failures;
}

/** The manifest as stored (`raw`, what the route must serve back) and parsed (`m`); read once. */
let manifest: Promise<{ raw: unknown; m: Manifest }> | undefined;
const readManifest = () =>
  (manifest ??= json("manifest.json").then((raw) => ({
    raw,
    m: parseManifest(raw),
  })));

runLoader({
  envVar: "PNL_LOAD_DATABASE_URL",
  load: async (sql) => load(sql, (await readManifest()).m),
  verify: async (sql) => {
    const { raw, m } = await readManifest();
    return verify(sql, m, raw);
  },
});
