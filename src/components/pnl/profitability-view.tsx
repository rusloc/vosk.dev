import type { ProfitabilityRow } from "@/lib/pnl/engine/analysis";
import {
  formatAmount,
  formatPercent,
  type Units,
} from "@/lib/pnl/engine/format";
import { infoCopy } from "./info-copy";
import { InfoPopover } from "./info-popover";
import styles from "./views.module.css";

// Profitability (L-09, C-46, design guide §6.4): the table by the chosen breakdown and the contribution-margin bars
// with the company average marked. Renders engine values only.

const CM_SCALE = 0.6; // bars run 0–60 %

export function ProfitabilityView({
  rows,
  total,
  comparison,
  breakdown,
  units,
  unitsLabel,
  allocated,
}: {
  rows: readonly ProfitabilityRow[];
  total: ProfitabilityRow;
  comparison: string; // "Budget", "Prior year", …
  breakdown: string; // "Channel", "Region", …
  units: Units;
  unitsLabel: string; // "USD m"
  allocated: boolean; // margins below CM are partly allocated (C-31)
}) {
  const fill = {
    comparison: comparison.toLowerCase(),
    breakdown: breakdown.toLowerCase(),
  };
  const tone = (r: ProfitabilityRow) =>
    r.favourable === null ? "" : r.favourable ? styles.fav : styles.unf;
  const pct = (v: number | null) => formatPercent(v);
  const average = total.cm;

  const row = (r: ProfitabilityRow, foot = false) => (
    <tr key={r.key}>
      <td>{r.label}</td>
      <td>{formatAmount(r.netRevenue, units)}</td>
      <td>
        <span className={styles.share}>
          {!foot && (
            <span className={styles.shareTrack} aria-hidden="true">
              <span
                className={styles.shareFill}
                style={{
                  width: `${Math.max(0, Math.min(1, r.share ?? 0)) * 100}%`,
                }}
              />
            </span>
          )}
          {pct(r.share)}
        </span>
      </td>
      <td className={tone(r)} style={{ fontWeight: 600 }}>
        {formatPercent(r.growth, 1, { signed: true })}
      </td>
      <td>{pct(r.gm)}</td>
      <td>{pct(r.cm)}</td>
      <td>{pct(r.ebitda)}</td>
      <td>{pct(r.op)}</td>
    </tr>
  );

  return (
    <section
      id="view-profitability"
      role="tabpanel"
      aria-label="Profitability"
      className={styles.view}
    >
      <div
        className={styles.split}
        style={{ gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)" }}
      >
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>
                Profitability by {fill.breakdown}
              </h2>
              <p className={styles.cardSub}>
                Net revenue in {unitsLabel}; growth vs {comparison}; margins as
                % of each row&apos;s net revenue
              </p>
            </div>
            <InfoPopover copy={infoCopy("profitability", fill)} />
          </div>
          <table className={styles.profit}>
            <thead>
              <tr>
                <th colSpan={4} />
                <th colSpan={4} className={styles.marginGroup}>
                  Margin, % of net revenue
                </th>
              </tr>
              <tr>
                <th scope="col">{breakdown}</th>
                <th scope="col">Net revenue</th>
                <th scope="col">Share</th>
                <th scope="col">vs {comparison}</th>
                <th scope="col">Gross</th>
                <th scope="col">Contribution</th>
                <th scope="col">Adj. EBITDA</th>
                <th scope="col">Operating</th>
              </tr>
            </thead>
            <tbody>{rows.map((r) => row(r))}</tbody>
            <tfoot>{row(total, true)}</tfoot>
          </table>
          <p className={styles.note}>
            {allocated
              ? `Costs not booked to a ${fill.breakdown} — operating expenses and below — are shared out by net revenue, so margins below contribution are partly an allocation.`
              : "Growth is net revenue vs the comparison over the same months."}
          </p>
        </article>
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>
                Contribution margin by {fill.breakdown}
              </h2>
              <p className={styles.cardSub}>
                % of net revenue; dashed line = average {pct(average)}
              </p>
            </div>
            <InfoPopover copy={infoCopy("cm", fill)} />
          </div>
          {rows
            .filter((r) => r.cm !== null)
            .map((r) => (
              <div key={r.key} className={styles.cmRow}>
                <span className={styles.cmName}>{r.label}</span>
                <span className={styles.cmTrack} aria-hidden="true">
                  <span
                    className={styles.cmFill}
                    style={{
                      width: `${Math.max(0, Math.min(1, (r.cm ?? 0) / CM_SCALE)) * 100}%`,
                    }}
                  />
                  {average !== null && (
                    <span
                      className={styles.cmAverage}
                      style={{
                        left: `${Math.max(0, Math.min(1, average / CM_SCALE)) * 100}%`,
                      }}
                    />
                  )}
                </span>
                <span className={styles.cmValue}>{pct(r.cm)}</span>
              </div>
            ))}
        </article>
      </div>
    </section>
  );
}
