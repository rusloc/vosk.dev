import type { Manifest } from "../data/manifest";
import type { MonthNumber, TimeView } from "./types";

type DimMonth = Manifest["tables"]["dim_month"];

export interface Window {
  months: number[]; // month indexes inside the data history, ascending
  monthsBeforeHistory: number; // LTM months that fall before the first month of data (C-50)
}

/** Month index of fiscal year `fy`, month `month` (F-02, F-03). */
export function anchorIndex(
  dimMonth: DimMonth,
  fy: number,
  month: MonthNumber,
): number {
  const row = dimMonth.find(
    (m) => m.fiscal_year === fy && m.month_number === month,
  );
  if (!row) throw new Error(`time-windows: no month ${month} in FY${fy}`);
  return row.month_index;
}

/** First month of a custom range (timeView RANGE, 2026-11-15). */
export interface RangeStart {
  fy: number;
  month: MonthNumber;
}

/**
 * Spec §7 time windows, anchored on the selected month m of fiscal year y. RANGE (2026-11-15): every month from
 * `start` to the anchor, across fiscal years; a start after the anchor is read the other way round.
 */
export function resolveWindow(
  dimMonth: DimMonth,
  timeView: TimeView,
  fy: number,
  month: MonthNumber,
  start?: RangeStart,
): Window {
  const anchor = anchorIndex(dimMonth, fy, month);
  const quarter = dimMonth[anchor]?.quarter;
  const sameYear = dimMonth.filter((m) => m.fiscal_year === fy);
  const indexes = (rows: DimMonth) => rows.map((m) => m.month_index);
  switch (timeView) {
    case "MTD":
      return { months: [anchor], monthsBeforeHistory: 0 };
    case "QTD":
      return {
        months: indexes(
          sameYear.filter(
            (m) => m.quarter === quarter && m.month_number <= month,
          ),
        ),
        monthsBeforeHistory: 0,
      };
    case "YTD":
      return {
        months: indexes(sameYear.filter((m) => m.month_number <= month)),
        monthsBeforeHistory: 0,
      };
    case "FY":
      return { months: indexes(sameYear), monthsBeforeHistory: 0 };
    case "RANGE": {
      const from = start
        ? anchorIndex(dimMonth, start.fy, start.month)
        : anchor;
      const [a, b] = from <= anchor ? [from, anchor] : [anchor, from];
      return {
        months: indexes(
          dimMonth.filter((m) => m.month_index >= a && m.month_index <= b),
        ),
        monthsBeforeHistory: 0,
      };
    }
    case "LTM": {
      const first = anchor - 11; // m − 11 … m, can cross fiscal years
      return {
        months: indexes(
          dimMonth.filter(
            (m) => m.month_index >= first && m.month_index <= anchor,
          ),
        ),
        monthsBeforeHistory: Math.max(0, -first),
      };
    }
  }
}
