import { SECTIONS, type Section } from "../data/manifest";
import { MON, type Period } from "./calendar";
import { CLEARED_TITLE, KPI_TITLES, TEXT } from "./copy";
import type { Dataset } from "./data";
import {
  cellValue,
  heat,
  ledgerRows,
  ledgerSummary,
  lineTotals,
  sectionFlows,
} from "./direct";
import {
  compact,
  days,
  fmtDayLedger,
  fmtDayLong,
  fmtIsoDate,
  fmtRange,
  money,
  partsOfDay,
  pctOfNi,
  percent,
  ratio,
  txnType,
  type Unit,
} from "./format";
import { metrics, type Metrics } from "./metrics";
import type { Entry } from "./nav";
import { quintiles } from "./quintile";
import { selfCheck } from "./self-check";
import {
  SECTION_NAME,
  barAxisMax,
  statement,
  statementRows,
  type RowKind,
} from "./statement";
import type { Group, HeatSort, Selection } from "./url-state";
import { priorPeriod } from "./calendar";

// View models (CF-ARC-03): plain objects with every string ready to print and every geometry as a ratio, so the
// components lay out and never compute a business value.

const periodText = (p: Period) => `${p.label}${p.partial ? " to date" : ""}`;

// ---------- shell ----------

export interface ShellView {
  badge: { mode: string; value: string; sub: string };
  ariaLabel: string;
  context: string;
}

export function shellView(
  ds: Dataset,
  sel: Selection,
  p: Period,
  unit: Unit,
): ShellView {
  const mode =
    sel.quick ?? { M: "Month", Q: "Quarter", Y: "YTD", A: "Year" }[sel.mode];
  const am = ds.months[p.a]!;
  const bm = ds.months[p.b]!;
  const badge =
    sel.mode === "A"
      ? {
          mode,
          value: String(sel.y),
          sub: `${MON[+am.slice(5) - 1]}–${MON[+bm.slice(5) - 1]}`,
        }
      : {
          mode,
          value:
            sel.mode === "Q" ? `Q${Math.ceil(sel.m / 3)}` : MON[sel.m - 1]!,
          sub: String(sel.y),
        };
  return {
    badge,
    ariaLabel: `Period ${periodText(p)}; open calendar and settings`,
    context: `${ds.company} · ${fmtRange(ds, p.d0, p.d1)} · ${unit === "USDk" ? "USD thousands" : "USD"} · as of ${fmtIsoDate(ds.asOf)}`,
  };
}

// ---------- KPI cards ----------

export type KpiId = keyof typeof KPI_TITLES;
export interface KpiCard {
  id: KpiId;
  title: string;
  value: string;
  /** `▲ 36,103` and `vs Sep 2026`, or one text (`no prior period`, `vs Sep 2026: n/m`) */
  delta: { strong: string; label: string } | { text: string };
}

type KpiKind = "money" | "x" | "days";
const KPI_DEFS: {
  id: KpiId;
  kind: KpiKind;
  v: (m: Metrics) => number | null;
}[] = [
  { id: "close", kind: "money", v: (m) => m.close },
  { id: "net", kind: "money", v: (m) => m.net },
  { id: "cfo", kind: "money", v: (m) => m.cfo },
  { id: "fcf", kind: "money", v: (m) => m.fcf },
  { id: "conv", kind: "x", v: (m) => (m.convMeaningful ? m.conv : null) },
  { id: "dso", kind: "days", v: (m) => m.dso },
];

export function kpiCards(ds: Dataset, p: Period, unit: Unit): KpiCard[] {
  const cur = metrics(ds, p);
  const pp = priorPeriod(ds, p);
  const pr = pp ? metrics(ds, pp) : null;
  const fmt = (kind: KpiKind, v: number | null) =>
    kind === "money"
      ? money(v, unit, { suffix: true })
      : kind === "x"
        ? ratio(v)
        : days(v);
  return KPI_DEFS.map(({ id, kind, v }) => {
    const value = v(cur);
    let delta: KpiCard["delta"] = { text: TEXT.noPrior };
    if (pr) {
      const pv = v(pr);
      if (value !== null && pv !== null) {
        const d = value - pv;
        const zero = kind === "money" ? d === 0 : Math.abs(d) < 0.005;
        const arrow = zero ? "" : d > 0 ? "▲ " : "▼ ";
        const dv =
          kind === "money"
            ? money(Math.abs(d), unit, { suffix: true })
            : kind === "x"
              ? `${Math.abs(d).toFixed(2)}×`
              : days(Math.abs(d));
        delta = { strong: `${arrow}${dv}`, label: `vs ${p.priorLabel}` };
      } else delta = { text: `vs ${p.priorLabel}: ${TEXT.nm}` };
    }
    return { id, title: KPI_TITLES[id], value: fmt(kind, value), delta };
  });
}

// ---------- statement ----------

export interface StatementRowView {
  k: RowKind;
  label: string;
  amount: string;
  /** bar length 0–1 of the track; null = no bar cell content */
  bar: { ratio: number; balance: boolean; clipped: boolean } | null;
  /** the row prints a bar cell (grid lines) */
  track: boolean;
  pct: string;
  d: number;
  sec?: Section;
  open?: boolean;
  override?: boolean;
  edge?: "open" | "end";
}

export interface StatementView {
  periodLabel: string;
  unitLabel: string;
  ticks: string[];
  rows: StatementRowView[];
}

export function statementView(
  ds: Dataset,
  p: Period,
  unit: Unit,
  exp: ReadonlySet<Section>,
): StatementView {
  const st = statement(ds, p.a, p.b);
  const rows = statementRows(st, exp);
  const max = barAxisMax(rows);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const t = money(Math.round(f * max), unit, { suffix: true });
    return t === "–" ? "0" : t;
  });
  return {
    periodLabel: `${p.label}${p.partial ? " · to date" : ""}`,
    unitLabel: unit === "USDk" ? "USD k" : "USD",
    ticks,
    rows: rows.map((r) => {
      let bar: StatementRowView["bar"] = null;
      if (r.val !== null && r.k !== "sub" && r.val !== 0) {
        const a = Math.abs(r.val);
        bar =
          r.k === "bal"
            ? { ratio: Math.min(a / max, 1), balance: true, clipped: a > max }
            : { ratio: a / max, balance: false, clipped: false };
      }
      return {
        k: r.k,
        label: r.label,
        amount: r.val === null ? "" : money(r.val, unit),
        bar,
        track: r.k !== "sub" && r.k !== "gap" && r.val !== null,
        pct:
          r.val === null || r.k === "bal" || r.k === "sub"
            ? ""
            : pctOfNi(r.val, st.ni),
        d: r.d,
        sec: r.sec,
        open: r.open,
        override: r.override,
        edge: r.edge,
      };
    }),
  };
}

// ---------- Activities (heat) ----------

export interface HeatRowView {
  /** line index */
  line: number;
  label: string;
  enabled: boolean;
  total: string;
  /** block 1–5 of the row total, 0 = none */
  totalBlock: number;
  /** cells with cash moved: day offset k and block */
  cells: { k: number; block: number }[];
}

export interface HeatView {
  sec: Section;
  title: string;
  periodLabel: string;
  days: number;
  /** per column: day of month, month 0–11, year */
  cols: { dom: number; month: number; year: number }[];
  rows: HeatRowView[];
  netLabel: string;
  netTotal: string;
  legend: string[];
  sort: HeatSort | null;
  gridLabel: string;
}

export function heatView(
  ds: Dataset,
  p: Period,
  unit: Unit,
  sec: Section,
  sort: HeatSort | null,
): HeatView {
  const h = heat(ds, sec, p);
  const lt = lineTotals(ds, p.a, p.b);
  const ord = h.rows.map((_, j) => j);
  if (sort === "name" || sort === "name-desc") {
    const dir = sort === "name" ? 1 : -1;
    ord.sort(
      (x, y) => h.rows[x]!.label.localeCompare(h.rows[y]!.label, "en") * dir,
    );
  } else if (sort === "total" || sort === "total-asc") {
    const dir = sort === "total-asc" ? 1 : -1;
    const abs = (j: number) => Math.abs(lt[h.rows[j]!.i]!.net);
    ord.sort((x, y) => (abs(x) - abs(y)) * dir || x - y);
  }
  const vals: number[] = [];
  for (const row of h.grid)
    for (const c of row) if (cellValue(c) > 0) vals.push(cellValue(c));
  const q = quintiles(vals);
  const tq = quintiles(
    h.rows.map((l) => Math.abs(lt[l.i]!.net)).filter((v) => v > 0),
  );
  const legend = q.bounds.map((b, i) =>
    b
      ? `Block ${i + 1} (${i * 20}–${(i + 1) * 20} %): ${compact(b.min / 100)} – ${compact(b.max / 100)}`
      : `Block ${i + 1}: no days`,
  );
  const rows = ord.map((j): HeatRowView => {
    const l = h.rows[j]!;
    const t = lt[l.i]!;
    const cells: HeatRowView["cells"] = [];
    h.grid[j]!.forEach((c, k) => {
      const v = cellValue(c);
      if (v > 0) cells.push({ k, block: q.block(v) });
    });
    return {
      line: l.i,
      label: l.label,
      enabled: t.n > 0,
      total: money(t.net, unit),
      totalBlock: t.net === 0 ? 0 : tq.block(Math.abs(t.net)),
      cells,
    };
  });
  const net = h.rows.reduce((s, l) => s + lt[l.i]!.net, 0);
  const name = SECTION_NAME[sec];
  return {
    sec,
    title: `${name} activities`,
    periodLabel: periodText(p),
    days: p.days,
    cols: Array.from({ length: p.days }, (_, k) => partsOfDay(ds, p.d0 + k)),
    rows,
    netLabel: `Net cash from ${name.toLowerCase()} activities`,
    netTotal: money(net, unit),
    legend,
    sort,
    gridLabel: `${name} cash moved per day; arrow keys move, Enter opens the day`,
  };
}

export interface CellTip {
  date: string;
  line: string;
  rows: [string, string][];
  n: number;
}

/** The tooltip of one heat cell (row index in line order of the activity, day offset k). */
export function cellTip(
  ds: Dataset,
  p: Period,
  unit: Unit,
  line: number,
  k: number,
): CellTip {
  const d = p.d0 + k;
  let cin = 0;
  let cout = 0;
  let n = 0;
  for (const r of ds.ledger) {
    if (r.d !== d || r.line !== line) continue;
    if (r.c > 0) cin += r.c;
    else cout += r.c;
    n++;
  }
  const ex = { exact: unit === "USD" };
  return {
    date: fmtDayLong(ds, d),
    line: ds.lines[line]!.label,
    rows: [
      ["In", money(cin, unit, ex)],
      ["Out", money(cout, unit, ex)],
      ["Transactions", String(n)],
    ],
    n,
  };
}

// ---------- Transactions (ledger) ----------

export interface LedgerRowView {
  key: string;
  date: string;
  party: string;
  partyTitle: string;
  memo: string;
  type: string;
  doc: string;
  line: string;
  amount: string;
  cleared: "R" | "C" | "U" | "N";
  clearedTitle: string;
}

export interface LedgerView {
  title: string;
  when: string;
  allLines: boolean;
  tiles: { cin: string; cout: string; net: string; n: string };
  rows: LedgerRowView[];
  totalLabel: string;
  total: string;
}

export function ledgerView(
  ds: Dataset,
  p: Period,
  unit: Unit,
  e: Extract<Entry, { view: "ledger" }>,
): LedgerView {
  const rows = ledgerRows(ds, {
    sec: e.sec,
    line: e.line,
    d0: e.day ?? p.d0,
    d1: e.day ?? p.d1,
  });
  const s = ledgerSummary(rows);
  const ex = { exact: unit === "USD" };
  const allLines = e.line === null;
  return {
    title: `${SECTION_NAME[e.sec]} › ${allLines ? "all lines" : ds.lines[e.line!]!.label}`,
    when: e.day !== null ? fmtDayLong(ds, e.day) : periodText(p),
    allLines,
    tiles: {
      cin: money(s.in, unit, ex),
      cout: money(s.out, unit, ex),
      net: money(s.net, unit, ex),
      n: String(s.n),
    },
    rows: rows.map((r, i) => {
      const name = ds.counterparties.get(r.cp) ?? "";
      return {
        key: `${r.txn}-${r.line}-${r.cp}-${r.c > 0 ? "+" : "-"}-${i}`,
        date: fmtDayLedger(ds, r.d),
        party: name || "(no name)",
        partyTitle: name,
        memo: r.memo || "–",
        type: txnType(r.type),
        doc: r.doc ? `#${r.doc}` : "",
        line: ds.lines[r.line]!.label,
        amount: money(r.c, unit, ex),
        cleared: r.cl,
        clearedTitle: CLEARED_TITLE[r.cl],
      };
    }),
    totalLabel: `Total · ${s.n} transactions`,
    total: money(s.net, unit, ex),
  };
}

// ---------- Cash pop-up ----------

export interface CashBar {
  label: string;
  kind: "bal" | "in" | "out" | "net";
  ratio: number;
  value: string;
}
export interface CashCard {
  sec: Section | null;
  title: string;
  head: string;
  bars: CashBar[];
  note: string | null;
  ariaLabel: string;
}

export function cashView(
  ds: Dataset,
  p: Period,
  unit: Unit,
): { heading: string; cards: CashCard[] } {
  const st = statement(ds, p.a, p.b);
  const fl = sectionFlows(ds, p.a, p.b);
  const cin = SECTIONS.reduce((s, k) => s + fl[k].in, 0);
  const cout = SECTIONS.reduce((s, k) => s + fl[k].out, 0);
  const m = (v: number) => money(v, unit);
  const bar = (
    label: string,
    kind: CashBar["kind"],
    v: number,
    max: number,
  ): CashBar => ({
    label,
    kind,
    ratio: v === 0 ? 0 : Math.abs(v) / max,
    value: m(v),
  });
  const balMax = Math.max(st.open, st.close, cin, -cout, 100);
  const actMax = Math.max(
    ...SECTIONS.flatMap((k) => [fl[k].in, -fl[k].out]),
    100,
  );
  const secTot: Record<Section, number> = { OP: st.op, INV: st.iv, FIN: st.fn };
  const cards: CashCard[] = [
    {
      sec: null,
      title: "Cash balance",
      head: m(st.close),
      bars: [
        bar("Opening", "bal", st.open, balMax),
        bar("In", "in", cin, balMax),
        bar("Out", "out", cout, balMax),
        bar("Closing", "bal", st.close, balMax),
      ],
      note: null,
      ariaLabel: `Cash balance: opening ${m(st.open)}, in ${m(cin)}, out ${m(cout)}, closing ${m(st.close)}`,
    },
    ...SECTIONS.map((k): CashCard => {
      const f = fl[k];
      const gap = secTot[k] - f.net;
      return {
        sec: k,
        title: SECTION_NAME[k],
        head: m(f.net),
        bars: [
          bar("In", "in", f.in, actMax),
          bar("Out", "out", f.out, actMax),
          bar("Net", "net", f.net, actMax),
        ],
        note: gap !== 0 ? `statement adds ${m(gap)} non-cash` : null,
        ariaLabel: `${SECTION_NAME[k]}: cash in ${m(f.in)}, cash out ${m(f.out)}, net ${m(f.net)}; open activities`,
      };
    }),
  ];
  return { heading: `Cash · ${periodText(p)}`, cards };
}

// ---------- Diagram ----------

interface GroupDef {
  id: Group;
  sec: Section;
  title: string;
  lead: (m: Metrics, u: Unit) => [string, string];
  mets: [
    string,
    (m: Metrics, u: Unit) => string,
    string | ((m: Metrics) => string),
  ][];
}

const xx = (m: Metrics) => (m.convMeaningful ? ratio(m.conv) : TEXT.nm);
const mm = (v: number, u: Unit) => money(v, u, { suffix: true });
export const GROUP_DEFS: GroupDef[] = [
  {
    id: "quality",
    sec: "OP",
    title: "Cash quality",
    lead: (m) => [xx(m), "cash conversion"],
    mets: [
      ["CFO margin", (m) => percent(m.margin), "CFO ÷ revenue"],
      ["Cash conversion", (m) => xx(m), "CFO ÷ net income"],
      ["Accruals", (m, u) => mm(m.accruals, u), "net income − CFO"],
    ],
  },
  {
    id: "wc",
    sec: "OP",
    title: "Working capital",
    lead: (m) => [days(m.ccc, true), "cash conversion cycle"],
    mets: [
      ["DSO", (m) => days(m.dso, true), "A/R ÷ revenue × days"],
      ["DPO", (m) => days(m.dpo, true), "A/P ÷ bills spend × days"],
      [
        "Cash conversion cycle",
        (m) => days(m.ccc, true),
        "DSO − DPO (no inventory)",
      ],
    ],
  },
  {
    id: "fcf",
    sec: "INV",
    title: "FCF and investment",
    lead: (m, u) => [mm(m.fcf, u), "free cash flow"],
    mets: [
      ["Free cash flow", (m, u) => mm(m.fcf, u), "CFO − capex + proceeds"],
      ["Capex intensity", (m) => percent(m.capexIntensity), "capex ÷ revenue"],
      [
        "Capex coverage",
        (m) => (m.capex > 0 ? ratio(m.capexCoverage) : "no capex"),
        "CFO ÷ capex",
      ],
    ],
  },
  {
    id: "lev",
    sec: "FIN",
    title: "Leverage and coverage",
    lead: (m) => [ratio(m.dscr), "debt service coverage"],
    mets: [
      ["DSCR", (m) => ratio(m.dscr), "CFO ÷ (interest + term principal)"],
      [
        "Net debt ÷ EBITDA",
        (m) => ratio(m.netDebtEbitda),
        (m) =>
          m.netDebt < 0 ? "net cash · EBITDA annualised" : "EBITDA annualised",
      ],
      [
        "Payout cover",
        (m) => (m.draws > 0 ? ratio(m.payout) : "no draws"),
        "CFO ÷ owner draws",
      ],
    ],
  },
];

export interface DiagramNode {
  key: string;
  kind: "root" | "act" | "grp" | "met";
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  value: string;
  caption: string;
  sec?: Section;
  group?: Group;
  open?: boolean;
  ariaLabel?: string;
}

export interface DiagramView {
  heading: string;
  width: number;
  height: number;
  nodes: DiagramNode[];
  /** SVG path data of the links; `on` = drawn darker */
  links: { d: string; on: boolean }[];
  plus: { x: number; y: number }[];
  allOpen: boolean;
  noneOpen: boolean;
}

export function diagramView(
  ds: Dataset,
  p: Period,
  unit: Unit,
  open: ReadonlySet<Group>,
): DiagramView {
  const m = metrics(ds, p);
  const st = statement(ds, p.a, p.b);
  const Wd = 1120;
  const NW = { root: 240, act: 210, grp: 240, met: 260 };
  const gx = 52;
  const span = NW.root + NW.act + NW.grp + NW.met + gx * 3;
  const x0 = Math.max(12, (Wd - span) / 2);
  const X = {
    root: x0,
    act: x0 + NW.root + gx,
    grp: x0 + NW.root + NW.act + gx * 2,
    met: x0 + NW.root + NW.act + NW.grp + gx * 3,
  };
  const H = { root: 104, act: 78, grp: 70, met: 56 };
  let y = 16;
  const acts = SECTIONS.map((k) => {
    const groups = GROUP_DEFS.filter((g) => g.sec === k).map((g) => {
      const isOpen = open.has(g.id);
      const mets: { mt: GroupDef["mets"][number]; cy: number }[] = [];
      let cy: number;
      if (isOpen) {
        for (const mt of g.mets) {
          mets.push({ mt, cy: y + H.met / 2 });
          y += H.met + 10;
        }
        cy = (mets[0]!.cy + mets[mets.length - 1]!.cy) / 2;
      } else {
        cy = y + H.grp / 2;
        y += H.grp + 16;
      }
      return { g, open: isOpen, cy, mets };
    });
    y += 18;
    return {
      k,
      cy: (groups[0]!.cy + groups[groups.length - 1]!.cy) / 2,
      groups,
    };
  });
  const rootCy = (acts[0]!.cy + acts[2]!.cy) / 2;
  const secVal: Record<Section, number> = { OP: st.op, INV: st.iv, FIN: st.fn };
  const curve = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    on: boolean,
  ) => {
    const mx = (x1 + x2) / 2;
    return { d: `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`, on };
  };
  const nodes: DiagramNode[] = [];
  const links: DiagramView["links"] = [];
  const plus: DiagramView["plus"] = [];
  nodes.push({
    key: "root",
    kind: "root",
    x: X.root,
    y: rootCy - H.root / 2,
    w: NW.root,
    h: H.root,
    title: "Net change in cash",
    value: money(st.net, unit, { suffix: true }),
    caption: `closing less opening · ${p.label}`,
    ariaLabel: `Net change in cash ${money(st.net, unit)}`,
  });
  for (const a of acts) {
    links.push(curve(X.root + NW.root, rootCy, X.act - 22, a.cy, true));
    links.push({ d: `M${X.act - 22} ${a.cy} L${X.act} ${a.cy}`, on: true });
    plus.push({ x: X.act - 22, y: a.cy });
    nodes.push({
      key: `act-${a.k}`,
      kind: "act",
      x: X.act,
      y: a.cy - H.act / 2,
      w: NW.act,
      h: H.act,
      title: SECTION_NAME[a.k],
      value: money(secVal[a.k], unit, { suffix: true }),
      caption: "net cash · opens heatmap",
      sec: a.k,
      ariaLabel: `${SECTION_NAME[a.k]} ${money(secVal[a.k], unit)}; open heatmap`,
    });
    for (const { g, open: isOpen, cy, mets } of a.groups) {
      links.push(curve(X.act + NW.act, a.cy, X.grp, cy, isOpen));
      const [lv, ls] = g.lead(m, unit);
      nodes.push({
        key: `grp-${g.id}`,
        kind: "grp",
        x: X.grp,
        y: cy - H.grp / 2,
        w: NW.grp,
        h: H.grp,
        title: g.title,
        value: lv,
        caption: ls,
        group: g.id,
        open: isOpen,
      });
      for (const { mt, cy: my } of mets) {
        links.push(curve(X.grp + NW.grp, cy, X.met, my, true));
        nodes.push({
          key: `met-${g.id}-${mt[0]}`,
          kind: "met",
          x: X.met,
          y: my - H.met / 2,
          w: NW.met,
          h: H.met,
          title: mt[0],
          value: mt[1](m, unit),
          caption: typeof mt[2] === "function" ? mt[2](m) : mt[2],
        });
      }
    }
  }
  return {
    heading: `Diagram · ${periodText(p)}`,
    width: Wd,
    height: y,
    nodes,
    links,
    plus,
    allOpen: GROUP_DEFS.every((g) => open.has(g.id)),
    noneOpen: !GROUP_DEFS.some((g) => open.has(g.id)),
  };
}

// ---------- Reconciliation ----------

export interface RecView {
  heading: string;
  /** null = the period has no control key */
  count: string | null;
  head: { metric: string; page: string; control: string; ok: boolean }[];
  lines: {
    label: string;
    heat: string;
    ledger: string;
    control: string;
    ok: boolean;
  }[];
  footer: string;
}

export function recView(ds: Dataset, p: Period): RecView {
  const heading = `Reconciliation · ${p.label}`;
  if (!p.key) return { heading, count: null, head: [], lines: [], footer: "" };
  const sc = selfCheck(ds, p.key);
  const ex = (usd: number | null) =>
    usd === null
      ? TEXT.nm
      : money(Math.round(usd * 100), "USD", { exact: true });
  const head = sc.rows
    .filter((r) => !r.metric.startsWith("DIRECT_LINE"))
    .map((r) => {
      const m16 = r.metric.startsWith("M16");
      return {
        metric: r.metric,
        page: m16
          ? r.page === null
            ? TEXT.nm
            : r.page.toFixed(4)
          : ex(r.page),
        control: m16 ? r.control.toFixed(4) : ex(r.control),
        ok: r.ok,
      };
    });
  const byCode = new Map<
    string,
    { heat: number | null; ledger: number | null; control: number; ok: boolean }
  >();
  for (const r of sc.rows) {
    const x = /^DIRECT_LINE (\S+) \((.+)\)$/.exec(r.metric);
    if (!x) continue;
    const o = byCode.get(x[1]!) ?? {
      heat: null,
      ledger: null,
      control: r.control,
      ok: true,
    };
    if (x[2] === "ledger") o.ledger = r.page;
    else o.heat = r.page;
    o.ok &&= r.ok;
    byCode.set(x[1]!, o);
  }
  const ok = sc.rows.filter((r) => r.ok).length;
  return {
    heading,
    count: `${ok} / ${sc.rows.length} tie ${ok === sc.rows.length ? "✓" : "✗"}`,
    head,
    lines: [...byCode].map(([code, o]) => ({
      label: ds.lineByCode.get(code)?.label ?? code,
      heat: ex(o.heat),
      ledger: ex(o.ledger),
      control: ex(o.control),
      ok: o.ok,
    })),
    footer: TEXT.recFooter(p.key),
  };
}
