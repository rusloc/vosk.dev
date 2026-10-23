"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Manifest } from "@/lib/pnl/data/manifest";
import { toggleSlice } from "@/lib/pnl/state/selection-schema";
import type {
  BaseChoice,
  CompareChoice,
  Selection,
  TimeView,
} from "@/lib/pnl/engine/types";
import {
  RAIL_GROUPS,
  RAIL_WIDTH,
  railItemId,
  type PanelKey,
} from "./filter-rail";
import { CheckIcon, CloseIcon, InfoIcon } from "./icons";
import styles from "./ledger.module.css";
import { Segmented, SwitchRow, type Option } from "./primitives";

// Filter flyout (design guide §5.2): one open at a time, pointer at its rail item; Escape, ✕ and Done close it;
// focus moves to ✕ on open and back to the rail item on close (N-08). "Reset this group" restores the group's
// defaults (F-35).

export type Patch = Partial<Selection>;

const GROUP_FIELDS: Record<PanelKey, readonly (keyof Selection)[]> = {
  period: ["fy", "month", "timeView"],
  versions: ["base", "compareA", "compareB"],
  slice: ["region", "channel", "line", "segment"],
  display: [
    "currency",
    "fxBasis",
    "units",
    "costSign",
    "varianceFormat",
    "showPctNr",
    "showFyOutlook",
    "showTags",
    "hideEmpty",
  ],
};

// Rail geometry (§5.1): first item centre at 124 px (padding 12 + brand 44 + 12 + gap 4 + section 24 + gap 4 + 24),
// item pitch 48 + gap 4; the flyout sits at top 92 and the 12 px pointer is centred on the item.
const POINTER_TOP = 124 - 92 - 6;
const RAIL_ITEM_PITCH = 52;

const TITLES: Record<PanelKey, [string, string]> = {
  period: ["Period", "Year, month and time view"],
  versions: ["Versions", "Base and two comparisons"],
  slice: ["Slice", "Region, channel, category and segment"],
  display: ["Display", "Currency, units and table options"],
};

interface PanelProps {
  sel: Selection;
  manifest: Manifest;
  onChange: (patch: Patch) => void;
}

export function Flyout({
  panel,
  wide,
  sel,
  defaults,
  manifest,
  onChange,
  onClose,
}: PanelProps & {
  panel: PanelKey;
  wide: boolean;
  defaults: Selection;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    return () => document.getElementById(railItemId(panel))?.focus();
  }, [panel]);

  useEffect(() => {
    const ctrl = new AbortController();
    window.addEventListener("keydown", (e) => e.key === "Escape" && onClose(), {
      signal: ctrl.signal,
    });
    return () => ctrl.abort();
  }, [onClose]);

  const [title, subtitle] = TITLES[panel];
  const index = RAIL_GROUPS.findIndex((g) => g.key === panel);
  const props = { sel, manifest, onChange };
  const reset = () =>
    onChange(
      Object.fromEntries(GROUP_FIELDS[panel].map((f) => [f, defaults[f]])),
    );

  return (
    <div
      className={styles.flyout}
      style={{ left: (wide ? RAIL_WIDTH.expanded : RAIL_WIDTH.collapsed) + 10 }}
    >
      <div
        aria-hidden="true"
        className={styles.flyoutPointer}
        style={{ top: POINTER_TOP + index * RAIL_ITEM_PITCH }}
      />
      <div
        role="dialog"
        aria-label={`${title} filters`}
        className={styles.flyoutCard}
      >
        <div className={styles.flyoutHead}>
          <div>
            <div className={styles.flyoutTitle}>{title}</div>
            <div className={styles.caption}>{subtitle}</div>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            className={styles.close}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        <div className={styles.flyoutBody}>
          {panel === "period" && <PeriodPanel {...props} />}
          {panel === "versions" && <VersionsPanel {...props} />}
          {panel === "slice" && <SlicePanel {...props} />}
          {panel === "display" && <DisplayPanel {...props} />}
        </div>
        <div className={styles.flyoutFoot}>
          <button type="button" className={styles.resetLink} onClick={reset}>
            Reset this group
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({
  label,
  count,
  children,
}: {
  label: string;
  count?: string; // multi-selects: "All 4" / "2 of 4" (design guide §5.2)
  children: ReactNode;
}) {
  return (
    <div className={styles.group}>
      <span className={styles.groupLabel}>
        {label}
        {count && <span>{count}</span>}
      </span>
      {children}
    </div>
  );
}

const TIME_VIEWS: readonly Option<TimeView>[] = [
  { value: "MTD", label: "Month" },
  { value: "QTD", label: "QTD" },
  { value: "YTD", label: "YTD" },
  { value: "LTM", label: "LTM" },
  { value: "FY", label: "FY" },
];

// F-02 … F-04
function PeriodPanel({ sel, manifest, onChange }: PanelProps) {
  const months = manifest.tables.dim_month;
  const years = [...new Set(months.map((d) => d.fiscal_year))];
  return (
    <>
      <Group label="Fiscal year">
        <Segmented
          label="Fiscal year"
          value={String(sel.fy)}
          options={years.map((y) => ({ value: String(y), label: `FY${y}` }))}
          onChange={(v) => onChange({ fy: Number(v) })}
        />
      </Group>
      <Group label="Month">
        <div role="group" aria-label="Month" className={styles.monthGrid}>
          {months
            .filter((d) => d.fiscal_year === sel.fy)
            .map((d) => (
              <button
                key={d.month_key}
                type="button"
                aria-pressed={d.month_number === sel.month}
                aria-label={
                  d.is_closed ? d.month_name : `${d.month_name} (open month)`
                }
                className={`${styles.month} ${d.is_closed ? "" : styles.monthOpen}`}
                onClick={() =>
                  onChange({
                    month:
                      d.month_number as Selection["month"] /* dim_month schema: 1 … 12 */,
                  })
                }
              >
                {d.month_name}
              </button>
            ))}
        </div>
        <span className={styles.caption}>
          Dashed months are still open. Actual shows closed months only; Latest
          estimate and Budget cover them.
        </span>
      </Group>
      <Group label="Time view">
        <Segmented
          label="Time view"
          value={sel.timeView}
          options={TIME_VIEWS}
          onChange={(timeView) => onChange({ timeView })}
        />
      </Group>
    </>
  );
}

const COMPARES: readonly Option<CompareChoice>[] = [
  { value: "B", label: "Budget" },
  { value: "LE", label: "Latest est." },
  { value: "PY", label: "Prior year" },
  { value: "NONE", label: "None" },
];

// F-05 … F-07
function VersionsPanel({ sel, manifest, onChange }: PanelProps) {
  const closed = manifest.tables.dim_month.filter((d) => d.is_closed);
  const last = closed[closed.length - 1];
  const latest = manifest.tables.dim_version.find((v) => v.is_latest_forecast);
  const bases: readonly {
    value: BaseChoice;
    label: string;
    description: string;
  }[] = [
    {
      value: "A",
      label: "Actual",
      description: `Closed months only, through ${last ? `${last.month_name} ${last.fiscal_year}` : "the last close"}`,
    },
    {
      value: "LE",
      label: "Latest estimate",
      description: `Actual for closed months plus ${latest?.version_name ?? "the latest forecast"}`,
    },
    {
      value: "B",
      label: "Budget",
      description: `Approved FY${sel.fy} budget, phased by month`,
    },
  ];
  return (
    <>
      <Group label="Base version">
        <div
          role="radiogroup"
          aria-label="Base version"
          className={styles.group}
        >
          {bases.map((b) => (
            <label
              key={b.value}
              className={`${styles.radioCard} ${sel.base === b.value ? styles.radioCardOn : ""}`}
            >
              <input
                type="radio"
                name="base-version"
                checked={sel.base === b.value}
                onChange={() => onChange({ base: b.value })}
              />
              <span className={styles.radioText}>
                <span className={styles.radioTitle}>{b.label}</span>
                <span className={styles.caption}>{b.description}</span>
              </span>
            </label>
          ))}
        </div>
      </Group>
      <Group label="Compare A">
        <Segmented
          label="Compare A"
          value={sel.compareA}
          options={COMPARES}
          onChange={(compareA) => onChange({ compareA })}
        />
      </Group>
      <Group label="Compare B">
        <Segmented
          label="Compare B"
          value={sel.compareB}
          options={COMPARES}
          onChange={(compareB) => onChange({ compareB })}
        />
        <span className={styles.caption}>
          Comparisons always cover the same months as the base.
        </span>
      </Group>
    </>
  );
}

// F-08 … F-11: chips per slot (design guide §5.2). F-33: never empty, Select all; F-32: in the Group view the three
// company-specific slots are off and say why; region stays.
function SlicePanel({ sel, manifest, onChange }: PanelProps) {
  const t = manifest.tables;
  const own = <
    R extends {
      entity_code: string;
      is_unassigned: boolean;
      sort_order: number;
    },
  >(
    rows: readonly R[],
  ) =>
    rows
      .filter((r) => r.entity_code === sel.entity && !r.is_unassigned)
      .sort((a, b) => a.sort_order - b.sort_order);
  const slotLabel = (
    rows: readonly { entity_code: string; slot_label: string }[],
    fallback: string,
  ) =>
    rows.find(
      (r) => r.entity_code === (sel.entity === "GROUP" ? "P" : sel.entity),
    )?.slot_label ?? fallback;
  const slots: {
    field: "region" | "channel" | "line" | "segment";
    label: string;
    options: { code: string; name: string }[];
  }[] = [
    {
      field: "region",
      label: "Region",
      options: [...t.dim_region]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((r) => ({ code: r.region_code, name: r.region_name })),
    },
    {
      field: "channel",
      label: slotLabel(t.dim_channel, "Channel"),
      options: own(t.dim_channel).map((r) => ({
        code: r.channel_code,
        name: r.channel_name,
      })),
    },
    {
      field: "line",
      label: slotLabel(t.dim_line, "Category"),
      options: own(t.dim_line).map((r) => ({
        code: r.line_code,
        name: r.line_name,
      })),
    },
    {
      field: "segment",
      label: slotLabel(t.dim_segment, "Segment"),
      options: own(t.dim_segment).map((r) => ({
        code: r.segment_code,
        name: r.segment_name,
      })),
    },
  ];
  const group = sel.entity === "GROUP";
  return (
    <>
      {group && (
        <div className={styles.noticeBox}>
          <InfoIcon />
          <span>
            ACME Group: channel, category and segment differ by company, so they
            are off here (All, consolidated). Region applies.
          </span>
        </div>
      )}
      {slots.map(({ field, label, options }) => {
        if (group && field !== "region")
          return (
            <Group key={field} label={label}>
              <div className={styles.disabledRow} aria-disabled="true">
                All (consolidated)
              </div>
            </Group>
          );
        const all = options.map((o) => o.code);
        const chosen = sel[field];
        const on = (code: string) => chosen.includes(code);
        const count =
          chosen.length === 0
            ? `All ${all.length}`
            : `${chosen.length} of ${all.length}`;
        return (
          <Group key={field} label={label} count={count}>
            <div role="group" aria-label={label} className={styles.chips}>
              <button
                type="button"
                aria-pressed={chosen.length === 0}
                className={styles.chip}
                onClick={() => onChange({ [field]: [] })}
              >
                {chosen.length === 0 && <CheckIcon />}
                Select all
              </button>
              {options.map((o) => (
                <button
                  key={o.code}
                  type="button"
                  aria-pressed={on(o.code)}
                  className={styles.chip}
                  onClick={() =>
                    onChange({ [field]: toggleSlice(chosen, all, o.code) })
                  }
                >
                  {on(o.code) && <CheckIcon />}
                  {o.name}
                </button>
              ))}
            </div>
          </Group>
        );
      })}
      <span className={styles.caption}>
        Lines from operating expenses down are not booked to channel, category
        or segment; with one of these filters on they are shared out by net
        revenue (alloc.).
      </span>
    </>
  );
}

// F-12 … F-17
function DisplayPanel({ sel, manifest, onChange }: PanelProps) {
  const p = manifest.tables;
  return (
    <>
      <Group label="Currency">
        <Segmented
          label="Currency"
          value={sel.currency}
          options={p.param_reporting_currency.map((c) => ({
            value: c.currency_code,
            label: c.currency_code,
          }))}
          onChange={(currency) => onChange({ currency })}
        />
      </Group>
      <Group label="FX basis">
        <Segmented
          label="FX basis"
          value={sel.fxBasis}
          options={[
            { value: "ACT", label: "Actual rates" },
            { value: "CC", label: "Constant currency" },
          ]}
          onChange={(fxBasis) => onChange({ fxBasis })}
        />
      </Group>
      <div className={styles.split}>
        <Group label="Units">
          <Segmented
            label="Units"
            value={sel.units}
            options={[
              { value: "M", label: "m" },
              { value: "K", label: "k" },
            ]}
            onChange={(units) => onChange({ units })}
          />
        </Group>
        <Group label="Costs shown">
          <Segmented
            label="Costs shown"
            value={sel.costSign}
            options={[
              { value: "NEG", label: "−" },
              { value: "POS", label: "+" },
            ]}
            onChange={(costSign) => onChange({ costSign })}
          />
        </Group>
      </div>
      <Group label="Variance">
        <Segmented
          label="Variance format"
          value={sel.varianceFormat}
          options={[
            { value: "BOTH", label: "Amount and %" },
            { value: "ABS", label: "Amount" },
            { value: "PCT", label: "%" },
          ]}
          onChange={(varianceFormat) => onChange({ varianceFormat })}
        />
      </Group>
      <Group label="Statement shows">
        <div>
          <SwitchRow
            label="% of net revenue column"
            checked={sel.showPctNr}
            onChange={(showPctNr) => onChange({ showPctNr })}
          />
          <SwitchRow
            label="Full-year outlook columns"
            checked={sel.showFyOutlook}
            onChange={(showFyOutlook) => onChange({ showFyOutlook })}
          />
          <SwitchRow
            label="Classification tags"
            checked={sel.showTags}
            onChange={(showTags) => onChange({ showTags })}
          />
          <SwitchRow
            label="Hide empty lines"
            checked={sel.hideEmpty}
            onChange={(hideEmpty) => onChange({ hideEmpty })}
          />
        </div>
      </Group>
    </>
  );
}
