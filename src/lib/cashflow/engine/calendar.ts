import type { Dataset } from "./data";

// Periods (handoff 02 § 3.2, CF-ENG-02 … CF-ENG-05; mock `period()`). Months are indexed 0 … N−1 from the manifest;
// "last" = the last data month. Mode M month · Q quarter · A calendar year · Y year to date.

export const MON = [
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
] as const;

export type Mode = "M" | "Q" | "A" | "Y";
export type Quick = "YTD" | "QTD" | "MTD";
export const QUICK_MODE: Record<Quick, Mode> = { YTD: "Y", QTD: "Q", MTD: "M" };

export interface Period {
  mode: Mode;
  y: number;
  m: number;
  /** first and last month index */
  a: number;
  b: number;
  label: string;
  /** control key (`M-2026-10`, `Y-2025`) or null */
  key: string | null;
  prior: { a: number; b: number } | null;
  priorLabel: string;
  /** first and last day index */
  d0: number;
  d1: number;
  days: number;
  partial: boolean;
}

/** [year, month 1–12] of month index i */
export function ym(ds: Dataset, i: number): [number, number] {
  const k = ds.months[0]!;
  const t = +k.slice(0, 4) * 12 + (+k.slice(5, 7) - 1) + i;
  return [Math.floor(t / 12), (t % 12) + 1];
}

/** month index of (y, m 1–12); may be outside 0 … N−1 */
export function idx(ds: Dataset, y: number, m: number): number {
  const k = ds.months[0]!;
  return y * 12 + (m - 1) - (+k.slice(0, 4) * 12 + (+k.slice(5, 7) - 1));
}

export const lastIx = (ds: Dataset) => ds.months.length - 1;

/** The period of (mode, y, m); `m` is the selected month (for Q any month of the quarter, for A the year's last data month). */
export function period(ds: Dataset, mode: Mode, y: number, m: number): Period {
  const N = ds.months.length;
  const e = idx(ds, y, m);
  let a = e;
  let b = e;
  let label: string;
  let key: string | null = null;
  if (mode === "Q") {
    const q = Math.ceil(m / 3);
    a = idx(ds, y, q * 3 - 2);
    b = Math.min(idx(ds, y, q * 3), N - 1);
    label = `Q${q} ${y}`;
  } else if (mode === "Y") {
    a = idx(ds, y, 1);
    label = `YTD ${MON[m - 1]} ${y}`;
    if (m === 12 || e === N - 1) key = `Y-${y}`;
  } else if (mode === "A") {
    a = idx(ds, y, 1);
    b = Math.min(idx(ds, y, 12), N - 1);
    label = String(y);
    key = `Y-${y}`;
  } else {
    label = `${MON[m - 1]} ${y}`;
    key = `M-${ds.months[e]}`;
  }
  const len = b - a + 1;
  const pa =
    mode === "Y" || mode === "A" ? a - 12 : mode === "Q" ? a - 3 : a - 1;
  const prior = pa >= 0 ? { a: pa, b: pa + len - 1 } : null;
  let priorLabel = "";
  if (prior) {
    const [py, pm] = ym(ds, pa);
    priorLabel =
      mode === "M"
        ? `${MON[pm - 1]} ${py}`
        : mode === "Q"
          ? `Q${Math.ceil(pm / 3)} ${py}`
          : mode === "A"
            ? len === 12
              ? String(y - 1)
              : `Jan–${MON[len - 1]} ${y - 1}`
            : `YTD ${py}`;
  }
  const d0 = ds.mStart[a]!;
  const d1 = ds.mEnd[b]!;
  return {
    mode,
    y,
    m,
    a,
    b,
    label,
    key,
    prior,
    priorLabel,
    d0,
    d1,
    days: d1 - d0 + 1,
    partial: (mode === "Q" && b - a < 2) || (mode === "A" && b - a < 11),
  };
}

/** The window of a period shifted to its prior (same mode and labels are not needed: metrics read a and b only). */
export function priorPeriod(ds: Dataset, p: Period): Period | null {
  if (!p.prior) return null;
  const { a, b } = p.prior;
  return {
    ...p,
    a,
    b,
    d0: ds.mStart[a]!,
    d1: ds.mEnd[b]!,
    days: ds.mEnd[b]! - ds.mStart[a]! + 1,
  };
}

/** Quick handles resolve against the last data month (CF-ENG-04). */
export function quickPeriod(ds: Dataset, q: Quick): Period {
  const [y, m] = ym(ds, lastIx(ds));
  return period(ds, QUICK_MODE[q], y, m);
}

/** The period a control key stands for (the self-check): `M-2026-10` → month; `Y-2025` → YTD to Dec or the last month. */
export function keyPeriod(ds: Dataset, key: string): Period {
  const y = +key.slice(2, 6);
  if (key[0] === "M") return period(ds, "M", y, +key.slice(7, 9));
  const [ly, lm] = ym(ds, lastIx(ds));
  return period(ds, "Y", y, y === ly ? lm : 12);
}

/** Does month (y, m) carry data? */
export const hasMonth = (ds: Dataset, y: number, m: number) => {
  const i = idx(ds, y, m);
  return i >= 0 && i <= lastIx(ds);
};

/** The data years, first to last. */
export function dataYears(ds: Dataset): number[] {
  const [y0] = ym(ds, 0);
  const [y1] = ym(ds, lastIx(ds));
  const out: number[] = [];
  for (let y = y0; y <= y1; y++) out.push(y);
  return out;
}
