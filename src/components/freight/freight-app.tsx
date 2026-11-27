"use client";

import { asyncBufferFromUrl, cachedAsyncBuffer } from "hyparquet";
import { useMemo, useState, type ReactNode } from "react";
import { ReportBoard } from "@/components/report-board";
import { useReportLoad } from "@/components/report-load";
import { dayToIso, loadDataset, toDay } from "@/lib/freight/data";
import type { Dataset, DimKey } from "@/lib/freight/data";
import {
  ACC_COLUMNS,
  ACC_DEFAULT,
  DIM_LABEL,
  FILTER_KEYS,
  MONEY,
  OPER_COLUMNS,
  OPER_DEFAULT,
  PIVOT_BY,
  VOLUME,
  clientTotals,
  defaultPeriod,
  dimValues,
  flatTable,
  kpiPanel,
  pivotTable,
  shipmentDetail,
  topN,
} from "@/lib/freight/engine";
import type {
  Currency,
  Filters,
  FilterKey,
  KpiTile,
  MoneyKey,
  Period,
  Table,
  VolumeKey,
} from "@/lib/freight/engine";
import { int, money2, pct, periodLabel, tileValue } from "@/lib/freight/format";
import { once } from "@/lib/report-data/once";
import { DataTable } from "./data-table";
import { TopClients } from "./top-clients";
import s from "./freight.module.css";

// The freight sales report, web version of the "Freight Sales Demo" Power BI report (docs/freight/README.md). The
// data is two Parquet files in the build (public/data/freight/), read in the browser column by column; every number
// comes from lib/freight/engine. Ask AI is not built for this report (owner, 11-24): `chat` props are ignored.

// Parallel range requests on one URL fail in Chromium's HTTP cache (ERR_CACHE_OPERATION_NOT_SUPPORTED, seen 11-24), so
// they skip it; the dataset is kept in memory for the page's life (`once`), so a second open reads nothing again.
const open = async (name: string) =>
  cachedAsyncBuffer(
    await asyncBufferFromUrl({
      url: `/data/freight/${name}`,
      requestInit: { cache: "no-store" },
    }),
  );
const fetchDataset = once(() => loadDataset(open));

type Tab = "oper" | "acc" | "top";
type Pop =
  "filters" | "period" | "info" | "columns" | "groupBy" | "topN" | null;

interface View {
  tab: Tab;
  period: Period;
  filters: Filters;
  currency: Currency;
  pivot: Record<"oper" | "acc", boolean>;
  topTable: boolean;
  cols: Record<"oper" | "acc", string[]>;
  groupBy: DimKey;
  n: number;
  money: MoneyKey;
  volume: VolumeKey;
}

const initialView = (ds: Dataset): View => ({
  tab: "oper",
  period: defaultPeriod(ds),
  filters: { company: "CO-FRA" },
  currency: "usd",
  pivot: { oper: false, acc: false },
  topTable: false,
  cols: { oper: OPER_DEFAULT, acc: ACC_DEFAULT },
  groupBy: "client",
  n: 10,
  money: "gpAct",
  volume: "teu",
});

export function FreightApp() {
  const { load, retry } = useReportLoad(fetchDataset);
  return (
    <ReportBoard fill className={s.ground}>
      {load.status === "ready" ? (
        <Report ds={load.data} />
      ) : (
        <p className={s.loading} role="status">
          {load.status === "loading"
            ? "Loading the freight sales report…"
            : `Could not load the data (${load.message}).`}
          {load.status === "error" && (
            <button type="button" onClick={retry}>
              Retry
            </button>
          )}
        </p>
      )}
    </ReportBoard>
  );
}

const TABS: { key: Tab; label: string; hint: string; icon: ReactNode }[] = [
  {
    key: "oper",
    label: "Operational date",
    hint: "Operational date view: shipments, expected amounts",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    key: "acc",
    label: "Accounting date",
    hint: "Accounting date view: ledger postings, actual amounts",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />
      </svg>
    ),
  },
  {
    key: "top",
    label: "Top N clients",
    hint: "Top N clients by money and by volume",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
      </svg>
    ),
  },
];

function Report({ ds }: { ds: Dataset }) {
  const [view, setView] = useState<View>(() => initialView(ds));
  const [pop, setPop] = useState<Pop>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const set = (patch: Partial<View>) => setView((v) => ({ ...v, ...patch }));
  const setFilter = (k: FilterKey, value: string | undefined) =>
    setView((v) => {
      const filters = { ...v.filters };
      if (value === undefined || value === "") delete filters[k];
      else filters[k] = value;
      return { ...v, filters };
    });

  const { tab, period, filters, currency } = view;
  const kpis = useMemo(
    () => kpiPanel(ds, period, filters, currency),
    [ds, period, filters, currency],
  );
  const side = tab === "acc" ? "acc" : "oper";
  const table = useMemo<Table | null>(() => {
    if (tab === "top") return null;
    return view.pivot[tab]
      ? pivotTable(ds, tab, period, filters, view.groupBy)
      : flatTable(ds, tab, period, filters, view.cols[tab]);
  }, [ds, tab, period, filters, view.pivot, view.cols, view.groupBy]);
  const clients = useMemo(
    () => (tab === "top" ? clientTotals(ds, period, filters, currency) : null),
    [ds, tab, period, filters, currency],
  );
  const topTable = useMemo<Table | null>(() => {
    if (!clients || !view.topTable) return null;
    const keys = [...Object.keys(MONEY), ...Object.keys(VOLUME)] as (
      MoneyKey | VolumeKey
    )[];
    const rows = topN(clients, view.money, view.n).map((b) => [
      b.client,
      ...keys.map((k) => clients.get(b.client)![k]),
    ]);
    const cur = currency === "usd" ? "USD" : "LOCAL";
    return {
      columns: [
        { key: "client", label: "Client", kind: "text" },
        ...keys.map((k) => ({
          key: k,
          label:
            k in MONEY
              ? `${MONEY[k as MoneyKey]} ${cur}`
              : VOLUME[k as VolumeKey],
          kind: k in MONEY ? ("money" as const) : ("num" as const),
        })),
      ],
      rows,
    };
  }, [clients, view.topTable, view.money, view.n, currency]);

  const extraFilters = FILTER_KEYS.filter(
    (k) => k !== "company" && filters[k] !== undefined,
  );
  const tabLabel = TABS.find((t) => t.key === tab)!.label;
  const crumb =
    tab === "top"
      ? view.topTable
        ? "Table"
        : "Chart"
      : view.pivot[tab]
        ? "Pivot"
        : "Shipments";
  const note =
    tab === "top"
      ? "Click a client to filter the page · pick one client in Filters to drill"
      : view.pivot[tab]
        ? "Totals per picked attribute · LOCAL and USD amounts"
        : "One row per shipment · click an id for its details · LOCAL and USD amounts";

  return (
    <div className={s.root}>
      <header className={s.header}>
        <h2 className={s.title}>Overview</h2>
        <nav className={s.tabs} aria-label="Report views">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              title={t.hint}
              aria-current={t.key === tab ? "page" : undefined}
              onClick={() => set({ tab: t.key })}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
        <div className={s.tools}>
          <IconButton
            label="Filters"
            active={pop === "filters" || extraFilters.length > 0}
            onClick={() => setPop(pop === "filters" ? null : "filters")}
          >
            <path d="M4 5h16l-6 7v6l-4 2v-8z" />
          </IconButton>
          <IconButton
            label="Period"
            active={pop === "period"}
            onClick={() => setPop(pop === "period" ? null : "period")}
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </IconButton>
          <IconButton
            label="Reset"
            onClick={() => {
              setView(initialView(ds));
              setPop(null);
              setDetail(null);
            }}
          >
            <path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5" />
          </IconButton>
          <IconButton
            label="About this report"
            active={pop === "info"}
            onClick={() => setPop(pop === "info" ? null : "info")}
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6M12 7.5v.5" />
          </IconButton>
        </div>
      </header>

      <div className={s.body}>
        <aside className={s.kpis}>
          <KpiCard
            title="EXPECTED"
            sub="operational date"
            tiles={kpis.expected}
            prevDays={kpis.prevDays}
            dim={tab === "acc"}
          />
          <KpiCard
            title="ACTUAL"
            sub="accounting date"
            tiles={kpis.actual}
            prevDays={kpis.prevDays}
            dim={tab === "oper"}
          />
        </aside>

        <main className={s.main}>
          <div className={s.context}>
            <div className={s.ctxBox}>
              <button
                type="button"
                className={s.ctxField}
                onClick={() => setPop(pop === "period" ? null : "period")}
              >
                <span>Period</span>
                {periodLabel(period)}
              </button>
              <label className={s.ctxField}>
                <span>Company</span>
                <select
                  value={filters.company ?? ""}
                  onChange={(e) => setFilter("company", e.target.value)}
                >
                  <option value="">All companies</option>
                  {dimValues(ds, "company").map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {extraFilters.map((k) => (
                <span
                  key={k}
                  className={s.chip}
                  title={`${DIM_LABEL[k]}: ${filters[k]}`}
                >
                  {DIM_LABEL[k]}: {filters[k]}
                  <button
                    type="button"
                    aria-label={`Remove the ${DIM_LABEL[k]} filter`}
                    onClick={() => setFilter(k, undefined)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <Toggle
              options={[
                ["usd", "USD"],
                ["loc", "Local"],
              ]}
              value={currency}
              onChange={(c) => set({ currency: c as Currency })}
            />
            {tab === "top" ? (
              <Toggle
                options={[
                  ["chart", "Chart"],
                  ["table", "Table"],
                ]}
                value={view.topTable ? "table" : "chart"}
                onChange={(v) => set({ topTable: v === "table" })}
              />
            ) : (
              <Toggle
                options={[
                  ["flat", "Flat"],
                  ["pivot", "Pivot"],
                ]}
                value={view.pivot[tab] ? "pivot" : "flat"}
                onChange={(v) =>
                  set({ pivot: { ...view.pivot, [tab]: v === "pivot" } })
                }
              />
            )}
            <button
              type="button"
              className={s.ctxMenu}
              onClick={() =>
                setPop((p) => {
                  const want: Pop =
                    tab === "top"
                      ? "topN"
                      : view.pivot[tab]
                        ? "groupBy"
                        : "columns";
                  return p === want ? null : want;
                })
              }
            >
              ⇄{" "}
              {tab === "top"
                ? `Top ${view.n}`
                : view.pivot[tab]
                  ? `Group by: ${DIM_LABEL[view.groupBy]}`
                  : "Columns"}
            </button>
          </div>

          <section className={s.panel}>
            <div className={s.panelHead}>
              <span className={s.crumb}>{tabLabel} ›</span>
              <span className={s.crumbNow}>{crumb}</span>
              <span className={s.note}>{note}</span>
            </div>
            {tab === "top" ? (
              topTable ? (
                <DataTable table={topTable} />
              ) : (
                <TopClients
                  totals={clients!}
                  n={view.n}
                  money={view.money}
                  volume={view.volume}
                  onMoney={(money) => set({ money })}
                  onVolume={(volume) => set({ volume })}
                  onClient={(c) => setFilter("client", c)}
                />
              )
            ) : (
              <DataTable
                key={`${tab}-${view.pivot[tab]}`}
                table={table!}
                onSerial={view.pivot[tab] ? undefined : setDetail}
              />
            )}
          </section>
        </main>
      </div>

      {pop && (
        <div className={s.scrim} onClick={() => setPop(null)} aria-hidden />
      )}
      {pop === "filters" && (
        <Popover
          title="Filters"
          onClose={() => setPop(null)}
          className={s.popRight}
        >
          {FILTER_KEYS.filter((k) => k !== "company").map((k) => (
            <FilterField
              key={k}
              ds={ds}
              k={k}
              value={filters[k]}
              onChange={(v) => setFilter(k, v)}
            />
          ))}
          <button
            type="button"
            className={s.linkButton}
            onClick={() =>
              setView((v) => ({
                ...v,
                filters: v.filters.company
                  ? { company: v.filters.company }
                  : {},
              }))
            }
          >
            Clear filters
          </button>
        </Popover>
      )}
      {pop === "period" && (
        <Popover
          title="Period"
          onClose={() => setPop(null)}
          className={s.popRight}
        >
          <PeriodPicker
            ds={ds}
            period={period}
            onChange={(p) => set({ period: p })}
          />
        </Popover>
      )}
      {pop === "info" && (
        <Popover
          title="About this report"
          onClose={() => setPop(null)}
          className={s.popRight}
        >
          <ul className={s.info}>
            <li>
              <b>Expected</b> figures come from shipments, by their operational
              date. <b>Actual</b> figures come from ledger postings, by
              accounting date: revenue from Revenue postings, gross profit from
              all of them.
            </li>
            <li>
              Each KPI is compared with the period of the same length just
              before it ({kpis.prevDays} days now).
            </li>
            <li>
              Amounts in USD or in each company&apos;s local currency. Tables
              show both.
            </li>
            <li>
              Client report, anonymised data: names and codes are generated,
              amounts scaled. The demo calendar runs from{" "}
              {dayToIso(ds.firstDay)} to {dayToIso(ds.lastDay)}.
            </li>
          </ul>
        </Popover>
      )}
      {(pop === "columns" || pop === "groupBy" || pop === "topN") && (
        <Popover
          title={
            pop === "columns"
              ? "Columns"
              : pop === "groupBy"
                ? "Group by"
                : "Top N"
          }
          onClose={() => setPop(null)}
          className={s.popMenu}
        >
          {pop === "columns" && (
            <ColumnPicker
              all={side === "oper" ? OPER_COLUMNS : ACC_COLUMNS}
              picked={view.cols[side]}
              onChange={(keys) => set({ cols: { ...view.cols, [side]: keys } })}
            />
          )}
          {pop === "groupBy" &&
            PIVOT_BY.map((k) => (
              <label key={k} className={s.option}>
                <input
                  type="radio"
                  name="groupBy"
                  checked={view.groupBy === k}
                  onChange={() => set({ groupBy: k })}
                />
                {DIM_LABEL[k]}
              </label>
            ))}
          {pop === "topN" &&
            [5, 10, 15, 20].map((n) => (
              <label key={n} className={s.option}>
                <input
                  type="radio"
                  name="topN"
                  checked={view.n === n}
                  onChange={() => set({ n })}
                />
                Top {n}
              </label>
            ))}
        </Popover>
      )}
      {detail && (
        <ShipmentPanel
          ds={ds}
          serial={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={s.iconButton}
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={s.toggle} role="group">
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          aria-pressed={k === value}
          onClick={() => onChange(k)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function KpiCard({
  title,
  sub,
  tiles,
  prevDays,
  dim,
}: {
  title: string;
  sub: string;
  tiles: KpiTile[];
  prevDays: number;
  dim: boolean;
}) {
  return (
    <section className={dim ? `${s.kpiCard} ${s.kpiDim}` : s.kpiCard}>
      <h3>
        {title} <span>{sub}</span>
      </h3>
      <div className={s.tiles}>
        {tiles.map((t) => {
          const good = t.change === null ? null : t.change >= 0;
          return (
            <div key={t.label} className={s.tile}>
              <span className={s.tileLabel}>{t.label}</span>
              <strong className={s.tileValue}>
                {tileValue(t.kind, t.value)}
              </strong>
              <span className={s.tileChange}>
                {good !== null && (
                  <span className={good ? s.good : s.off}>
                    {good ? "Good" : "Off track"}
                  </span>
                )}
                <span className={good === false ? s.down : s.up}>
                  {t.change === null
                    ? "n/a"
                    : `${good ? "▲" : "▼"} ${pct(t.change)}`}
                </span>
              </span>
              <span className={s.tilePrev}>
                prev. {prevDays}d <b>{tileValue(t.kind, t.prev)}</b>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Popover({
  title,
  onClose,
  className,
  children,
}: {
  title: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${s.popover} ${className ?? ""}`}
      role="dialog"
      aria-label={title}
    >
      <div className={s.popHead}>
        <h3>{title}</h3>
        <button type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={s.popBody}>{children}</div>
    </div>
  );
}

const LONG_LIST = 40; // a list longer than this is typed into, with suggestions

function FilterField({
  ds,
  k,
  value,
  onChange,
}: {
  ds: Dataset;
  k: FilterKey;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const values = useMemo(() => dimValues(ds, k), [ds, k]);
  const [draft, setDraft] = useState(value ?? "");
  const id = `freight-filter-${k}`;
  if (values.length <= LONG_LIST)
    return (
      <label className={s.field}>
        <span>{DIM_LABEL[k]}</span>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">All</option>
          {values.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
    );
  return (
    <label className={s.field}>
      <span>
        {DIM_LABEL[k]} <i>({int(values.length)})</i>
      </span>
      <input
        list={id}
        value={draft}
        placeholder="All: type to search"
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          if (v === "") onChange(undefined);
          else if (values.includes(v)) onChange(v);
        }}
      />
      <datalist id={id}>
        {values.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </label>
  );
}

function PeriodPicker({
  ds,
  period,
  onChange,
}: {
  ds: Dataset;
  period: Period;
  onChange: (p: Period) => void;
}) {
  const last = new Date(dayToIso(ds.lastDay) + "T00:00:00Z");
  const monthsBack = (m: number) =>
    Math.max(
      ds.firstDay,
      toDay(
        new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - m + 1, 1))
          .toISOString()
          .slice(0, 10),
      ),
    );
  const presets: [string, Period][] = [
    ["Last month", { from: monthsBack(1), to: ds.lastDay }],
    ["Last 3 months", { from: monthsBack(3), to: ds.lastDay }],
    ["Last 5 months", { from: monthsBack(5), to: ds.lastDay }],
    [
      "Year to date",
      { from: toDay(`${last.getUTCFullYear()}-01-01`), to: ds.lastDay },
    ],
    ["All data", { from: ds.firstDay, to: ds.lastDay }],
  ];
  const min = dayToIso(ds.firstDay);
  const max = dayToIso(ds.lastDay);
  return (
    <>
      <div className={s.presets}>
        {presets.map(([label, p]) => (
          <button
            key={label}
            type="button"
            aria-pressed={p.from === period.from && p.to === period.to}
            onClick={() => onChange(p)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={s.dates}>
        <label className={s.field}>
          <span>From</span>
          <input
            type="date"
            min={min}
            max={dayToIso(period.to)}
            value={dayToIso(period.from)}
            onChange={(e) =>
              e.target.value &&
              onChange({ ...period, from: toDay(e.target.value) })
            }
          />
        </label>
        <label className={s.field}>
          <span>To</span>
          <input
            type="date"
            min={dayToIso(period.from)}
            max={max}
            value={dayToIso(period.to)}
            onChange={(e) =>
              e.target.value &&
              onChange({ ...period, to: toDay(e.target.value) })
            }
          />
        </label>
      </div>
      <p className={s.hint}>
        Data from {min} to {max}. KPIs compare with the{" "}
        {period.to - period.from + 1} days before.
      </p>
    </>
  );
}

function ColumnPicker({
  all,
  picked,
  onChange,
}: {
  all: { key: string; label: string }[];
  picked: string[];
  onChange: (keys: string[]) => void;
}) {
  const on = new Set(picked);
  return (
    <div className={s.columns}>
      {all.map((c) => (
        <label key={c.key} className={s.option}>
          <input
            type="checkbox"
            checked={on.has(c.key)}
            disabled={c.key === "serial"}
            onChange={() => {
              const next = new Set(on);
              if (next.has(c.key)) next.delete(c.key);
              else next.add(c.key);
              onChange(all.map((x) => x.key).filter((k) => next.has(k)));
            }}
          />
          {c.label}
        </label>
      ))}
    </div>
  );
}

function ShipmentPanel({
  ds,
  serial,
  onClose,
}: {
  ds: Dataset;
  serial: string;
  onClose: () => void;
}) {
  const d = useMemo(() => shipmentDetail(ds, serial), [ds, serial]);
  return (
    <aside className={s.detail} role="dialog" aria-label={`Shipment ${serial}`}>
      <div className={s.popHead}>
        <h3>Shipment details · {serial}</h3>
        <button type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={s.detailBody}>
        {d.fields ? (
          <dl className={s.fields}>
            {d.fields.map(([label, v]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {v === null ? "—" : typeof v === "number" ? money2(v) : v}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={s.hint}>
            No shipment record: this id has ledger postings only.
          </p>
        )}
        <h4>Ledger postings ({d.postings.length})</h4>
        <table className={s.postings}>
          <thead>
            <tr>
              <th>Accounting date</th>
              <th>Type</th>
              <th>Account</th>
              <th className={s.right}>USD</th>
              <th className={s.right}>LOCAL</th>
            </tr>
          </thead>
          <tbody>
            {d.postings.map((p, i) => (
              <tr key={i}>
                <td>{p.date}</td>
                <td>{p.type}</td>
                <td>{p.account}</td>
                <td className={s.right}>{money2(p.usd)}</td>
                <td className={s.right}>{money2(p.loc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
