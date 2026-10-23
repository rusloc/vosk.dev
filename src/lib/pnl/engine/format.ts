import type { Selection, StatementRow } from "./types";

// The ONLY place that rounds (D-30). N-06: millions with 1 decimal, thousands with 0 (param_units), percentages with
// 1 decimal, take rate with 2, thousands separators, a true minus sign (U+2212) for negatives and "+" on deltas
// (L-12); tabular figures are a CSS concern. Values arrive unrounded from the engine.

const MINUS = "−";
const NOT_AVAILABLE = "n/a"; // M-13
const formatters = new Map<string, Intl.NumberFormat>();

function fixed(value: number, decimals: number, signed = false): string {
  const key = `${decimals}|${signed}`;
  let f = formatters.get(key);
  if (!f) {
    // 'negative' / 'exceptZero' drop the sign when the value rounds to zero, so no "−0.0" or "+0.0"
    f = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      signDisplay: signed ? "exceptZero" : "negative",
    });
    formatters.set(key, f);
  }
  return f.format(value).replace("-", MINUS);
}

export interface Units {
  divisor: number; // param_units.divisor
  decimals: number; // param_units.decimals
}

export interface FormatOptions {
  signed?: boolean; // "+" on positive deltas (L-12)
}

/** Amount in display units (F-14), e.g. 3,398.5 for 3.3985 bn in millions. */
export function formatAmount(
  value: number | null,
  units: Units,
  { signed = false }: FormatOptions = {},
): string {
  return value === null
    ? NOT_AVAILABLE
    : fixed(value / units.divisor, units.decimals, signed);
}

/** Ratio (fraction) as a percentage: 0.2008 → "20.1%"; take rate uses decimals = 2. */
export function formatPercent(
  ratio: number | null,
  decimals = 1,
  { signed = false }: FormatOptions = {},
): string {
  return ratio === null
    ? NOT_AVAILABLE
    : `${fixed(ratio * 100, decimals, signed)}%`;
}

/** Δ of two ratios in percentage points (M-11): 0.012 → "+1.2 pp". */
export function formatPoints(delta: number | null, decimals = 1): string {
  return delta === null
    ? NOT_AVAILABLE
    : `${fixed(delta * 100, decimals, true)} pp`;
}

/** True when the value shows as zero in these units, so a Δ carries no favourable / unfavourable colour. */
export function roundsToZero(value: number, units: Units): boolean {
  return (
    Math.round(Math.abs(value / units.divisor) * 10 ** units.decimals) === 0
  );
}

/**
 * F-15 / M-25: "Costs shown as positives" flips the sign of cost rows for display only; Δ, Δ % and totals keep the
 * signed values (Δ positive = favourable). `multiplier` is param_cost_sign.display_multiplier_for_costs.
 */
export function displayValue(
  value: number | null,
  isCost: boolean,
  multiplier: number,
): number | null {
  return value === null || !isCost ? value : value * multiplier;
}

/**
 * M-22 hide empty lines: a leaf or company row whose visible columns all show as zero (or n/a) is hidden. Blocks,
 * subtotals, ratios and memo rows always show (T-16).
 */
export function isEmptyRow(
  row: StatementRow,
  sel: Pick<Selection, "compareA" | "compareB" | "showFyOutlook">,
  units: Units,
): boolean {
  if (row.kind !== "leaf" && row.kind !== "entity") return false;
  const shown = [
    row.base,
    ...(sel.compareA === "NONE" ? [] : [row.compareA?.value ?? null]),
    ...(sel.compareB === "NONE" ? [] : [row.compareB?.value ?? null]),
    ...(sel.showFyOutlook ? [row.fyBudget, row.fyLE.value] : []),
  ];
  return shown.every((v) => v === null || roundsToZero(v, units));
}

/** Key-figure formats (spec §5, N-06): see KpiFormat in kpis.ts. */
export type KpiValueFormat =
  "amount" | "percent" | "rate" | "count" | "perUnit" | "integer";

/**
 * A key-figure value as its tile shows it: amounts with the currency symbol and unit (e.g. "$3,398.5m",
 * "−$12.0m"), counts in display units ("419.8m"), per-unit amounts with 2 decimals, whole numbers, percentages with
 * 1 decimal and the take rate with 2 (N-06).
 */
export function formatKpi(
  value: number | null,
  format: KpiValueFormat,
  units: Units & { suffix: string },
  symbol: string,
): string {
  if (value === null) return NOT_AVAILABLE;
  const sign = value < 0 && fixed(value, 2) !== "0.00" ? MINUS : "";
  const abs = Math.abs(value);
  switch (format) {
    case "amount":
      return `${sign}${symbol}${formatAmount(abs, units)}${units.suffix}`;
    case "count":
      return `${sign}${formatAmount(abs, units)}${units.suffix}`;
    case "perUnit":
      return `${sign}${symbol}${fixed(abs, 2)}`;
    case "integer":
      return `${sign}${fixed(abs, 0)}`;
    case "percent":
      return formatPercent(value, 1);
    case "rate":
      return formatPercent(value, 2);
  }
}

/** The Δ a key-figure tile shows (K-20): Δ % for amounts and counts, Δ in percentage points for ratios. */
export function formatKpiDelta(
  c: { delta: number | null; deltaPct: number | null },
  format: KpiValueFormat,
): string {
  return format === "percent" || format === "rate"
    ? formatPoints(c.delta, format === "rate" ? 2 : 1)
    : formatPercent(c.deltaPct, 1, { signed: true });
}
