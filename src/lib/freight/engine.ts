import { DIMS, NO_DAY, dayToIso, toDay } from "./data";
import type {
  Dataset,
  DimKey,
  Dict,
  ShipDateKey,
  ShipNumKey,
  ShipTextKey,
} from "./data";

// Every number of the freight sales report. Two date axes, as in the Power BI model:
//  - expected figures come from shipments, by operational date;
//  - actual figures come from ledger postings, by accounting date.
// A KPI is compared with the period of the same length just before (Power BI's "prev. 153d").
// Checked against the published Power BI report in engine.test.ts.

export type Currency = "usd" | "loc";
export interface Period {
  from: number; // day numbers, inclusive
  to: number;
}

/** The attributes a viewer can filter on: the company in the context bar, the rest in the Filters panel. */
export const FILTER_KEYS = [
  "company",
  "client",
  "accManager",
  "salesPerson",
  "origin",
  "destination",
  "lob",
  "serviceType",
] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type Filters = Partial<Record<FilterKey, string>>;

export const DIM_LABEL: Record<DimKey, string> = {
  company: "Company",
  client: "Client",
  accManager: "Acc. manager",
  salesPerson: "Sales user",
  origin: "Origin",
  destination: "Destination",
  tradeLane: "Trade lane",
  lob: "Line of business",
  serviceType: "Service",
  shipmentType: "Shipment type",
  finStatus: "Fin. status",
  operStatus: "Oper. status",
};

export const periodDays = (p: Period) => p.to - p.from + 1;

export function previous(p: Period): Period {
  const len = periodDays(p);
  return { from: p.from - len, to: p.from - 1 };
}

/** The report's opening period: the last five months of the demo calendar (1 Jun – 31 Oct 2026), as in Power BI. */
export function defaultPeriod(ds: Dataset): Period {
  const last = new Date(dayToIso(ds.lastDay) + "T00:00:00Z");
  const from = new Date(
    Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - 4, 1),
  );
  return {
    from: Math.max(ds.firstDay, toDay(from.toISOString().slice(0, 10))),
    to: ds.lastDay,
  };
}

/** Distinct values of one attribute, sorted, for a filter list (blank values left out). */
export function dimValues(ds: Dataset, key: DimKey): string[] {
  const set = new Set([
    ...ds.shipments.dims[key].values,
    ...ds.postings.dims[key].values,
  ]);
  set.delete("");
  return [...set].sort((a, b) => a.localeCompare(b));
}

function matcher(dims: Record<DimKey, Dict>, filters: Filters) {
  const tests: [Uint32Array, number][] = [];
  for (const k of FILTER_KEYS) {
    const v = filters[k];
    if (v === undefined) continue;
    tests.push([dims[k].codes, dims[k].values.indexOf(v)]); // -1 never equals a code: nothing matches
  }
  return (i: number) => {
    for (const [codes, c] of tests) if (codes[i] !== c) return false;
    return true;
  };
}

/** Shipments with an operational date in the period that pass the filters. */
export function shipmentsIn(ds: Dataset, p: Period, f: Filters): number[] {
  const s = ds.shipments;
  const day = s.dates.oper;
  const ok = matcher(s.dims, f);
  const out: number[] = [];
  for (let i = 0; i < s.n; i++)
    if (day[i]! >= p.from && day[i]! <= p.to && ok(i)) out.push(i);
  return out;
}

/** Ledger postings with an accounting date in the period that pass the filters. */
export function postingsIn(ds: Dataset, p: Period, f: Filters): number[] {
  const q = ds.postings;
  const ok = matcher(q.dims, f);
  const out: number[] = [];
  for (let i = 0; i < q.n; i++)
    if (q.day[i]! >= p.from && q.day[i]! <= p.to && ok(i)) out.push(i);
  return out;
}

export interface Kpis {
  revenue: number;
  gp: number;
  shipments: number;
  clients: number;
}

export function expectedKpis(
  ds: Dataset,
  p: Period,
  f: Filters,
  cur: Currency,
): Kpis {
  const s = ds.shipments;
  const rev = cur === "usd" ? s.nums.expRevUsd : s.nums.expRevLoc;
  const gp = cur === "usd" ? s.nums.expGpUsd : s.nums.expGpLoc;
  const clients = new Set<number>();
  let r = 0;
  let g = 0;
  const idx = shipmentsIn(ds, p, f);
  for (const i of idx) {
    r += rev[i]!;
    g += gp[i]!;
    clients.add(s.dims.client.codes[i]!);
  }
  return { revenue: r, gp: g, shipments: idx.length, clients: clients.size };
}

/** Actual: revenue = Revenue postings, GP = all postings; shipments and clients counted on Revenue postings. */
export function actualKpis(
  ds: Dataset,
  p: Period,
  f: Filters,
  cur: Currency,
): Kpis {
  const q = ds.postings;
  const amt = cur === "usd" ? q.usd : q.loc;
  const ships = new Set<number>();
  const clients = new Set<number>();
  let r = 0;
  let g = 0;
  for (const i of postingsIn(ds, p, f)) {
    g += amt[i]!;
    if (!q.isRevenue[i]) continue;
    r += amt[i]!;
    ships.add(q.serial.codes[i]!);
    clients.add(q.dims.client.codes[i]!);
  }
  return { revenue: r, gp: g, shipments: ships.size, clients: clients.size };
}

export interface KpiTile {
  label: string;
  kind: "money" | "count";
  value: number;
  prev: number;
  /** cur / prev − 1; null when the previous period is zero */
  change: number | null;
}

export interface KpiPanel {
  expected: KpiTile[];
  actual: KpiTile[];
  prevDays: number;
}

function tiles(cur: Kpis, prev: Kpis, labels: [string, string]): KpiTile[] {
  const t = (
    label: string,
    kind: KpiTile["kind"],
    v: number,
    pv: number,
  ): KpiTile => ({
    label,
    kind,
    value: v,
    prev: pv,
    change: pv === 0 ? null : v / pv - 1,
  });
  return [
    t(labels[0], "money", cur.revenue, prev.revenue),
    t(labels[1], "money", cur.gp, prev.gp),
    t("Shipments", "count", cur.shipments, prev.shipments),
    t("Clients", "count", cur.clients, prev.clients),
  ];
}

export function kpiPanel(
  ds: Dataset,
  p: Period,
  f: Filters,
  cur: Currency,
): KpiPanel {
  const pp = previous(p);
  return {
    expected: tiles(expectedKpis(ds, p, f, cur), expectedKpis(ds, pp, f, cur), [
      "Exp. revenue",
      "Exp. GP",
    ]),
    actual: tiles(actualKpis(ds, p, f, cur), actualKpis(ds, pp, f, cur), [
      "Act. revenue",
      "Act. GP",
    ]),
    prevDays: periodDays(pp),
  };
}

// ---- tables ---------------------------------------------------------------------------------------------------

export type Cell = string | number | null;
export type ColumnKind = "text" | "date" | "money" | "num";
export interface Column {
  key: string;
  label: string;
  kind: ColumnKind;
}
export interface Table {
  columns: Column[];
  rows: Cell[][];
  /** the shipment id of each row (flat tables), for the details panel */
  serials?: string[];
}

type Getter<R> = (ds: Dataset, r: R) => Cell;
type ColumnDef<R> = Column & { get: Getter<R> };

const dayCell = (d: number): Cell => (d === NO_DAY ? null : dayToIso(d));
const blank = (v: string): Cell => (v === "" ? null : v);

const shipDim =
  (k: DimKey): Getter<number> =>
  (ds, i) =>
    blank(ds.shipments.dims[k].values[ds.shipments.dims[k].codes[i]!]!);
const shipText =
  (k: ShipTextKey): Getter<number> =>
  (ds, i) =>
    blank(ds.shipments.text[k].values[ds.shipments.text[k].codes[i]!]!);
const shipDate =
  (k: ShipDateKey): Getter<number> =>
  (ds, i) =>
    dayCell(ds.shipments.dates[k][i]!);
const shipNum =
  (k: ShipNumKey): Getter<number> =>
  (ds, i) =>
    ds.shipments.nums[k][i]!;

/** Operational date, flat: one row per shipment. */
export const OPER_COLUMNS: ColumnDef<number>[] = [
  { key: "company", label: "Company", kind: "text", get: shipDim("company") },
  {
    key: "serial",
    label: "Ship. serial",
    kind: "text",
    get: (ds, i) => ds.shipments.serial[i]!,
  },
  {
    key: "creation",
    label: "Creation date",
    kind: "date",
    get: shipDate("creation"),
  },
  {
    key: "oper",
    label: "Operational date",
    kind: "date",
    get: shipDate("oper"),
  },
  { key: "client", label: "Client", kind: "text", get: shipDim("client") },
  {
    key: "accManager",
    label: "Acc. manager",
    kind: "text",
    get: shipDim("accManager"),
  },
  {
    key: "salesPerson",
    label: "Sales user",
    kind: "text",
    get: shipDim("salesPerson"),
  },
  { key: "origin", label: "Origin", kind: "text", get: shipDim("origin") },
  {
    key: "destination",
    label: "Destination",
    kind: "text",
    get: shipDim("destination"),
  },
  {
    key: "tradeLane",
    label: "Trade lane",
    kind: "text",
    get: shipDim("tradeLane"),
  },
  {
    key: "originCountry",
    label: "Origin country",
    kind: "text",
    get: shipText("originCountry"),
  },
  {
    key: "originPort",
    label: "Origin port",
    kind: "text",
    get: shipText("originPort"),
  },
  {
    key: "destinationCountry",
    label: "Dest. country",
    kind: "text",
    get: shipText("destinationCountry"),
  },
  {
    key: "destinationPort",
    label: "Dest. port",
    kind: "text",
    get: shipText("destinationPort"),
  },
  { key: "lob", label: "Line of business", kind: "text", get: shipDim("lob") },
  {
    key: "serviceType",
    label: "Service",
    kind: "text",
    get: shipDim("serviceType"),
  },
  {
    key: "shipmentType",
    label: "Shipment type",
    kind: "text",
    get: shipDim("shipmentType"),
  },
  { key: "terms", label: "Incoterm", kind: "text", get: shipText("terms") },
  {
    key: "finStatus",
    label: "Fin. status",
    kind: "text",
    get: shipDim("finStatus"),
  },
  {
    key: "operStatus",
    label: "Oper. status",
    kind: "text",
    get: shipDim("operStatus"),
  },
  { key: "etd", label: "ETD", kind: "date", get: shipDate("etd") },
  { key: "eta", label: "ETA", kind: "date", get: shipDate("eta") },
  { key: "arrival", label: "Arrival", kind: "date", get: shipDate("arrival") },
  {
    key: "lastInvoice",
    label: "Last invoice",
    kind: "date",
    get: shipDate("lastInvoice"),
  },
  {
    key: "expRevLoc",
    label: "Exp. revenue LOCAL",
    kind: "money",
    get: shipNum("expRevLoc"),
  },
  {
    key: "expRevUsd",
    label: "Exp. revenue USD",
    kind: "money",
    get: shipNum("expRevUsd"),
  },
  {
    key: "expGpLoc",
    label: "Exp. GP LOCAL",
    kind: "money",
    get: shipNum("expGpLoc"),
  },
  {
    key: "expGpUsd",
    label: "Exp. GP USD",
    kind: "money",
    get: shipNum("expGpUsd"),
  },
  { key: "teu", label: "TEU", kind: "num", get: shipNum("teu") },
  { key: "cbm", label: "CBM", kind: "num", get: shipNum("cbm") },
  {
    key: "chargeWeight",
    label: "Ch. weight, kg",
    kind: "num",
    get: shipNum("chargeWeight"),
  },
];

export const OPER_DEFAULT = [
  "company",
  "serial",
  "creation",
  "client",
  "accManager",
  "salesPerson",
  "expRevLoc",
  "expRevUsd",
  "expGpLoc",
  "expGpUsd",
];

/** One shipment's postings in the period, rolled up (accounting date, flat). */
interface Roll {
  first: number; // a posting of this shipment, for its attributes
  lastDay: number;
  revUsd: number;
  revLoc: number;
  gpUsd: number;
  gpLoc: number;
}

const postDim =
  (k: DimKey): Getter<Roll> =>
  (ds, r) =>
    blank(ds.postings.dims[k].values[ds.postings.dims[k].codes[r.first]!]!);

/** Accounting date, flat: one row per shipment id with postings in the period. */
export const ACC_COLUMNS: ColumnDef<Roll>[] = [
  { key: "company", label: "Company", kind: "text", get: postDim("company") },
  {
    key: "serial",
    label: "Ship. serial",
    kind: "text",
    get: (ds, r) =>
      ds.postings.serial.values[ds.postings.serial.codes[r.first]!]!,
  },
  {
    key: "lastAcc",
    label: "Last acc. date",
    kind: "date",
    get: (_, r) => dayCell(r.lastDay),
  },
  { key: "client", label: "Client", kind: "text", get: postDim("client") },
  {
    key: "accManager",
    label: "Acc. manager",
    kind: "text",
    get: postDim("accManager"),
  },
  {
    key: "salesPerson",
    label: "Sales user",
    kind: "text",
    get: postDim("salesPerson"),
  },
  { key: "origin", label: "Origin", kind: "text", get: postDim("origin") },
  {
    key: "destination",
    label: "Destination",
    kind: "text",
    get: postDim("destination"),
  },
  {
    key: "tradeLane",
    label: "Trade lane",
    kind: "text",
    get: postDim("tradeLane"),
  },
  { key: "lob", label: "Line of business", kind: "text", get: postDim("lob") },
  {
    key: "serviceType",
    label: "Service",
    kind: "text",
    get: postDim("serviceType"),
  },
  {
    key: "shipmentType",
    label: "Shipment type",
    kind: "text",
    get: postDim("shipmentType"),
  },
  {
    key: "finStatus",
    label: "Fin. status",
    kind: "text",
    get: postDim("finStatus"),
  },
  {
    key: "operStatus",
    label: "Oper. status",
    kind: "text",
    get: postDim("operStatus"),
  },
  {
    key: "actRevLoc",
    label: "Act. revenue LOCAL",
    kind: "money",
    get: (_, r) => r.revLoc,
  },
  {
    key: "actRevUsd",
    label: "Act. revenue USD",
    kind: "money",
    get: (_, r) => r.revUsd,
  },
  {
    key: "actGpLoc",
    label: "Act. GP LOCAL",
    kind: "money",
    get: (_, r) => r.gpLoc,
  },
  {
    key: "actGpUsd",
    label: "Act. GP USD",
    kind: "money",
    get: (_, r) => r.gpUsd,
  },
];

export const ACC_DEFAULT = [
  "company",
  "serial",
  "lastAcc",
  "client",
  "accManager",
  "salesPerson",
  "actRevLoc",
  "actRevUsd",
  "actGpLoc",
  "actGpUsd",
];

function pick<R>(defs: ColumnDef<R>[], keys: string[]): ColumnDef<R>[] {
  const wanted = new Set(keys);
  return defs.filter((d) => wanted.has(d.key));
}

const strip = <R>({ key, label, kind }: ColumnDef<R>): Column => ({
  key,
  label,
  kind,
});

function rolls(ds: Dataset, p: Period, f: Filters): Roll[] {
  const q = ds.postings;
  const by = new Map<number, Roll>();
  for (const i of postingsIn(ds, p, f)) {
    const code = q.serial.codes[i]!;
    let r = by.get(code);
    if (!r) {
      r = {
        first: i,
        lastDay: q.day[i]!,
        revUsd: 0,
        revLoc: 0,
        gpUsd: 0,
        gpLoc: 0,
      };
      by.set(code, r);
    }
    if (q.day[i]! > r.lastDay) r.lastDay = q.day[i]!;
    r.gpUsd += q.usd[i]!;
    r.gpLoc += q.loc[i]!;
    if (q.isRevenue[i]) {
      r.revUsd += q.usd[i]!;
      r.revLoc += q.loc[i]!;
    }
  }
  return [...by.values()];
}

/** The flat table of one side, with the picked columns, ordered by shipment id. */
export function flatTable(
  ds: Dataset,
  side: "oper" | "acc",
  p: Period,
  f: Filters,
  keys: string[],
): Table {
  if (side === "oper") {
    const cols = pick(OPER_COLUMNS, keys);
    const idx = shipmentsIn(ds, p, f).sort((a, b) =>
      ds.shipments.serial[a]!.localeCompare(ds.shipments.serial[b]!),
    );
    return {
      columns: cols.map(strip),
      rows: idx.map((i) => cols.map((c) => c.get(ds, i))),
      serials: idx.map((i) => ds.shipments.serial[i]!),
    };
  }
  const cols = pick(ACC_COLUMNS, keys);
  const serialOf = (r: Roll) =>
    ds.postings.serial.values[ds.postings.serial.codes[r.first]!]!;
  const rs = rolls(ds, p, f).sort((a, b) =>
    serialOf(a).localeCompare(serialOf(b)),
  );
  return {
    columns: cols.map(strip),
    rows: rs.map((r) => cols.map((c) => c.get(ds, r))),
    serials: rs.map(serialOf),
  };
}

/** Pivot: totals per value of one attribute, ordered by that value. */
export function pivotTable(
  ds: Dataset,
  side: "oper" | "acc",
  p: Period,
  f: Filters,
  by: DimKey,
): Table {
  const groups = new Map<number, { m: number[]; ships: Set<number> }>();
  const group = (code: number) => {
    let g = groups.get(code);
    if (!g) groups.set(code, (g = { m: [0, 0, 0, 0], ships: new Set() }));
    return g;
  };
  let dict: Dict;
  if (side === "oper") {
    const s = ds.shipments;
    dict = s.dims[by];
    const { expRevLoc, expRevUsd, expGpLoc, expGpUsd } = s.nums;
    for (const i of shipmentsIn(ds, p, f)) {
      const g = group(dict.codes[i]!);
      g.m[0]! += expRevLoc[i]!;
      g.m[1]! += expRevUsd[i]!;
      g.m[2]! += expGpLoc[i]!;
      g.m[3]! += expGpUsd[i]!;
      g.ships.add(i);
    }
  } else {
    const q = ds.postings;
    dict = q.dims[by];
    for (const i of postingsIn(ds, p, f)) {
      const g = group(dict.codes[i]!);
      if (q.isRevenue[i]) {
        g.m[0]! += q.loc[i]!;
        g.m[1]! += q.usd[i]!;
        g.ships.add(q.serial.codes[i]!);
      }
      g.m[2]! += q.loc[i]!;
      g.m[3]! += q.usd[i]!;
    }
  }
  const pre = side === "oper" ? "Exp." : "Act.";
  const columns: Column[] = [
    { key: by, label: DIM_LABEL[by], kind: "text" },
    { key: "revLoc", label: `${pre} revenue LOCAL`, kind: "money" },
    { key: "revUsd", label: `${pre} revenue USD`, kind: "money" },
    { key: "gpLoc", label: `${pre} GP LOCAL`, kind: "money" },
    { key: "gpUsd", label: `${pre} GP USD`, kind: "money" },
    { key: "shipments", label: "Shipments", kind: "num" },
  ];
  const rows = [...groups.entries()]
    .map(([code, g]): Cell[] => [
      blank(dict.values[code]!),
      ...g.m,
      g.ships.size,
    ])
    .sort((a, b) => String(a[0] ?? "").localeCompare(String(b[0] ?? "")));
  return { columns, rows };
}

/** Column totals of a table: sums of the money and number columns, null elsewhere. */
export function totals(t: Table): Cell[] {
  return t.columns.map((c, j) =>
    c.kind === "money" || c.kind === "num"
      ? t.rows.reduce((s, r) => s + ((r[j] as number | null) ?? 0), 0)
      : null,
  );
}

export const PIVOT_BY: DimKey[] = [...DIMS];

// ---- top N clients ---------------------------------------------------------------------------------------------

export const MONEY = {
  revExp: "Rev. exp.",
  gpExp: "GP exp.",
  revAct: "Rev. act.",
  gpAct: "GP act.",
} as const;
export type MoneyKey = keyof typeof MONEY;
export const MONEY_TITLE: Record<MoneyKey, string> = {
  revExp: "expected revenue",
  gpExp: "expected gross profit",
  revAct: "actual revenue",
  gpAct: "actual gross profit",
};

export const VOLUME = {
  cbm: "CBM",
  chargeWeight: "Ch. weight",
  teu: "TEU",
} as const;
export type VolumeKey = keyof typeof VOLUME;
export const VOLUME_TITLE: Record<VolumeKey, string> = {
  cbm: "CBM",
  chargeWeight: "chargeable weight, kg",
  teu: "TEU",
};

export type ClientTotals = Record<MoneyKey | VolumeKey, number>;

/** Per client: money on both date axes and volume by operational date (blank client names left out). */
export function clientTotals(
  ds: Dataset,
  p: Period,
  f: Filters,
  cur: Currency,
): Map<string, ClientTotals> {
  const out = new Map<string, ClientTotals>();
  const get = (name: string) => {
    let t = out.get(name);
    if (!t)
      out.set(
        name,
        (t = {
          revExp: 0,
          gpExp: 0,
          revAct: 0,
          gpAct: 0,
          cbm: 0,
          chargeWeight: 0,
          teu: 0,
        }),
      );
    return t;
  };
  const s = ds.shipments;
  const rev = cur === "usd" ? s.nums.expRevUsd : s.nums.expRevLoc;
  const gp = cur === "usd" ? s.nums.expGpUsd : s.nums.expGpLoc;
  for (const i of shipmentsIn(ds, p, f)) {
    const name = s.dims.client.values[s.dims.client.codes[i]!]!;
    if (!name) continue;
    const t = get(name);
    t.revExp += rev[i]!;
    t.gpExp += gp[i]!;
    t.cbm += s.nums.cbm[i]!;
    t.chargeWeight += s.nums.chargeWeight[i]!;
    t.teu += s.nums.teu[i]!;
  }
  const q = ds.postings;
  const amt = cur === "usd" ? q.usd : q.loc;
  for (const i of postingsIn(ds, p, f)) {
    const name = q.dims.client.values[q.dims.client.codes[i]!]!;
    if (!name) continue;
    const t = get(name);
    t.gpAct += amt[i]!;
    if (q.isRevenue[i]) t.revAct += amt[i]!;
  }
  return out;
}

export interface Bar {
  client: string;
  value: number;
}

/** The n clients with the largest value of one measure (ties by name). */
export function topN(
  totals: Map<string, ClientTotals>,
  key: MoneyKey | VolumeKey,
  n: number,
): Bar[] {
  return [...totals.entries()]
    .map(([client, t]) => ({ client, value: t[key] }))
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value || a.client.localeCompare(b.client))
    .slice(0, n);
}

// ---- one shipment ----------------------------------------------------------------------------------------------

export interface ShipmentDetail {
  serial: string;
  /** label → value; null when the shipment has postings only */
  fields: [string, Cell][] | null;
  postings: {
    date: string;
    type: string;
    account: number;
    usd: number;
    loc: number;
  }[];
}

export function shipmentDetail(ds: Dataset, serial: string): ShipmentDetail {
  const s = ds.shipments;
  const i = s.serial.indexOf(serial);
  const fields =
    i < 0
      ? null
      : OPER_COLUMNS.filter((c) => c.key !== "serial").map(
          (c): [string, Cell] => [c.label, c.get(ds, i)],
        );
  const q = ds.postings;
  const code = q.serial.values.indexOf(serial);
  const postings: ShipmentDetail["postings"] = [];
  if (code >= 0)
    for (let j = 0; j < q.n; j++)
      if (q.serial.codes[j] === code)
        postings.push({
          date: dayToIso(q.day[j]!),
          type: q.isRevenue[j] ? "Revenue" : "Cost",
          account: q.account[j]!,
          usd: q.usd[j]!,
          loc: q.loc[j]!,
        });
  postings.sort(
    (a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type),
  );
  return { serial, fields, postings };
}
