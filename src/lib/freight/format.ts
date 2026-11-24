import { dayToIso } from "./data";
import type { Period } from "./engine";

// Number and date formats of the freight sales report, as the Power BI report writes them.

/** A KPI value: 21.0M, 956.3K, 3,278. */
export function compact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return Math.round(v).toLocaleString("en-US");
}

/** A chart label in millions with two decimals when the axis is in millions (0.12M), else compact. */
export function chartValue(v: number, max: number, money: boolean): string {
  if (money && max >= 1e5) return `${(v / 1e6).toFixed(2)}M`;
  if (money) return compact(v);
  return Math.round(v).toLocaleString("en-US");
}

export const int = (v: number) => Math.round(v).toLocaleString("en-US");

/** A KPI tile: money compact (21.0M), counts in full (3,278). */
export const tileValue = (kind: "money" | "count", v: number) =>
  kind === "money" ? compact(v) : int(v);

export const money2 = (v: number) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const num1 = (v: number) =>
  v.toLocaleString("en-US", { maximumFractionDigits: 1 });

/** +84.7% / -7.7% */
export const pct = (v: number) =>
  `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

const MONTH = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** 1 Jun – 31 Oct 2026; the first year only when the two differ. */
export function periodLabel(p: Period): string {
  const [y1, m1, d1] = dayToIso(p.from).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [y2, m2, d2] = dayToIso(p.to).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const a = `${d1} ${MONTH[m1 - 1]}${y1 !== y2 ? ` ${y1}` : ""}`;
  return `${a} – ${d2} ${MONTH[m2 - 1]} ${y2}`;
}
