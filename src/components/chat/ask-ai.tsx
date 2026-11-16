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

/**
 * The same button at 30px, for a report's own header (Mirelo, 11-06); `"marketing"`: ACME Marketing's 32px buttons and
 * themes; `"pnl"`: the P&L's 36px toolbar buttons in the Ledger palette, the glow in the company colour (11-09);
 * `"nordmark"`: the Nordmark header, after its refresh stamp (11-15).
 */
export function askAiTriggerCompact(
  label: string,
  report?: "marketing" | "pnl" | "trucks" | "nordmark",
) {
  return {
    className: `${styles.glow} ${styles.compact}${report ? ` ${styles[report]}` : ""}`,
    content: <SparkleLabel label={label} />,
  };
}

/** Questions the Mirelo chat offers before the first one is typed (owner, 11-06). */
export const MIRELO_SUGGESTIONS = [
  "Which market grew most vs last year?",
  "How has the approval rate moved over the last six months?",
  "Where is revenue behind budget?",
] as const;

/** Questions the P&L chat offers before the first one is typed (11-09). */
export const PNL_SUGGESTIONS = [
  "Where are we against budget on net revenue and EBITDA?",
  "Which lines drove the variance vs budget?",
  "What is the full-year outlook vs budget?",
] as const;

/** Questions the ACME Trucks chat offers before the first one is typed (11-09); each is in its answer key. */
export const TRUCKS_SUGGESTIONS = [
  "How does effective work time compare with plan?",
  "How does truck loading compare with plan?",
  "What is performance per truck against plan?",
] as const;

/** Questions the Nordmark executive dashboard's chat offers before the first one is typed (11-15); each is in its answer
 *  key (data/nordmark/checks/chat-golden.csv): the three lead KPIs at the opening view. */
export const NORDMARK_SUGGESTIONS = [
  "How are net sales doing against budget this week?",
  "How has total margin moved against last year?",
  "Are weeks of cover on target?",
] as const;

/** Questions the ACME Marketing chat offers before the first one is typed (11-06). */
export const MARKETING_SUGGESTIONS = [
  "Which channel brings paying customers at the lowest CAC?",
  "Which campaigns are flagged, and why?",
  "How has CAC moved over the last eight weeks?",
] as const;

/** Questions the Tidewell data chat offers before the first one is typed (11-16): one per scope, then the email. */
export const CEO_DIGEST_SUGGESTIONS = [
  "Which marketing channel had the lowest CAC in the last 4 weeks?",
  "How much cash came in and went out last month?",
  "Who are the top 5 clients by overdue amount?",
  "Email me the marketing report for last month.",
] as const;

/** The Tidewell data chat's own lines: a chat over a company's data, with no report beside it (11-16). */
export const CEO_DIGEST_CHAT_COPY = {
  note: "AI assistant · answers come from the demo company's data (made up); the figures sit under each answer.",
  intro:
    "Ask about marketing, cash flow or clients, or have a report emailed to you. Start with one of these:",
  placeholder: "Ask about the data…",
  working: "Looking at the data…",
} as const;
