import { parquetMetadataAsync, parquetRead } from "hyparquet";
import type { AsyncBuffer } from "hyparquet";

// The freight sales report's data (docs/freight/README.md): two Parquet files shipped in the build as delivered
// (public/data/freight/, owner 11-24), read in the browser column by column through HTTP range requests, so only the
// columns below are downloaded. Each column becomes a typed array or a dictionary of codes; the engine works on those.

/** Filter and group-by attributes, present on both a shipment and a ledger posting. */
export const DIMS = [
  "company",
  "client",
  "accManager",
  "salesPerson",
  "origin",
  "destination",
  "tradeLane",
  "lob",
  "serviceType",
  "shipmentType",
  "finStatus",
  "operStatus",
] as const;
export type DimKey = (typeof DIMS)[number];

const DIM_COLUMNS: Record<"shipments" | "postings", Record<DimKey, string>> = {
  shipments: {
    company: "_company",
    client: "_client_name",
    accManager: "_acc_manager",
    salesPerson: "_sales_person",
    origin: "_origin",
    destination: "_destination",
    tradeLane: "_trade_lane",
    lob: "_line_of_business",
    serviceType: "_service_type",
    shipmentType: "_shipment_type",
    finStatus: "_fin_status",
    operStatus: "_oper_status",
  },
  postings: {
    company: "_company",
    client: "_client_name",
    accManager: "_acc_manager",
    salesPerson: "_sales_person",
    origin: "_origin",
    destination: "_destination",
    tradeLane: "_trade_lane",
    lob: "_line_of_business",
    serviceType: "_service_type",
    shipmentType: "_ship_type",
    finStatus: "_fin_status",
    operStatus: "_oper_status",
  },
};

const SHIP_TEXT = {
  originCountry: "_origin_country",
  originPort: "_origin_port",
  destinationCountry: "_destination_country",
  destinationPort: "_destination_port",
  terms: "_shipping_terms",
  units: "_analytical_units",
} as const;
export type ShipTextKey = keyof typeof SHIP_TEXT;

const SHIP_DATES = {
  creation: "_creation_date",
  oper: "_oper_date",
  loading: "_loading_date",
  etd: "_etd",
  eta: "_eta",
  arrival: "_arrival_date",
  lastInvoice: "_last_invoice_date",
  finClosed: "_fin_closed_date",
} as const;
export type ShipDateKey = keyof typeof SHIP_DATES;

const SHIP_NUMS = {
  expRevUsd: "_expected_revenue_usd",
  expRevLoc: "_expected_revenue_local",
  expGpUsd: "_expected_profit_usd",
  expGpLoc: "_expected_profit_local",
  actRevUsd: "_actual_revenue_usd",
  actRevLoc: "_actual_revenue_local",
  actGpUsd: "_actual_profit_usd",
  actGpLoc: "_actual_profit_local",
  volume: "_analytical_volume",
  cbm: "_vol_cbm",
  teu: "_vol_teus",
  chargeWeight: "_vol_charge_weight",
} as const;
export type ShipNumKey = keyof typeof SHIP_NUMS;

/** A string column as codes into its distinct values (a missing value is the empty string). */
export interface Dict {
  values: string[];
  codes: Uint32Array;
}

/** No date: the day number stored for a null date. */
export const NO_DAY = -1;

export interface Shipments {
  n: number;
  serial: string[];
  dims: Record<DimKey, Dict>;
  text: Record<ShipTextKey, Dict>;
  /** Days since 1970-01-01 (UTC), NO_DAY when empty. */
  dates: Record<ShipDateKey, Int32Array>;
  nums: Record<ShipNumKey, Float64Array>;
}

export interface Postings {
  n: number;
  serial: Dict;
  day: Int32Array;
  isRevenue: Uint8Array;
  account: Float64Array;
  usd: Float64Array;
  loc: Float64Array;
  dims: Record<DimKey, Dict>;
}

export interface Dataset {
  shipments: Shipments;
  postings: Postings;
  /** The demo calendar: the first and last day with data (README: 2025-12-01 to 2026-10-31). */
  firstDay: number;
  lastDay: number;
}

export const FILES = {
  shipments: "shipments.parquet",
  postings: "postings.parquet",
} as const;

export const SHIPMENT_COLUMNS: string[] = [
  "_shipment_serial",
  ...Object.values(DIM_COLUMNS.shipments),
  ...Object.values(SHIP_TEXT),
  ...Object.values(SHIP_DATES),
  ...Object.values(SHIP_NUMS),
];

export const POSTING_COLUMNS: string[] = [
  "_ship_serial",
  "_accounting_date",
  "_type",
  "_account",
  "_amount_usd",
  "_amount_local",
  ...Object.values(DIM_COLUMNS.postings),
];

type Raw = Record<string, unknown[]>;

/** Reads the named columns of one Parquet file into one plain array per column. */
export async function readColumns(
  file: AsyncBuffer,
  columns: string[],
  label: string,
): Promise<Raw> {
  const metadata = await parquetMetadataAsync(file);
  const n = Number(metadata.num_rows);
  const out: Raw = Object.fromEntries(
    columns.map((c) => [c, new Array<unknown>(n)]),
  );
  await parquetRead({
    file,
    metadata,
    columns,
    onChunk: ({ columnName, columnData, rowStart }) => {
      const col = out[columnName];
      if (!col) return;
      for (let i = 0; i < columnData.length && rowStart + i < n; i++)
        col[rowStart + i] = columnData[i];
    },
  });
  for (const c of columns)
    if (out[c]!.length !== n || out[c]!.some((v) => v === undefined))
      throw new Error(`${label}: column ${c} is missing or short`);
  return out;
}

function dict(col: unknown[]): Dict {
  const index = new Map<string, number>();
  const values: string[] = [];
  const codes = new Uint32Array(col.length);
  for (let i = 0; i < col.length; i++) {
    const v = col[i] == null ? "" : String(col[i]);
    let c = index.get(v);
    if (c === undefined) {
      c = values.length;
      values.push(v);
      index.set(v, c);
    }
    codes[i] = c;
  }
  return { values, codes };
}

const DAY_MS = 86_400_000;

/** A Parquet DATE (a Date from hyparquet) or an ISO string as a day number. */
export function toDay(v: unknown): number {
  if (v == null) return NO_DAY;
  const ms =
    v instanceof Date ? v.getTime() : Date.parse(`${String(v)}T00:00:00Z`);
  if (!Number.isFinite(ms)) throw new Error(`not a date: ${String(v)}`);
  return Math.round(ms / DAY_MS);
}

export function dayToIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function days(col: unknown[]): Int32Array {
  const a = new Int32Array(col.length);
  for (let i = 0; i < col.length; i++) a[i] = toDay(col[i]);
  return a;
}

function nums(col: unknown[], label: string): Float64Array {
  const a = new Float64Array(col.length);
  for (let i = 0; i < col.length; i++) {
    const v = col[i];
    const x = v == null ? 0 : Number(v); // BIGINT columns arrive as bigint
    if (!Number.isFinite(x)) throw new Error(`${label}: not a number`);
    a[i] = x;
  }
  return a;
}

function mapKeys<K extends string>(
  spec: Record<K, string>,
  make: (col: unknown[], name: string) => Dict | Int32Array | Float64Array,
  raw: Raw,
) {
  return Object.fromEntries(
    Object.entries<string>(spec).map(([k, c]) => [k, make(raw[c]!, c)]),
  );
}

export function buildDataset(raw: { shipments: Raw; postings: Raw }): Dataset {
  const s = raw.shipments;
  const p = raw.postings;
  const shipments: Shipments = {
    n: s._shipment_serial!.length,
    serial: s._shipment_serial!.map(String),
    dims: mapKeys(DIM_COLUMNS.shipments, dict, s) as Shipments["dims"],
    text: mapKeys(SHIP_TEXT, dict, s) as Shipments["text"],
    dates: mapKeys(SHIP_DATES, days, s) as Shipments["dates"],
    nums: mapKeys(SHIP_NUMS, nums, s) as Shipments["nums"],
  };
  const type = p._type!;
  const isRevenue = new Uint8Array(type.length);
  for (let i = 0; i < type.length; i++)
    isRevenue[i] = type[i] === "Revenue" ? 1 : 0;
  const postings: Postings = {
    n: type.length,
    serial: dict(p._ship_serial!),
    day: days(p._accounting_date!),
    isRevenue,
    account: nums(p._account!, "_account"),
    usd: nums(p._amount_usd!, "_amount_usd"),
    loc: nums(p._amount_local!, "_amount_local"),
    dims: mapKeys(DIM_COLUMNS.postings, dict, p) as Postings["dims"],
  };
  let firstDay = Infinity;
  let lastDay = -Infinity;
  for (const d of [shipments.dates.oper, postings.day])
    for (const x of d) {
      if (x === NO_DAY) continue;
      if (x < firstDay) firstDay = x;
      if (x > lastDay) lastDay = x;
    }
  return { shipments, postings, firstDay, lastDay };
}

/** Loads both files through `open` (a URL-backed buffer in the browser, a file in tests) and builds the dataset. */
export async function loadDataset(
  open: (file: string) => Promise<AsyncBuffer>,
): Promise<Dataset> {
  const [shipments, postings] = await Promise.all([
    open(FILES.shipments).then((f) =>
      readColumns(f, SHIPMENT_COLUMNS, FILES.shipments),
    ),
    open(FILES.postings).then((f) =>
      readColumns(f, POSTING_COLUMNS, FILES.postings),
    ),
  ]);
  return buildDataset({ shipments, postings });
}
