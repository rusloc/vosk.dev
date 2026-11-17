"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PNL_SUGGESTIONS, askAiTriggerCompact } from "@/components/chat/ask-ai";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ReportDialog } from "@/components/report-dialog";
import { useReportSearch } from "@/components/report-search";
import { columnsSource } from "@/lib/pnl/data/columns-loader";
import { createDatasetLoader, type Dataset } from "@/lib/pnl/data/dataset";
import { createEngine } from "@/lib/pnl/engine";
import { companyName } from "@/lib/pnl/engine/header";
import { hideEmptyLines } from "@/lib/pnl/engine/hide-empty";
import { windowLabel } from "@/lib/pnl/engine/notices";
import type { RangeEnd } from "@/lib/pnl/engine/period";
import type { EntityCode, EntityView, Selection } from "@/lib/pnl/engine/types";
import {
  createSelectionCodec,
  parseEntity,
  restrictToBuilt,
} from "@/lib/pnl/state/selection-schema";
import {
  joinQuery,
  parseViewState,
  serializeViewState,
  type ViewState,
} from "@/lib/pnl/state/view-state";
import { CompanyPicker } from "./company-picker";
import {
  collapsedRows,
  expandedRows,
  openRows,
  type Expansion,
} from "./expansion";
import { FilterRail, isPanelKey, type Overlay } from "./filter-rail";
import { pnlFontVariables } from "./fonts";
import { PopupProvider } from "./glass";
import { Flyout } from "./flyout";
import { Header } from "./header";
import styles from "./ledger.module.css";
import { StatementTable } from "./statement-table";
import { themeVars } from "./theme";
import { AnalysisView } from "./views/analysis-view";
import { ProfitabilityView } from "./views/profitability-view";
import { VitalsView } from "./views/vitals-view";

// Client root (ADR-0002 §2.5): loads the data from /api/pnl (Supabase schema pnl_demo, 2026-11-09; public/data/pnl
// before), owns the Selection and passes engine results down.
// Orchestration only: every number comes from lib/pnl/engine. Embedded in the site's report popup, the Selection
// lives in React state as its query string (same codec as the standalone app's URL, F-37), not in the page URL.

const loader = createDatasetLoader(
  columnsSource(async (name) => {
    const res = await fetch(`/api/pnl/${name}`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    return res.json();
  }),
);

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entity: EntityCode; dataset: Dataset };

/**
 * `chat`: show the Ask AI button in the header (the page passes CHAT_ENABLED, ADR-0005). `chatOpen`: open its chat as
 * soon as the report is up (the page's Ask AI button).
 */
export function Shell({
  chat = false,
  chatOpen = false,
}: {
  chat?: boolean;
  chatOpen?: boolean;
}) {
  const { search, go, shareUrl } = useReportSearch();
  const entityParam = parseEntity(new URLSearchParams(search));
  const entity: EntityCode = entityParam === "S" ? "S" : "P"; // Group view: build step 4
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  // Synchronise with the external data files; a stale response for another entity is ignored.
  useEffect(() => {
    let live = true;
    loader.load([entity]).then(
      (dataset) => live && setLoad({ status: "ready", entity, dataset }),
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

  if (load.status === "ready" && load.entity === entity)
    return (
      <Ledger
        dataset={load.dataset}
        search={search}
        onSearch={go}
        shareUrl={shareUrl}
        chat={chat}
        chatOpen={chatOpen}
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
  shareUrl,
  chat,
  chatOpen,
}: {
  dataset: Dataset;
  search: string;
  onSearch: (query: string) => void;
  shareUrl: string;
  chat: boolean;
  chatOpen: boolean;
}) {
  const m = dataset.manifest;
  const codec = useMemo(() => createSelectionCodec(m), [m]);
  const engine = useMemo(() => createEngine(dataset), [dataset]);
  const defaults = useMemo(() => codec.defaults("P"), [codec]);
  const sel = useMemo(
    () => restrictToBuilt(codec.parse(new URLSearchParams(search))),
    [codec, search],
  );
  // The variances filter (lvr, lvch, lvln, lvsg): validated like the Selection keys, appended after them; a member the
  // company shown does not have is dropped, so the URL is rewritten to what is on screen. Every view is one page since
  // 2026-11-15 (Profitability's pager and its `p` key went), so an old link's `p` is dropped the same way.
  const vs = useMemo(() => {
    const raw = parseViewState(new URLSearchParams(search));
    return { ...raw, filter: engine.validVarFilter(sel, raw.filter) };
  }, [engine, sel, search]);
  const canonical = joinQuery(codec.serialize(sel), serializeViewState(vs));

  // Invalid or unbuilt input never stays in the state: rewrite it to the state actually shown (ADR-0002 §2.4).
  useEffect(() => {
    if (canonical !== search) onSearch(canonical);
  }, [canonical, search, onSearch]);

  const go = useCallback(
    (next: Selection, view: ViewState) =>
      onSearch(joinQuery(codec.serialize(next), serializeViewState(view))),
    [codec, onSearch],
  );
  const update = useCallback(
    (patch: Partial<Selection>) => go({ ...sel, ...patch }, vs),
    [go, sel, vs],
  );
  const updateView = useCallback(
    (patch: Partial<ViewState>) => go(sel, { ...vs, ...patch }),
    [go, sel, vs],
  );

  const [wide, setWide] = useState(false);
  // One pop-over at a time: a filter flyout, the company picker or the applied-filters pop-up
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const closeOverlay = useCallback(() => setOverlay(null), []);
  const toggleOverlay = (key: Overlay) =>
    setOverlay((o) => (o === key ? null : key));

  const statement = useMemo(() => engine.statement(sel), [engine, sel]);
  const howToRead = useMemo(
    () => (sel.view === "statement" ? null : engine.howToRead(sel)),
    [engine, sel],
  );

  // M-20 / M-21 (parity rule 5): the statement opens collapsed; expansion persists across every filter change and
  // resets to collapsed only when the company changes. Presets read the full spine, so rows that Hide empty lines
  // drops do not change them.
  const [expansion, setExpansion] = useState<Expansion>({
    entity: sel.entity,
    open: null,
  });
  const collapsed = useMemo(() => collapsedRows(statement.rows), [statement]);
  const open = openRows(expansion, sel.entity, collapsed);
  const setOpen = (next: ReadonlySet<string>) =>
    setExpansion({ entity: sel.entity, open: next });
  const toggle = (code: string) => {
    const next = new Set(open);
    if (!next.delete(code)) next.add(code);
    setOpen(next);
  };

  const notices = useMemo(() => engine.notices(sel), [engine, sel]);
  // The custom range end the period picker's month grid edits (From / To, 2026-11-15): picker state, not report state.
  const [rangeEdit, setRangeEdit] = useState<RangeEnd>("from");
  const period = useMemo(
    () => engine.period(sel, rangeEdit),
    [engine, sel, rangeEdit],
  );
  const header = useMemo(() => engine.header(sel), [engine, sel]); // viewer's time zone: client-only render
  const units = m.tables.param_units.find(
    (u) => u.units_code === sel.units,
  ) ?? { divisor: 1_000_000, decimals: 1 };
  const costMultiplier =
    m.tables.param_cost_sign.find((c) => c.cost_sign_code === sel.costSign)
      ?.display_multiplier_for_costs ?? 1;
  const window_ = windowLabel(m, sel);
  // F-37: the share link is the showcase page's URL plus the report's state (useReportSearch).
  const rows = hideEmptyLines(statement.rows, sel, units); // M-22, rounded in the selected units

  const companies = (
    ["P", "S", "GROUP"] as const satisfies readonly EntityView[]
  ).map((code) => ({
    code,
    name: companyName(m, code),
  }));

  return (
    <div
      className={`${styles.app} ${pnlFontVariables}`}
      style={themeVars(sel.entity)}
    >
      <FilterRail
        wide={wide}
        onToggleWide={() => setWide((w) => !w)}
        openPanel={overlay}
        onTogglePanel={toggleOverlay}
        summaries={{
          period: period.summary, // period picker v2: the rail tooltip uses the summary sentence
          versions: header.rail.versions,
          slice: "All slices",
          display: header.rail.display,
        }}
      />
      {overlay === "company" && (
        <CompanyPicker
          entity={sel.entity}
          companies={companies}
          wide={wide}
          onSelect={(entity) => update({ entity })}
          onClose={closeOverlay}
        />
      )}
      {overlay !== null && isPanelKey(overlay) && (
        <Flyout
          panel={overlay}
          wide={wide}
          sel={sel}
          defaults={defaults}
          manifest={m}
          period={period}
          onRangeEdit={setRangeEdit}
          onChange={update}
          onClose={closeOverlay}
        />
      )}
      <main className={styles.main}>
        {/* one glass pop-up at a time across header and content; a view change closes it */}
        <PopupProvider scope={sel.view}>
          <Header
            sel={sel}
            status={header.status}
            filters={header.filters}
            notices={notices}
            filtersOpen={overlay === "filters"}
            onToggleFilters={() => toggleOverlay("filters")}
            onCloseFilters={closeOverlay}
            shareUrl={shareUrl}
            onChange={update}
            howToRead={howToRead}
            chat={
              chat ? (
                // The chat asks about what the visitor is looking at; a figures card's link applies its state here.
                <ReportDialog
                  label="Ask AI"
                  title="AI assistant"
                  closeLabel="Close the assistant"
                  trigger={askAiTriggerCompact("Ask AI", "pnl")}
                  size="panel"
                  defaultOpen={chatOpen}
                >
                  {(closeChat) => (
                    <ChatPanel
                      endpoint="/api/chat/pnl"
                      suggestions={PNL_SUGGESTIONS}
                      state={canonical}
                      onOpenReport={(link) => {
                        onSearch(link);
                        closeChat();
                      }}
                    />
                  )}
                </ReportDialog>
              ) : null
            }
          />
          <div className={styles.content}>
            {sel.view === "statement" ? (
              <StatementTable
                rows={rows}
                sel={sel}
                windowLabel={window_}
                format={{
                  units,
                  unitsLabel: `${sel.currency} ${sel.units === "M" ? "m" : "k"}`,
                  costMultiplier,
                }}
                open={open}
                onToggle={toggle}
                onExpandAll={() => setOpen(expandedRows(statement.rows))}
                onCollapseAll={() => setOpen(collapsed)}
              />
            ) : (
              <RedesignedView
                engine={engine}
                sel={sel}
                vs={vs}
                onViewState={updateView}
              />
            )}
          </div>
        </PopupProvider>
      </main>
    </div>
  );
}

/** Vitals · Analysis · Profitability (P&L views redesign v4): engine view models in, components out. */
function RedesignedView({
  engine,
  sel,
  vs,
  onViewState,
}: {
  engine: ReturnType<typeof createEngine>;
  sel: Selection;
  vs: ViewState;
  onViewState: (patch: Partial<ViewState>) => void;
}) {
  const vm = useMemo(() => {
    if (sel.view === "kpi")
      return { kind: "vitals", vm: engine.vitals(sel) } as const;
    if (sel.view === "analysis")
      return {
        kind: "analysis",
        bridges: engine.analysis(sel),
        vm: engine.variances(sel, vs.filter),
      } as const;
    if (sel.view === "profitability")
      return { kind: "profitability", vm: engine.profitability(sel) } as const;
    return null;
  }, [engine, sel, vs]);
  if (!vm) return null;
  return (
    <section
      id={`view-${sel.view}`}
      role="tabpanel"
      aria-label={
        sel.view === "kpi"
          ? "Vitals"
          : sel.view === "analysis"
            ? "Analysis"
            : "Profitability"
      }
      style={{
        display: "flex",
        flex: "1 1 auto",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {vm.kind === "vitals" ? <VitalsView vm={vm.vm} /> : null}
      {vm.kind === "analysis" ? (
        <AnalysisView
          bridges={vm.bridges}
          vm={vm.vm}
          filter={vs.filter}
          onFilter={(filter) => onViewState({ filter })}
        />
      ) : null}
      {vm.kind === "profitability" ? <ProfitabilityView vm={vm.vm} /> : null}
    </section>
  );
}
