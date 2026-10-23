import type { Bridge } from "@/lib/pnl/engine/bridge";
import {
  formatAmount,
  formatPercent,
  type Units,
} from "@/lib/pnl/engine/format";
import type { VarianceRow } from "@/lib/pnl/engine/analysis";
import { infoCopy } from "./info-copy";
import { InfoPopover } from "./info-popover";
import styles from "./views.module.css";

// Analysis (L-08, design guide §6.3): the net revenue bridge (C-40) and the largest variances (C-45), side by side.
// Renders engine values only; every bar position is arithmetic on values the engine returned.

const W = 640;
const H = 300;
const PAD = { top: 30, right: 8, bottom: 48, left: 8 };

/** Round down to a readable axis start: 1, 2 or 5 × a power of ten below the range. */
function niceFloor(v: number, range: number): number {
  const step = 10 ** Math.floor(Math.log10(Math.max(range, 1)));
  return Math.floor(v / step) * step;
}

/** Two short lines at most, split on spaces, for the category labels under the bars. */
function wrap(label: string, max = 13): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + " " + w).length <= max)
      lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  return lines.length > 2 ? [lines[0] ?? "", lines.slice(1).join(" ")] : lines;
}

function BridgeChart({
  bridge,
  startLabel,
  endLabel,
  units,
}: {
  bridge: Bridge;
  startLabel: string;
  endLabel: string;
  units: Units;
}) {
  type Bar = {
    key: string;
    label: string;
    from: number;
    to: number;
    kind: "total" | "up" | "down";
    value: number;
  };
  const bars: Bar[] = [];
  bars.push({
    key: "start",
    label: startLabel,
    from: 0,
    to: bridge.start,
    kind: "total",
    value: bridge.start,
  });
  let level = bridge.start;
  for (const s of bridge.steps) {
    bars.push({
      key: s.key,
      label: s.label,
      from: level,
      to: level + s.value,
      kind: s.value >= 0 ? "up" : "down",
      value: s.value,
    });
    level += s.value;
  }
  bars.push({
    key: "end",
    label: endLabel,
    from: 0,
    to: bridge.end,
    kind: "total",
    value: bridge.end,
  });

  const levels = bars.flatMap((b) =>
    b.kind === "total" ? [b.to] : [b.from, b.to],
  );
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const range = Math.max(hi - lo, Math.abs(hi) * 0.02, 1);
  const raw = lo - range * 0.6;
  // The axis starts at zero unless that would flatten every step into a sliver (design guide §6.3: truncated axis).
  const axisMin = raw <= 0 ? 0 : niceFloor(raw, range);
  const axisMax = hi + range * 0.15;
  const plotH = H - PAD.top - PAD.bottom;
  const y = (v: number) =>
    PAD.top + ((axisMax - v) / (axisMax - axisMin)) * plotH;
  const slot = (W - PAD.left - PAD.right) / bars.length;
  const bw = Math.min(56, slot * 0.62);
  const fill = {
    total: "var(--acc)",
    up: "var(--fav-bar)",
    down: "var(--unf-bar)",
  } as const;
  const ink = {
    total: "var(--ink-900)",
    up: "var(--fav)",
    down: "var(--unf)",
  } as const;
  const text = (b: Bar) =>
    b.kind === "total"
      ? formatAmount(b.value, units)
      : formatAmount(b.value, units, { signed: true });
  const desc = bars.map((b) => `${b.label} ${text(b)}`).join("; ");

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.bridge}
        role="img"
        aria-label={`Net revenue bridge: ${desc}`}
      >
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(axisMin)}
          y2={y(axisMin)}
          stroke="var(--line-300)"
        />
        {bars.map((b, i) => {
          const x = PAD.left + slot * i + (slot - bw) / 2;
          const top = y(b.kind === "total" ? b.to : Math.max(b.from, b.to));
          const bottom =
            b.kind === "total" ? y(axisMin) : y(Math.min(b.from, b.to));
          const next = bars[i + 1];
          return (
            <g key={b.key}>
              <rect
                x={x}
                y={top}
                width={bw}
                height={Math.max(bottom - top, 1)}
                rx={2}
                fill={fill[b.kind]}
              />
              {next && next.kind !== "total" && (
                // connector from this bar's end level to the next bar
                <line
                  x1={x + bw}
                  x2={x + slot}
                  y1={y(b.to)}
                  y2={y(b.to)}
                  stroke="var(--slate-400)"
                  strokeDasharray="2 2"
                />
              )}
              <text
                x={x + bw / 2}
                y={top - 7}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill={ink[b.kind]}
              >
                {text(b)}
              </text>
              <text
                x={x + bw / 2}
                y={H - PAD.bottom + 16}
                textAnchor="middle"
                fontSize={12}
                fill="var(--ink-700)"
              >
                {wrap(b.label).map((l, j) => (
                  <tspan key={l} x={x + bw / 2} dy={j === 0 ? 0 : 14}>
                    {l}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
      {axisMin > 0 && (
        <p className={styles.note}>
          The axis starts at {formatAmount(axisMin, units)}, not at zero.
        </p>
      )}
    </>
  );
}

function VarianceTable({
  rows,
  units,
}: {
  rows: readonly VarianceRow[];
  units: Units;
}) {
  const scale = Math.max(...rows.map((r) => Math.abs(r.delta)), 1);
  return (
    <table className={styles.varList}>
      <thead>
        <tr>
          <th scope="col">Line</th>
          <th scope="col" className={styles.varBar}>
            Unfavourable · Favourable
          </th>
          <th scope="col">Δ</th>
          <th scope="col">Δ %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const half = (Math.abs(r.delta) / scale) * 50;
          const tone =
            r.favourable === null ? "" : r.favourable ? styles.fav : styles.unf;
          return (
            <tr key={r.code}>
              <td>
                <span className={styles.lineName}>{r.label}</span>
                <span className={styles.lineBlock}>{r.block}</span>
              </td>
              <td aria-hidden="true">
                <span className={styles.track} style={{ display: "block" }}>
                  <span className={styles.centre} />
                  <span
                    className={`${styles.bar} ${r.favourable ? styles.barFav : styles.barUnf}`}
                    style={{
                      left: `${r.favourable ? 50 : 50 - half}%`,
                      width: `${Math.max(half, 0.8)}%`,
                    }}
                  />
                </span>
              </td>
              <td className={tone} style={{ fontWeight: 600 }}>
                {formatAmount(r.delta, units, { signed: true })}
              </td>
              <td className={tone}>
                {formatPercent(r.deltaPct, 1, { signed: true })}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function AnalysisView({
  bridge,
  variances,
  comparison,
  baseLabel,
  unitsLabel,
  units,
}: {
  bridge: Bridge;
  variances: readonly VarianceRow[];
  comparison: string; // "Budget", "Prior year", …
  baseLabel: string; // "Actual"
  unitsLabel: string; // "USD millions"
  units: Units;
}) {
  const fill = { comparison: comparison.toLowerCase(), breakdown: "" };
  return (
    <section
      id="view-analysis"
      role="tabpanel"
      aria-label="Analysis"
      className={styles.view}
    >
      <div
        className={styles.split}
        style={{ gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)" }}
      >
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>Net revenue bridge</h2>
              <p className={styles.cardSub}>
                {comparison} to {baseLabel}, {unitsLabel}. Steps at constant
                currency; FX is the translation difference.
              </p>
            </div>
            <InfoPopover copy={infoCopy("bridge", fill)} />
          </div>
          <BridgeChart
            bridge={bridge}
            startLabel={comparison}
            endLabel={baseLabel}
            units={units}
          />
        </article>
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>
                Largest variances vs {comparison}
              </h2>
              <p className={styles.cardSub}>
                Top 8 lines by size of Δ, {unitsLabel}
              </p>
            </div>
            <InfoPopover copy={infoCopy("variances", fill)} />
          </div>
          <VarianceTable rows={variances} units={units} />
        </article>
      </div>
    </section>
  );
}
