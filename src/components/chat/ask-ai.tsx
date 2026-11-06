import styles from "./ask-ai.module.css";

function Sparkle() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={styles.icon}
      aria-hidden="true"
    >
      <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

function SparkleLabel({ label }: { label: string }) {
  return (
    <>
      <Sparkle />
      {label}
    </>
  );
}

/** The "Ask AI" trigger for <ReportDialog>: the glowing pill and its sparkle (11-06). */
export function askAiTrigger(label: string) {
  return { className: styles.glow, content: <SparkleLabel label={label} /> };
}

/** The same button at 30px, for a report's own header (Mirelo, 11-06); `"marketing"`: ACME Marketing's 32px buttons and themes. */
export function askAiTriggerCompact(label: string, report?: "marketing") {
  return {
    className: `${styles.glow} ${styles.compact}${report === "marketing" ? ` ${styles.marketing}` : ""}`,
    content: <SparkleLabel label={label} />,
  };
}

/** Questions the Mirelo chat offers before the first one is typed (owner, 11-06). */
export const MIRELO_SUGGESTIONS = [
  "Which market grew most vs last year?",
  "How has the approval rate moved over the last six months?",
  "Where is revenue behind budget?",
] as const;

/** Questions the ACME Marketing chat offers before the first one is typed (11-06). */
export const MARKETING_SUGGESTIONS = [
  "Which channel brings paying customers at the lowest CAC?",
  "Which campaigns are flagged, and why?",
  "How has CAC moved over the last eight weeks?",
] as const;
