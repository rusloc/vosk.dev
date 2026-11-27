import styles from "./live-chat.module.css";

// Two speech bubbles in a 100 × 100 box (owner's reference, 11-27): the front one outlined on the page colour, its tail
// down-left; the back one solid, offset down-right, its tail down-right, cut away by a gap around the front one.
const FRONT =
  "M21 7H60a14 14 0 0 1 14 14v21a14 14 0 0 1-14 14H37L18 75l3-19a14 14 0 0 1-14-14V21A14 14 0 0 1 21 7Z";
const BACK =
  "M46 26H80a16 16 0 0 1 16 16v24a16 16 0 0 1-16 16L81.5 97 63 82H46a16 16 0 0 1-16-16V42a16 16 0 0 1 16-16Z";

/**
 * The closed launcher's face: the bubbles, and three typing dots in the front one, rising in turn (owner, 11-27; CSS
 * only, live-chat.module.css; static under reduced motion). Decorative: the button carries the name.
 */
export function LauncherIcon({ maskId: rawId }: { maskId: string }) {
  // useId may hold ":" or "«»", which break a url(#…) reference.
  const maskId = `lc-mask-${rawId.replace(/[^\w-]/g, "")}`;
  return (
    <span className={styles.launcherIcon} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="text-foreground h-full w-full">
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="100"
          height="100"
        >
          <rect width="100" height="100" fill="#fff" />
          <path
            d={FRONT}
            fill="#000"
            stroke="#000"
            strokeWidth="17"
            strokeLinejoin="round"
          />
        </mask>
        <path d={BACK} fill="currentColor" mask={`url(#${maskId})`} />
        <path
          d={FRONT}
          fill="var(--background)"
          stroke="currentColor"
          strokeWidth="6.5"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.dots}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
    </span>
  );
}
