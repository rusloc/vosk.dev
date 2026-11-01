"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { interFontVariable } from "@/components/inter-font";
import { ReportBoard, useBoardHeight } from "@/components/report-board";
import { useReportSearch } from "@/components/report-search";
import { createSalesLoader } from "@/lib/mirelo/data";
import { createSalesEngine } from "@/lib/mirelo";
import type { DetailIndex } from "@/lib/mirelo";
import type { Drill, SalesBase, SalesSelection } from "@/lib/mirelo/types";
import type { BandVM, OverviewVM, RowAction } from "@/lib/mirelo/view-model";
import {
  ChartCardView,
  HeroCardView,
  KpiCardView,
  TableCardView,
} from "./cards";
import type { Box } from "./cards";
import { Header } from "./header";
import { PopupProvider } from "./popup";
import { SlideOver } from "./slide-over";
import styles from "./sales.module.css";

// Client root (ADR-0011 (c)): loads public/data/mirelo in the browser, owns the Selection and passes engine view
// models down. Orchestration only: every number and string comes from lib/mirelo. Embedded in the site's report
// popup, the Selection lives in React state as its query string (the standalone app's URL contract), on a
// 1440-wide board the popup scales to fit; since 2026-11-01 the board also grows taller than 810 px to fill the popup
// (no empty band under it) and the extra height goes to the chart rows and the band tables.

const loader = createSalesLoader(async (name) => {
  const res = await fetch(`/data/mirelo/${name}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.arrayBuffer();
});

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; base: SalesBase };

export function SalesApp() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loader.base().then(
      (base) => live && setLoad({ status: "ready", base }),
      (e: unknown) => live && setLoad({ status: "error", message: message(e) }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  if (load.status === "ready") return <Dashboard base={load.base} />;
  return (
    <ReportBoard fill className={`${styles.page} ${interFontVariable}`}>
      <div className={styles.board}>
        <p className={styles.status} role="status">
          {load.status === "loading"
            ? "Loading Mirelo sales data…"
            : `Could not load the sales data (${load.message}).`}
          {load.status === "error" ? (
            <button
              type="button"
              onClick={() => {
                setLoad({ status: "loading" });
                setAttempt((a) => a + 1);
              }}
            >
              Retry
            </button>
          ) : null}
        </p>
      </div>
    </ReportBoard>
  );
}

// Layout-spec §1–§5 boxes (board px) at the design height 810; `extra` = board height − 810 (fill, 2026-11-01).
// Overview: both chart rows grow, the hero band and the 3-row market table keep their size and the table sits at the
// bottom. Band views: the chart rows and the (scrolling) table share the extra.
const DESIGN_H = 810;
const HERO_X = [32, 380, 728, 1076] as const;
const KPI_X = [32, 264, 496, 728, 960, 1192] as const;
const rows2 = (
  xs: readonly number[],
  w: number,
  y: number,
  h1: number,
  h2: number,
  gap: number,
): Box[] => [
  ...xs.map((x) => ({ x, y, w, h: h1 })),
  ...xs.map((x) => ({ x, y: y + h1 + gap, w, h: h2 })),
];
function bandBoxes(layout: BandVM["layout"], extra: number) {
  const e = Math.floor(extra * 0.3);
  const xs = layout === "thirds" ? [32, 496, 960] : [32, 728];
  const w = layout === "thirds" ? 448 : 680;
  return {
    charts: rows2(xs, w, 252, 162 + e, 162 + e, 16),
    table: { x: 32, y: 608 + 2 * e, w: 1376, h: 186 + extra - 2 * e },
  };
}
function overviewBoxes(extra: number) {
  const e = Math.floor(extra / 2);
  return {
    charts: rows2([32, 728], 680, 324, 160 + e, 160 + extra - e, 16),
    table: { x: 32, y: 676 + extra, w: 1376, h: 118 },
  };
}

type Detail = { ix: DetailIndex } | { error: string } | null;

function Dashboard({ base }: { base: SalesBase }) {
  const engine = useMemo(() => createSalesEngine(base), [base]);
  const { search, go: setSearch, shareUrl } = useReportSearch();
  const sel = useMemo(
    () => engine.codec.parse(new URLSearchParams(search)),
    [engine, search],
  );
  const canonical = engine.codec.serialize(sel);
  const defaults = useMemo(() => engine.codec.defaults(), [engine]);
  const [stack, setStack] = useState<Drill[]>([]);
  const [detail, setDetail] = useState<Detail>(null);
  const panelId = useId();

  const go = useCallback(
    (next: SalesSelection) => setSearch(engine.codec.serialize(next)),
    [engine, setSearch],
  );
  // Invalid or non-canonical query → rewrite to the validated state (unknown keys dropped).
  useEffect(() => {
    if (canonical !== search) go(sel);
  }, [canonical, search, go, sel]);

  // The capped loan / client sample loads on first need (Clients, Portfolio, any slide-over).
  const needs = engine.needsDetail(sel);
  useEffect(() => {
    if (!needs || detail) return;
    let live = true;
    loader.detail().then(
      (d) => live && setDetail({ ix: engine.indexDetail(d) }),
      (e: unknown) => live && setDetail({ error: message(e) }),
    );
    return () => {
      live = false;
    };
  }, [needs, detail, engine]);
  const ix = detail && "ix" in detail ? detail.ix : null;

  const header = useMemo(() => engine.header(sel), [engine, sel]);
  const overview = useMemo(
    () => (sel.view === "overview" ? engine.overview(sel) : null),
    [engine, sel],
  );
  const band = useMemo(
    () => (sel.view === "overview" ? null : engine.band(sel, ix)),
    [engine, sel, ix],
  );
  const slide = useMemo(
    () => (sel.drill ? engine.slideOver(sel, ix, sel.drill) : null),
    [engine, sel, ix],
  );

  const update = (patch: Partial<SalesSelection>) => go({ ...sel, ...patch });
  const onAction = (a: RowAction) => {
    if (a.kind === "market") update({ market: a.market });
    else {
      setStack([]);
      update({ drill: a.drill });
    }
  };
  const onClose = useCallback(() => {
    setStack([]);
    go({ ...sel, drill: null });
  }, [go, sel]);

  return (
    <ReportBoard fill className={`${styles.page} ${interFontVariable}`}>
      {/* one pop-up open at a time; a view change closes it (remount) */}
      <PopupProvider key={sel.view}>
        <Board>
          <Header
            vm={header}
            sel={sel}
            defaults={defaults}
            panelId={panelId}
            shareUrl={shareUrl}
            onChange={update}
          />
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={`tab-${sel.view}`}
            className={styles.panel}
          >
            {overview ? (
              <OverviewView
                vm={overview}
                onOpen={(view) => update({ view })}
                onMonth={(anchor) => update({ anchor })}
                onAction={onAction}
              />
            ) : null}
            {band ? (
              <BandView
                vm={band}
                onMonth={(anchor) => update({ anchor })}
                onAction={onAction}
              />
            ) : null}
          </div>
          {slide ? (
            <SlideOver
              vm={
                detail && "error" in detail
                  ? {
                      kind: "missing",
                      title: "Could not load the loan sample",
                      sub: detail.error,
                    }
                  : slide
              }
              onClose={onClose}
              onBack={
                stack.length > 0
                  ? () => {
                      const prev = stack.at(-1) ?? null;
                      setStack(stack.slice(0, -1));
                      update({ drill: prev });
                    }
                  : null
              }
              onClient={(client) => {
                if (sel.drill) setStack([...stack, sel.drill]);
                update({ drill: { kind: "client", client } });
              }}
            />
          ) : null}
        </Board>
      </PopupProvider>
    </ReportBoard>
  );
}

/** The board at the height the popup gives it (inside <ReportBoard fill>). */
function Board({ children }: { children: ReactNode }) {
  const height = useBoardHeight();
  return (
    <div className={styles.board} style={{ height }}>
      {children}
    </div>
  );
}

function OverviewView({
  vm,
  onOpen,
  onMonth,
  onAction,
}: {
  vm: OverviewVM;
  onOpen: (v: SalesSelection["view"]) => void;
  onMonth: (m: number) => void;
  onAction: (a: RowAction) => void;
}) {
  const boxes = overviewBoxes(useBoardHeight() - DESIGN_H);
  return (
    <>
      {vm.heroes.map((h, i) => (
        <HeroCardView
          key={h.id}
          card={h}
          box={{ x: HERO_X[i] ?? 32, y: 116, w: 332, h: 192 }}
          onOpen={onOpen}
        />
      ))}
      {vm.charts.map((c, i) => (
        <ChartCardView
          key={c.id}
          card={c}
          box={boxes.charts[i] ?? { x: 32, y: 324, w: 680, h: 160 }}
          onOpen={onOpen}
          onMonth={onMonth}
        />
      ))}
      <TableCardView
        card={vm.table}
        box={boxes.table}
        tight
        onAction={onAction}
      />
    </>
  );
}

function BandView({
  vm,
  onMonth,
  onAction,
}: {
  vm: BandVM;
  onMonth: (m: number) => void;
  onAction: (a: RowAction) => void;
}) {
  const boxes = bandBoxes(vm.layout, useBoardHeight() - DESIGN_H);
  return (
    <>
      {vm.kpis.map((k, i) => (
        <KpiCardView
          key={k.id}
          card={k}
          box={{ x: KPI_X[i] ?? 32, y: 116, w: 216, h: 120 }}
        />
      ))}
      {vm.charts.map((c, i) => (
        <ChartCardView
          key={c.id}
          card={c}
          box={boxes.charts[i] ?? { x: 32, y: 252, w: 448, h: 162 }}
          onOpen={() => undefined}
          onMonth={onMonth}
        />
      ))}
      <TableCardView
        card={vm.table}
        box={boxes.table}
        tight={false}
        onAction={onAction}
      />
    </>
  );
}
