"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { clsx } from "clsx";
import { ReportBoard, useBoardScale } from "@/components/report-board";
import { useReportLoad } from "@/components/report-load";
import { browserSource, loadDataset } from "@/lib/cashflow/data/loader";
import { SECTIONS, type Section } from "@/lib/cashflow/data/manifest";
import {
  S01_TIP,
  STEPS,
  TEXT,
  TITLE,
  type InfoId,
} from "@/lib/cashflow/engine/copy";
import type { Dataset } from "@/lib/cashflow/engine/data";
import type { Unit } from "@/lib/cashflow/engine/format";
import {
  back,
  canonicalStack,
  goStep,
  menuDrill,
  push,
  replaceTop,
  top,
  type Entry,
  type Nav,
} from "@/lib/cashflow/engine/nav";
import {
  parseUrlState,
  selectionPeriod,
  type Group,
  type HeatSort,
  type Selection,
} from "@/lib/cashflow/engine/url-state";
import {
  cashView,
  cellTip,
  diagramView,
  heatView,
  kpiCards,
  ledgerView,
  recView,
  shellView,
  statementView,
} from "@/lib/cashflow/engine/view";
import { cashflowFontVariables } from "./cashflow-fonts";
import { IconMenu } from "./icons";
import {
  CalendarPop,
  CashPop,
  DiagramPop,
  HowPop,
  InfoBody,
  MenuPop,
  PopFrame,
  RecPop,
  type Place,
} from "./popups";
import {
  ActivitiesView,
  KpiRow,
  StatementView,
  TransactionsView,
  type Tip,
} from "./views";
import "./cashflow.css";

// The ACME Cash Flow report's client root (handoff js-spec 01 § 4, CF-ARC-07): loads the data, owns the state (the
// selection from the URL, the view stack, the open pop-up), routes the panel and hosts the pop-ups and the tooltip. The
// URL is read once on open (a deep link opens the popup in that state, openOnQuery) and never written back: the
// report sits in the showcase page, whose own URL (utm_ keys included) stays what the visitor arrived with (11-26, as
// the other reports in components/report-search.ts; CF-URL-03's replaceState was for the iframe embed, not ported). Every number and string comes from lib/cashflow/engine. Data: /api/cashflow
// (Supabase, schema cashflow_demo), as columns.

const ROOT_CLASS = `acme-cf ${cashflowFontVariables}`;
const fetchDataset = () => loadDataset(browserSource());

export function CashflowApp() {
  const { load, retry } = useReportLoad(fetchDataset);
  return (
    <ReportBoard fill className="bg-[#E8E5DF]">
      <div className={ROOT_CLASS}>
        {load.status === "ready" ? (
          <Board ds={load.data} />
        ) : (
          <div className="frame">
            <div className="top">
              <div className="ttl">
                <h1>{TITLE}</h1>
              </div>
            </div>
            <section className="kpis" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div className="kpi" key={i} />
              ))}
            </section>
            <div className="body">
              <div className="layer">
                <div
                  className="card state"
                  role={load.status === "error" ? "alert" : "status"}
                >
                  {load.status === "error" ? (
                    <div>
                      {TEXT.loadFailed}: {load.message}
                      <br />
                      <button type="button" onClick={retry}>
                        Try again
                      </button>
                    </div>
                  ) : (
                    TEXT.loading
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ReportBoard>
  );
}

type TipAt = { tip: Tip; x: number; y: number } | null;

/**
 * The tooltip's state, outside React state: a mouse move over the heat grid re-renders <TipHost> alone, not the board
 * and its panel.
 */
function tipStore() {
  let at: TipAt = null;
  const subs = new Set<() => void>();
  return {
    get: () => at,
    set(next: TipAt) {
      at = next;
      subs.forEach((f) => f());
    },
    subscribe(f: () => void) {
      subs.add(f);
      return () => void subs.delete(f);
    },
  };
}

type Pop =
  | { kind: "cal" | "menu" | "how" | "cash" | "diagram" | "rec" }
  | { kind: "info"; id: InfoId; place: Place };

function Board({ ds }: { ds: Dataset }) {
  const scale = useBoardScale();
  const init = useMemo(() => parseUrlState(ds, window.location.search), [ds]);
  const [sel, setSel] = useState<Selection>(init.sel);
  const [unit, setUnit] = useState<Unit>(init.unit);
  const [nav, setNav] = useState<Nav>(() => ({
    stack: canonicalStack(init.entry),
    lastSec: init.entry.view === "stmt" ? "OP" : init.entry.sec,
  }));
  const [collapsed, setCollapsed] = useState<Section[]>(init.collapsed);
  const [sort, setSort] = useState<HeatSort | null>(init.sort);
  const [groups, setGroups] = useState<Group[]>(init.groups);
  const [pop, setPop] = useState<Pop | null>(
    init.pop ? { kind: init.pop } : null,
  );
  const [cursor, setCursor] = useState<{ j: number; k: number } | null>(null);
  const [tips] = useState(tipStore);

  const frame = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const calBtn = useRef<HTMLButtonElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const viewChanged = useRef(false);

  const p = useMemo(() => selectionPeriod(ds, sel), [ds, sel]);
  const entry = top(nav);

  // after a view change: panel scrolled to the top, focus on the panel (CF-NAV-10)
  useLayoutEffect(() => {
    if (!viewChanged.current) return;
    viewChanged.current = false;
    if (layer.current) {
      layer.current.scrollTop = 0;
      layer.current.focus({ preventScroll: true });
    }
  }, [nav]);

  const hideTip = useCallback(() => tips.set(null), [tips]);
  const showTip = useCallback(
    (t: Tip | null, at?: { x: number; y: number }) => {
      const r = frame.current?.getBoundingClientRect();
      if (!t || !at || !r) return tips.set(null);
      tips.set({
        tip: t,
        x: (at.x - r.left) / scale,
        y: (at.y - r.top) / scale,
      });
    },
    [scale, tips],
  );

  // A scroll hides the tooltip, except the S01 chip's while the chip has keyboard focus: focusing it scrolls it into
  // view, and that scroll would hide the tooltip the focus just opened (CF-A11-09).
  const onLayerScroll = () => {
    const a = document.activeElement;
    if (a instanceof HTMLElement && a.matches(".ovr")) {
      const b = a.getBoundingClientRect();
      showTip(
        { title: S01_TIP.title, lines: [S01_TIP.body] },
        { x: b.right, y: b.top },
      );
    } else hideTip();
  };

  const navigate = useCallback(
    (next: Nav, focusPanel = true) => {
      viewChanged.current = focusPanel;
      setNav(next);
      setCursor(null);
      tips.set(null);
    },
    [tips],
  );
  const go = (e: Entry) => navigate(push(nav, e));

  const closePop = useCallback(() => {
    setPop(null);
    const o = opener.current;
    opener.current = null;
    if (o && o.isConnected)
      requestAnimationFrame(() => o.focus({ preventScroll: true }));
  }, []);
  const openPop = (next: Pop, from: HTMLElement | null) => {
    tips.set(null);
    if (from) opener.current = from;
    setPop(next);
  };

  // focus moves into an opened pop-up
  const popRef = useRef<HTMLDivElement>(null);
  const popKey = pop
    ? pop.kind === "info"
      ? `info-${pop.id}`
      : pop.kind
    : null;
  useEffect(() => {
    if (!popKey) return;
    // a frame later: an ⓘ pop-up is still `visibility: hidden` here (PopFrame places it in a layout effect), and a hidden
    // element does not take focus
    const id = requestAnimationFrame(() => {
      const el = popRef.current;
      const f =
        el?.querySelector<HTMLElement>("[data-first]") ??
        el?.querySelector<HTMLElement>("button:not(.x):not(:disabled)") ??
        el?.querySelector<HTMLElement>(".x");
      f?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [popKey]);

  const changeSel = (s: Selection) => {
    const np = selectionPeriod(ds, s);
    setSel(s);
    setCursor(null);
    if (
      entry.view === "ledger" &&
      entry.day !== null &&
      (entry.day < np.d0 || entry.day > np.d1)
    )
      setNav(replaceTop(nav, { ...entry, day: null })); // CF-TXN-08
  };

  // Keys on the document, like the mock: Esc must reach the report while focus sits on the site popup around it. A
  // handled Esc is marked (preventDefault), so the site popup (useModal) leaves it alone; an unhandled one closes it.
  const onKeyDown = (e: globalThis.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (pop) {
        e.preventDefault();
        closePop();
        return;
      }
      const b = back(nav);
      if (b) {
        e.preventDefault();
        navigate(b);
      }
      return;
    }
    if (e.key === "Tab" && pop && popRef.current) {
      const f = [
        ...popRef.current.querySelectorAll<HTMLElement>(
          "button:not(:disabled), [tabindex='0']",
        ),
      ];
      const a = f[0];
      const z = f[f.length - 1];
      if (!a || !z) return;
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      } else if (!popRef.current.contains(document.activeElement)) {
        e.preventDefault();
        a.focus();
      }
    }
  };

  const keyHandler = useRef(onKeyDown);
  useEffect(() => {
    keyHandler.current = onKeyDown;
  });
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || !frame.current?.isConnected) return;
      keyHandler.current(e);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const openInfo = (id: InfoId, el: HTMLElement) => {
    const fr = frame.current?.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!fr) return;
    const place: Place = {
      kind: "near",
      x: (b.left - fr.left) / scale,
      y: (b.bottom - fr.top) / scale + 8,
      right: (b.right - fr.left) / scale,
      top: (b.top - fr.top) / scale,
    };
    openPop({ kind: "info", id, place }, el);
  };

  // ---------- view models ----------
  const exp = useMemo(
    () => new Set(SECTIONS.filter((s) => !collapsed.includes(s))),
    [collapsed],
  );
  const shell = shellView(ds, sel, p, unit);
  const cards = useMemo(() => kpiCards(ds, p, unit), [ds, p, unit]);
  const step = entry.view === "stmt" ? 0 : entry.view === "heat" ? 1 : 2;
  const tipOf = useCallback(
    (line: number, k: number) => {
      const t = cellTip(ds, p, unit, line, k);
      return { title: t.date, lines: [t.line], rows: t.rows, n: t.n };
    },
    [ds, p, unit],
  );

  const heatVm = useMemo(
    () =>
      entry.view === "heat" ? heatView(ds, p, unit, entry.sec, sort) : null,
    [ds, p, unit, entry, sort],
  );

  let panel: React.ReactNode;
  if (entry.view === "stmt") {
    panel = (
      <StatementView
        vm={statementView(ds, p, unit, exp)}
        onToggle={(sec) => {
          const y = layer.current?.scrollTop ?? 0;
          setCollapsed(
            collapsed.includes(sec)
              ? collapsed.filter((s) => s !== sec)
              : [...collapsed, sec],
          );
          requestAnimationFrame(
            () => layer.current && (layer.current.scrollTop = y),
          );
        }}
        onOpenActivity={(sec) => go({ view: "heat", sec })}
        onInfo={openInfo}
        onTip={showTip}
      />
    );
  } else if (entry.view === "heat") {
    const sec = entry.sec;
    panel = (
      <ActivitiesView
        vm={heatVm!}
        cursor={cursor}
        onTab={(s) => {
          if (s !== sec)
            navigate(replaceTop(nav, { view: "heat", sec: s }), false);
        }}
        onSort={(key) =>
          setSort(
            key === "name"
              ? sort === "name"
                ? "name-desc"
                : "name"
              : sort === "total"
                ? "total-asc"
                : "total",
          )
        }
        onOpenLine={(line) => go({ view: "ledger", sec, line, day: null })}
        onOpenDay={(line, k) =>
          go({ view: "ledger", sec, line, day: p.d0 + k })
        }
        onCursor={setCursor}
        cellTip={tipOf}
        onInfo={openInfo}
        onTip={showTip}
      />
    );
  } else {
    panel = (
      <TransactionsView vm={ledgerView(ds, p, unit, entry)} onInfo={openInfo} />
    );
  }

  // ---------- pop-up body ----------
  let popNode: React.ReactNode = null;
  if (pop) {
    const blur = pop.kind === "diagram" || pop.kind === "rec";
    let cls = pop.kind as string;
    let place: Place = { kind: "center" };
    let body: React.ReactNode;
    switch (pop.kind) {
      case "cal":
        place = { kind: "fixed" };
        body = (
          <CalendarPop
            ds={ds}
            sel={sel}
            unit={unit}
            onSelect={changeSel}
            onUnit={setUnit}
          />
        );
        break;
      case "menu":
        place = { kind: "fixed" };
        body = (
          <MenuPop
            current={step}
            onDrill={(s) => {
              setPop(null);
              opener.current = null;
              navigate(menuDrill(nav, s));
            }}
            onOpen={(k) => setPop({ kind: k })}
          />
        );
        break;
      case "info":
        cls = "";
        place = pop.place;
        body = <InfoBody id={pop.id} headingId="cf-pop-h" />;
        break;
      case "how":
        body = <HowPop />;
        break;
      case "cash": {
        const vm = cashView(ds, p, unit);
        body = (
          <CashPop
            heading={vm.heading}
            cards={vm.cards}
            onActivity={(sec) => {
              setPop(null);
              opener.current = null;
              go({ view: "heat", sec });
            }}
          />
        );
        break;
      }
      case "diagram":
        cls = "dia";
        body = (
          <DiagramPop
            vm={diagramView(ds, p, unit, new Set(groups))}
            onGroup={(g) =>
              setGroups(
                groups.includes(g)
                  ? groups.filter((x) => x !== g)
                  : [...groups, g],
              )
            }
            onAll={(open) =>
              setGroups(open ? ["quality", "wc", "fcf", "lev"] : [])
            }
            onActivity={(sec) => {
              setPop(null);
              opener.current = null;
              go({ view: "heat", sec });
            }}
          />
        );
        break;
      case "rec":
        body = <RecPop vm={recView(ds, p)} />;
        break;
    }
    popNode = (
      <>
        <div className={clsx("scrim", blur && "blur")} onClick={closePop} />
        <div ref={popRef} style={{ display: "contents" }}>
          <PopFrame
            cls={cls}
            labelId="cf-pop-h"
            place={place}
            onClose={closePop}
          >
            {body}
          </PopFrame>
        </div>
      </>
    );
  }

  const togglePop = (kind: "cal" | "menu", el: HTMLElement) => {
    if (pop?.kind === kind) closePop();
    else openPop({ kind }, el);
  };

  return (
    <div className="frame" ref={frame}>
      {/* plain divs, not header / main: the report sits inside the site page, which has its own banner and main */}
      <div className="top">
        <button
          ref={calBtn}
          className="sq"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={pop?.kind === "cal"}
          aria-label={shell.ariaLabel}
          onClick={(e) => togglePop("cal", e.currentTarget)}
        >
          <span className="pm">
            <i>{shell.badge.mode}</i>
            <b>{shell.badge.value}</b>
            <span>{shell.badge.sub}</span>
          </span>
        </button>
        <div className="ttl">
          <h1>{TITLE}</h1>
          <p>{shell.context}</p>
        </div>
        <nav className="crumbs" aria-label="Breadcrumb">
          {STEPS.map((label, i) => (
            <span key={label} style={{ display: "contents" }}>
              {i > 0 && (
                <span className="gt" aria-hidden="true">
                  ›
                </span>
              )}
              {i === step ? (
                <span className="cur" aria-current="page" data-t={label}>
                  {label}
                </span>
              ) : (
                <button
                  type="button"
                  data-t={label}
                  onClick={() => navigate(goStep(nav, i as 0 | 1 | 2))}
                >
                  {label}
                </button>
              )}
            </span>
          ))}
        </nav>
        <button
          ref={menuBtn}
          className="sq"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={pop?.kind === "menu"}
          aria-label="Menu"
          onClick={(e) => togglePop("menu", e.currentTarget)}
        >
          <IconMenu />
        </button>
      </div>
      <KpiRow
        cards={cards}
        onInfo={openInfo}
        onCash={(el) => openPop({ kind: "cash" }, el)}
      />
      <div className="body">
        <div
          className="layer"
          tabIndex={-1}
          ref={layer}
          onScroll={onLayerScroll}
        >
          {panel}
        </div>
      </div>
      {popNode}
      <TipHost tips={tips} />
    </div>
  );
}

function TipHost({ tips }: { tips: ReturnType<typeof tipStore> }) {
  const at = useSyncExternalStore(tips.subscribe, tips.get, tips.get);
  return at && <Tooltip tip={at.tip} x={at.x} y={at.y} />;
}

/** Glass tooltip in board coordinates, flipped to stay on the board (mock `showTip`). */
function Tooltip({ tip, x, y }: { tip: Tip; x: number; y: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fw = (el.offsetParent as HTMLElement | null)?.clientWidth ?? 1440;
    let left = x + 14;
    let top = y - el.offsetHeight - 8;
    if (left + el.offsetWidth > fw - 8) left = x - el.offsetWidth - 14;
    if (top < 8) top = y + 24;
    setPos({ left, top });
  }, [x, y, tip]);
  return (
    <div
      className="tip"
      role="tooltip"
      ref={ref}
      style={pos ?? { left: x, top: y, visibility: "hidden" }}
    >
      <b>{tip.title}</b>
      {tip.lines?.map((l) => (
        <div className="m" key={l}>
          {l}
        </div>
      ))}
      {tip.rows?.map(([a, b]) => (
        <div className="r" key={a}>
          <span>{a}</span>
          <span>{b}</span>
        </div>
      ))}
    </div>
  );
}
