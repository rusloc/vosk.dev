import styles from "./home-backdrop.module.css";

// Five decorative bars clustered around the vertical center, expanding
// left→right once on load. Widths shrink 75% → 25% of the viewport; each bar
// is right-rounded (~8px) and filled with a left→right opacity gradient.
const BAR_WIDTHS = [75, 62.5, 50, 37.5, 25];

export function HomeBackdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      {BAR_WIDTHS.map((width, i) => (
        <div
          key={width}
          className={styles.bar}
          // Stagger each bar so they cascade top→bottom on load.
          style={{ width: `${width}%`, animationDelay: `${0.05 + i * 0.1}s` }}
        />
      ))}
    </div>
  );
}
