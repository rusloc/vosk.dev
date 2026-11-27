"use client";

import { clsx } from "clsx";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Section } from "@/lib/cashflow/data/manifest";
import { MON } from "@/lib/cashflow/engine/calendar";
import { S01_TIP, TEXT, type InfoId } from "@/lib/cashflow/engine/copy";
import type { HeatSort } from "@/lib/cashflow/engine/url-state";
import type {
  HeatView,
  KpiCard,
  LedgerView,
  StatementView as StatementVM,
} from "@/lib/cashflow/engine/view";
import { IconBars, IconChevron, IconGo, IconSort, Notch } from "./icons";

// The KPI row and the three views (handoff js-spec 03 § 2–5). Layout, DOM, focus and events only: every string and
// ratio comes from the engine's view models (CF-ARC-03).

export interface Tip {
  title: string;
  lines?: string[];
  rows?: [string, string][];
}
/** Show a tooltip at a client point, or hide it (null). */
export type ShowTip = (tip: Tip | null, at?: { x: number; y: number }) => void;
type OpenInfo = (id: InfoId, el: HTMLElement) => void;

export function InfoButton({
  id,
  label,
  onInfo,
  className,
}: {
  id: InfoId;
  label: string;
  onInfo: OpenInfo;
  className?: string;
}) {
  return (
    <button
      className={clsx("i", className)}
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      onClick={(e) => onInfo(id, e.currentTarget)}
    >
      i
    </button>
  );
}

// ---------- KPI row ----------

export function KpiRow({
  cards,
  onInfo,
  onCash,
}: {
  cards: KpiCard[];
  onInfo: OpenInfo;
  onCash: (el: HTMLElement) => void;
}) {
  return (
    <section className="kpis" aria-label="Key figures">
      {cards.map((k) => (
        <div className="kpi" key={k.id}>
          <span className="t">{k.title}</span>
          <span className="v">{k.value}</span>
          <span className="dl">
            {"text" in k.delta ? (
              <span>{k.delta.text}</span>
            ) : (
              <>
                <b>{k.delta.strong}</b>
                <span>{k.delta.label}</span>
              </>
            )}
          </span>
          {k.id === "close" && (
            <button
              className="kb kb-k"
              type="button"
              aria-haspopup="dialog"
              aria-label="Cash balance and activities: opening, in, out, closing"
              onClick={(e) => onCash(e.currentTarget)}
            >
              <IconBars />
            </button>
          )}
          <InfoButton id={k.id} label={`About ${k.title}`} onInfo={onInfo} />
        </div>
      ))}
    </section>
  );
}

// ---------- View 1 · Statement ----------

const ROW_CLASS: Record<string, string> = {
  tot: "k-tot",
  sect: "k-sect",
  grand: "k-grand",
};

export function StatementView({
  vm,
  onToggle,
  onOpenActivity,
  onInfo,
  onTip,
}: {
  vm: StatementVM;
  onToggle: (sec: Section) => void;
  onOpenActivity: (sec: Section) => void;
  onInfo: OpenInfo;
  onTip: ShowTip;
}) {
  const table = useRef<HTMLTableElement>(null);
  // pin the opening row directly under the sticky column header
  useLayoutEffect(() => {
    const t = table.current;
    const head = t?.tHead;
    if (!t || !head) return;
    const measure = () =>
      t.style.setProperty("--theadH", `${head.offsetHeight}px`);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);

  // A section row's toggle is a real button (aria-expanded is not allowed on a table row): Enter / Space click it and the
  // click reaches the row's handler; ↓ ↑ move between the three toggles.
  const onRowKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const tgs = [
      ...(table.current?.querySelectorAll<HTMLButtonElement>("tr.tog .tg") ??
        []),
    ];
    const i = tgs.indexOf(e.currentTarget.querySelector(".tg")!);
    tgs[i + (e.key === "ArrowDown" ? 1 : -1)]?.focus();
  };

  const grid = [0.25, 0.5, 0.75, 1].map((f) => (
    <i key={f} className="grid" style={{ left: `${f * 100}%` }} />
  ));

  return (
    <div className="card">
      <div className="ch">
        <h2>{TEXT.statementCard}</h2>
        <span className="sp" />
        <span className="lg">
          <span>
            <i className="amt" />
            {TEXT.legendLine}
          </span>
          <span>
            <i className="bal" />
            {TEXT.legendBalance}
          </span>
        </span>
        <InfoButton id="stmt" label="About the statement" onInfo={onInfo} />
      </div>
      <table className="st" ref={table}>
        <colgroup>
          <col className="c-l" />
          <col className="c-v" />
          <col className="c-g" />
          <col />
          <col className="c-p" />
        </colgroup>
        <thead>
          <tr>
            <th className="l" scope="col">
              {vm.periodLabel}
            </th>
            <th scope="col">{vm.unitLabel}</th>
            <th aria-hidden="true" />
            <th className="ax" scope="col">
              <div className="ax-w" style={{ marginRight: 16 }}>
                {vm.ticks.map((t, i) => (
                  <span key={i} style={{ left: `${i * 25}%` }}>
                    {t}
                  </span>
                ))}
              </div>
            </th>
            <th className="p" scope="col">
              {TEXT.pctHeader}
              <InfoButton
                id="pct"
                label="About % of net income"
                onInfo={onInfo}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {vm.rows.map((r, idx) => {
            if (r.k === "gap")
              return (
                <tr className="k-gap" key={`gap-${idx}`}>
                  <td colSpan={5} />
                </tr>
              );
            const bar = r.track ? (
              <div
                style={{
                  position: "relative",
                  marginRight: 16,
                  height: "100%",
                }}
              >
                {grid}
                <div className="bw">
                  {r.bar &&
                    (r.bar.balance ? (
                      <>
                        <div
                          className={clsx("bar bal", r.bar.clipped && "clip")}
                          style={{ width: `${r.bar.ratio * 100}%` }}
                        />
                        {r.bar.clipped && (
                          <span
                            style={{
                              position: "absolute",
                              left: "calc(100% - 44px)",
                              top: 0,
                              bottom: 0,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Notch />
                          </span>
                        )}
                      </>
                    ) : (
                      <div
                        className="bar"
                        style={{ width: `${r.bar.ratio * 100}%` }}
                      />
                    ))}
                </div>
              </div>
            ) : null;
            const cells = (label: React.ReactNode) => (
              <>
                <td className="l" style={{ "--d": r.d } as React.CSSProperties}>
                  {label}
                </td>
                <td className="v">{r.amount}</td>
                <td />
                <td className="b">{bar}</td>
                <td className="p">{r.pct}</td>
              </>
            );
            if (r.k === "secx") {
              const sec = r.sec!;
              return (
                <tr
                  key={`sec-${sec}`}
                  className={clsx("tog k-secx", r.open && "open")}
                  onClick={() => onToggle(sec)}
                  onKeyDown={onRowKey}
                >
                  {cells(
                    <div className="lw">
                      <button
                        className="tg"
                        type="button"
                        aria-expanded={r.open}
                        aria-label={`${r.label}: ${r.open ? "collapse" : "expand"} its lines`}
                      >
                        <IconChevron />
                        <span className="lb">{r.label}</span>
                      </button>
                      <button
                        className="kb"
                        type="button"
                        aria-label={`Open ${r.label} (Activities)`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenActivity(sec);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <IconGo />
                      </button>
                    </div>,
                  )}
                </tr>
              );
            }
            const cls =
              r.k === "bal"
                ? `k-bal ${r.edge === "open" ? "k-open" : "k-end"}`
                : `${ROW_CLASS[r.k] ?? ""} k-${r.k}`;
            return (
              <tr key={`${r.k}-${r.label}-${idx}`} className={cls}>
                {cells(
                  <div className="lw">
                    <span className="lb">{r.label}</span>
                    {r.override && (
                      <span
                        className="ovr"
                        tabIndex={0}
                        aria-label={`${S01_TIP.title}: ${S01_TIP.body}`}
                        onMouseMove={(e) =>
                          onTip(
                            { title: S01_TIP.title, lines: [S01_TIP.body] },
                            { x: e.clientX, y: e.clientY },
                          )
                        }
                        onMouseLeave={() => onTip(null)}
                        onFocus={(e) => {
                          const b = e.currentTarget.getBoundingClientRect();
                          onTip(
                            { title: S01_TIP.title, lines: [S01_TIP.body] },
                            { x: b.right, y: b.top },
                          );
                        }}
                        onBlur={() => onTip(null)}
                      >
                        S01
                      </span>
                    )}
                  </div>,
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- View 2 · Activities ----------

const SECS: [Section, string][] = [
  ["OP", "Operating"],
  ["INV", "Investing"],
  ["FIN", "Financing"],
];
const CS_MIN = 16;
const CS_MAX = 40;
const TOT_H = 36;
const GAP = 2;

export function ActivitiesView({
  vm,
  cursor,
  onTab,
  onSort,
  onOpenLine,
  onOpenDay,
  onCursor,
  cellTip,
  onInfo,
  onTip,
}: {
  vm: HeatView;
  cursor: { j: number; k: number } | null;
  onTab: (sec: Section) => void;
  onSort: (key: "name" | "total") => void;
  onOpenLine: (line: number | null) => void;
  onOpenDay: (line: number, k: number) => void;
  onCursor: (c: { j: number; k: number } | null) => void;
  cellTip: (line: number, k: number) => Tip & { n: number };
  onInfo: OpenInfo;
  onTip: ShowTip;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(959);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setAvail(el.clientWidth || 959);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = vm.days;
  const multi = n > 31;
  const TH = multi ? 44 : 26;
  const cs = Math.min(CS_MAX, Math.max(CS_MIN, avail / Math.min(n, 31)));
  const W = n * cs;
  const H = TH + vm.rows.length * cs;
  const tight = cs < 24;
  const sq = cs - 2;
  const cursorRow = cursor ? vm.rows[cursor.j] : undefined;
  const cursorCell =
    cursor && cursorRow ? cellTip(cursorRow.line, cursor.k) : null;
  const cursorText = cursorCell
    ? [
        cursorCell.title,
        ...(cursorCell.lines ?? []),
        ...(cursorCell.rows ?? []).map(([a, b]) => `${a} ${b}`),
      ].join(", ")
    : "";

  // the keyboard cursor: scroll its column into view and show its tooltip
  useLayoutEffect(() => {
    if (!cursor) return;
    const sc = wrap.current;
    const k = cursor.k;
    if (
      sc &&
      (k * cs < sc.scrollLeft || (k + 1) * cs > sc.scrollLeft + sc.clientWidth)
    )
      sc.scrollLeft = k * cs - sc.clientWidth / 2;
    if (document.activeElement === svg.current && svg.current) {
      const r = svg.current.getBoundingClientRect();
      const s = r.width / W || 1;
      const row = vm.rows[cursor.j];
      if (row)
        onTip(cellTip(row.line, k), {
          x: r.left + (k + 0.5) * cs * s,
          y: r.top + (TH + cursor.j * cs) * s,
        });
    }
  }, [cursor, cs, W, TH, vm.rows, cellTip, onTip]);

  const sortBtn = (key: "name" | "total") => {
    const s: HeatSort | null = vm.sort;
    const on =
      key === "name"
        ? s === "name" || s === "name-desc"
        : s === "total" || s === "total-asc";
    const name =
      key === "name"
        ? s === "name"
          ? "line name, A to Z"
          : s === "name-desc"
            ? "line name, Z to A"
            : "line name"
        : s === "total"
          ? "total, high to low"
          : s === "total-asc"
            ? "total, low to high"
            : "total amount";
    const txt =
      key === "name"
        ? s === "name-desc"
          ? "Z–A"
          : "A–Z"
        : s === "total-asc"
          ? "Low–high"
          : "High–low";
    const dir = !on
      ? "off"
      : key === "name"
        ? s === "name"
          ? "up"
          : "down"
        : s === "total-asc"
          ? "up"
          : "down";
    return (
      <button
        className={clsx("hsort", on && "on")}
        type="button"
        aria-pressed={on}
        aria-label={`Sort by ${name}${on ? "" : " (off)"}`}
        onClick={() => onSort(key)}
      >
        <IconSort dir={dir} />
        <span>
          {key === "name" ? "Name" : "Total"} {on ? txt : ""}
        </span>
      </button>
    );
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const j = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1 + SECS.length,
      Home: 0,
      End: SECS.length - 1,
    }[e.key];
    if (j === undefined) return;
    e.preventDefault();
    const sec = SECS[j % SECS.length]![0];
    onTab(sec);
    requestAnimationFrame(() =>
      tabs.current
        ?.querySelector<HTMLButtonElement>(`#cf-tab-${sec}`)
        ?.focus({ preventScroll: true }),
    );
  };

  const cellAt = (t: EventTarget) => {
    const el = t instanceof Element ? t.closest("rect.hit") : null;
    return el
      ? {
          j: Number(el.getAttribute("data-j")),
          k: Number(el.getAttribute("data-k")),
        }
      : null;
  };

  const onGridKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const c = cursor ?? { j: 0, k: 0 };
    const mv = (
      {
        ArrowRight: [0, 1],
        ArrowLeft: [0, -1],
        ArrowDown: [1, 0],
        ArrowUp: [-1, 0],
        Home: [0, -1e4],
        End: [0, 1e4],
      } as Record<string, [number, number]>
    )[e.key];
    if (mv) {
      e.preventDefault();
      onCursor({
        j: Math.max(0, Math.min(vm.rows.length - 1, c.j + mv[0])),
        k: Math.max(0, Math.min(n - 1, c.k + mv[1])),
      });
      return;
    }
    if (e.key === "Enter" && cursor) {
      const row = vm.rows[cursor.j];
      if (row && cellTip(row.line, cursor.k).n > 0) {
        e.preventDefault();
        onOpenDay(row.line, cursor.k);
      }
    }
  };

  // axis: month bands and day ticks
  const axis: React.ReactNode[] = [];
  const seps: React.ReactNode[] = [];
  vm.cols.forEach((c, k) => {
    const x = k * cs;
    if (multi && (c.dom === 1 || k === 0)) {
      const daysInMonth = new Date(
        Date.UTC(c.year, c.month + 1, 0),
      ).getUTCDate();
      const end = Math.min(n, k + daysInMonth - c.dom + 1);
      axis.push(
        <rect
          key={`b${k}`}
          className={clsx("mband", c.month % 2 === 1 && "alt")}
          x={x}
          y={0}
          width={(end - k) * cs}
          height={18}
          rx={4}
        />,
        <text key={`bt${k}`} className="tick mo" x={x + 8} y={13}>
          {MON[c.month]} {c.year}
        </text>,
      );
      if (k > 0)
        seps.push(
          <line key={`s${k}`} className="msep" x1={x} x2={x} y1={0} y2={H} />,
        );
    }
    if (multi || cs >= 18 || c.dom % 2 === 1)
      axis.push(
        <text
          key={`t${k}`}
          className="tick"
          x={x + cs / 2}
          y={TH - 8}
          textAnchor="middle"
        >
          {c.dom}
        </text>,
      );
  });

  return (
    <div className="card hm-card">
      <div className="ftabs" role="tablist" aria-label="Activity" ref={tabs}>
        {SECS.map(([k, name], i) => (
          <button
            key={k}
            className="ftab"
            type="button"
            role="tab"
            id={`cf-tab-${k}`}
            data-t={name}
            aria-selected={k === vm.sec}
            aria-controls="cf-hm"
            tabIndex={k === vm.sec ? 0 : -1}
            onClick={() => onTab(k)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="hm-box">
        <div className="ch">
          <h2>{vm.title}</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {vm.periodLabel}
          </span>
          <span className="sp" />
        </div>
        <div
          className="hm"
          id="cf-hm"
          role="tabpanel"
          aria-labelledby={`cf-tab-${vm.sec}`}
        >
          <div className="hl-col">
            <div className="hsh" style={{ height: TH }}>
              {sortBtn("name")}
            </div>
            {vm.rows.map((r) => (
              <button
                key={r.line}
                className={clsx("rl", !r.enabled && "zero", tight && "tight")}
                type="button"
                style={{ height: cs }}
                disabled={!r.enabled}
                aria-label={`${r.label}: ${r.total}; open transactions`}
                onClick={() => onOpenLine(r.line)}
              >
                <span>{r.label}</span>
                {r.enabled && (
                  <span className="go" aria-hidden="true">
                    →
                  </span>
                )}
              </button>
            ))}
            <button
              className="rl tot"
              type="button"
              style={{ height: TOT_H, borderRadius: 0 }}
              onClick={() => onOpenLine(null)}
            >
              {vm.netLabel}
            </button>
          </div>
          <div
            className="hmw"
            ref={wrap}
            onScroll={() => {
              // the keyboard cursor scrolls its column into view: keep its tooltip (CF-KEY-03); any other scroll hides it
              const s = svg.current;
              const row = cursor && vm.rows[cursor.j];
              if (!s || !row || document.activeElement !== s)
                return onTip(null);
              const r = s.getBoundingClientRect();
              const f = r.width / W || 1;
              onTip(cellTip(row.line, cursor.k), {
                x: r.left + (cursor.k + 0.5) * cs * f,
                y: r.top + (TH + cursor.j * cs) * f,
              });
            }}
          >
            <svg
              ref={svg}
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              tabIndex={0}
              role="application"
              aria-label={vm.gridLabel}
              onMouseMove={(e) => {
                const c = cellAt(e.target);
                const row = c ? vm.rows[c.j] : undefined;
                if (c && row)
                  onTip(cellTip(row.line, c.k), { x: e.clientX, y: e.clientY });
                else if (document.activeElement !== svg.current) onTip(null);
              }}
              onMouseLeave={() => {
                if (document.activeElement !== svg.current) onTip(null);
              }}
              onClick={(e) => {
                const c = cellAt(e.target);
                const row = c ? vm.rows[c.j] : undefined;
                if (c && row) onOpenDay(row.line, c.k);
              }}
              onKeyDown={onGridKey}
              // keyboard focus only: on a mouse press the cursor's scroll-into-view would move the grid under the
              // pointer before mouseup, and the click would land on another cell (or none)
              onFocus={(e) => {
                if (e.currentTarget.matches(":focus-visible"))
                  onCursor(cursor ?? { j: 0, k: 0 });
              }}
              onBlur={() => onTip(null)}
            >
              {axis}
              {vm.rows.map((r, j) => {
                const y = TH + j * cs + GAP / 2;
                const side = cs - GAP;
                return (
                  <g key={r.line}>
                    <rect
                      className="cell z"
                      x={0}
                      y={y}
                      width={W - GAP}
                      height={side}
                      rx={3}
                    />
                    {r.cells.map((c) => (
                      <rect
                        key={c.k}
                        className={`cell hit q${c.block}`}
                        data-j={j}
                        data-k={c.k}
                        x={c.k * cs + GAP / 2}
                        y={y}
                        width={side}
                        height={side}
                        rx={2}
                      />
                    ))}
                  </g>
                );
              })}
              {seps}
              {cursor && (
                <rect
                  className="cur"
                  x={cursor.k * cs}
                  y={TH + cursor.j * cs}
                  width={cs}
                  height={cs}
                  rx={3}
                  style={{ stroke: "var(--hl)", strokeWidth: 2 }}
                />
              )}
            </svg>
          </div>
          <div className="hl-col">
            <div className="hsh r" style={{ height: TH }}>
              {sortBtn("total")}
            </div>
            {vm.rows.map((r) => (
              <span
                key={r.line}
                className={clsx("rt n", !r.enabled && "zero", tight && "tight")}
                style={{ height: cs }}
              >
                <i
                  className={`tq ${r.totalBlock ? `q${r.totalBlock}` : "z"}`}
                  style={{ width: sq, height: sq }}
                  aria-hidden="true"
                />
                <span className="tv">{r.total}</span>
              </span>
            ))}
            <span className="rt n tot" style={{ height: TOT_H }}>
              {vm.netTotal}
            </span>
          </div>
        </div>
        {/* the cursor's cell, read out (CF-A11-06): the tooltip itself is not tied to the grid */}
        <span className="sr-only" aria-live="polite">
          {cursorText}
        </span>
        <div className="hm-foot">
          <span
            className="ramp"
            role="img"
            aria-label="Cash moved per day in five equal-count blocks; orange = top 20 %"
          >
            <i className="z" title="No cash moved" />
            {vm.legend.map((t, i) => (
              <i key={i} className={`q${i + 1}`} title={t} />
            ))}
          </span>
          <InfoButton
            id="heat"
            label="About the heatmap colours"
            onInfo={onInfo}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- View 3 · Transactions ----------

export function TransactionsView({
  vm,
  onInfo,
}: {
  vm: LedgerView;
  onInfo: OpenInfo;
}) {
  return (
    <div className="card ledger">
      <div className="ch">
        <h2>{vm.title}</h2>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{vm.when}</span>
        <span className="sp" />
        <InfoButton id="ledger" label="About the ledger" onInfo={onInfo} />
      </div>
      <div className="trio" style={{ marginTop: 8 }}>
        <div className="k-in">
          <span>Cash in</span>
          <b>{vm.tiles.cin}</b>
        </div>
        <div className="k-out">
          <span>Cash out</span>
          <b>{vm.tiles.cout}</b>
        </div>
        <div>
          <span>Net</span>
          <b>{vm.tiles.net}</b>
        </div>
        <div>
          <span>Transactions</span>
          <b>{vm.tiles.n}</b>
        </div>
      </div>
      {vm.rows.length ? (
        <div
          className="lgw"
          tabIndex={0}
          role="region"
          aria-label={`${vm.title}: transactions`}
        >
          <table className="lt">
            <colgroup>
              <col className="c1" />
              <col className="c2" />
              <col />
              <col className="c4" />
              {vm.allLines && <col className="c5" />}
              <col className="c6" />
              <col className="c7" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Party</th>
                <th scope="col">Memo</th>
                <th scope="col">Type · No.</th>
                {vm.allLines && <th scope="col">Line</th>}
                <th scope="col" className="r">
                  Amount
                </th>
                <th scope="col" title="Cleared status">
                  Clr
                </th>
              </tr>
            </thead>
            <tbody>
              {vm.rows.map((r) => (
                <tr key={r.key}>
                  <td className="n">{r.date}</td>
                  <td title={r.partyTitle}>{r.party}</td>
                  <td className="m" title={r.memo}>
                    {r.memo}
                  </td>
                  <td>
                    {r.type}
                    {r.doc && <span className="m"> {r.doc}</span>}
                  </td>
                  {vm.allLines && <td className="m">{r.line}</td>}
                  <td className="r n">{r.amount}</td>
                  <td>
                    <span
                      className={`cl ${r.cleared}`}
                      title={r.clearedTitle}
                      role="img"
                      aria-label={r.clearedTitle}
                    >
                      {r.cleared === "N"
                        ? "·"
                        : r.cleared === "U"
                          ? ""
                          : r.cleared}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={vm.allLines ? 5 : 4}>{vm.totalLabel}</td>
                <td className="r n">{vm.total}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="empty">{TEXT.noCash}</div>
      )}
    </div>
  );
}
