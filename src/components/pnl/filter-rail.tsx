"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type { EntityView } from "@/lib/pnl/engine/types";
import {
  BarsIcon,
  CalendarIcon,
  FunnelIcon,
  RailToggleIcon,
  SlidersIcon,
} from "./icons";
import styles from "./ledger.module.css";
import { COMPANY_THEME } from "./theme";

// Filter rail (design guide §5.1): 64 px collapsed / 248 px expanded; the brand mark switches company (ADR-0007,
// L-01, F-01); four groups, one flyout at a time.

export type PanelKey = "period" | "versions" | "slice" | "display";

export const RAIL_WIDTH = { collapsed: 64, expanded: 248 } as const;
export const RAIL_GROUPS: readonly {
  key: PanelKey;
  label: string;
  Icon: ComponentType;
}[] = [
  { key: "period", label: "Period", Icon: CalendarIcon },
  { key: "versions", label: "Versions", Icon: BarsIcon },
  { key: "slice", label: "Slice", Icon: FunnelIcon },
  { key: "display", label: "Display", Icon: SlidersIcon },
];
export const railItemId = (key: PanelKey) => `rail-${key}`;

export interface Company {
  code: EntityView;
  name: string;
}

export function FilterRail({
  wide,
  onToggleWide,
  openPanel,
  onTogglePanel,
  summaries,
  entity,
  companies,
  onEntity,
}: {
  wide: boolean;
  onToggleWide: () => void;
  openPanel: PanelKey | null;
  onTogglePanel: (key: PanelKey) => void;
  summaries: Record<PanelKey, string>;
  entity: EntityView;
  companies: readonly Company[];
  onEntity: (entity: EntityView) => void;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <nav
      aria-label="Filters"
      className={styles.rail}
      style={{ width: wide ? RAIL_WIDTH.expanded : RAIL_WIDTH.collapsed }}
    >
      <div className={styles.brand}>
        <button
          id="rail-company"
          type="button"
          className={styles.brandMark}
          aria-label="Switch company"
          title="Switch company"
          aria-haspopup="dialog"
          aria-expanded={picking}
          onClick={() => setPicking((p) => !p)}
        >
          A
          <span aria-hidden="true" className={styles.brandCaret}>
            ▾
          </span>
        </button>
        {wide && (
          <div className={styles.brandText}>
            <span className={styles.brandName}>ACME P&amp;L</span>
            <span className={styles.railMuted}>
              {companies.find((c) => c.code === entity)?.name}
            </span>
          </div>
        )}
      </div>
      {picking && (
        <EntityPicker
          left={(wide ? RAIL_WIDTH.expanded : RAIL_WIDTH.collapsed) + 10}
          entity={entity}
          companies={companies}
          onPick={(code) => {
            setPicking(false);
            if (code !== entity) onEntity(code);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      <div className={styles.railSection}>
        {wide ? (
          "Filters"
        ) : (
          <span aria-hidden="true" className={styles.railDivider} />
        )}
      </div>
      {RAIL_GROUPS.map(({ key, label, Icon }) => (
        <button
          key={key}
          id={railItemId(key)}
          type="button"
          className={styles.railItem}
          aria-expanded={openPanel === key}
          aria-label={`${label}: ${summaries[key]}`}
          onClick={() => onTogglePanel(key)}
        >
          <Icon />
          {wide && (
            <span className={styles.railItemText}>
              <span className={styles.railItemLabel}>{label}</span>
              <span className={styles.railItemSummary}>{summaries[key]}</span>
            </span>
          )}
        </button>
      ))}
      <div className={styles.railSpacer} />
      <button
        type="button"
        className={styles.railItem}
        aria-label={wide ? "Collapse filter rail" : "Expand filter rail"}
        onClick={onToggleWide}
      >
        <RailToggleIcon expanded={wide} />
        {wide && <span className={styles.railItemLabel}>Collapse</span>}
      </button>
    </nav>
  );
}

/** The company picker (F-01, single select): Escape, outside click or a choice closes it; focus returns to the mark. */
function EntityPicker({
  left,
  entity,
  companies,
  onPick,
  onClose,
}: {
  left: number;
  entity: EntityView;
  companies: readonly Company[];
  onPick: (code: EntityView) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current
      ?.querySelector<HTMLButtonElement>("[aria-pressed=true]")
      ?.focus();
    const ctrl = new AbortController();
    const close = () => onClose();
    window.addEventListener("keydown", (e) => e.key === "Escape" && close(), {
      signal: ctrl.signal,
    });
    window.addEventListener(
      "pointerdown",
      (e) => {
        const target = e.target as Node;
        if (
          !ref.current?.contains(target) &&
          !document.getElementById("rail-company")?.contains(target)
        )
          close();
      },
      { signal: ctrl.signal },
    );
    return () => {
      ctrl.abort();
      document.getElementById("rail-company")?.focus();
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Switch company"
      className={styles.picker}
      style={{ left }}
    >
      <span className={styles.groupLabel}>Company</span>
      {companies.map((c) => {
        const theme = COMPANY_THEME[c.code];
        const selected = c.code === entity;
        return (
          <button
            key={c.code}
            type="button"
            aria-pressed={selected}
            className={styles.company}
            style={
              selected
                ? {
                    borderColor: theme.acc,
                    boxShadow: `0 0 0 1px ${theme.acc}`,
                    background: theme.accT,
                  }
                : undefined
            }
            onClick={() => onPick(c.code)}
          >
            <span
              aria-hidden="true"
              className={styles.companyDot}
              style={{ background: theme.acc }}
            />
            <span className={styles.companyText}>
              <span className={styles.companyName}>{c.name}</span>
              <span className={styles.caption}>{theme.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
