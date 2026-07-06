import styles from "./home-backdrop.module.css";

// Five horizontal bars, evenly stacked, with slight opacity variation for depth.
const bars = [
  { y: 9.17, opacity: 0.18 },
  { y: 27.34, opacity: 0.13 },
  { y: 45.5, opacity: 0.2 },
  { y: 63.67, opacity: 0.12 },
  { y: 81.84, opacity: 0.16 },
];

export function HomeBackdrop() {
  return (
    <svg
      className={styles.backdrop}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {bars.map((bar, i) => (
        <rect
          key={bar.y}
          className={styles.bar}
          x="0"
          y={bar.y}
          width="100"
          height="9"
          fillOpacity={bar.opacity}
          // Stagger each bar so they cascade top→bottom on load.
          style={{ animationDelay: `${0.05 + i * 0.1}s` }}
        />
      ))}
    </svg>
  );
}
