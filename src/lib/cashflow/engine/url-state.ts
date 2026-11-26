import { z } from "zod";
import { SECTIONS, type Section } from "../data/manifest";
import {
  QUICK_MODE,
  dataYears,
  hasMonth,
  lastIx,
  period,
  quickPeriod,
  ym,
  type Mode,
  type Period,
  type Quick,
} from "./calendar";
import type { Dataset } from "./data";
import { isoOfDay } from "./format";
import type { Entry } from "./nav";
import type { Unit } from "./format";

// URL state (handoff 03 § 8, CF-URL-01 … CF-URL-06): the query string is the whole shareable state. Every key is
// validated here before anything reaches the engine or the DOM; an invalid value falls back to its default, an unknown
// key is dropped, a key that needs another is dropped without it. The page rewrites the URL with replaceState only.

export const URL_KEYS = [
  "p",
  "u",
  "v",
  "a",
  "l",
  "d",
  "c",
  "s",
  "pop",
  "g",
] as const;

export type HeatSort = "name" | "name-desc" | "total" | "total-asc";
export const HEAT_SORTS: readonly HeatSort[] = [
  "name",
  "name-desc",
  "total",
  "total-asc",
];
export type UrlPop = "cash" | "diagram" | "rec" | "how";
export const URL_POPS: readonly UrlPop[] = ["cash", "diagram", "rec", "how"];
export type Group = "quality" | "wc" | "fcf" | "lev";
export const GROUPS: readonly Group[] = ["quality", "wc", "fcf", "lev"];

export interface Selection {
  mode: Mode;
  y: number;
  m: number;
  quick: Quick | null;
}

export interface UrlState {
  sel: Selection;
  unit: Unit;
  /** the top of the canonical stack */
  entry: Entry;
  /** collapsed sections */
  collapsed: Section[];
  sort: HeatSort | null;
  pop: UrlPop | null;
  groups: Group[];
}

/** The landing selection: the last data month. */
export function defaultSelection(ds: Dataset): Selection {
  const [y, m] = ym(ds, lastIx(ds));
  return { mode: "M", y, m, quick: null };
}

export const selectionPeriod = (ds: Dataset, s: Selection): Period =>
  s.quick ? quickPeriod(ds, s.quick) : period(ds, s.mode, s.y, s.m);

/** Year → mode A at the year's last data month; quarter n → mode Q at its last data month (the calendar's `pick`). */
export function yearSelection(ds: Dataset, y: number): Selection {
  const [ly, lm] = ym(ds, lastIx(ds));
  return { mode: "A", y, m: y === ly ? lm : 12, quick: null };
}
export function quarterSelection(ds: Dataset, y: number, q: number): Selection {
  const [ly, lm] = ym(ds, lastIx(ds));
  return {
    mode: "Q",
    y,
    m: y === ly ? Math.min(q * 3, lm) : q * 3,
    quick: null,
  };
}
export function quickSelection(ds: Dataset, q: Quick): Selection {
  const [y, m] = ym(ds, lastIx(ds));
  return { mode: QUICK_MODE[q], y, m, quick: q };
}

const raw = z
  .object(Object.fromEntries(URL_KEYS.map((k) => [k, z.string().optional()])))
  .strip();

function parsePeriod(ds: Dataset, p: string | undefined): Selection {
  const def = defaultSelection(ds);
  if (!p) return def;
  if (p === "ytd" || p === "qtd" || p === "mtd")
    return quickSelection(ds, p.toUpperCase() as Quick);
  let x = /^m-(\d{4})-(\d{2})$/.exec(p);
  if (x) {
    const y = +x[1]!;
    const m = +x[2]!;
    return m >= 1 && m <= 12 && hasMonth(ds, y, m)
      ? { mode: "M", y, m, quick: null }
      : def;
  }
  x = /^q-(\d{4})-([1-4])$/.exec(p);
  if (x) {
    const y = +x[1]!;
    const q = +x[2]!;
    return hasMonth(ds, y, q * 3 - 2) ? quarterSelection(ds, y, q) : def;
  }
  x = /^y-(\d{4})$/.exec(p);
  if (x)
    return dataYears(ds).includes(+x[1]!) ? yearSelection(ds, +x[1]!) : def;
  return def;
}

const list = <T extends string>(
  v: string | undefined,
  allowed: readonly T[],
): T[] => {
  if (!v) return [];
  const set = new Set(v.split(","));
  return allowed.filter((a) => set.has(a));
};

/** Parses a query string (with or without `?`) into a valid state. */
export function parseUrlState(ds: Dataset, search: string): UrlState {
  const q = raw.parse(
    Object.fromEntries(new URLSearchParams(search)),
  ) as Partial<Record<(typeof URL_KEYS)[number], string>>;
  const sel = parsePeriod(ds, q.p);
  const p = selectionPeriod(ds, sel);
  const sec: Section = q.a === "inv" ? "INV" : q.a === "fin" ? "FIN" : "OP";
  let entry: Entry = { view: "stmt" };
  if (q.v === "activities") entry = { view: "heat", sec };
  else if (q.v === "transactions") {
    const code = q.l?.toUpperCase();
    const l = code ? ds.lineByCode.get(code) : undefined;
    const line = l && l.section === sec ? l.i : null;
    let day: number | null = null;
    if (line !== null && q.d && /^\d{4}-\d{2}-\d{2}$/.test(q.d)) {
      const t = Date.UTC(
        +q.d.slice(0, 4),
        +q.d.slice(5, 7) - 1,
        +q.d.slice(8, 10),
      );
      const d = (t - ds.day0) / 86_400_000;
      if (
        Number.isInteger(d) &&
        d >= p.d0 &&
        d <= p.d1 &&
        isoOfDay(ds, d) === q.d
      )
        day = d;
    }
    entry = { view: "ledger", sec, line, day };
  }
  return {
    sel,
    unit: q.u === "k" ? "USDk" : "USD",
    entry,
    collapsed: list(q.c, ["op", "inv", "fin"] as const).map(
      (s) => s.toUpperCase() as Section,
    ),
    sort: HEAT_SORTS.includes(q.s as HeatSort) ? (q.s as HeatSort) : null,
    pop: URL_POPS.includes(q.pop as UrlPop) ? (q.pop as UrlPop) : null,
    groups: list(q.g, GROUPS),
  };
}

function periodParam(ds: Dataset, s: Selection): string | null {
  const def = defaultSelection(ds);
  if (s.quick) return s.quick.toLowerCase();
  if (s.mode === "M")
    return s.y === def.y && s.m === def.m
      ? null
      : `m-${s.y}-${String(s.m).padStart(2, "0")}`;
  if (s.mode === "Q") return `q-${s.y}-${Math.ceil(s.m / 3)}`;
  if (s.mode === "A") return `y-${s.y}`;
  return null; // YTD at another month is not reachable from the page
}

/** The canonical query string (no `?`): fixed key order, defaults omitted. */
export function serializeUrlState(ds: Dataset, st: UrlState): string {
  const out: [string, string][] = [];
  const add = (k: string, v: string | null) => {
    if (v) out.push([k, v]);
  };
  add("p", periodParam(ds, st.sel));
  add("u", st.unit === "USDk" ? "k" : null);
  const e = st.entry;
  if (e.view !== "stmt") {
    add("v", e.view === "heat" ? "activities" : "transactions");
    add("a", e.sec === "OP" ? null : e.sec.toLowerCase());
    if (e.view === "ledger" && e.line !== null) {
      add("l", ds.lines[e.line]!.code.toLowerCase());
      if (e.day !== null) add("d", isoOfDay(ds, e.day));
    }
  }
  add(
    "c",
    SECTIONS.filter((s) => st.collapsed.includes(s))
      .map((s) => s.toLowerCase())
      .join(",") || null,
  );
  add("s", st.sort);
  add("pop", st.pop);
  add("g", GROUPS.filter((g) => st.groups.includes(g)).join(",") || null);
  return out.map(([k, v]) => `${k}=${v}`).join("&");
}
