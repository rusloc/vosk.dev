import type { Manifest } from "../data/manifest";
import { resolveWindow } from "./time-windows";
import type { MonthNumber, Selection, TimeView } from "./types";

// Period picker v2 (docs/design/period-picker-v2.md Part 1): the live summary sentence, the plain time-view labels,
// the month-grid label per time view and the month cells (covered window, anchor, open months by base version, C-01).
// Copy lives here so the rail, the flyout and the applied-filters pop-up say the same thing (F-02 … F-04).

type DimMonth = Manifest["tables"]["dim_month"];
type Period = Pick<Selection, "fy" | "month" | "timeView" | "base"> &
  Partial<Pick<Selection, "startFy" | "startMonth">>;

/** The end of a custom range the picker edits (2026-11-15): its first month or its last. */
export type RangeEnd = "from" | "to";

export const TIME_VIEW_LABEL: Record<TimeView, string> = {
  MTD: "One month",
  QTD: "Quarter to date",
  YTD: "Year to date",
  LTM: "Last 12 months",
  FY: "Full year",
  RANGE: "Custom range",
};
const TIME_VIEW_ORDER: readonly TimeView[] = [
  "MTD",
  "QTD",
  "YTD",
  "LTM",
  "FY",
  "RANGE",
];

/** What the selected month means in each time view; Full year has no grid. */
const GRID_LABEL: Record<TimeView, string | null> = {
  MTD: "Month",
  QTD: "Up to",
  YTD: "Up to",
  LTM: "Ending",
  FY: null,
  RANGE: "Ending", // the range picker relabels it From / To by the end being edited
};

export const OPEN_MONTH_HINT =
  "Switch the base to Latest estimate to include forecast months.";

const MONTH_NUMBERS: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
];
export const isMonthNumber = (n: number): n is MonthNumber =>
  MONTH_NUMBERS.includes(n);

export interface MonthCell {
  month: MonthNumber;
  name: string;
  /** Inside the window the numbers cover (selected fiscal year's part only). */
  covered: boolean;
  /** The selected month: the end of the window. */
  anchor: boolean;
  /** False = open month under an Actual base (C-01): shown, not selectable. */
  selectable: boolean;
  /** Small label under the month name for open months: "not closed yet", "forecast" or "budget". */
  note: string | null;
}

/** One month of a custom range's ends. */
export interface RangePoint {
  fy: number;
  month: MonthNumber;
  label: string; // "Oct 2025"
}

/** The custom range picker (2026-11-15): its two ends, the end being edited and the whole-year spans. */
export interface RangeView {
  edit: RangeEnd;
  from: RangePoint;
  to: RangePoint;
  /** Whole fiscal years, alone and in runs: "2025", "2025 – 2026" (Jan of the first to Dec of the last). */
  spans: readonly { key: string; label: string; patch: Partial<Selection> }[];
  /** The span the range equals, if any. */
  span: string | null;
}

export interface PeriodView {
  summary: string;
  timeViews: readonly { value: TimeView; label: string }[];
  /** What choosing each time view changes: Custom range starts as the months on screen (the current window). */
  timeViewPatch: (timeView: TimeView) => Partial<Selection>;
  years: readonly number[];
  /** The year the month grid shows: the selected fiscal year, or the year of the range end being edited. */
  year: number;
  /** The custom range picker; null outside RANGE. */
  range: RangeView | null;
  /** "Month", "Up to" or "Ending"; null = Full year, the grid is hidden. */
  gridLabel: string | null;
  /** The one line that replaces the grid in Full year. */
  fullYearNote: string | null;
  months: readonly MonthCell[];
  openMonthHint: string;
}

/**
 * The months the numbers contain (period-picker-v2.md rules): the time-view window clipped to the data history, and
 * under an Actual base cut at the last close (C-01), so the sentence matches the version plan and the model's
 * `_Window Label`. "Showing Jan – Sep 2026 - year to date"; one month: "Showing Sep 2026"; across years: "Oct 2025 –
 * Sep 2026"; nothing closed under Actual: "Showing no closed month yet".
 */
export function periodSummary(m: Manifest, p: Period): string {
  const dim = m.tables.dim_month;
  const months = resolveWindow(
    dim,
    p.timeView,
    p.fy,
    p.month,
    rangeStart(p),
  ).months.filter(
    (t) => p.base !== "A" || dim[t]?.is_closed, // closed months are a prefix of dim_month: the cut stays contiguous
  );
  const a = dim[months[0] ?? -1];
  const b = dim[months[months.length - 1] ?? -1];
  if (!a || !b) return "Showing no closed month yet"; // parity rule 7: exactly this, no time-view tail
  const tail =
    p.timeView === "MTD" || p.timeView === "RANGE" // a custom range says only its months
      ? ""
      : ` - ${TIME_VIEW_LABEL[p.timeView].toLowerCase()}`;
  const end = `${b.month_name} ${b.fiscal_year}`;
  const range =
    a === b
      ? end
      : a.fiscal_year === b.fiscal_year
        ? `${a.month_name} – ${end}`
        : `${a.month_name} ${a.fiscal_year} – ${end}`;
  return `Showing ${range}${tail}`;
}

const longMonth = new Intl.DateTimeFormat("en", {
  month: "long",
  timeZone: "UTC",
});

/** "Full year covers January to December." from the fiscal year's first and last month in dim_month. */
function fullYearNote(dim: DimMonth, fy: number): string {
  const year = dim.filter((d) => d.fiscal_year === fy);
  const first = year[0];
  const last = year[year.length - 1];
  if (!first || !last) return "";
  const name = (d: DimMonth[number]) =>
    longMonth.format(new Date(d.month_start_date));
  return `Full year covers ${name(first)} to ${name(last)}.`;
}

const OPEN_NOTE = { A: "not closed yet", LE: "forecast", B: "budget" } as const;

const rangeStart = (p: Period) =>
  p.startFy !== undefined && p.startMonth !== undefined
    ? { fy: p.startFy, month: p.startMonth }
    : undefined;
const order = (fy: number, month: number) => fy * 12 + month;

/**
 * Moving one end of a custom range (2026-11-15): the other end follows when the range would turn inside out, so the
 * range is never empty and the end just clicked is always where it was put.
 */
export function rangePatch(
  sel: Pick<Selection, "fy" | "month" | "startFy" | "startMonth">,
  end: RangeEnd,
  fy: number,
  month: MonthNumber,
): Pick<Selection, "fy" | "month" | "startFy" | "startMonth"> {
  const at = order(fy, month);
  if (end === "from")
    return at > order(sel.fy, sel.month)
      ? { startFy: fy, startMonth: month, fy, month }
      : { startFy: fy, startMonth: month, fy: sel.fy, month: sel.month };
  return at < order(sel.startFy, sel.startMonth)
    ? { startFy: fy, startMonth: month, fy, month }
    : { startFy: sel.startFy, startMonth: sel.startMonth, fy, month };
}

function rangeView(m: Manifest, sel: Selection, edit: RangeEnd): RangeView {
  const dim = m.tables.dim_month;
  const point = (fy: number, month: MonthNumber): RangePoint => ({
    fy,
    month,
    label: `${dim.find((d) => d.fiscal_year === fy && d.month_number === month)?.month_name ?? month} ${fy}`,
  });
  const years = [...new Set(dim.map((d) => d.fiscal_year))];
  const spans = years.flatMap((a, i) =>
    years.slice(i).map((b) => ({
      key: a === b ? String(a) : `${a}-${b}`,
      label: a === b ? String(a) : `${a} – ${b}`,
      patch: { startFy: a, startMonth: 1, fy: b, month: 12 } as const,
    })),
  );
  return {
    edit,
    from: point(sel.startFy, sel.startMonth),
    to: point(sel.fy, sel.month),
    spans,
    span:
      sel.startMonth === 1 && sel.month === 12
        ? sel.startFy === sel.fy
          ? String(sel.fy)
          : `${sel.startFy}-${sel.fy}`
        : null,
  };
}

/** `edit`: in a custom range, the end the month grid edits (the picker's From / To switch); default the first. */
export function periodView(
  m: Manifest,
  sel: Selection,
  edit: RangeEnd = "from",
): PeriodView {
  const dim = m.tables.dim_month;
  const isRange = sel.timeView === "RANGE";
  const window = resolveWindow(
    dim,
    sel.timeView,
    sel.fy,
    sel.month,
    rangeStart(sel),
  ).months;
  const inWindow = new Set(window);
  const year = isRange && edit === "from" ? sel.startFy : sel.fy;
  const anchorMonth = isRange && edit === "from" ? sel.startMonth : sel.month;
  const months = dim
    .filter((d) => d.fiscal_year === year)
    .flatMap((d): MonthCell[] => {
      if (!isMonthNumber(d.month_number)) return [];
      const selectable = d.is_closed || sel.base !== "A"; // C-01: Actual never covers an open month
      return [
        {
          month: d.month_number,
          name: d.month_name,
          covered: selectable && inWindow.has(d.month_index),
          anchor: d.month_number === anchorMonth,
          selectable,
          note: d.is_closed ? null : OPEN_NOTE[sel.base],
        },
      ];
    });
  // Custom range starts as the months on screen: the window's first month (inside the history) to the anchor.
  const first = dim[window[0] ?? -1];
  const toRange: Partial<Selection> = {
    timeView: "RANGE",
    startFy: first?.fiscal_year ?? sel.fy,
    startMonth:
      first && isMonthNumber(first.month_number) ? first.month_number : 1,
  };
  const gridLabel = isRange
    ? edit === "from"
      ? "From"
      : "To"
    : GRID_LABEL[sel.timeView];
  return {
    summary: periodSummary(m, sel),
    timeViews: TIME_VIEW_ORDER.map((value) => ({
      value,
      label: TIME_VIEW_LABEL[value],
    })),
    timeViewPatch: (timeView) =>
      timeView === "RANGE" ? (isRange ? {} : toRange) : { timeView },
    years: [...new Set(dim.map((d) => d.fiscal_year))],
    year,
    range: isRange ? rangeView(m, sel, edit) : null,
    gridLabel,
    fullYearNote: gridLabel === null ? fullYearNote(dim, sel.fy) : null,
    months,
    openMonthHint: OPEN_MONTH_HINT,
  };
}
