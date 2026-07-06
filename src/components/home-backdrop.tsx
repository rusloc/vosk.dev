import styles from "./home-backdrop.module.css";

// Five bars clustered around the vertical center. From top to bottom:
//  - color steps from black up ~10% lightness each (#000 → #666)
//  - width decreases linearly from 75% to 25% of the screen
//  - each is 10% of the viewport height thick, with small gaps (close together)
const BAR_HEIGHT = 10;
const BAR_GAP = 2.5;
const BAR_COUNT = 5;
// Centre the whole stack vertically in the 0–100 viewBox.
const STACK_TOP = (100 - (BAR_COUNT * BAR_HEIGHT + (BAR_COUNT - 1) * BAR_GAP)) / 2;

const bars = [
  { fill: "#000000", width: 75 },
  { fill: "#1a1a1a", width: 62.5 },
  { fill: "#333333", width: 50 },
  { fill: "#4d4d4d", width: 37.5 },
  { fill: "#666666", width: 25 },
];

export function HomeBackdrop() {
  return (
    <div className={styles.backdrop}>
      <svg
        className={styles.svg}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {bars.map((bar, i) => (
          <rect
            key={bar.fill}
            className={styles.bar}
            x="0"
            y={STACK_TOP + i * (BAR_HEIGHT + BAR_GAP)}
            width={bar.width}
            height={BAR_HEIGHT}
            fill={bar.fill}
            // Stagger each bar so they cascade top→bottom on load.
            style={{ animationDelay: `${0.05 + i * 0.1}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
