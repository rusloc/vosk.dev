import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parquetRead } from "hyparquet";
import { parseManifest } from "@/lib/pnl/data/manifest";
import type { Manifest } from "@/lib/pnl/data/manifest";

// The P&L chat's answer key, the independent half (plan .log/report/2026-11-07-ai-chat-metrics-plan.md §2, §5): figures
// the generator's control totals do not carry (other currencies, constant currency, MTD / QTD / LTM windows, slices
// and their allocation, drivers, prior year, FY outlook, shares), computed straight from the Parquet by plain loops
// written from the data contract and the spec (docs/pnl/data-contract.md, requirements C-01 … C-13, C-30 … C-36),
// NOT from the report engine, so they check it. Frozen in data/pnl/checks/chat-golden.csv;
// src/lib/pnl/chat-metrics.test.ts checks the catalogue against it. Re-run after a data rebuild:
//
//     node --import tsx scripts/pnl-golden.ts
//
// Key: metric | entity | fy | month | time view | base | currency | fx basis | column | filters ("k=v;k=v").
// Column: base, B (Budget), LE (latest estimate), PY (prior year). An empty expected value = the figure is n/a.

const DIR = new URL("../data/pnl/parquet/", import.meta.url);
const OUT = new URL("../data/pnl/checks/chat-golden.csv", import.meta.url);

interface Row {
  month_idx: number;
  version: number;
  region: number;
  channel: number;
  line: number;
  segment: number;
  account: number;
  counterparty: number;
  cents: number;
}
interface OpsRow {
  entity: number;
  month_idx: number;
  version: number;
  region: number;
  channel: number;
  line: number;
  segment: number;
  units: number;
  gmv_cents: number;
  merchants: number;
}

async function rows<T>(name: string): Promise<T[]> {
  const b = await readFile(fileURLToPath(new URL(name, DIR)));
  const file = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  let out: T[] = [];
  await parquetRead({
    file,
    rowFormat: "object",
    onComplete: (data) => {
      out = data as T[];
    },
  });
  return out;
}

const m: Manifest = parseManifest(
  JSON.parse(
    await readFile(fileURLToPath(new URL("manifest.json", DIR)), "utf8"),
  ),
);
const pl = {
  P: await rows<Row>("pl-P.parquet"),
  S: await rows<Row>("pl-S.parquet"),
};
const ops = await rows<OpsRow>("ops.parquet");

// ---------- the dictionaries, in words ----------
const { dict } = m;
const months = m.tables.dim_month; // index = month_index
const closed = new Set(
  months.filter((d) => d.is_closed).map((d) => d.month_index),
);
const VERSION = {
  ACT: dict.version.indexOf("ACT"),
  BUD: dict.version.indexOf("BUD"),
};
const latest = m.tables.dim_version.find((v) => v.is_latest_forecast)!;
const FC = {
  idx: dict.version.indexOf(latest.version_key),
  first: months.find((d) => d.month_key === latest.first_month_key)!
    .month_index,
  last: months.find((d) => d.month_key === latest.last_month_key)!.month_index,
};
const regionCcy = dict.region.map(
  (code) =>
    m.tables.dim_region.find((r) => r.region_code === code)!
      .functional_currency,
);
const fxRates = new Map(
  m.tables.fact_fx_rate.map((r) => [
    `${r.currency_code}|${r.month_key}|${r.rate_type}`,
    r.local_per_usd,
  ]),
);
const rate = (ccy: string, t: number, type: "ACTUAL_AVG" | "BUDGET") => {
  const v = fxRates.get(`${ccy}|${months[t]!.month_key}|${type}`);
  if (v === undefined) throw new Error(`no ${type} rate for ${ccy} at ${t}`);
  return v;
};
const account = m.tables.dim_account;
const accountOf = dict.account.map((code) =>
  account.find((a) => a.account_code === code)!,
);
const BLOCKS = [
  "GR",
  "GTN",
  "COR",
  "VSC",
  "SM",
  "RD",
  "GA",
  "OOI",
  "DA",
  "ADJ",
  "INV",
  "FIN",
  "TAX",
] as const;
/** Spec §3: the statement's subtotals, from the blocks. */
function lines(block: Record<string, number>): Record<string, number> {
  const L: Record<string, number> = { ...block };
  L.NR = L.GR! + L.GTN!;
  L.GP = L.NR + L.COR!;
  L.CM = L.GP + L.VSC!;
  L.OPEX = L.SM! + L.RD! + L.GA! + L.OOI!;
  L.EBITDA = L.CM + L.OPEX;
  L.UOP = L.EBITDA + L.DA!;
  L.OP = L.UOP + L.ADJ!;
  L.PBFIT = L.OP + L.INV!;
  L.PBT = L.PBFIT + L.FIN!;
  L.NP = L.PBT + L.TAX!;
  return L;
}

// ---------- windows and columns (spec §7, C-01 … C-05) ----------
type TimeView = "MTD" | "QTD" | "YTD" | "LTM" | "FY";
function windowMonths(tv: TimeView, fy: number, month: number): number[] {
  const anchor = months.find(
    (d) => d.fiscal_year === fy && d.month_number === month,
  )!;
  const same = months.filter((d) => d.fiscal_year === fy);
  switch (tv) {
    case "MTD":
      return [anchor.month_index];
    case "QTD":
      return same
        .filter((d) => d.quarter === anchor.quarter && d.month_number <= month)
        .map((d) => d.month_index);
    case "YTD":
      return same
        .filter((d) => d.month_number <= month)
        .map((d) => d.month_index);
    case "FY":
      return same.map((d) => d.month_index);
    case "LTM":
      return months
        .filter(
          (d) =>
            d.month_index > anchor.month_index - 12 &&
            d.month_index <= anchor.month_index,
        )
        .map((d) => d.month_index);
  }
}
type Base = "A" | "LE" | "B";
type Col = "base" | "B" | "LE" | "PY";
/** (version index, source month) pairs a column reads. */
function parts(base: Base, col: Col, window: number[]): [number, number][] {
  // C-01: an actual base never includes months after the last close; comparators use exactly the base months (C-03).
  const base_ = base === "A" ? window.filter((t) => closed.has(t)) : window;
  const choice = col === "base" ? base : col;
  switch (choice) {
    case "A":
      return base_.filter((t) => closed.has(t)).map((t) => [VERSION.ACT, t]);
    case "B":
      return base_.map((t) => [VERSION.BUD, t]);
    case "LE":
      return base_.flatMap((t): [number, number][] =>
        closed.has(t)
          ? [[VERSION.ACT, t]]
          : t >= FC.first && t <= FC.last
            ? [[FC.idx, t]]
            : [],
      );
    case "PY":
      return base_
        .map((t) => t - 12)
        .filter((t) => t >= 0 && closed.has(t))
        .map((t) => [VERSION.ACT, t]);
  }
}
type Basis = "ACT" | "CC";
/** C-11 … C-13: local cents → reporting units, both legs at one rate type and month. */
function factor(
  version: number,
  t: number,
  region: number,
  cur: string,
  basis: Basis,
  fy: number,
): number {
  const isBudget = version === VERSION.BUD;
  const type = basis === "CC" || isBudget ? "BUDGET" : "ACTUAL_AVG";
  const at =
    basis === "CC"
      ? months.find(
          (d) =>
            d.fiscal_year === fy && d.month_number === months[t]!.month_number,
        )!.month_index
      : t;
  return rate(cur, at, type) / rate(regionCcy[region]!, at, type) / 100;
}

// ---------- the question ----------
interface Q {
  entity: "P" | "S" | "GROUP";
  fy: number;
  month: number;
  tv: TimeView;
  base: Base;
  cur: string;
  fx: Basis;
  region?: string;
  channel?: string;
  line?: string;
  segment?: string;
}
type Dim = "region" | "channel" | "line" | "segment";
const DIMS: Dim[] = ["region", "channel", "line", "segment"];

/**
 * Σ per account of one column, in reporting units, within the slice. Direct accounts are read as booked; accounts
 * below contribution margin, booked by region only, are allocated to a channel / line / segment slice by net-revenue
 * share within entity × version × month × region (C-31). GROUP = both companies without counterparty rows (C-36).
 */
function accounts(q: Q, col: Col): Float64Array | null {
  const ps = parts(q.base, col, windowMonths(q.tv, q.fy, q.month));
  if (ps.length === 0) return null;
  const out = new Float64Array(dict.account.length);
  const entities =
    q.entity === "GROUP" ? (["P", "S"] as const) : ([q.entity] as const);
  const sliceDims = DIMS.filter((d) => q[d] !== undefined);
  const code = (d: Dim, r: Row) => dict[d][r[d]]!;
  const inSlice = (r: Row) => sliceDims.every((d) => code(d, r) === q[d]);
  const allocate = sliceDims.some((d) => d !== "region");
  for (const e of entities)
    for (const [v, t] of ps) {
      const atMonth = pl[e].filter(
        (r) =>
          r.version === v &&
          r.month_idx === t &&
          !(q.entity === "GROUP" && r.counterparty !== 0),
      );
      for (let region = 0; region < dict.region.length; region++) {
        if (q.region !== undefined && dict.region[region] !== q.region)
          continue;
        const here = atMonth.filter((r) => r.region === region);
        const f = factor(v, t, region, q.cur, q.fx, q.fy);
        const isNr = (r: Row) =>
          accountOf[r.account]!.block_code === "GR" ||
          accountOf[r.account]!.block_code === "GTN";
        const nrRegion = here.filter(isNr).reduce((s, r) => s + r.cents, 0);
        const nrSlice = here
          .filter((r) => isNr(r) && inSlice(r))
          .reduce((s, r) => s + r.cents, 0);
        for (const r of here) {
          const below = accountOf[r.account]!.is_below_cm;
          if (allocate && below)
            out[r.account] =
              (out[r.account] ?? 0) +
              r.cents * f * (nrRegion === 0 ? 0 : nrSlice / nrRegion);
          else if (inSlice(r))
            out[r.account] = (out[r.account] ?? 0) + r.cents * f;
        }
      }
    }
  return out;
}
function statement(q: Q, col: Col): Record<string, number> | null {
  const acc = accounts(q, col);
  if (!acc) return null;
  const block: Record<string, number> = Object.fromEntries(
    BLOCKS.map((b) => [b, 0]),
  );
  acc.forEach((v, i) => {
    block[accountOf[i]!.block_code] =
      (block[accountOf[i]!.block_code] ?? 0) + v;
  });
  return lines(block);
}
const leafSum = (q: Q, col: Col, codes: string[]) => {
  const acc = accounts(q, col);
  return acc
    ? codes.reduce((s, c) => s + acc[dict.account.indexOf(c)]!, 0)
    : null;
};
/** Operational facts of a company within the slice: units and GMV over the column's months, merchants at its last month. */
function opsSum(q: Q, col: Col, extra: Partial<Record<Dim, string>> = {}) {
  if (q.entity === "GROUP") return null;
  const ps = parts(q.base, col, windowMonths(q.tv, q.fy, q.month));
  if (ps.length === 0) return null;
  const last = Math.max(...ps.map(([, t]) => t));
  const e = dict.entity.indexOf(q.entity);
  const want = { ...q, ...extra };
  let units = 0;
  let gmv = 0;
  let merchants = 0;
  for (const r of ops) {
    if (r.entity !== e) continue;
    if (!ps.some(([v, t]) => r.version === v && r.month_idx === t)) continue;
    if (DIMS.some((d) => want[d] !== undefined && dict[d][r[d]] !== want[d]))
      continue;
    units += r.units;
    gmv +=
      r.gmv_cents * factor(r.version, r.month_idx, r.region, q.cur, q.fx, q.fy);
    if (r.month_idx === last) merchants += r.merchants;
  }
  return { units, gmv, merchants };
}
const ratio = (n: number | null | undefined, d: number | null | undefined) =>
  n == null || d == null || d === 0 ? null : n / d;
const line = (q: Q, col: Col, code: string) =>
  statement(q, col)?.[code] ?? null;
const lineNr = (q: Q, col: Col, lineCode: string) =>
  line({ ...q, line: lineCode }, col, "NR");
const lastMonthQ = (q: Q): Q | null => {
  const ps = parts(q.base, "base", windowMonths(q.tv, q.fy, q.month));
  if (!ps.length) return null;
  const t = Math.max(...ps.map(([, x]) => x));
  return {
    ...q,
    fy: months[t]!.fiscal_year,
    month: months[t]!.month_number,
    tv: "MTD",
  };
};
/** Whole fiscal year, latest estimate or Budget (M-14). */
const fyLine = (q: Q, which: "LE" | "B", code: string) =>
  line({ ...q, tv: "FY", month: 12, base: which }, "base", code);

// ---------- metric → formula ----------
const METRICS: Record<string, (q: Q, col: Col) => number | null> = {
  // statement lines and ratio rows: by code
  GM_PCT: (q, c) => ratio(line(q, c, "GP"), line(q, c, "NR")),
  CM_PCT: (q, c) => ratio(line(q, c, "CM"), line(q, c, "NR")),
  EBITDA_PCT: (q, c) => ratio(line(q, c, "EBITDA"), line(q, c, "NR")),
  OP_PCT: (q, c) => ratio(line(q, c, "OP"), line(q, c, "NR")),
  NP_PCT: (q, c) => ratio(line(q, c, "NP"), line(q, c, "NR")),
  ETR_PCT: (q, c) => ratio(-(line(q, c, "TAX") ?? 0), line(q, c, "PBT")),
  OPEX_PCT: (q, c) => {
    const s = statement(q, c);
    return s ? ratio(-(s.SM! + s.RD! + s.GA!), s.NR) : null;
  },
  GTN_PCT: (q, c) => ratio(-(line(q, c, "GTN") ?? 0), line(q, c, "GR")),
  SM_PCT: (q, c) => ratio(-(line(q, c, "SM") ?? 0), line(q, c, "NR")),
  AP_PCT: (q, c) =>
    q.entity === "P"
      ? ratio(-(leafSum(q, c, ["SM_P1", "SM_P2"]) ?? 0), line(q, c, "NR"))
      : null,
  AP_SPEND: (q, c) =>
    q.entity === "P" ? leafSum(q, c, ["SM_P1", "SM_P2"]) : null,
  NR_GROWTH: (q, c) =>
    c === "base"
      ? ratio(
          (line(q, "base", "NR") ?? 0) - (line(q, "PY", "NR") ?? 0),
          Math.abs(line(q, "PY", "NR") ?? 0),
        )
      : null,
  NR_GROWTH_ORGANIC: (q, c) =>
    c === "base"
      ? ratio(
          (line({ ...q, fx: "CC" }, "base", "NR") ?? 0) -
            (line({ ...q, fx: "CC" }, "PY", "NR") ?? 0),
          Math.abs(line({ ...q, fx: "CC" }, "PY", "NR") ?? 0),
        )
      : null,
  UNITS: (q, c) => (q.entity === "P" ? (opsSum(q, c)?.units ?? null) : null),
  NR_PER_UNIT: (q, c) =>
    q.entity === "P" ? ratio(line(q, c, "NR"), opsSum(q, c)?.units) : null,
  GMV: (q, c) => (q.entity === "S" ? (opsSum(q, c)?.gmv ?? null) : null),
  TAKE_RATE: (q, c) =>
    q.entity === "S" && q.line === undefined
      ? ratio(lineNr(q, c, "PAY"), opsSum(q, c, { line: "PAY" })?.gmv)
      : null,
  ACTIVE_MERCHANTS: (q, c) =>
    q.entity === "S" ? (opsSum(q, c)?.merchants ?? null) : null,
  ARR: (q, c) => {
    if (q.entity !== "S" || q.line !== undefined) return null;
    const lm = lastMonthQ(q);
    if (!lm) return null;
    const x = c === "base" ? lineNr(lm, "base", "SUB") : lineNr(lm, c, "SUB");
    return x === null ? null : x * 12;
  },
  SUB_SHARE: (q, c) =>
    q.entity === "S" && q.line === undefined
      ? ratio(lineNr(q, c, "SUB"), line(q, c, "NR"))
      : null,
  PAY_SHARE: (q, c) =>
    q.entity === "S" && q.line === undefined
      ? ratio(lineNr(q, c, "PAY"), line(q, c, "NR"))
      : null,
  FY_NR_LE: (q, c) => (c === "base" ? fyLine(q, "LE", "NR") : null),
  FY_NR_BUDGET: (q, c) => (c === "base" ? fyLine(q, "B", "NR") : null),
  FY_NR_ATTAINMENT: (q, c) =>
    c === "base" ? ratio(fyLine(q, "LE", "NR"), fyLine(q, "B", "NR")) : null,
  FY_EBITDA_ATTAINMENT: (q, c) =>
    c === "base"
      ? ratio(fyLine(q, "LE", "EBITDA"), fyLine(q, "B", "EBITDA"))
      : null,
  FX_EFFECT_NR: (q, c) =>
    c === "base"
      ? (line({ ...q, fx: "ACT" }, "base", "NR") ?? 0) -
        (line({ ...q, fx: "CC" }, "base", "NR") ?? 0)
      : null,
  NR_SHARE: (q, c) => {
    if (q.entity === "GROUP" || !DIMS.some((d) => q[d] !== undefined))
      return null;
    const whole: Q = {
      entity: q.entity,
      fy: q.fy,
      month: q.month,
      tv: q.tv,
      base: q.base,
      cur: q.cur,
      fx: q.fx,
    };
    return ratio(line(q, c, "NR"), line(whole, c, "NR"));
  },
  EBITDA_SHARE: (q, c) => {
    if (q.entity === "GROUP" || !DIMS.some((d) => q[d] !== undefined))
      return null;
    const whole: Q = {
      entity: q.entity,
      fy: q.fy,
      month: q.month,
      tv: q.tv,
      base: q.base,
      cur: q.cur,
      fx: q.fx,
    };
    return ratio(line(q, c, "EBITDA"), line(whole, c, "EBITDA"));
  },
};
const LINE_CODES = [
  "GR",
  "GTN",
  "NR",
  "COR",
  "GP",
  "VSC",
  "CM",
  "SM",
  "RD",
  "GA",
  "OOI",
  "OPEX",
  "EBITDA",
  "DA",
  "UOP",
  "ADJ",
  "OP",
  "INV",
  "PBFIT",
  "FIN",
  "PBT",
  "TAX",
  "NP",
];
for (const code of LINE_CODES) METRICS[code] = (q, c) => line(q, c, code);

// ---------- the questions ----------
// key: metric|entity|fy|month|tv|base|cur|fx|col|filters
const QUESTIONS: [string, string][] = [
  // other currencies, constant currency
  [
    "NR|P|2025|12|FY|A|EUR|ACT|base|",
    "What was Consumer Products' net revenue in 2025 in euros?",
  ],
  [
    "EBITDA|S|2026|9|YTD|A|GBP|ACT|base|",
    "Commerce Cloud adjusted EBITDA year to date September 2026 in pounds?",
  ],
  [
    "NR|P|2026|9|YTD|A|USD|CC|base|",
    "Consumer Products net revenue YTD September 2026 at constant currency?",
  ],
  [
    "FX_EFFECT_NR|P|2026|9|YTD|A|USD|ACT|base|",
    "How much of Consumer Products' year-to-date revenue is FX effect?",
  ],
  [
    "NR_GROWTH_ORGANIC|P|2026|9|YTD|A|USD|ACT|base|",
    "What is Consumer Products' organic revenue growth year to date?",
  ],
  [
    "NR_GROWTH|S|2026|9|YTD|A|USD|ACT|base|",
    "How fast is Commerce Cloud revenue growing year on year, YTD September 2026?",
  ],
  // windows
  [
    "NR|S|2026|9|MTD|A|USD|ACT|base|",
    "Commerce Cloud net revenue in September 2026?",
  ],
  [
    "OP|P|2026|9|QTD|A|USD|ACT|base|",
    "Consumer Products operating profit in Q3 2026?",
  ],
  [
    "NR|P|2026|9|LTM|A|USD|ACT|base|",
    "Consumer Products net revenue over the last twelve months to September 2026?",
  ],
  [
    "NR|P|2025|6|LTM|A|USD|ACT|base|",
    "Consumer Products trailing twelve-month net revenue to June 2025?",
  ],
  [
    "EBITDA|S|2026|3|QTD|A|USD|ACT|base|",
    "Commerce Cloud adjusted EBITDA in Q1 2026?",
  ],
  // comparators
  [
    "NR|P|2026|9|YTD|A|USD|ACT|B|",
    "What was Consumer Products' budgeted net revenue for January to September 2026?",
  ],
  [
    "NR|P|2026|9|YTD|A|USD|ACT|PY|",
    "Consumer Products net revenue in the same period of 2025 (January to September)?",
  ],
  [
    "EBITDA|S|2026|9|YTD|A|USD|ACT|PY|",
    "What was Commerce Cloud's adjusted EBITDA for January to September 2025?",
  ],
  [
    "NR|P|2026|12|FY|LE|USD|ACT|base|",
    "What is the latest estimate of Consumer Products' full-year 2026 net revenue?",
  ],
  [
    "NP|S|2026|12|FY|B|USD|ACT|base|",
    "Commerce Cloud's budgeted net profit for full year 2026?",
  ],
  ["NR|P|2024|12|FY|A|USD|ACT|PY|", "Consumer Products net revenue in 2023?"], // trap: before the history → n/a
  // slices: region (booked), channel / line / segment (allocation below CM)
  [
    "NR|P|2025|12|FY|A|USD|ACT|base|region=EU",
    "Consumer Products net revenue in Continental Europe in 2025?",
  ],
  [
    "EBITDA|P|2026|9|YTD|A|USD|ACT|base|region=NA",
    "Consumer Products adjusted EBITDA in North America, YTD September 2026?",
  ],
  [
    "GP|P|2026|9|YTD|A|USD|ACT|base|channel=D2C",
    "Gross profit of Consumer Products' own D2C webstore, year to date September 2026?",
  ],
  [
    "EBITDA|P|2026|9|YTD|A|USD|ACT|base|channel=GRO",
    "Adjusted EBITDA of the grocery and mass retail channel, YTD September 2026?",
  ],
  [
    "OP|P|2025|12|FY|A|USD|ACT|base|line=HOME",
    "Operating profit of Consumer Products' home care category in 2025?",
  ],
  [
    "CM|S|2026|9|YTD|A|USD|ACT|base|segment=ENT",
    "Commerce Cloud contribution margin from enterprise customers, YTD September 2026?",
  ],
  [
    "NR|S|2026|9|YTD|A|USD|ACT|base|line=SUB",
    "Commerce Cloud platform subscription revenue year to date September 2026?",
  ],
  [
    "NR|S|2026|9|YTD|A|EUR|ACT|base|region=UK",
    "Commerce Cloud net revenue in UK & Ireland year to date, in euros?",
  ],
  [
    "NR|P|2026|9|YTD|A|USD|ACT|B|region=AP",
    "Consumer Products' budgeted net revenue for Asia-Pacific, January to September 2026?",
  ],
  [
    "NP|P|2026|9|YTD|A|USD|ACT|base|segment=PREM",
    "Net profit of Consumer Products' premium segment, YTD September 2026?",
  ],
  // ratios
  [
    "GM_PCT|P|2025|12|FY|A|USD|ACT|base|",
    "What was Consumer Products' gross margin in 2025?",
  ],
  [
    "EBITDA_PCT|S|2026|9|YTD|A|USD|ACT|base|",
    "Commerce Cloud adjusted EBITDA margin year to date September 2026?",
  ],
  [
    "OPEX_PCT|P|2026|9|YTD|A|USD|ACT|base|",
    "Consumer Products opex as a percentage of revenue, YTD September 2026?",
  ],
  [
    "GTN_PCT|P|2026|9|YTD|A|USD|ACT|base|",
    "What is Consumer Products' gross-to-net percentage year to date?",
  ],
  [
    "AP_PCT|P|2026|9|YTD|A|USD|ACT|base|",
    "Consumer Products A&P as a share of net revenue, year to date September 2026?",
  ],
  [
    "ETR_PCT|S|2025|12|FY|A|USD|ACT|base|",
    "What was Commerce Cloud's effective tax rate in 2025?",
  ],
  [
    "SM_PCT|S|2026|9|YTD|A|USD|ACT|base|",
    "Commerce Cloud sales and marketing as a percentage of revenue, YTD September 2026?",
  ],
  [
    "GM_PCT|P|2026|9|YTD|A|USD|ACT|base|region=EU",
    "Consumer Products gross margin in Continental Europe, YTD September 2026?",
  ],
  // drivers
  [
    "UNITS|P|2025|12|FY|A|USD|ACT|base|",
    "How many units did Consumer Products sell in 2025?",
  ],
  [
    "NR_PER_UNIT|P|2026|9|YTD|A|USD|ACT|base|",
    "Consumer Products net revenue per unit, year to date September 2026?",
  ],
  [
    "UNITS|P|2026|9|YTD|A|USD|ACT|base|region=NA",
    "Units sold by Consumer Products in North America, YTD September 2026?",
  ],
  [
    "GMV|S|2026|9|YTD|A|USD|ACT|base|",
    "GMV processed by Commerce Cloud year to date September 2026?",
  ],
  [
    "TAKE_RATE|S|2026|9|YTD|A|USD|ACT|base|",
    "What is Commerce Cloud's payments take rate year to date?",
  ],
  [
    "ACTIVE_MERCHANTS|S|2026|9|YTD|A|USD|ACT|base|",
    "How many active merchants did Commerce Cloud have at the end of September 2026?",
  ],
  [
    "ACTIVE_MERCHANTS|S|2025|12|FY|A|USD|ACT|base|",
    "How many active merchants did Commerce Cloud have at the end of 2025?",
  ],
  [
    "ARR|S|2026|9|YTD|A|USD|ACT|base|",
    "What is Commerce Cloud's ARR run-rate as of September 2026?",
  ],
  [
    "SUB_SHARE|S|2026|9|YTD|A|USD|ACT|base|",
    "What share of Commerce Cloud revenue comes from platform subscriptions, YTD September 2026?",
  ],
  [
    "AP_SPEND|P|2026|9|YTD|A|USD|ACT|base|",
    "How much did Consumer Products spend on advertising and promotion year to date?",
  ],
  ["GMV|P|2026|9|YTD|A|USD|ACT|base|", "GMV processed by Consumer Products?"], // trap: a Commerce Cloud driver → n/a
  [
    "UNITS|S|2026|9|YTD|A|USD|ACT|base|",
    "How many units did Commerce Cloud sell?",
  ], // trap → n/a
  // outlook
  [
    "FY_NR_LE|P|2026|9|YTD|A|USD|ACT|base|",
    "What is the full-year 2026 revenue outlook for Consumer Products?",
  ],
  [
    "FY_NR_ATTAINMENT|S|2026|9|YTD|A|USD|ACT|base|",
    "Commerce Cloud full-year revenue attainment vs budget?",
  ],
  [
    "FY_EBITDA_ATTAINMENT|P|2026|9|YTD|A|USD|ACT|base|",
    "Will Consumer Products reach its 2026 EBITDA budget: what is the attainment?",
  ],
  // the Group
  [
    "NR|GROUP|2025|12|FY|A|USD|ACT|base|",
    "What was the Group's consolidated net revenue in 2025?",
  ],
  [
    "EBITDA|GROUP|2026|9|YTD|A|USD|ACT|base|",
    "Group adjusted EBITDA year to date September 2026?",
  ],
  [
    "OP|GROUP|2026|9|YTD|A|USD|ACT|B|",
    "The Group's budgeted operating profit for January to September 2026?",
  ],
  // shares
  [
    "NR_SHARE|P|2025|12|FY|A|USD|ACT|base|region=NA",
    "What share of Consumer Products' 2025 revenue came from North America?",
  ],
  [
    "EBITDA_SHARE|S|2026|9|YTD|A|USD|ACT|base|segment=SMB",
    "What share of Commerce Cloud's EBITDA comes from small business customers, YTD September 2026?",
  ],
  [
    "NR_SHARE|P|2026|9|YTD|A|USD|ACT|base|",
    "Consumer Products' share of net revenue?",
  ], // trap: no slice → n/a
];

function parse(key: string): { metric: string; q: Q; col: Col } {
  const [
    metric = "",
    entity = "",
    fy = "",
    month = "",
    tv = "",
    base = "",
    cur = "",
    fx = "",
    col = "",
    filters = "",
  ] = key.split("|");
  const q: Q = {
    entity: entity as Q["entity"],
    fy: Number(fy),
    month: Number(month),
    tv: tv as TimeView,
    base: base as Base,
    cur,
    fx: fx as Basis,
  };
  for (const kv of filters.split(";").filter(Boolean)) {
    const [k, v] = kv.split("=") as [Dim, string];
    q[k] = v;
  }
  return { metric, q, col: col as Col };
}

const out = ["key,expected,question"];
for (const [key, question] of QUESTIONS) {
  const { metric, q, col } = parse(key);
  const f = METRICS[metric];
  if (!f) throw new Error(`no formula for ${metric}`);
  const v = f(q, col);
  out.push(
    `${key},${v === null ? "" : String(v)},${question.includes(",") ? `"${question}"` : question}`,
  );
  console.log(`${key} → ${v === null ? "n/a" : v}`);
}
await writeFile(fileURLToPath(OUT), `${out.join("\n")}\n`);
console.log(`${QUESTIONS.length} rows → ${fileURLToPath(OUT)}`);
