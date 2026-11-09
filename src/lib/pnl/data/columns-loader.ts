import type { EntityCode, OpsColumns, PlColumns } from "../engine/types";
import type { DatasetSource } from "./dataset";
import type { Manifest } from "./manifest";

// The P&L data as JSON columns (2026-11-09): since the rows moved to Supabase schema `pnl_demo`, the browser and the
// chat route read them through /api/pnl/<name> (src/lib/pnl/server.ts) as an object of equal-length arrays, one per
// Parquet column, and build the same typed arrays parquet-loader.ts built from the files. A P&L entity has up to
// ~335k rows, more than one JSON response may carry (the function response cap), so each entity comes in chunks of
// one version × up to twelve months: `pl-P/v0-m0-11.json`. ops is one chunk. The chunk list is derived from the
// manifest here and resolved server-side in artifacts.ts; the load script verifies every chunk against the Parquet.

/** Parquet column → JSON key (the same names) and the typed array it fills. */
export const PL_COLUMNS = [
  "month_idx",
  "version",
  "region",
  "channel",
  "line",
  "segment",
  "account",
  "counterparty",
  "cents",
] as const;
export const OPS_COLUMNS = [
  "entity",
  "month_idx",
  "version",
  "region",
  "channel",
  "line",
  "segment",
  "units",
  "gmv_cents",
  "merchants",
] as const;
export const OPS_NAME = "ops.json";
const MONTHS_PER_CHUNK = 12;

export type Columns = Record<string, unknown[]>;

/** The chunk names one entity's rows come in, in version then month order. */
export function plChunkNames(m: Manifest, entity: EntityCode): string[] {
  const months = m.tables.dim_month.length;
  const names: string[] = [];
  for (let v = 0; v < m.dict.version.length; v++)
    for (let from = 0; from < months; from += MONTHS_PER_CHUNK)
      names.push(
        `pl-${entity}/v${v}-m${from}-${Math.min(from + MONTHS_PER_CHUNK, months) - 1}.json`,
      );
  return names;
}

/** `pl-P/v0-m0-11.json` → its table filter; null for any other name. */
export function parsePlChunkName(
  name: string,
): { entity: EntityCode; version: number; from: number; to: number } | null {
  const m = /^pl-([PS])\/v(\d{1,2})-m(\d{1,3})-(\d{1,3})\.json$/.exec(name);
  if (!m) return null;
  const version = Number(m[2]);
  const from = Number(m[3]);
  const to = Number(m[4]);
  if (to < from || to - from >= MONTHS_PER_CHUNK) return null;
  return { entity: m[1] as EntityCode, version, from, to };
}

/** Rows (as the database returns them) → columns, the wire shape. */
export function toColumns(
  rows: readonly Record<string, unknown>[],
  names: readonly string[],
): Columns {
  return Object.fromEntries(names.map((c) => [c, rows.map((r) => r[c])]));
}

function columnsOf(
  json: unknown,
  names: readonly string[],
  label: string,
): { cols: Record<string, unknown[]>; n: number } {
  if (json === null || typeof json !== "object" || Array.isArray(json))
    throw new Error(`${label}: expected an object of columns`);
  const cols: Record<string, unknown[]> = {};
  let n = -1;
  for (const c of names) {
    const col = (json as Record<string, unknown>)[c];
    if (!Array.isArray(col)) throw new Error(`${label}: column ${c} missing`);
    if (n >= 0 && col.length !== n)
      throw new Error(`${label}: column ${c} has ${col.length} rows, not ${n}`);
    n = col.length;
    cols[c] = col;
  }
  return { cols, n: Math.max(n, 0) };
}

/** Copies one JSON column into a typed array at `offset`, checking every value's kind and code range. */
function fill(
  out: Int32Array | Float64Array,
  offset: number,
  col: unknown[],
  label: string,
  max?: number,
): void {
  const ints = out instanceof Int32Array;
  for (let i = 0; i < col.length; i++) {
    const v = col[i];
    if (
      typeof v !== "number" ||
      !Number.isFinite(v) ||
      (ints && !Number.isInteger(v))
    )
      throw new Error(
        `${label}: row ${i} is not a ${ints ? "integer" : "number"}`,
      );
    if (max !== undefined && (v < 0 || v >= max))
      throw new Error(`${label}: code ${v} outside 0…${max - 1}`);
    out[offset + i] = v;
  }
}

/** The chunks of one entity, concatenated in chunk order, as the engine's typed arrays. */
export function plFromChunks(
  chunks: readonly unknown[],
  m: Manifest,
  label: string,
): PlColumns {
  const parsed = chunks.map((c, i) =>
    columnsOf(c, PL_COLUMNS, `${label} chunk ${i}`),
  );
  const n = parsed.reduce((s, p) => s + p.n, 0);
  const pl: PlColumns = {
    n,
    monthIdx: new Int32Array(n),
    version: new Int32Array(n),
    region: new Int32Array(n),
    channel: new Int32Array(n),
    line: new Int32Array(n),
    segment: new Int32Array(n),
    account: new Int32Array(n),
    counterparty: new Int32Array(n),
    cents: new Float64Array(n),
  };
  const { dict } = m;
  const targets: [string, Int32Array | Float64Array, number | undefined][] = [
    ["month_idx", pl.monthIdx, m.tables.dim_month.length],
    ["version", pl.version, dict.version.length],
    ["region", pl.region, dict.region.length],
    ["channel", pl.channel, dict.channel.length],
    ["line", pl.line, dict.line.length],
    ["segment", pl.segment, dict.segment.length],
    ["account", pl.account, dict.account.length],
    ["counterparty", pl.counterparty, dict.counterparty.length],
    ["cents", pl.cents, undefined],
  ];
  let offset = 0;
  parsed.forEach((p, i) => {
    for (const [c, out, max] of targets)
      fill(out, offset, p.cols[c]!, `${label} chunk ${i} ${c}`, max);
    offset += p.n;
  });
  return pl;
}

export function opsFromColumns(json: unknown, m: Manifest): OpsColumns {
  const { cols, n } = columnsOf(json, OPS_COLUMNS, OPS_NAME);
  const ops: OpsColumns = {
    n,
    entity: new Int32Array(n),
    monthIdx: new Int32Array(n),
    version: new Int32Array(n),
    region: new Int32Array(n),
    channel: new Int32Array(n),
    line: new Int32Array(n),
    segment: new Int32Array(n),
    units: new Int32Array(n),
    gmvCents: new Float64Array(n),
    merchants: new Int32Array(n),
  };
  const { dict } = m;
  const targets: [string, Int32Array | Float64Array, number | undefined][] = [
    ["entity", ops.entity, dict.entity.length],
    ["month_idx", ops.monthIdx, m.tables.dim_month.length],
    ["version", ops.version, dict.version.length],
    ["region", ops.region, dict.region.length],
    ["channel", ops.channel, dict.channel.length],
    ["line", ops.line, dict.line.length],
    ["segment", ops.segment, dict.segment.length],
    ["units", ops.units, undefined],
    ["gmv_cents", ops.gmvCents, undefined],
    ["merchants", ops.merchants, undefined],
  ];
  for (const [c, out, max] of targets)
    fill(out, 0, cols[c]!, `${OPS_NAME} ${c}`, max);
  return ops;
}

/** The browser's (and the chat route's) source: `fetchJson(name)` answers with /api/pnl/<name>'s JSON. */
export function columnsSource(
  fetchJson: (name: string) => Promise<unknown>,
): DatasetSource {
  return {
    manifest: () => fetchJson("manifest.json"),
    pl: async (entity, m) =>
      plFromChunks(
        await Promise.all(plChunkNames(m, entity).map(fetchJson)),
        m,
        `pl-${entity}`,
      ),
    ops: async (m) => opsFromColumns(await fetchJson(OPS_NAME), m),
  };
}
