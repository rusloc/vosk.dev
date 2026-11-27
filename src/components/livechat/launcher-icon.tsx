import styles from "./live-chat.module.css";

// One squared speech bubble in a 100 × 100 box: a rounded rectangle (x 18–82, y 20–64) with a small tail down-left.
const BUBBLE =
  "M28 20H72a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10H46L31 80V64H28a10 10 0 0 1-10-10V30a10 10 0 0 1 10-10Z";

/**
 * The closed launcher's face (owner, 11-27): on the button's black square, an orange-outlined bubble with three orange
 * typing dots inside, rising in turn (CSS only, live-chat.module.css; static under reduced motion). Decorative: the
 * button carries the name.
 */
export function LauncherIcon() {
  return (
    <span className={styles.launcherIcon} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <path d={BUBBLE} className={styles.bubble} />
      </svg>
      <span className={styles.dots}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
    </span>
  );
}
