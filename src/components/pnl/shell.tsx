"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createDatasetLoader, type Dataset } from "@/lib/pnl/data/dataset";
import { createEngine, type Against } from "@/lib/pnl/engine";
import { activeSlices, windowLabel } from "@/lib/pnl/engine/notices";
import type { EntityCode, EntityView, Selection } from "@/lib/pnl/engine/types";
import {
  createSelectionCodec,
  parseEntity,
  resetSelection,
  switchEntity,
  type SliceMemory,
} from "@/lib/pnl/state/selection-schema";
import { AnalysisView } from "./analysis-view";
import { FilterRail, type Company, type PanelKey } from "./filter-rail";
import { pnlFontVariables } from "./fonts";
import { Flyout } from "./flyout";
import { Header } from "./header";
import { InfoIcon } from "./icons";
import { KeyFigures, KeyFiguresToolbar } from "./key-figures";
import styles from "./ledger.module.css";
import { Segmented } from "./primitives";
import { ProfitabilityView } from "./profitability-view";
import { StatementTable } from "./statement-table";
import { themeVars } from "./theme";

// Client root (ADR-0002 §2.5): loads public/data/pnl, owns the Selection and passes engine results down.
// Orchestration only: every number comes from lib/engine. Embedded in the site's report popup, the Selection lives
// in React state as its query string (same codec as the standalone app's URL, F-37), not in the page URL.

const loader = createDatasetLoader(async (name) => {
  const res = await fetch(`/data/pnl/${name}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.arrayBuffer();
});

const FILES: Record<EntityView, readonly EntityCode[]> = {
  P: ["P"],
  S: ["S"],
  GROUP: ["P", "S"], // the Group view needs both companies (ADR-0002 §2.2)
};

const SHORT = { B: "Budget", LE: "Latest est.", PY: "Prior year" } as const;
const BASE = { A: "Actual", LE: "Latest estimate", B: "Budget" } as const;

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entity: EntityView; dataset: Dataset };

export function Shell() {
  // A shared link (F-37) carries the state in the page URL. The report only ever renders in the browser (inside the
  // popup, after a click or a shared link), so reading `window` here is safe.
  const [search, setSearch] = useState(() => window.location.search.slice(1));
  const entity = parseEntity(new URLSearchParams(search));
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // The last dataset stays on screen while another company's file loads, so a switch never blanks the report.
  const [shown, setShown] = useState<Dataset | null>(null);
  // F-30 memory lives here, above the report, so it survives the report unmounting while a file loads.
  const [memory, setMemory] = useState<SliceMemory>({});

  // Synchronise with the external data files; a stale response for another entity is ignored.
  useEffect(() => {
    let live = true;
    loader.load(FILES[entity]).then(
      (dataset) => {
        if (!live) return;
        setLoad({ status: "ready", entity, dataset });
        setShown(dataset);
      },
      (error: unknown) =>
        live &&
        setLoad({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        }),
    );
    return () => {
      live = false;
    };
  }, [entity, attempt]);

  const ready = load.status === "ready" && load.entity === entity;
  const dataset = ready ? load.dataset : null;
  const fallback =
    shown && FILES[entity].every((e) => shown.pl.has(e)) ? shown : null;
  if (dataset ?? fallback)
    return (
      <Ledger
        dataset={(dataset ?? fallback) as Dataset}
        search={search}
        onSearch={setSearch}
        memory={memory}
        onMemory={setMemory}
      />
    );
  return (
    <div
      className={`${styles.app} ${pnlFontVariables}`}
      style={themeVars(entity)}
    >
      <main className={styles.main}>
        <div className={styles.content}>
          {load.status === "error" ? (
            <p role="alert" className={styles.state}>
              The P&amp;L data could not be loaded ({load.message}).
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setAttempt((a) => a + 1)}
              >
                Retry
              </button>
            </p>
          ) : (
            <p className={styles.state}>Loading the P&amp;L…</p>
          )}
        </div>
      </main>
    </div>
  );
}

function Ledger({
  dataset,
  search,
  onSearch,
  memory,
  onMemory,
}: {
  dataset: Dataset;
  search: string;
  onSearch: (search: string) => void;
  memory: SliceMemory;
  onMemory: (memory: SliceMemory) => void;
}) {
  const m = dataset.manifest;
  const codec = useMemo(() => createSelectionCodec(m), [m]);
  const engine = useMemo(() => createEngine(dataset), [dataset]);
  const sel = useMemo(
    () => codec.parse(new URLSearchParams(search)),
    [codec, search],
  );
  const canonical = codec.serialize(sel);

  const update = useCallback(
    (patch: Partial<Selection>) =>
      onSearch(codec.serialize({ ...sel, ...patch })),
    [codec, sel, onSearch],
  );
  const onEntity = (to: EntityView) => {
    const next = switchEntity(sel, to, memory, codec.defaults);
    onMemory(next.memory);
    onSearch(codec.serialize(next.sel));
  };

  const [wide, setWide] = useState(false);
  const [panel, setPanel] = useState<PanelKey | null>(null);
  const closePanel = useCallback(() => setPanel(null), []);
  // The comparison the Analysis and Profitability views use (C-40): Compare A unless the toolbar picks B.
  const [against, setAgainst] = useState<Against>("A");

  // M-20 / M-21 (ADR-0007): collapsed by default; expansion persists across filter changes and resets to collapsed
  // when the company changes.
  const [expansion, setExpansion] = useState({
    key: sel.entity,
    open: new Set<string>(),
  });
  const open =
    expansion.key === sel.entity ? expansion.open : new Set<string>();
  const setOpen = (next: Set<string>) =>
    setExpansion({ key: sel.entity, open: next });
  const toggle = (code: string) => {
    const next = new Set(open);
    if (!next.delete(code)) next.add(code);
    setOpen(next);
  };

  const notices = useMemo(() => engine.notices(sel), [engine, sel]);
  const status = engine.dataStatus();
  const closedMonth = m.tables.dim_month.find(
    (d) => d.month_key === status.lastClosedMonth,
  );
  const units = m.tables.param_units.find(
    (u) => u.units_code === sel.units,
  ) ?? { divisor: 1_000_000, decimals: 1 };
  const unitsSuffix = sel.units === "M" ? "m" : "k";
  const unitsLabel = `${sel.currency} ${unitsSuffix}`;
  const symbol =
    m.tables.param_reporting_currency.find(
      (c) => c.currency_code === sel.currency,
    )?.symbol ?? "";
  const costMultiplier =
    m.tables.param_cost_sign.find((c) => c.cost_sign_code === sel.costSign)
      ?.display_multiplier_for_costs ?? 1;
  const window_ = windowLabel(m, sel);
  const anchor = m.tables.dim_month.find(
    (d) => d.fiscal_year === sel.fy && d.month_number === sel.month,
  );
  const anchorLabel = `${anchor?.month_name ?? sel.month} ${sel.fy}`;
  // F-37: the showcase page's own URL plus the state. Ledger mounts only in the browser (after the data load), so
  // `window` is always there.
  const base = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = `${base}${canonical ? `?${canonical}` : ""}`;
  const compares = [sel.compareA, sel.compareB]
    .filter((c) => c !== "NONE")
    .map((c) => SHORT[c]);
  const slices = activeSlices(m, sel);

  const companies: Company[] = [
    ...m.tables.dim_entity.map((e) => ({
      code: e.entity_code,
      name: e.short_name,
    })),
    {
      code: "GROUP" as const,
      name: m.tables.dim_entity[0]?.consolidation_group ?? "ACME Group",
    },
  ];
  const slot = (rows: readonly { entity_code: string; slot_label: string }[]) =>
    rows.find((x) => x.entity_code === sel.entity)?.slot_label ?? "";
  const breakdowns: { value: Selection["breakdown"]; label: string }[] =
    sel.entity === "GROUP"
      ? [
          { value: "REGION", label: "Region" },
          { value: "ENTITY", label: "Entity" },
        ]
      : [
          { value: "REGION", label: "Region" },
          { value: "CHANNEL", label: slot(m.tables.dim_channel) },
          { value: "LINE", label: slot(m.tables.dim_line) },
          { value: "SEGMENT", label: slot(m.tables.dim_segment) },
        ];

  /** The active view's own controls in the header toolbar (design guide §5.3). */
  function toolbar() {
    switch (sel.view) {
      case "kpi":
        return (
          <KeyFiguresToolbar
            caption={
              compares.length
                ? `Changes vs ${compares.join(" and ")}, same months`
                : "No comparison selected"
            }
          />
        );
      case "analysis":
        return (
          <>
            <span className={styles.toolbarLabel}>Compared with</span>
            <Segmented
              compact
              label="Compared with"
              value={against}
              options={(["A", "B"] as const).map((k) => {
                const choice = k === "A" ? sel.compareA : sel.compareB;
                return {
                  value: k,
                  label: choice === "NONE" ? `Compare ${k}` : SHORT[choice],
                  disabledReason:
                    choice === "NONE"
                      ? `Compare ${k} is off (Versions filter)`
                      : undefined,
                };
              })}
              onChange={setAgainst}
            />
          </>
        );
      case "profitability":
        return (
          <>
            <span className={styles.toolbarLabel}>Break down by</span>
            <Segmented
              compact
              label="Break down by"
              value={sel.breakdown}
              options={breakdowns}
              onChange={(breakdown) => update({ breakdown })}
            />
          </>
        );
      default:
        return null;
    }
  }

  /** One view at a time (the tabs swap the content area); each asks the engine only for its own numbers. */
  function view() {
    switch (sel.view) {
      case "kpi":
        return (
          <KeyFigures
            tiles={engine.kpis(sel)}
            names={{
              a: sel.compareA === "NONE" ? "" : `vs ${SHORT[sel.compareA]}`,
              b: sel.compareB === "NONE" ? "" : `vs ${SHORT[sel.compareB]}`,
            }}
            fmt={{ units: { ...units, suffix: unitsSuffix }, symbol }}
          />
        );
      case "analysis": {
        const a = engine.analysis(sel, against);
        return (
          <AnalysisView
            bridge={a.bridge}
            variances={a.variances}
            comparison={a.comparison.label}
            baseLabel={BASE[sel.base]}
            unitsLabel={`${sel.currency} ${sel.units === "M" ? "millions" : "thousands"}`}
            units={units}
          />
        );
      }
      case "profitability": {
        const p = engine.profitability(sel, against);
        return (
          <ProfitabilityView
            rows={p.rows}
            total={p.total}
            comparison={p.comparison.label}
            breakdown={
              breakdowns.find((b) => b.value === sel.breakdown)?.label ??
              "Entity"
            }
            units={units}
            unitsLabel={unitsLabel}
            allocated={["CHANNEL", "LINE", "SEGMENT"].includes(sel.breakdown)}
          />
        );
      }
      default: {
        const statement = engine.statement(sel);
        return (
          <StatementTable
            rows={statement.rows}
            sel={sel}
            windowLabel={window_}
            format={{ units, unitsLabel, costMultiplier }}
            open={open}
            onToggle={toggle}
            onExpandAll={() =>
              setOpen(
                new Set(
                  statement.rows
                    .map((r) => r.parent)
                    .filter((p): p is string => p !== null),
                ),
              )
            }
            onCollapseAll={() => setOpen(new Set())}
          />
        );
      }
    }
  }

  return (
    <div
      className={`${styles.app} ${pnlFontVariables}`}
      style={themeVars(sel.entity)}
    >
      <FilterRail
        wide={wide}
        onToggleWide={() => setWide((w) => !w)}
        openPanel={panel}
        onTogglePanel={(key) => setPanel((p) => (p === key ? null : key))}
        summaries={{
          period:
            sel.timeView === "FY"
              ? `Full year · FY${sel.fy}`
              : `${sel.timeView === "MTD" ? "Month" : sel.timeView} · ${anchorLabel}`,
          versions: `${BASE[sel.base]}${compares.length ? ` vs ${compares.join(", ")}` : ""}`,
          slice:
            slices.length === 0
              ? "All slices"
              : `${slices.length} filter${slices.length === 1 ? "" : "s"} on`,
          display: `${sel.currency} ${unitsSuffix} · ${sel.fxBasis === "CC" ? "constant currency" : "actual rates"}`,
        }}
        entity={sel.entity}
        companies={companies}
        onEntity={onEntity}
      />
      {panel && (
        <Flyout
          panel={panel}
          wide={wide}
          sel={sel}
          defaults={codec.defaults(sel.entity)}
          manifest={m}
          onChange={update}
          onClose={closePanel}
        />
      )}
      <main className={styles.main}>
        <Header
          sel={sel}
          dataStatus={
            closedMonth
              ? `Actuals closed through ${closedMonth.month_name} ${closedMonth.fiscal_year}`
              : ""
          }
          context={engine.context(sel)}
          shareUrl={shareUrl}
          toolbar={toolbar()}
          onChange={update}
          onReset={() =>
            onSearch(codec.serialize(resetSelection(sel, codec.defaults)))
          }
        />
        <div className={styles.content}>
          {notices.length > 0 && (
            <ul className={styles.notices} aria-label="Notices">
              {notices.map((n) => (
                <li key={n.code}>
                  <InfoIcon />
                  {n.text}
                </li>
              ))}
            </ul>
          )}
          {view()}
        </div>
      </main>
    </div>
  );
}
