import type { KpiStatus } from "./thresholds";

// View models of the Vitals, Analysis and Profitability views (P&L views redesign v4). Every string is final copy
// and every plotted number comes from the engine; components own geometry only (ADR-0002, CONV-001).

export interface InfoValue {
  label: string;
  value: string;
}

/** ⓘ pop-up (ADR-0012 §2.3): what it is · formula in words · sub-metrics · source measures (Track B names). */
export interface InfoVM {
  title: string;
  what: string;
  formula: string;
  values: InfoValue[];
  source: string;
}

export interface HowToReadVM {
  title: string;
  lines: InfoValue[];
}

/** ahead = favourable beyond on-track, adverse = watch / off track, plan = on track, neutral = no colour (PY rows). */
export type Tone = "ahead" | "adverse" | "plan" | "neutral";

export interface DeltaRow {
  label: string; // "vs Budget"
  abs: string | null; // "+$9.2 m"; null for ratios
  rel: string; // "+1.4%", "+0.3 pp", "on plan", "n/a"
  tone: Tone;
}

export interface StatusChip {
  status: KpiStatus;
  text: string; // word, never colour alone (N-07)
}

export interface KpiCardVM {
  id: string;
  title: string;
  size: "hero" | "secondary" | "driver";
  value: string;
  rows: DeltaRow[];
  status: StatusChip | null;
  info: InfoVM;
}

export interface VitalsVM {
  results: KpiCardVM[]; // 3 heroes, then 2 secondary
  drivers: KpiCardVM[]; // 5, content swaps by company (L-10)
}

export type BridgeKind =
  "start" | "end" | "subtotal" | "up" | "down" | "fx" | "level";

export interface BridgeStep {
  label: string;
  kind: BridgeKind;
  /** start / end / subtotal / level: the level; up / down / fx: the signed change. */
  value: number;
  text: string; // value label
  sub: string | null; // step % of the stream's comparison, or the level's Δ vs comparison
}

export interface BridgeVM {
  id: string;
  title: string;
  steps: BridgeStep[];
  info: InfoVM;
  /** Σ changes − (end − start): 0 up to float noise (T-05). */
  residual: number;
}

/** The variances filter: one member per slice dimension or null = all; the chosen members combine (AND). */
export interface VarFilter {
  region: string | null;
  channel: string | null;
  line: string | null;
  segment: string | null;
}
export type VarDim = keyof VarFilter;
export const VAR_DIMS: readonly VarDim[] = [
  "region",
  "channel",
  "line",
  "segment",
];
export const NO_FILTER: VarFilter = {
  region: null,
  channel: null,
  line: null,
  segment: null,
};

export interface VarFilterDim {
  dim: VarDim;
  label: string; // "Region", else the company's slot label ("Channel", "Sales motion", "Category", …)
  options: { code: string; label: string }[]; // without the unassigned member
}

export interface VarRow {
  kind: "leaf" | "footer";
  code: string;
  label: string;
  blockName: string | null; // leaf: the P&L block, shown as a grey suffix
  comparison: string;
  actual: string;
  delta: number; // signed, reporting units (bar)
  deltaText: string;
  deltaPct: string; // "n.m." when |comparison| < 2.0 units or |Δ %| > 50 %
  py: string; // Δ vs prior year
  fx: string; // of which FX
  tone: Tone;
  alloc: boolean; // below CM under a channel / line / segment filter: allocated by NR share (C-31)
}

export interface VariancesVM {
  title: string;
  cmpName: string;
  columns: { comparison: string; py: string };
  rows: VarRow[]; // every leaf line with data, ranked by |Δ|
  footer: VarRow[]; // total at operating profit
  scale: number; // max |Δ| of every leaf (shared bar scale)
  filter: VarFilterDim[]; // the four dimensions and their members, for the filter pop-up
  filterText: string | null; // the applied members, " · "-joined; null without a filter
  info: InfoVM;
}

export interface ProfRow {
  key: string;
  label: string;
  nr: string;
  nrDelta: { text: string; tone: Tone };
  gm: string;
  cm: string;
  cmDelta: { text: string; status: KpiStatus | null };
  contribution: string;
  ebitda: string;
  total: boolean;
}

export interface ConcentrationVM {
  levels: {
    label: string;
    segments: { key: string; label: string; share: number; text: string }[];
  }[];
  info: InfoVM;
}

/**
 * Revenue and margin by month (2026-11-17, owner: a combo chart, replaces the 11-15 growth/margin small multiples):
 * one period per month of the selection, or per fiscal quarter past 12 months; net revenue as bars, CM % as a line.
 */
export interface MarginVM {
  grain: "month" | "quarter";
  unit: string; // "$ m", the bars' axis
  periods: {
    key: string;
    short: string; // "Mar" / "Q1", under the bar
    year: string; // "2026" under the first period and where the year changes, else ""
    nr: number | null; // net revenue in the selected units (bar)
    cmPct: number | null; // contribution ÷ NR (line)
    cmText: string; // "33.4%"
    detail: string; // hover and screen readers
  }[];
  info: InfoVM;
}

export interface HeatVM {
  rows: {
    key: string;
    label: string;
    cells: {
      value: number | null;
      text: string;
      share: string;
      detail: string;
    }[]; // value = NR, the cell colour
    total: string;
  }[];
  cols: {
    key: string;
    label: string;
    gm: number | null;
    gmText: string;
    total: string;
  }[];
  grand: string;
  info: InfoVM;
}

export interface ProfitabilityVM {
  title: string;
  subtitle: string; // basis and comparison, built from the selection (parity rule 13)
  table: { rows: ProfRow[]; info: InfoVM; cmpName: string };
  concentration: ConcentrationVM;
  margin: MarginVM;
  heat: HeatVM;
}

export interface AnalysisVM {
  nr: BridgeVM;
  profit: BridgeVM;
}
