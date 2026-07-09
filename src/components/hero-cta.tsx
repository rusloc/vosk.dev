import type { CSSProperties } from "react";
import Link from "next/link";
import styles from "./hero-cta.module.css";

// Fixed table rather than Math.random(): the page is statically rendered, so
// runtime randomness would bake into the build. Irregular positions, sizes and
// non-repeating durations read as random; negative delays start each bar
// mid-cycle so they never pulse in unison. Alpha stays low enough that the
// bars glow against bg-foreground without competing with the label.
type Bar = [
  left: number, // %
  width: number, // px — 1-2 reads as a line, 4-6 as a bar
  height: number, // %
  fill: string, // rgba() body
  duration: number, // s
  delay: number, // s
];

const BARS: Bar[] = [
  [4, 1, 62, "79, 70, 229, 0.5", 1.7, -0.4],
  [11, 4, 38, "255, 153, 28, 0.35", 2.3, -1.5],
  [17, 2, 78, "45, 212, 191, 0.45", 1.1, -0.9],
  [24, 5, 30, "244, 114, 182, 0.28", 2.6, -2.1],
  [31, 1, 55, "255, 153, 28, 0.4", 1.9, -0.2],
  [39, 3, 85, "79, 70, 229, 0.55", 1.3, -1.1],
  [46, 2, 44, "45, 212, 191, 0.32", 2.1, -1.8],
  [54, 6, 68, "244, 114, 182, 0.3", 1.5, -0.6],
  [62, 1, 33, "79, 70, 229, 0.42", 2.7, -2.4],
  [69, 3, 72, "255, 153, 28, 0.5", 1.2, -0.3],
  [76, 2, 48, "45, 212, 191, 0.36", 2.4, -1.3],
  [83, 4, 81, "244, 114, 182, 0.26", 1.6, -0.8],
  [90, 1, 36, "255, 153, 28, 0.44", 2.0, -1.7],
  [96, 3, 59, "79, 70, 229, 0.38", 1.4, -2.6],
];

export function HeroCta() {
  return (
    <Link
      href="/work"
      className="bg-foreground text-background relative isolate inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-md px-7 text-sm font-medium transition-opacity hover:opacity-90"
    >
      <span className={styles.layer} aria-hidden="true">
        {BARS.map(([left, width, height, fill, duration, delay]) => (
          <span
            key={left}
            className={styles.bar}
            style={
              {
                left: `${left}%`,
                width: `${width}px`,
                height: `${height}%`,
                background: `rgba(${fill})`,
                "--duration": `${duration}s`,
                "--delay": `${delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </span>
      <span className={styles.label}>
        View case studies <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
