import { useId } from "react";
import type {
  BridgeStep,
  ConcentrationVM,
  MarginVM,
} from "@/lib/pnl/engine/view-types";
import { extent, linear, niceTicks } from "../chart-scale";

// Inline SVG charts of the Vitals / Analysis / Profitability views (no chart library). Geometry only: values,
// labels and step kinds come from lib/engine.

export const INK = "#101B2B";
export const SLATE = "#4F5C6C";
export const SLATE4 = "#8592A3";
export const LINE = "#CDD4DC";
export const LINE1 = "#EDF0F3";
const GREEN = "#3BA37B";
const ORANGE = "#E2804A";
const DARK = "#2B3748";
/** Member colours of a cut (regions, channels, lines, segments), in member order (v4 reference `memCols`). */
export const MEMBER = [
  "#6B48C8",
  "#2453A6",
  "#3BA37B",
  "#E2804A",
  "#8592A3",
  "#B9A3E8",
] as const;

/** Two-line wrap for long axis labels. */
function wrap(label: string, max = 12): [string, string] {
  if (label.length <= max) return [label, ""];
  const cut = label.lastIndexOf(" ", Math.ceil(label.length / 2) + 2);
  return cut > 0 ? [label.slice(0, cut), label.slice(cut + 1)] : [label, ""];
}

/** Running level before / after each bar; level steps change the level, like D&A from EBITDA to OP. */
function runningLevels(steps: readonly BridgeStep[]) {
  const out: { s: BridgeStep; from: number | null; to: number }[] = [];
  let run = 0;
  for (const s of steps) {
    if (s.kind === "start" || s.kind === "subtotal" || s.kind === "end") {
      run = s.value;
      out.push({ s, from: null, to: s.value });
    } else {
      out.push({ s, from: run, to: run + s.value });
      run += s.value;
    }
  }
  return out;
}

export function Waterfall({
  steps,
  width,
  height,
}: {
  steps: readonly BridgeStep[];
  width: number;
  height: number;
}) {
  const hatch = useId().replace(/:/g, "");
  if (width < 40 || height < 40) return null;
  const padL = 46;
  const padR = 8;
  const padT = 34;
  // narrow steps (the 14-step profit bridge in a half-width panel): smaller type, sub-labels move under the axis
  const compact = (width - padL - padR) / steps.length < 60;
  const padB = compact ? 60 : 44;
  const font = compact ? 9.5 : 11;
  const bars = runningLevels(steps);
  const levels = bars.flatMap((b) =>
    b.from === null ? [b.to] : [b.from, b.to],
  );
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const range = hi - lo || Math.abs(hi) || 1;
  // truncated axis (README decision 4): totals start well above zero so the steps stay readable
  const y0 = lo >= 0 ? Math.max(0, lo - range * 0.6) : lo - range * 0.1;
  const ticks = niceTicks(y0, hi + range * 0.08, 4);
  const Y = linear(ticks[0] ?? y0, ticks.at(-1) ?? hi, height - padB, padT);
  const iw = width - padL - padR;
  const gap = iw / steps.length;
  const bw = Math.min(64, gap * 0.62);
  const base = Y(ticks[0] ?? y0);
  const fmt = (t: number) => {
    const scale = Math.abs(ticks.at(-1) ?? 1) >= 1e6 ? 1e6 : 1e3;
    return (t / scale).toLocaleString("en-US", { maximumFractionDigits: 0 });
  };
  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={steps.map((s) => `${s.label} ${s.text}`).join(", ")}
    >
      <defs>
        <pattern
          id={hatch}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="#FFFFFF" />
          <line x1="0" y1="0" x2="0" y2="6" stroke={SLATE4} strokeWidth="3" />
        </pattern>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={width - padR}
            y1={Y(t)}
            y2={Y(t)}
            stroke={LINE1}
          />
          <text
            x={padL - 6}
            y={Y(t) + 3}
            fontSize={10}
            textAnchor="end"
            fill={SLATE4}
          >
            {fmt(t)}
          </text>
        </g>
      ))}
      {bars.map(({ s, from, to }, i) => {
        const x = padL + gap * i + (gap - bw) / 2;
        const top = from === null ? Y(to) : Y(Math.max(from, to));
        const bottom = from === null ? base : Y(Math.min(from, to));
        const fill =
          s.kind === "start" || s.kind === "end"
            ? "var(--acc)"
            : s.kind === "subtotal"
              ? DARK
              : s.kind === "level"
                ? SLATE4
                : s.kind === "fx"
                  ? `url(#${hatch})`
                  : s.value >= 0
                    ? GREEN
                    : ORANGE;
        const [l1, l2] = wrap(s.label, compact ? 9 : 12);
        const subBelow = compact && s.sub !== null;
        const next = bars[i + 1];
        const labelColour =
          s.kind === "up" ? "#06603F" : s.kind === "down" ? "#C2410C" : INK;
        return (
          <g key={`${s.label}-${i}`}>
            <rect
              x={x}
              y={top}
              width={bw}
              height={Math.max(2, bottom - top)}
              rx={2}
              fill={fill}
              stroke={s.kind === "fx" ? SLATE : undefined}
            />
            {next && next.from !== null ? (
              <line
                x1={x + bw}
                x2={x + gap}
                y1={Y(to)}
                y2={Y(to)}
                stroke={LINE}
                strokeDasharray="2 2"
              />
            ) : null}
            <text
              x={x + bw / 2}
              y={top - (s.sub && !subBelow ? 16 : 5)}
              fontSize={font + (compact ? 0.5 : 0)}
              fontWeight={600}
              textAnchor="middle"
              fill={labelColour}
            >
              {s.text}
            </text>
            {s.sub ? (
              <text
                x={x + bw / 2}
                y={subBelow ? height - padB + 42 : top - 4}
                fontSize={subBelow ? 9 : 9.5}
                fontWeight={subBelow ? 600 : 400}
                textAnchor="middle"
                fill={SLATE}
              >
                {s.sub}
              </text>
            ) : null}
            <text
              x={x + bw / 2}
              y={height - padB + 15}
              fontSize={font}
              textAnchor="middle"
              fill={SLATE}
            >
              {l1}
            </text>
            {l2 ? (
              <text
                x={x + bw / 2}
                y={height - padB + 27}
                fontSize={font}
                textAnchor="middle"
                fill={SLATE}
              >
                {l2}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Diverging variance bar on a shared scale; with a cut, member segments stack outwards from the centre. */
export function DivBar({
  delta,
  scale,
  width = 124,
}: {
  delta: number;
  scale: number;
  width?: number;
}) {
  const half = width / 2;
  const w = (Math.min(Math.abs(delta), scale) / scale) * half;
  return (
    <svg
      width={width}
      height={11}
      aria-hidden="true"
      style={{ verticalAlign: "middle" }}
    >
      <rect x={0} y={1} width={width} height={9} rx={2} fill={LINE1} />
      <rect
        x={Math.max(0, delta >= 0 ? half : half - w)}
        y={1}
        width={Math.min(w, width)}
        height={9}
        fill={delta >= 0 ? GREEN : ORANGE}
      />
      <line x1={half} x2={half} y1={0} y2={11} stroke="rgba(16,27,43,.45)" />
    </svg>
  );
}

export function ShareBars({
  vm,
  width,
  height,
}: {
  vm: ConcentrationVM;
  width: number;
  height: number;
}) {
  if (width < 40 || height < 40) return null;
  const labW = 92;
  const rowH = Math.min(64, (height - 8) / vm.levels.length);
  const bw = width - labW - 4;
  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="Share by profit level"
    >
      {vm.levels.map((lvl, r) => {
        let x = labW;
        const y = r * rowH + 8;
        return (
          <g key={lvl.label}>
            <text
              x={0}
              y={y + rowH * 0.42}
              fontSize={12}
              fontWeight={500}
              fill={INK}
            >
              {lvl.label}
            </text>
            {lvl.segments.map((s, i) => {
              const w = s.share * bw;
              const el = (
                <g key={s.key}>
                  <title>{`${lvl.label}: ${s.label} ${s.text}`}</title>
                  <rect
                    x={x}
                    y={y}
                    width={Math.max(0, w - 1)}
                    height={rowH * 0.6}
                    fill={MEMBER[i % MEMBER.length]}
                  />
                  {w > 38 ? (
                    <text
                      x={x + w / 2}
                      y={y + rowH * 0.36}
                      fontSize={11}
                      fontWeight={600}
                      textAnchor="middle"
                      fill="#FFFFFF"
                    >
                      {s.text}
                    </text>
                  ) : null}
                </g>
              );
              x += w;
              return el;
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** SVG path of a series over evenly spaced months; a null breaks the line. */
function linePath(
  values: readonly (number | null)[],
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

/** `n` + 1 ticks of one nice step covering [lo, hi]: the right axis shares the left axis's gridlines. */
function alignedTicks(lo: number, hi: number, n: number): number[] {
  const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.1 || 0.01;
  const min = lo - pad;
  const max = hi + pad;
  const mag = 10 ** Math.floor(Math.log10((max - min) / n));
  for (const m of [mag / 10, mag, mag * 10])
    for (const k of [1, 2, 2.5, 5]) {
      const step = k * m;
      const start = Math.floor(min / step) * step;
      if (start + n * step >= max)
        return Array.from({ length: n + 1 }, (_, i) => start + i * step);
    }
  return Array.from({ length: n + 1 }, (_, i) => min + ((max - min) * i) / n);
}

/**
 * Revenue and margin by month (2026-11-17, owner): a combo chart, net revenue as bars on the left axis and contribution
 * margin % as a line on the right axis, the two axes on the same gridlines. Each point carries its CM % while there is
 * room, else the last one only; hover a period for its figures.
 */
export function MarginCombo({
  vm,
  width,
  height,
}: {
  vm: MarginVM;
  width: number;
  height: number;
}) {
  const k = vm.periods.length;
  if (width < 200 || height < 120 || k === 0) return null;
  const padL = 44;
  const padR = 44;
  const padT = 30; // legend
  const padB = 34; // period and year
  const iw = width - padL - padR;
  const band = iw / k;
  const bw = Math.min(56, band * 0.62);
  const nrs = vm.periods.map((p) => p.nr);
  const [nrLo, nrHi] = extent(nrs);
  const left = niceTicks(Math.min(0, nrLo), nrHi * 1.06, 4);
  const n = left.length - 1;
  const [cmLo, cmHi] = extent(vm.periods.map((p) => p.cmPct));
  const right = alignedTicks(cmLo, cmHi, n);
  const bottom = height - padB;
  const YL = linear(left[0] ?? 0, left.at(-1) ?? 1, bottom, padT);
  const YR = linear(right[0] ?? 0, right.at(-1) ?? 1, bottom, padT);
  const X = (i: number) => padL + band * i + band / 2;
  const leftStep = (left[1] ?? 1) - (left[0] ?? 0);
  const rightStep = (right[1] ?? 0.01) - (right[0] ?? 0);
  const amount = (t: number) =>
    t.toLocaleString("en-US", { maximumFractionDigits: leftStep < 1 ? 1 : 0 });
  const percent = (t: number) =>
    `${(t * 100).toFixed(rightStep < 0.01 ? 1 : 0).replace("-", "−")}%`;
  const lastIdx = vm.periods.findLastIndex((p) => p.cmPct !== null);
  const everyLabel = band >= 46;
  const barFill = "color-mix(in srgb, var(--acc) 32%, #FFFFFF)";
  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`${vm.info.title}: ${vm.periods.map((p) => p.detail).join("; ")}`}
    >
      <g fontSize={11} fill={SLATE}>
        <rect
          x={padL}
          y={6}
          width={12}
          height={10}
          rx={2}
          style={{ fill: barFill }}
        />
        <text x={padL + 18} y={15}>
          {`Net revenue, ${vm.unit} (left)`}
        </text>
        <line
          x1={padL + 170}
          x2={padL + 190}
          y1={11}
          y2={11}
          stroke={INK}
          strokeWidth={2}
        />
        <circle
          cx={padL + 180}
          cy={11}
          r={3}
          fill="#FFFFFF"
          stroke={INK}
          strokeWidth={1.6}
        />
        <text x={padL + 196} y={15}>
          Contribution margin % (right)
        </text>
      </g>
      {left.map((t, i) => (
        <g key={t}>
          <line
            x1={padL}
            x2={width - padR}
            y1={YL(t)}
            y2={YL(t)}
            stroke={i === 0 ? LINE : LINE1}
          />
          <text
            x={padL - 6}
            y={YL(t) + 3}
            fontSize={10}
            textAnchor="end"
            fill={SLATE4}
          >
            {amount(t)}
          </text>
          <text x={width - padR + 6} y={YL(t) + 3} fontSize={10} fill={SLATE4}>
            {percent(right[i] ?? 0)}
          </text>
        </g>
      ))}
      {vm.periods.map((p, i) => {
        const y0 = YL(Math.max(0, left[0] ?? 0));
        const y1 = p.nr === null ? y0 : YL(p.nr);
        return (
          <g key={p.key}>
            <title>{p.detail}</title>
            <rect
              x={X(i) - band / 2}
              y={padT}
              width={band}
              height={bottom - padT}
              fill="transparent"
            />
            {p.nr === null ? null : (
              <rect
                x={X(i) - bw / 2}
                y={Math.min(y0, y1)}
                width={bw}
                height={Math.abs(y0 - y1)}
                rx={2}
                style={{ fill: barFill }}
              />
            )}
            <text
              x={X(i)}
              y={bottom + 15}
              fontSize={10.5}
              textAnchor="middle"
              fill={SLATE}
            >
              {p.short}
            </text>
            {p.year ? (
              <text
                x={X(i)}
                y={bottom + 28}
                fontSize={10}
                textAnchor="middle"
                fill={SLATE4}
              >
                {p.year}
              </text>
            ) : null}
          </g>
        );
      })}
      <path
        d={linePath(
          vm.periods.map((p) => p.cmPct),
          X,
          YR,
        )}
        fill="none"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
        pointerEvents="none"
      />
      {vm.periods.map((p, i) =>
        p.cmPct === null ? null : (
          <g key={p.key} pointerEvents="none">
            <circle
              cx={X(i)}
              cy={YR(p.cmPct)}
              r={3.5}
              fill="#FFFFFF"
              stroke={INK}
              strokeWidth={1.8}
            />
            {everyLabel || i === lastIdx ? (
              <text
                x={X(i)}
                y={YR(p.cmPct) - 9}
                fontSize={10.5}
                fontWeight={600}
                textAnchor="middle"
                fill={INK}
                stroke="#FFFFFF"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {p.cmText}
              </text>
            ) : null}
          </g>
        ),
      )}
    </svg>
  );
}
