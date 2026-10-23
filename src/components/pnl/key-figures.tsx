import { formatKpi, formatKpiDelta, type Units } from "@/lib/pnl/engine/format";
import type { KpiComparison, KpiTile } from "@/lib/pnl/engine/kpis";
import styles from "./views.module.css";

// Key figures (L-06, design guide §6.2, kpi-card-v2): eight financial and four operational tiles. Each comparison
// row is a diverging bar where right always means better, on one scale for every tile (±20 % for amount Δ %, ±5 pp
// for ratio Δ), capped at the track's end with a chevron. Renders engine values only.

const SCALE_PCT = 0.2;
const SCALE_PP = 0.05;

export interface KpiFormatting {
  units: Units & { suffix: string };
  symbol: string;
}

function CompareRow({
  name,
  c,
  tile,
}: {
  name: string;
  c: KpiComparison;
  tile: KpiTile;
}) {
  const ratio = tile.format === "percent" || tile.format === "rate";
  const raw = ratio ? c.delta : c.deltaPct;
  // A Δ that shows as 0.0 carries no arrow, colour or bar (as in the statement)
  const x = raw !== null && Math.abs(raw) < 0.0005 ? 0 : raw;
  const favourable = x === 0 ? null : c.favourable;
  const tone = favourable === null ? "" : favourable ? styles.fav : styles.unf;
  if (c.value === null || x === null)
    return (
      <div className={styles.compare}>
        <span className={styles.compareName}>{name}</span>
        <span className={styles.track} />
        <span className={styles.compareDelta}>n/a</span>
      </div>
    );
  const share = Math.abs(x) / (ratio ? SCALE_PP : SCALE_PCT);
  const half = Math.min(1, share) * 50;
  // right = better: favourable grows right, unfavourable left; a neutral KPI always right, by size, uncoloured
  const right = favourable !== false;
  const arrow = x > 0 ? "▲" : x < 0 ? "▼" : "";
  return (
    <div className={styles.compare}>
      <span className={styles.compareName}>{name}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.centre} />
        {x !== 0 && (
          <span
            className={`${styles.bar} ${favourable === null ? styles.barNeutral : favourable ? styles.barFav : styles.barUnf}`}
            style={{
              left: `${right ? 50 : 50 - half}%`,
              width: `${Math.max(half, 0.8)}%`,
            }}
          />
        )}
        {share > 1 && (
          <span
            className={styles.capped}
            style={right ? { right: -8 } : { left: -8 }}
          >
            {right ? "›" : "‹"}
          </span>
        )}
      </span>
      <span className={`${styles.compareDelta} ${tone}`}>
        {arrow && <span aria-hidden="true">{arrow} </span>}
        {formatKpiDelta(c, tile.format)}
      </span>
    </div>
  );
}

function Tile({
  tile,
  names,
  fmt,
}: {
  tile: KpiTile;
  names: { a: string; b: string };
  fmt: KpiFormatting;
}) {
  return (
    <article
      className={`${styles.tile} ${tile.group === "operational" ? styles.tileOps : ""}`}
      aria-label={tile.label}
    >
      <span className={styles.tileLabel} title={tile.definition}>
        {tile.label}
      </span>
      <span className={styles.tileValue}>
        {formatKpi(tile.value, tile.format, fmt.units, fmt.symbol)}
      </span>
      {tile.sub && (
        <span className={styles.tileSub}>
          {tile.sub.label}{" "}
          {formatKpi(tile.sub.value, tile.sub.format, fmt.units, fmt.symbol)}
        </span>
      )}
      {(tile.compareA || tile.compareB) && (
        <div className={styles.compares}>
          {tile.compareA && (
            <CompareRow name={names.a} c={tile.compareA} tile={tile} />
          )}
          {tile.compareB && (
            <CompareRow name={names.b} c={tile.compareB} tile={tile} />
          )}
        </div>
      )}
    </article>
  );
}

export function KeyFigures({
  tiles,
  names,
  fmt,
}: {
  tiles: readonly KpiTile[];
  names: { a: string; b: string }; // "vs Budget", "vs Prior year"
  fmt: KpiFormatting;
}) {
  const group = (g: KpiTile["group"]) =>
    tiles
      .filter((t) => t.group === g)
      .map((t) => <Tile key={t.id} tile={t} names={names} fmt={fmt} />);
  return (
    <section
      id="view-kpi"
      role="tabpanel"
      aria-label="Key figures"
      className={styles.view}
    >
      <h2 className={styles.section}>Financial</h2>
      <div className={styles.grid4}>{group("financial")}</div>
      <h2 className={styles.section}>Operational</h2>
      <div className={styles.grid4}>{group("operational")}</div>
    </section>
  );
}

/**
 * Toolbar for the view (design guide §5.3): what the deltas compare with, and the colour legend. The pills carry no
 * arrows: on a tile the arrow shows direction and the colour whether it helps (§2), so "▲ favourable" would mislead
 * on a cost that rises.
 */
export function KeyFiguresToolbar({ caption }: { caption: string }) {
  return (
    <span className={styles.legend}>
      {caption}
      <span className={`${styles.pill} ${styles.pillFav}`}>favourable</span>
      <span className={`${styles.pill} ${styles.pillUnf}`}>unfavourable</span>
    </span>
  );
}
