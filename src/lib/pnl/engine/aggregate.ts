import type { Dataset } from "../data/dataset";
import type { Manifest } from "../data/manifest";
import { translationFactor } from "./fx";
import type { Fx, FxBasis } from "./fx";
import type {
  ColumnPlan,
  Currency,
  EntityCode,
  ReportingCurrency,
  Selection,
} from "./types";

export interface Translation {
  fx: Fx;
  currency: ReportingCurrency;
  basis: FxBasis;
  fy: number; // selected fiscal year (C-12)
}

/** Slice filters as dictionary indexes; null = every value (F-33: an empty selection means all). */
export interface SliceFilter {
  region: ReadonlySet<number> | null;
  channel: ReadonlySet<number> | null;
  line: ReadonlySet<number> | null;
  segment: ReadonlySet<number> | null;
}

export type SliceSelection = Pick<
  Selection,
  "region" | "channel" | "line" | "segment"
>;

export function sliceFilter(m: Manifest, sel: SliceSelection): SliceFilter {
  const pick = (codes: readonly string[], dict: readonly string[]) =>
    codes.length === 0 ? null : new Set(codes.map((c) => dict.indexOf(c)));
  return {
    region: pick(sel.region, m.dict.region),
    channel: pick(sel.channel, m.dict.channel),
    line: pick(sel.line, m.dict.line),
    segment: pick(sel.segment, m.dict.segment),
  };
}

export type SliceDimension = keyof SliceFilter;

/** The filter narrowed to one value of one dimension; an excluded value leaves an empty set (nothing passes). */
export function narrow(
  f: SliceFilter,
  dim: SliceDimension,
  index: number,
): SliceFilter {
  const current = f[dim];
  return {
    ...f,
    [dim]:
      current === null || current.has(index)
        ? new Set([index])
        : new Set<number>(),
  };
}

/** C-31 applies when a slice the below-CM lines are not booked to is filtered (they carry region, nothing else). */
export const allocates = (f: SliceFilter) =>
  f.channel !== null || f.line !== null || f.segment !== null;

/** Per account, in reporting-currency units: `all` every row, `ic` only the rows with a counterparty (C-35). */
export interface Accounts {
  all: Float64Array;
  ic: Float64Array;
}

/** Accounts × months for one entity and version (index = month × accounts + account). */
interface Matrix {
  all: Float64Array;
  ic: Float64Array;
}

const CACHE_LIMIT = 256;

/**
 * The one scan (ADR-0002 §2.3), cached as an accounts × months matrix per entity, version, slice filter and
 * translation, so every column, window and later view (key figures, bridge, profitability) is a sum over months of
 * a matrix already built. Each row is translated at its own month × currency rate before summing (D-30).
 *
 * Slices (C-30, C-31): rows above contribution margin are booked to every slice and are kept or dropped by the
 * filter. Rows from operating expenses down carry the region only; with a channel, category or segment filter on
 * they are allocated by net revenue share within the same entity, region, month and version:
 * allocated = line × NR(filter) ÷ NR(all). Region filters both kinds directly.
 */
export function createAggregator(ds: Dataset) {
  const m = ds.manifest;
  const { dict, tables } = m;
  const nMonths = tables.dim_month.length;
  const nRegions = dict.region.length;
  const nAccounts = dict.account.length;
  const budgetKey = tables.dim_version.find(
    (v) => v.version_code === "Budget",
  )?.version_key;
  const regionCcy: Currency[] = dict.region.map((code) => {
    const r = tables.dim_region.find((d) => d.region_code === code);
    if (!r)
      throw new Error(`aggregate: region ${code} missing from dim_region`);
    return r.functional_currency;
  });
  const account = (code: string) => {
    const a = tables.dim_account.find((d) => d.account_code === code);
    if (!a) throw new Error(`aggregate: account ${code} not in dim_account`);
    return a;
  };
  const belowCm = Uint8Array.from(dict.account, (c) =>
    account(c).is_below_cm ? 1 : 0,
  );
  // Net revenue = the blocks in the NR formula (D-32), the allocation key of C-31.
  const nrFormula = tables.dim_report_line.find(
    (l) => l.line_code === "NR",
  )?.formula;
  if (!nrFormula) throw new Error("aggregate: no NR line in dim_report_line");
  const nrBlocks = new Set(nrFormula.split("+").map((s) => s.trim()));
  const isNr = Uint8Array.from(dict.account, (c) =>
    nrBlocks.has(account(c).block_code) ? 1 : 0,
  );

  // Rows are sorted by version (ADR-0002 §2.2): scan only that version's span when it is contiguous.
  const spans = new Map<string, [number, number]>();
  const span = (e: EntityCode, v: number): [number, number] => {
    const key = `${e}|${v}`;
    let s = spans.get(key);
    if (!s) {
      const pl = ds.pl.get(e);
      if (!pl) throw new Error(`aggregate: entity ${e} not loaded`);
      let lo = -1;
      let hi = -1;
      let count = 0;
      for (let i = 0; i < pl.n; i++)
        if (pl.version[i] === v) {
          if (lo < 0) lo = i;
          hi = i + 1;
          count++;
        }
      s = lo < 0 ? [0, 0] : count === hi - lo ? [lo, hi] : [0, pl.n];
      spans.set(key, s);
    }
    return s;
  };

  const ccMonth = (t: number, fy: number) => {
    const monthNumber = tables.dim_month[t]?.month_number;
    const cc = tables.dim_month.find(
      (d) => d.fiscal_year === fy && d.month_number === monthNumber,
    );
    if (!cc)
      throw new Error(`aggregate: no FY${fy} month for constant currency`);
    return cc.month_index;
  };

  // local cents → reporting units, per month × region, for one version and translation
  const factors = new Map<string, Float64Array>();
  const factorTable = (versionKey: string, tr: Translation): Float64Array => {
    const key = `${versionKey}|${tr.currency}|${tr.basis}|${tr.basis === "CC" ? tr.fy : ""}`;
    let table = factors.get(key);
    if (!table) {
      const isBudget = versionKey === budgetKey;
      table = new Float64Array(nMonths * nRegions);
      for (let t = 0; t < nMonths; t++)
        regionCcy.forEach((ccy, r) => {
          (table as Float64Array)[t * nRegions + r] =
            translationFactor(
              tr.fx,
              ccy,
              tr.currency,
              t,
              isBudget,
              tr.basis,
              tr.basis === "CC" ? ccMonth(t, tr.fy) : t,
            ) / 100;
        });
      factors.set(key, table);
    }
    return table;
  };

  const cache = new Map<string, Matrix>();
  const filterKey = (f: SliceFilter) =>
    [f.region, f.channel, f.line, f.segment]
      .map((s) => (s === null ? "*" : [...s].sort((a, b) => a - b).join(".")))
      .join("|");

  function matrix(
    e: EntityCode,
    versionKey: string,
    f: SliceFilter,
    tr: Translation,
  ): Matrix {
    const key = `${e}|${versionKey}|${filterKey(f)}|${tr.currency}|${tr.basis}|${tr.basis === "CC" ? tr.fy : ""}`;
    const hit = cache.get(key);
    if (hit) {
      cache.delete(key); // refresh its place: the cache evicts the least recently used
      cache.set(key, hit);
      return hit;
    }
    const pl = ds.pl.get(e);
    if (!pl) throw new Error(`aggregate: entity ${e} not loaded`);
    const v = dict.version.indexOf(versionKey);
    if (v < 0)
      throw new Error(
        `aggregate: version ${versionKey} is not in the built data`,
      );
    const [lo, hi] = span(e, v);
    const {
      monthIdx,
      version,
      region,
      channel,
      line,
      segment,
      account: acc,
    } = pl;
    const { counterparty, cents } = pl;

    const factor = factorTable(versionKey, tr);

    const inRegion = (i: number) =>
      f.region === null || f.region.has(region[i] ?? -1);
    const inSlices = (i: number) =>
      (f.channel === null || f.channel.has(channel[i] ?? -1)) &&
      (f.line === null || f.line.has(line[i] ?? -1)) &&
      (f.segment === null || f.segment.has(segment[i] ?? -1));

    // C-31 shares per month × region, in local cents (one currency per region, so the ratio needs no rates)
    const share = new Float64Array(nMonths * nRegions).fill(1);
    if (allocates(f)) {
      const nrAll = new Float64Array(nMonths * nRegions);
      const nrSel = new Float64Array(nMonths * nRegions);
      for (let i = lo; i < hi; i++) {
        if (version[i] !== v || !isNr[acc[i] ?? 0]) continue;
        const k = (monthIdx[i] ?? 0) * nRegions + (region[i] ?? 0);
        nrAll[k] = (nrAll[k] ?? 0) + (cents[i] ?? 0);
        if (inSlices(i)) nrSel[k] = (nrSel[k] ?? 0) + (cents[i] ?? 0);
      }
      for (let k = 0; k < share.length; k++)
        share[k] = nrAll[k] ? (nrSel[k] ?? 0) / (nrAll[k] ?? 1) : 0;
    }

    const all = new Float64Array(nMonths * nAccounts);
    const ic = new Float64Array(nMonths * nAccounts);
    for (let i = lo; i < hi; i++) {
      if (version[i] !== v || !inRegion(i)) continue;
      const a = acc[i] ?? 0;
      const below = belowCm[a] === 1;
      if (!below && !inSlices(i)) continue;
      const t = monthIdx[i] ?? 0;
      const k = t * nRegions + (region[i] ?? 0);
      const value =
        (cents[i] ?? 0) * (factor[k] ?? 0) * (below ? (share[k] ?? 0) : 1);
      const cell = t * nAccounts + a;
      all[cell] = (all[cell] ?? 0) + value;
      if (counterparty[i] !== 0) ic[cell] = (ic[cell] ?? 0) + value;
    }

    const out = { all, ic };
    cache.set(key, out);
    if (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    return out;
  }

  const nCh = dict.channel.length;
  const nLn = dict.line.length;
  const nSg = dict.segment.length;
  /** One lowest slice k = region × channel × category × segment (C-40). */
  const sliceKey = (r: number, c: number, l: number, g: number) =>
    ((r * nCh + c) * nLn + l) * nSg + g;
  const keep = (f: SliceFilter, r: number, c: number, l: number, g: number) =>
    (f.region === null || f.region.has(r)) &&
    (f.channel === null || f.channel.has(c)) &&
    (f.line === null || f.line.has(l)) &&
    (f.segment === null || f.segment.has(g));
  /** The plan's months per version index, so a scan can test a row in O(1). */
  const planMonths = (plan: ColumnPlan) => {
    const out = new Map<number, Set<number>>();
    for (const p of plan.parts) {
      const v = dict.version.indexOf(p.version);
      if (v < 0)
        throw new Error(
          `aggregate: version ${p.version} is not in the built data`,
        );
      const months = out.get(v) ?? new Set<number>();
      p.months.forEach((t) => months.add(t));
      out.set(v, months);
    }
    return out;
  };

  return {
    sliceKey,

    /**
     * Net revenue per lowest slice for one entity (C-40): the bridge's price / volume split works slice by slice.
     * Net revenue is booked to every slice, so nothing here is allocated.
     */
    nrBySlice(
      e: EntityCode,
      plan: ColumnPlan,
      f: SliceFilter,
      tr: Translation,
    ): Map<number, number> {
      const pl = ds.pl.get(e);
      if (!pl) throw new Error(`aggregate: entity ${e} not loaded`);
      const out = new Map<number, number>();
      for (const [v, months] of planMonths(plan)) {
        const factor = factorTable(dict.version[v] ?? "", tr);
        const [lo, hi] = span(e, v);
        for (let i = lo; i < hi; i++) {
          const t = pl.monthIdx[i] ?? 0;
          if (
            pl.version[i] !== v ||
            !months.has(t) ||
            !isNr[pl.account[i] ?? 0]
          )
            continue;
          const r = pl.region[i] ?? 0;
          const c = pl.channel[i] ?? 0;
          const l = pl.line[i] ?? 0;
          const g = pl.segment[i] ?? 0;
          if (!keep(f, r, c, l, g)) continue;
          const k = sliceKey(r, c, l, g);
          out.set(
            k,
            (out.get(k) ?? 0) +
              (pl.cents[i] ?? 0) * (factor[t * nRegions + r] ?? 0),
          );
        }
      }
      return out;
    },

    /**
     * Operational facts for one entity over a plan (D-03): units sold and GMV processed are sums (GMV translated
     * like any amount, D-30); active merchants is a period-end count, read at the plan's last month (K-23).
     */
    operational(
      e: EntityCode,
      plan: ColumnPlan,
      f: SliceFilter,
      tr: Translation,
    ): {
      units: number;
      gmv: number;
      merchants: number;
      unitsBySlice: Map<number, number>;
    } {
      const ops = ds.ops;
      const entity = dict.entity.indexOf(e);
      const versions = planMonths(plan);
      const last = Math.max(-1, ...plan.parts.flatMap((p) => p.months));
      let units = 0;
      let gmv = 0;
      let merchants = 0;
      const unitsBySlice = new Map<number, number>();
      for (let i = 0; i < ops.n; i++) {
        const v = ops.version[i] ?? 0;
        const t = ops.monthIdx[i] ?? 0;
        if (ops.entity[i] !== entity || !versions.get(v)?.has(t)) continue;
        const r = ops.region[i] ?? 0;
        const c = ops.channel[i] ?? 0;
        const l = ops.line[i] ?? 0;
        const g = ops.segment[i] ?? 0;
        if (!keep(f, r, c, l, g)) continue;
        const u = ops.units[i] ?? 0;
        units += u;
        if (u !== 0) {
          const k = sliceKey(r, c, l, g);
          unitsBySlice.set(k, (unitsBySlice.get(k) ?? 0) + u);
        }
        const cents = ops.gmvCents[i] ?? 0;
        if (cents !== 0)
          gmv +=
            cents *
            (factorTable(dict.version[v] ?? "", tr)[t * nRegions + r] ?? 0);
        if (t === last) merchants += ops.merchants[i] ?? 0;
      }
      return { units, gmv, merchants, unitsBySlice };
    },

    /** Σ per account over the plan's versions and months, one entity (D-31). */
    accounts(
      e: EntityCode,
      plan: ColumnPlan,
      f: SliceFilter,
      tr: Translation,
    ): Accounts {
      const all = new Float64Array(nAccounts);
      const ic = new Float64Array(nAccounts);
      for (const p of plan.parts) {
        const mx = matrix(e, p.version, f, tr);
        for (const t of p.months) {
          const base = t * nAccounts;
          for (let a = 0; a < nAccounts; a++) {
            all[a] = (all[a] ?? 0) + (mx.all[base + a] ?? 0);
            ic[a] = (ic[a] ?? 0) + (mx.ic[base + a] ?? 0);
          }
        }
      }
      return { all, ic };
    },
  };
}

export type Aggregator = ReturnType<typeof createAggregator>;
