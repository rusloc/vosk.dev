"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import type { Selection } from "@/lib/pnl/engine/types";
import { AnalysisIcon, ProfitabilityIcon, TableIcon, TilesIcon } from "./icons";
import styles from "./ledger.module.css";

// Header (design guide §5.3): eyebrow with data status (N-02), title + context line (L-04), view tabs and the
// per-view toolbar. The company switch lives on the rail's brand mark (ADR-0007).

const TABS: readonly {
  key: Selection["view"];
  label: string;
  Icon: ComponentType;
}[] = [
  { key: "statement", label: "P&L statement", Icon: TableIcon },
  { key: "kpi", label: "Key figures", Icon: TilesIcon },
  { key: "analysis", label: "Analysis", Icon: AnalysisIcon },
  { key: "profitability", label: "Profitability", Icon: ProfitabilityIcon },
];

export function Header({
  sel,
  dataStatus,
  context,
  shareUrl,
  toolbar,
  onChange,
  onReset,
}: {
  sel: Selection;
  dataStatus: string;
  context: string;
  shareUrl: string;
  toolbar?: ReactNode; // the active view's own controls
  onChange: (patch: Partial<Selection>) => void;
  onReset: () => void;
}) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const copyLink = () =>
    navigator.clipboard.writeText(shareUrl).then(
      () => setCopy("copied"),
      () => setCopy("failed"),
    );

  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>
            ACME Group · Management reporting · {dataStatus}
          </span>
          <div className={styles.titleLine}>
            <h1 className={styles.title}>Profit &amp; loss</h1>
            <span className={styles.context}>{context}</span>
          </div>
        </div>
      </div>

      <div className={styles.headerBottom}>
        <div
          role="tablist"
          aria-label="View"
          className={styles.tabs}
          onKeyDown={(e) => {
            // N-08: arrow keys, Home and End move between tabs (automatic activation)
            const i = TABS.findIndex((t) => t.key === sel.view);
            const next =
              e.key === "ArrowRight"
                ? (i + 1) % TABS.length
                : e.key === "ArrowLeft"
                  ? (i - 1 + TABS.length) % TABS.length
                  : e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? TABS.length - 1
                      : -1;
            const tab = TABS[next];
            if (!tab) return;
            e.preventDefault();
            onChange({ view: tab.key });
            e.currentTarget.querySelectorAll("button")[next]?.focus();
          }}
        >
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={sel.view === key}
              aria-controls={`view-${key}`}
              tabIndex={sel.view === key ? 0 : -1}
              className={styles.tab}
              onClick={() => onChange({ view: key })}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
        <div className={styles.toolbar}>
          {toolbar}
          {/* F-35: defaults back, keeping the company and the view */}
          <button type="button" className={styles.linkButton} onClick={onReset}>
            Reset
          </button>
          {/* F-37: the link reopens the same selection */}
          <button
            type="button"
            className={styles.linkButton}
            onClick={copyLink}
            aria-live="polite"
          >
            {copy === "copied" ? "Link copied" : "Copy link"}
          </button>
          {copy === "failed" && (
            // Clipboard can be blocked: offer the link to copy by hand
            <input
              readOnly
              aria-label="Link to this view"
              className={styles.linkButton}
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>
      </div>
    </header>
  );
}
