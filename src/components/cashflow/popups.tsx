"use client";

import { clsx } from "clsx";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Section } from "@/lib/cashflow/data/manifest";
import {
  MON,
  dataYears,
  hasMonth,
  lastIx,
  ym,
} from "@/lib/cashflow/engine/calendar";
import {
  HOW_KEYS,
  HOW_STEPS,
  INFO,
  TEXT,
  type InfoId,
} from "@/lib/cashflow/engine/copy";
import type { Dataset } from "@/lib/cashflow/engine/data";
import type { Unit } from "@/lib/cashflow/engine/format";
import {
  quarterSelection,
  quickSelection,
  yearSelection,
  type Group,
  type Selection,
} from "@/lib/cashflow/engine/url-state";
import type {
  CashCard,
  DiagramView,
  RecView,
} from "@/lib/cashflow/engine/view";
import { IconCheck, IconDiagram, IconGo, IconHow } from "./icons";

// The seven pop-ups (handoff js-spec 03 § 6). One layer at a time; the board owns open / close, focus and Esc.

export type Place =
  | { kind: "fixed" }
  | { kind: "center" }
  | { kind: "near"; x: number; y: number; right: number; top: number };

/** Glass frame of every pop-up: a dialog labelled by its heading, the orange close button, placement. */
export function PopFrame({
  cls,
  labelId,
  place,
  onClose,
  children,
}: {
  cls: string;
  labelId: string;
  place: Place;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (place.kind !== "near" || !ref.current) return;
    const el = ref.current;
    const parent = el.offsetParent as HTMLElement | null;
    const fw = parent?.clientWidth ?? 1440;
    const fh = parent?.clientHeight ?? 810;
    let x = place.x;
    let y = place.y;
    if (x + el.offsetWidth > fw - 16) x = place.right - el.offsetWidth;
    if (y + el.offsetHeight > fh - 16)
      y = Math.max(16, place.top - el.offsetHeight - 8);
    setPos({ left: Math.max(16, x), top: y });
  }, [place]);
  return (
    <div
      ref={ref}
      className={clsx("pop", cls, place.kind === "center" && "center")}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      style={
        place.kind === "near"
          ? (pos ?? { left: place.x, top: place.y, visibility: "hidden" })
          : undefined
      }
    >
      {children}
      <button className="x" type="button" aria-label="Close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

// ---------- calendar + settings ----------

type Span = "A" | "Q" | "M";
const SPANS: [Span, string][] = [
  ["A", "Year"],
  ["Q", "Quarter"],
  ["M", "Month"],
];
const QUICK = ["YTD", "QTD", "MTD"] as const;
const QSPAN = { YTD: "A", QTD: "Q", MTD: "M" } as const;

export function CalendarPop({
  ds,
  sel,
  unit,
  onSelect,
  onUnit,
}: {
  ds: Dataset;
  sel: Selection;
  unit: Unit;
  onSelect: (s: Selection) => void;
  onUnit: (u: Unit) => void;
}) {
  const [span, setSpan] = useState<Span>(
    sel.quick ? QSPAN[sel.quick] : sel.mode === "Y" ? "A" : sel.mode,
  );
  const [year, setYear] = useState(sel.y);
  const live = !sel.quick;
  const years = dataYears(ds);
  const y0 = years[0]!;
  const [y1, m1] = ym(ds, lastIx(ds));
  const el = (
    key: string,
    txt: string,
    on: boolean,
    off: boolean,
    part: string,
    pick: () => void,
  ) => (
    <button
      key={key}
      type="button"
      disabled={off}
      className={part ? "part" : undefined}
      title={part || undefined}
      aria-label={part ? `${txt}, ${part}` : undefined}
      aria-pressed={on}
      onClick={pick}
    >
      {txt}
    </button>
  );
  let els: ReactNode;
  // a step to the first or last data year disables the button used: focus moves to the other one (mock `data-cyr`)
  const step = (d: -1 | 1, el: HTMLButtonElement) => {
    const y = year + d;
    setYear(y);
    if (y <= y0 || y >= y1) {
      const other = el.parentElement?.querySelectorAll("button")[d < 0 ? 1 : 0];
      requestAnimationFrame(() => other?.focus({ preventScroll: true }));
    }
  };
  const stepper = (
    <div className="ystep" role="group" aria-label="Year">
      <button
        type="button"
        aria-label="Previous year"
        disabled={year <= y0}
        onClick={(e) => step(-1, e.currentTarget)}
      >
        ‹
      </button>
      <b aria-live="polite">{year}</b>
      <button
        type="button"
        aria-label="Next year"
        disabled={year >= y1}
        onClick={(e) => step(1, e.currentTarget)}
      >
        ›
      </button>
    </div>
  );
  if (span === "A") {
    els = (
      <div className="mgrid g3" role="group" aria-label="Year">
        {years.map((yy) =>
          el(
            String(yy),
            String(yy),
            live && sel.mode === "A" && sel.y === yy,
            false,
            hasMonth(ds, yy, 12) ? "" : `Jan–${MON[m1 - 1]} only`,
            () => {
              setYear(yy);
              onSelect(yearSelection(ds, yy));
            },
          ),
        )}
      </div>
    );
  } else if (span === "Q") {
    els = (
      <>
        {stepper}
        <div className="mgrid" role="group" aria-label="Quarter">
          {[1, 2, 3, 4].map((q) => {
            const last =
              [3, 2, 1].find((k) => hasMonth(ds, year, q * 3 - 3 + k)) ?? 0;
            const part =
              last && last < 3
                ? `${MON[q * 3 - 3]}${last > 1 ? `–${MON[q * 3 - 3 + last - 1]}` : ""} only`
                : "";
            return el(
              `q${q}`,
              `Q${q}`,
              live &&
                sel.mode === "Q" &&
                sel.y === year &&
                Math.ceil(sel.m / 3) === q,
              !last,
              part,
              () => onSelect(quarterSelection(ds, year, q)),
            );
          })}
        </div>
      </>
    );
  } else {
    els = (
      <>
        {stepper}
        <div className="mgrid" role="group" aria-label="Month">
          {MON.map((mn, i) =>
            el(
              mn,
              mn,
              live && sel.mode === "M" && sel.y === year && sel.m === i + 1,
              !hasMonth(ds, year, i + 1),
              "",
              () => onSelect({ mode: "M", y: year, m: i + 1, quick: null }),
            ),
          )}
        </div>
      </>
    );
  }
  return (
    <>
      <h3 id="cf-pop-h">Period</h3>
      <div className="ctabs" role="group" aria-label="Span">
        {SPANS.map(([k, t]) => (
          <button
            key={k}
            className="vtab"
            type="button"
            data-t={t}
            aria-pressed={live && span === k}
            data-first={live && span === k ? "" : undefined}
            onClick={() => setSpan(k)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="cels">{els}</div>
      <div className="gh">
        To date · {MON[m1 - 1]} {y1}
      </div>
      <div className="chips" role="group" aria-label="To date">
        {QUICK.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={sel.quick === k}
            data-first={sel.quick === k ? "" : undefined}
            onClick={() => {
              const s = quickSelection(ds, k);
              setSpan(QSPAN[k]);
              setYear(s.y);
              onSelect(s);
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <div
        className="gh"
        style={{
          marginTop: 18,
          borderTop: "1px solid var(--rule)",
          paddingTop: 14,
        }}
      >
        Units
      </div>
      <div className="chips" role="group" aria-label="Units">
        {(
          [
            ["USD", "USD"],
            ["USDk", "USD k"],
          ] as const
        ).map(([k, t]) => (
          <button
            key={k}
            type="button"
            aria-pressed={unit === k}
            onClick={() => onUnit(k)}
          >
            {t}
          </button>
        ))}
      </div>
    </>
  );
}

// ---------- menu ----------

export function MenuPop({
  current,
  onDrill,
  onOpen,
}: {
  current: 0 | 1 | 2;
  onDrill: (step: 0 | 1 | 2) => void;
  onOpen: (kind: "diagram" | "rec" | "how") => void;
}) {
  const item = (
    key: string,
    label: string,
    cur: boolean,
    icon: ReactNode,
    onClick: () => void,
  ) => (
    <button
      key={key}
      className="mi"
      type="button"
      aria-current={cur}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
  return (
    <>
      <h3 id="cf-pop-h" style={{ margin: "4px 8px 6px" }}>
        Menu
      </h3>
      <p className="mgh" id="cf-mg-drill">
        Drill path
      </p>
      <div className="drill" role="group" aria-labelledby="cf-mg-drill">
        {(["Statement", "Activities", "Transactions"] as const).map((t, i) =>
          item(
            t,
            t,
            current === i,
            <span className="ly" aria-label={`layer ${i + 1}`}>
              {i + 1}
            </span>,
            () => onDrill(i as 0 | 1 | 2),
          ),
        )}
      </div>
      <div className="mgmt" role="group" aria-labelledby="cf-mg-mgmt">
        <p className="mgh" id="cf-mg-mgmt">
          Management view
        </p>
        {item("diagram", "Diagram", false, <IconDiagram />, () =>
          onOpen("diagram"),
        )}
        {item("rec", "Reconciliation", false, <IconCheck />, () =>
          onOpen("rec"),
        )}
      </div>
      <div className="msep" />
      {item("how", "How to read", false, <IconHow />, () => onOpen("how"))}
    </>
  );
}

// ---------- ⓘ and How to read ----------

export function InfoBody({
  id,
  headingId,
}: {
  id: InfoId;
  headingId?: string;
}) {
  const i = INFO[id];
  return (
    <>
      <h3 id={headingId}>{i.title}</h3>
      <p>{i.body}</p>
      <div className="f">{i.formula}</div>
      <span className="src">{i.source}</span>
    </>
  );
}

export function HowPop() {
  return (
    <>
      <h3 id="cf-pop-h">How to read</h3>
      <div className="how-g">
        <div>
          <p className="gh">Path</p>
          <ol className="steps">
            {HOW_STEPS.map(([t, s], i) => (
              <li key={t}>
                <b>{i + 1}</b>
                {t}
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p style={{ marginTop: 10 }}>
            Click a section row to expand its lines; the orange{" "}
            <span
              className="kb"
              style={{ display: "inline-grid", verticalAlign: -4 }}
              role="img"
              aria-label="arrow button"
            >
              <IconGo />
            </span>{" "}
            opens its activities. {TEXT.howPathTail}
          </p>
          <p className="gh">Keys</p>
          <div className="keys">
            {HOW_KEYS.map(([k, t]) => (
              <Pair key={k} a={<span className="kbd">{k}</span>} b={t} />
            ))}
          </div>
        </div>
        <div>
          <p className="gh">Marks</p>
          <div className="keys">
            <Pair
              a={<span className="n">(12,480)</span>}
              b="cash out; cash in has no sign; – is zero"
            />
            <Pair
              a={
                <i
                  className="sw2"
                  style={{ background: "var(--lineBar)", width: 22 }}
                />
              }
              b="statement line: bar length = absolute amount"
            />
            <Pair
              a={
                <i
                  className="sw2"
                  style={{ background: "var(--sec)", width: 22 }}
                />
              }
              b="balance (opening, closing); a notch = longer than the axis"
            />
            <Pair
              a={
                <>
                  <i className="sw2" style={{ background: "var(--in)" }} />{" "}
                  <i className="sw2" style={{ background: "var(--out)" }} />{" "}
                  <i className="sw2" style={{ background: "var(--hl)" }} />
                </>
              }
              b="activity cards: in · out · net"
            />
            <Pair a={<span className="rule1" />} b="section total" />
            <Pair a={<span className="rule2" />} b="closing cash" />
            <Pair
              a={<span className="ovr">S01</span>}
              b="line of credit moved to financing by override"
            />
            <Pair
              a={
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i
                      key={i}
                      className="sw2"
                      style={{ background: `var(--q${i})`, width: 9 }}
                    />
                  ))}
                </>
              }
              b="heatmap: five blocks, 20 % of the days each; orange = top 20 %"
            />
            <Pair
              a={
                <>
                  <span className="cl R">R</span>{" "}
                  <span className="cl C">C</span> <span className="cl U" />
                </>
              }
              b="reconciled · cleared · uncleared"
            />
            <Pair
              a={<i className="sw2" style={{ background: "var(--hl)" }} />}
              b="accent: current level, focus, selection; never good or bad"
            />
          </div>
        </div>
      </div>
    </>
  );
}

const Pair = ({ a, b }: { a: ReactNode; b: string }) => (
  <>
    <span>{a}</span>
    <span>{b}</span>
  </>
);

// ---------- Cash ----------

export function CashPop({
  heading,
  cards,
  onActivity,
}: {
  heading: string;
  cards: CashCard[];
  onActivity: (sec: Section) => void;
}) {
  const rows = (c: CashCard) =>
    c.bars.map((b) => (
      <div key={b.label} className={`arow ${b.kind}`}>
        <span>{b.label}</span>
        <span className="tr">
          {b.ratio > 0 && <i style={{ width: `${b.ratio * 100}%` }} />}
        </span>
        <span className="n">{b.value}</span>
      </div>
    ));
  return (
    <>
      <h3 id="cf-pop-h">{heading}</h3>
      <div className="cgrid">
        {cards.map((c) =>
          c.sec === null ? (
            <div
              key="bal"
              className="act bal-card"
              role="group"
              aria-label={c.ariaLabel}
            >
              <span className="ah">
                <h3>{c.title}</h3>
                <span className="n">{c.head}</span>
              </span>
              {rows(c)}
            </div>
          ) : (
            <button
              key={c.sec}
              className="act"
              type="button"
              aria-label={c.ariaLabel}
              onClick={() => onActivity(c.sec!)}
            >
              <span className="ah">
                <h3>{c.title}</h3>
                <span className="n">{c.head}</span>
                <span className="gt" aria-hidden="true">
                  →
                </span>
              </span>
              <div className="arow blank" aria-hidden="true" />
              {rows(c)}
              {c.note && <span className="nc">{c.note}</span>}
            </button>
          ),
        )}
      </div>
    </>
  );
}

// ---------- Diagram ----------

export function DiagramPop({
  vm,
  onGroup,
  onAll,
  onActivity,
}: {
  vm: DiagramView;
  onGroup: (g: Group) => void;
  onAll: (open: boolean) => void;
  onActivity: (sec: Section) => void;
}) {
  const [note, setNote] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  // the chip just used disables itself: focus goes to the other one, not to the page (mock `redrawDiagram`)
  const all = (open: boolean) => {
    onAll(open);
    requestAnimationFrame(() =>
      chips.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus({ preventScroll: true }),
    );
  };
  return (
    <>
      <div className="ph">
        <h3 id="cf-pop-h">
          {vm.heading}{" "}
          <button
            className="i"
            type="button"
            aria-label="About the diagram"
            aria-expanded={note}
            style={{ marginLeft: 6, verticalAlign: -3 }}
            onClick={() => setNote(!note)}
          >
            i
          </button>
        </h3>
        <div
          className="chips sm"
          role="group"
          aria-label="KPI groups"
          ref={chips}
        >
          <button type="button" disabled={vm.allOpen} onClick={() => all(true)}>
            Expand all
          </button>
          <button
            type="button"
            disabled={vm.noneOpen}
            onClick={() => {
              if (body.current) body.current.scrollTop = 0;
              all(false);
            }}
          >
            Collapse all
          </button>
        </div>
      </div>
      {note && (
        <div className="dg-note">
          <InfoBody id="diagram" />
        </div>
      )}
      <div className="dgp pb" ref={body}>
        <div className="dg" style={{ width: vm.width, height: vm.height }}>
          <svg
            className="links"
            width={vm.width}
            height={vm.height}
            aria-hidden="true"
          >
            {vm.links.map((l, i) => (
              <path key={i} className={clsx("lnk", l.on && "on")} d={l.d} />
            ))}
            {vm.plus.map((p, i) => (
              <g key={i} className="plus">
                <circle cx={p.x} cy={p.y} r={10} />
                <text x={p.x} y={p.y}>
                  +
                </text>
              </g>
            ))}
          </svg>
          {vm.nodes.map((n) => {
            const style = { left: n.x, top: n.y, width: n.w, height: n.h };
            const inner = (
              <>
                <span className="t">
                  {n.title}
                  {n.kind === "act" && (
                    <span aria-hidden="true" style={{ marginLeft: "auto" }}>
                      →
                    </span>
                  )}
                </span>
                <span className="v">{n.value}</span>
                <span className="s">{n.caption}</span>
              </>
            );
            if (n.kind === "act")
              return (
                <button
                  key={n.key}
                  className="node act-n"
                  type="button"
                  style={style}
                  aria-label={n.ariaLabel}
                  onClick={() => onActivity(n.sec!)}
                >
                  {inner}
                </button>
              );
            if (n.kind === "grp")
              return (
                <button
                  key={n.key}
                  className="node grp"
                  type="button"
                  style={style}
                  aria-expanded={n.open}
                  onClick={() => onGroup(n.group!)}
                >
                  {inner}
                </button>
              );
            return (
              <div
                key={n.key}
                className={`node ${n.kind === "root" ? "root" : "met"}`}
                role="note"
                style={style}
                aria-label={n.ariaLabel}
              >
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------- Reconciliation ----------

export function RecPop({ vm }: { vm: RecView }) {
  const mark = (ok: boolean) => (
    <td className="ok" aria-label={ok ? "ties" : "differs"}>
      {ok ? "✓" : "✗"}
    </td>
  );
  return (
    <>
      <h3 id="cf-pop-h">
        {vm.heading}{" "}
        {vm.count && (
          <span
            style={{ fontWeight: 500, color: "var(--muted)", fontSize: 12.5 }}
          >
            {vm.count}
          </span>
        )}
      </h3>
      <div className="pb">
        {vm.count === null ? (
          <p>{TEXT.recNoKey}</p>
        ) : (
          <>
            <div className="rec-g">
              <table className="rec-t">
                <thead>
                  <tr>
                    <th scope="col">Statement · KPI</th>
                    <th scope="col" className="r">
                      Page
                    </th>
                    <th scope="col" className="r">
                      Control
                    </th>
                    <th scope="col">
                      <span className="sr-only">Ties</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vm.head.map((r) => (
                    <tr key={r.metric}>
                      <td>{r.metric}</td>
                      <td className="r">{r.page}</td>
                      <td className="r">{r.control}</td>
                      {mark(r.ok)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="rec-t">
                <thead>
                  <tr>
                    <th scope="col">Direct line</th>
                    <th scope="col" className="r">
                      Heatmap row
                    </th>
                    <th scope="col" className="r">
                      Ledger
                    </th>
                    <th scope="col" className="r">
                      Control
                    </th>
                    <th scope="col">
                      <span className="sr-only">Ties</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vm.lines.map((r) => (
                    <tr key={r.label}>
                      <td>{r.label}</td>
                      <td className="r">{r.heat}</td>
                      <td className="r">{r.ledger}</td>
                      <td className="r">{r.control}</td>
                      {mark(r.ok)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className="src">{vm.footer}</span>
          </>
        )}
      </div>
    </>
  );
}
