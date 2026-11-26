import { MON } from "./calendar";
import type { Dataset } from "./data";

// Formats (handoff 02 § 3.6, CF-ENG-20 … CF-ENG-23; mock `money()`, `fx`, `dd`, `pct`, `compact`). Money arrives in
// cents; rounding happens here only. `en-US` is passed explicitly (CF-ARC-02). The unit is an argument (CF-ARC-04).

export type Unit = "USD" | "USDk";

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nf2 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const MINUS = "−";

export interface MoneyOpts {
  /** 2 decimals in USD whatever the unit */
  exact?: boolean;
  /** `k` after the value in USD k */
  suffix?: boolean;
}

/** Money from cents: thousands separators, no symbol, negatives in parentheses, zero and null as an en dash. */
export function money(
  cents: number | null,
  unit: Unit,
  opt: MoneyOpts = {},
): string {
  if (cents === null || Number.isNaN(cents)) return "–";
  const v = cents / 100;
  const k = unit === "USDk" && !opt.exact;
  const x = Math.abs(k ? v / 1000 : v);
  const s = opt.exact ? nf2.format(x) : k ? nf1.format(x) : nf0.format(x);
  if (s === "0" || s === "0.0" || s === "0.00") return "–";
  const t = s + (k && opt.suffix ? "k" : "");
  return v < 0 ? `(${t})` : t;
}

/** `1.04×`; negatives with U+2212; null → n/m */
export const ratio = (v: number | null) =>
  v === null ? "n/m" : `${v < 0 ? MINUS : ""}${Math.abs(v).toFixed(2)}×`;

/** days: `46.4` (card) or `46.4 d` (Diagram) */
export const days = (v: number | null, unit = false) =>
  v === null
    ? "n/m"
    : `${v < 0 ? MINUS : ""}${nf1.format(Math.abs(v))}${unit ? " d" : ""}`;

/** a share as `15.9%` (1 decimal); negatives with U+2212 */
export const percent = (v: number | null) =>
  v === null ? "n/m" : `${v < 0 ? MINUS : ""}${nf1.format(Math.abs(v * 100))}%`;

/** legend tooltips: under 1,000 → 0 decimals; under 100,000 → `12.6k`; else `126k` (USD in, not cents) */
export const compact = (v: number) =>
  v < 1000
    ? nf0.format(v)
    : `${v < 100_000 ? nf1.format(v / 1000) : nf0.format(v / 1000)}k`;

/** % of net income on a statement row (CF-ENG-09): n/m unless net income is positive; never `(0.0%)`. */
export function pctOfNi(val: number, ni: number): string {
  if (!(ni > 0)) return "n/m";
  const x = (val / ni) * 100;
  const ax = Math.abs(x);
  const t = `${ax < 10 ? nf1.format(ax) : nf0.format(ax)}%`;
  return x < 0 && t !== "0.0%" ? `(${t})` : t;
}

export const fmtInt = (n: number) => nf0.format(n);
export const fmt1 = (n: number) => nf1.format(n);

// ---------- dates (UTC only) ----------

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dateOf = (ds: Dataset, d: number) => new Date(ds.day0 + d * 86_400_000);

/** `5 Oct` */
export function fmtDay(ds: Dataset, d: number) {
  const t = dateOf(ds, d);
  return `${t.getUTCDate()} ${MON[t.getUTCMonth()]}`;
}
/** ledger `5 Oct 26` */
export function fmtDayLedger(ds: Dataset, d: number) {
  return `${fmtDay(ds, d)} ${String(dateOf(ds, d).getUTCFullYear() % 100).padStart(2, "0")}`;
}
/** `Mon 5 Oct 2026` */
export function fmtDayLong(ds: Dataset, d: number) {
  const t = dateOf(ds, d);
  return `${WD[t.getUTCDay()]} ${t.getUTCDate()} ${MON[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}
/** context line `1 Oct – 31 Oct 2026` */
export function fmtRange(ds: Dataset, d0: number, d1: number) {
  return `${fmtDay(ds, d0)} – ${fmtDay(ds, d1)} ${dateOf(ds, d1).getUTCFullYear()}`;
}
/** as-of `5 Nov 2026` from an ISO date */
export function fmtIsoDate(iso: string) {
  return `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
}
/** `2026-10-15` of a day index */
export const isoOfDay = (ds: Dataset, d: number) =>
  dateOf(ds, d).toISOString().slice(0, 10);
/** day of month / month / year of a day index */
export function partsOfDay(ds: Dataset, d: number) {
  const t = dateOf(ds, d);
  return {
    dom: t.getUTCDate(),
    month: t.getUTCMonth(),
    year: t.getUTCFullYear(),
  };
}

/** `BillPayment` → `Bill Payment` */
export const txnType = (t: string) => t.replace(/([a-z])([A-Z])/g, "$1 $2");
