import styles from "./ask-ai.module.css";
import { ralewayFontVariable } from "./raleway-font";

/** The neon label: the second letter is the "faulty" one that flickers on its own (owner's design, 11-06). */
function NeonLabel({ label }: { label: string }) {
  return (
    <span className={styles.txt}>
      {label.slice(0, 1)}
      <span className={styles.faulty}>{label.slice(1, 2)}</span>
      {label.slice(2)}
    </span>
  );
}

/** The "Ask AI" trigger for <ReportDialog>: the neon button (11-06). */
export function askAiTrigger(label: string) {
  return {
    className: `${styles.glow} ${ralewayFontVariable}`,
    content: <NeonLabel label={label} />,
  };
}

/** The same button at 30px, for a report's own header (Mirelo, 11-06). */
export function askAiTriggerCompact(label: string) {
  return {
    className: `${styles.glow} ${styles.compact} ${ralewayFontVariable}`,
    content: <NeonLabel label={label} />,
  };
}

/** Questions the Mirelo chat offers before the first one is typed (owner, 11-06). */
export const MIRELO_SUGGESTIONS = [
  "Which market grew most vs last year?",
  "How has the approval rate moved over the last six months?",
  "Where is revenue behind budget?",
] as const;
