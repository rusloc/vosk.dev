"use client";

import { Chart, type ChartConfiguration, type Plugin } from "chart.js";
import { useMemo, useState, type ReactNode } from "react";
import { ChartCanvas } from "@/components/chart-canvas";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  channelMix,
  channelShares,
  computeKpis,
  filterOptions,
  monthlySeries,
  revenueByCategory,
  revenueByCountry,
  topProducts,
  type ChannelShares,
  type SalesDashboardData,
  type SalesFilter,
} from "@/lib/sales-dashboard-calc";

/**
 * The online-sales dashboard (docs/08-cube-sales-showcase.md §7). Receives the whole
 * pre-aggregated payload as props from the ISR page and re-slices it here on every filter
 * change — the browser never talks to Cube. All arithmetic lives in
 * lib/sales-dashboard-calc.ts; this file is filters, tiles, chart configs and tables.
 *
 * Deliberate departures from the plan's chart list:
 *  - "Revenue + orders combo" is two charts. Two y-scales on one plot align arbitrarily and
 *    so invent a correlation; two plots over the same month axis do not.
 *  - Channel mix is a 100% stack. The absolute stack's outline is the revenue chart again;
 *    shares are what show the mix moving. It always shows every channel — narrowed to one it
 *    would be a wall of 100% — and greys the rest when the channel filter picks one.
 */

// Categorical slots, fixed order, assigned by channel — never by rank, so a filter cannot
// repaint a survivor. Slot 1 is the site's --primary and doubles as the single-series colour.
// Validated on this surface (#fff8e7) with the dataviz skill's validate_palette.js: worst
// adjacent pair ΔE 9.1 under CVD, 19.6 normal vision. Slots 3–5 sit below 3:1 against the
// cream, which is what makes the legend and the table view mandatory rather than nice.
const SERIES = [
  "#4f46e5",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
];
const DEEMPHASIS = "#d8cdb0";

// Chart chrome. Mirrors app/globals.css by value: configs are built during render — on the
// server too — where there is no computed style to read a CSS variable from.
const INK = "#1f1b16";
const MUTED_INK = "#6f6a5f";
const SURFACE = "#fff8e7";
const GRID = "#e7dbbe";
const AXIS = "#cdbf9c";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumSignificantDigits: 3,
});
const integer = new Intl.NumberFormat("en-US");
// Fixed at one decimal: "22%" beside "27.1%" in a column reads as two different precisions.
const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const wholePercent = new Intl.NumberFormat("en-US", { style: "percent" });
const signedPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const signedPoints = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-03" → "Mar" or "Mar ’26". Sliced, never parsed: no Date, no timezone. */
function monthLabel(month: string, withYear: boolean): string {
  const name = MONTHS[Number(month.slice(5, 7)) - 1] ?? month;
  return withYear ? `${name} ’${month.slice(2, 4)}` : name;
}

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const tickStyle = { color: MUTED_INK, font: { size: 11 } };

const tooltipStyle = {
  backgroundColor: INK,
  titleColor: SURFACE,
  bodyColor: SURFACE,
  titleFont: { weight: "normal" },
  bodyFont: { weight: "bold" },
  padding: 10,
  cornerRadius: 6,
  // A short stroke of the series colour, not a box — at tooltip density a filled square is
  // data-weight ink doing a label's job.
  boxWidth: 10,
  boxHeight: 2,
  boxPadding: 6,
} as const;

const monthAxis = {
  grid: { display: false },
  border: { color: AXIS },
  ticks: { ...tickStyle, maxRotation: 0, autoSkipPadding: 12 },
};

const valueAxis = (format: (value: number) => string) => ({
  beginAtZero: true,
  border: { display: false },
  grid: { color: GRID, lineWidth: 1 },
  ticks: {
    ...tickStyle,
    maxTicksLimit: 6,
    callback: (value: string | number) => format(Number(value)),
  },
});

// One tooltip for the whole column under the pointer: the reader aims at a month, never at
// a 2px line or a 6px bar.
const byMonth = { mode: "index", intersect: false } as const;

function columnConfig(
  months: string[],
  values: number[],
  format: (value: number) => string,
): ChartConfiguration<"bar"> {
  return {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          data: values,
          backgroundColor: SERIES[0],
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: byMonth,
      scales: { x: monthAxis, y: valueAxis(format) },
      plugins: {
        tooltip: {
          ...tooltipStyle,
          displayColors: false,
          callbacks: { label: (item) => usd.format(item.parsed.y ?? 0) },
        },
      },
    },
  };
}

function lineConfig(
  months: string[],
  values: number[],
): ChartConfiguration<"line"> {
  return {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          data: values,
          borderColor: SERIES[0],
          borderWidth: 2,
          borderJoinStyle: "round",
          borderCapStyle: "round",
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: SERIES[0],
          // The surface-coloured ring keeps the hover dot legible where it sits on the line.
          pointHoverBorderColor: SURFACE,
          pointHoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: byMonth,
      scales: { x: monthAxis, y: valueAxis((value) => integer.format(value)) },
      plugins: {
        tooltip: {
          ...tooltipStyle,
          displayColors: false,
          callbacks: { label: (item) => integer.format(item.parsed.y ?? 0) },
        },
      },
    },
  };
}

function shareConfig(
  shares: ChannelShares,
  months: string[],
  colorOf: (channel: string) => string,
  selected: SalesFilter["channel"],
): ChartConfiguration<"bar"> {
  return {
    type: "bar",
    data: {
      labels: months,
      datasets: shares.series.map(({ channel, share }) => ({
        label: channel,
        data: share,
        backgroundColor:
          selected === "all" || selected === channel
            ? colorOf(channel)
            : DEEMPHASIS,
        // The 2px surface gap between segments: a top border in the surface colour. Never a
        // stroke around the mark — that is ink which isn't data.
        borderColor: SURFACE,
        borderWidth: { top: 2, right: 0, bottom: 0, left: 0 },
        borderSkipped: false,
        maxBarThickness: 24,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: byMonth,
      scales: {
        x: { ...monthAxis, stacked: true },
        y: {
          ...valueAxis((value) => wholePercent.format(value)),
          stacked: true,
          max: 1,
        },
      },
      plugins: {
        tooltip: {
          ...tooltipStyle,
          // Listed top-down in the order the segments are stacked.
          itemSort: (a, b) => b.datasetIndex - a.datasetIndex,
          callbacks: {
            // The key would otherwise take the dataset's border colour — which here is the
            // surface-coloured gap, i.e. six identical cream strokes.
            labelColor: (item) => {
              const color = String(item.dataset.backgroundColor);
              return { borderColor: color, backgroundColor: color };
            },
            // Value first: the reader already has the series from the key, and wants the number.
            label: (item) =>
              `${percent.format(item.parsed.y ?? 0)}  ${item.dataset.label ?? ""}`,
          },
        },
      },
    },
  };
}

/** Value at the tip of every horizontal bar — which is what lets those charts drop the x-axis. */
const barValueLabels: Plugin<"bar"> = {
  id: "barValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = `12px ${Chart.defaults.font.family}`;
    ctx.fillStyle = INK;
    ctx.textBaseline = "middle";
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      const value = chart.data.datasets[0]?.data[i];
      if (typeof value === "number") {
        ctx.fillText(usdCompact.format(value), bar.x + 6, bar.y);
      }
    });
    ctx.restore();
  },
};

function rankedBarConfig(
  names: string[],
  values: number[],
): ChartConfiguration<"bar"> {
  return {
    type: "bar",
    data: {
      labels: names,
      datasets: [
        {
          data: values,
          backgroundColor: SERIES[0],
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      // Room for the value label past the longest bar.
      layout: { padding: { right: 56 } },
      // Nearest along y: the whole row is the hit target, not just the painted bar.
      interaction: { mode: "nearest", axis: "y", intersect: false },
      scales: {
        x: { display: false, beginAtZero: true },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            ...tickStyle,
            color: INK,
            // Truncated on the axis only — harder on a phone, where a 24-character name
            // runs off the canvas edge. The tooltip and the table carry it in full.
            callback(value) {
              return truncate(
                this.getLabelForValue(Number(value)),
                this.chart.width < 400 ? 18 : 24,
              );
            },
          },
        },
      },
      plugins: {
        tooltip: {
          ...tooltipStyle,
          displayColors: false,
          callbacks: { label: (item) => usd.format(item.parsed.x ?? 0) },
        },
      },
    },
    plugins: [barValueLabels],
  };
}

function Card({
  title,
  legend,
  scroll,
  children,
}: {
  title: string;
  legend?: ReactNode;
  scroll: boolean;
  children: ReactNode;
}) {
  return (
    <section className="border-border bg-background flex flex-col rounded-lg border p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {legend}
      {/* A chart grows into whatever a taller neighbour in the grid row leaves it; a table
          is capped and scrolls, or 32 months of rows would set the height of the row. */}
      <div
        className={cn(
          "relative mt-3",
          scroll ? "h-60 overflow-auto" : "min-h-60 flex-1",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** The table twin of a chart: first column is the label, the rest are right-aligned figures. */
function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-border text-muted-foreground border-b">
          {head.map((cell, i) => (
            <th
              key={i}
              scope="col"
              className={cn(
                "bg-background sticky top-0 py-1.5 font-medium whitespace-nowrap",
                i === 0 ? "text-left" : "pl-3 text-right",
              )}
            >
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className="border-border border-b last:border-0">
            {row.map((cell, i) =>
              i === 0 ? (
                <th key={i} scope="row" className="py-1.5 text-left font-normal">
                  {cell}
                </th>
              ) : (
                <td key={i} className="py-1.5 pl-3 text-right tabular-nums">
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Segmented<Value extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="border-border inline-flex overflow-hidden rounded-md border"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors",
            option.value === value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Delta({
  change,
  inPoints,
  caption,
}: {
  change: number | undefined;
  inPoints?: boolean;
  caption: string;
}) {
  if (change === undefined) {
    return <p className="text-muted-foreground mt-1 text-xs">{caption}</p>;
  }
  const text = inPoints
    ? `${signedPoints.format(change * 100)} pp`
    : signedPercent.format(change);
  return (
    <p className="text-muted-foreground mt-1 text-xs">
      {/* Glyph + sign carry the direction; the colour only repeats it. Up is good on all four. */}
      <span
        className={cn(
          "font-medium",
          change > 0 && "text-[#006300]",
          change < 0 && "text-[#d03b3b]",
        )}
      >
        {change > 0 ? "▲ " : change < 0 ? "▼ " : ""}
        {text}
      </span>{" "}
      {caption}
    </p>
  );
}

export function SalesDashboard({
  data,
  labels,
}: {
  data: SalesDashboardData;
  labels: Dictionary["salesDashboard"];
}) {
  const { years, channels } = useMemo(
    () => filterOptions(data.monthly),
    [data.monthly],
  );
  const [filter, setFilter] = useState<SalesFilter>({
    year: years.at(-1) ?? "all",
    channel: "all",
  });
  const [view, setView] = useState<"charts" | "tables">("charts");

  const model = useMemo(() => {
    const colorOf = (channel: string) =>
      SERIES[channels.indexOf(channel)] ?? DEEMPHASIS;
    const allYears = filter.year === "all";

    const points = monthlySeries(data.monthly, filter);
    const months = points.map((point) => monthLabel(point.month, allYears));
    const shares = channelShares(
      channelMix(data.monthly, { year: filter.year, channel: "all" }),
    );
    const categories = revenueByCategory(data.byCategory, filter);
    const products = topProducts(data.byProduct, filter);
    const countries = revenueByCountry(data.byCountry, filter);

    return {
      kpis: computeKpis(data.monthly, filter),
      partialYear: !allYears && points.length < 12,
      colorOf,
      points,
      months,
      shares,
      categories,
      products,
      countries,
      charts: {
        revenue: columnConfig(
          months,
          points.map((point) => point.revenue),
          (value) => usdCompact.format(value),
        ),
        orders: lineConfig(
          months,
          points.map((point) => point.orders),
        ),
        share: shareConfig(shares, months, colorOf, filter.channel),
        categories: rankedBarConfig(
          categories.map((row) => row.category),
          categories.map((row) => row.revenue),
        ),
        products: rankedBarConfig(
          products.map((row) => row.product),
          products.map((row) => row.revenue),
        ),
        countries: rankedBarConfig(
          countries.map((row) => row.country),
          countries.map((row) => row.revenue),
        ),
      },
    };
  }, [data, filter, channels]);

  const { kpis, charts } = model;
  // A year still in progress is compared against the same months only — so name them.
  const firstMonth = model.months[0];
  const lastMonth = model.months.at(-1);
  const priorCaption =
    filter.year === "all"
      ? labels.noPriorYear
      : labels.vsPrior.replace(
          "{period}",
          model.partialYear && firstMonth && lastMonth
            ? `${firstMonth}–${lastMonth} ${filter.year - 1}`
            : String(filter.year - 1),
        );

  const tiles = [
    {
      label: labels.kpiRevenue,
      value: usdCompact.format(kpis.revenue.value),
      change: kpis.revenue.change,
    },
    {
      label: labels.kpiOrders,
      value: integer.format(kpis.orders.value),
      change: kpis.orders.change,
    },
    {
      label: labels.kpiAov,
      value: kpis.aov.value === null ? "—" : usdCents.format(kpis.aov.value),
      change: kpis.aov.change,
    },
    {
      label: labels.kpiMargin,
      value:
        kpis.marginRate.value === null
          ? "—"
          : percent.format(kpis.marginRate.value),
      change: kpis.marginRate.change,
      inPoints: true,
    },
  ];

  const tables = view === "tables";
  const monthRows = (format: (point: (typeof model.points)[number]) => string) =>
    model.points.map((point, i) => [model.months[i] ?? point.month, format(point)]);

  return (
    <div className="space-y-3">
      {/* One filter row above everything it scopes — never a control inside a chart card. */}
      <div
        role="group"
        aria-label={labels.filtersAria}
        className="flex flex-wrap items-center gap-3"
      >
        <Segmented
          label={labels.yearLabel}
          value={filter.year}
          onChange={(year) => setFilter((current) => ({ ...current, year }))}
          options={[
            ...years.map((year) => ({ value: year, label: String(year) })),
            { value: "all" as const, label: labels.allYears },
          ]}
        />
        <select
          aria-label={labels.channelLabel}
          value={filter.channel}
          onChange={(event) =>
            setFilter((current) => ({ ...current, channel: event.target.value }))
          }
          className="border-border bg-background cursor-pointer rounded-md border px-2 py-1.5 text-xs font-medium"
        >
          <option value="all">{labels.allChannels}</option>
          {channels.map((channel) => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </select>
        <div className="ml-auto">
          <Segmented
            label={labels.viewLabel}
            value={view}
            onChange={setView}
            options={[
              { value: "charts", label: labels.viewCharts },
              { value: "tables", label: labels.viewTables },
            ]}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="border-border bg-background rounded-lg border p-4"
          >
            <dt className="text-muted-foreground text-xs">{tile.label}</dt>
            <dd>
              {/* Proportional figures: tabular-nums makes a large standalone number look loose. */}
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {tile.value}
              </p>
              <Delta
                change={tile.change}
                inPoints={tile.inPoints}
                caption={tile.change === undefined ? labels.noPriorYear : priorCaption}
              />
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title={labels.revenueByMonth} scroll={tables}>
          {tables ? (
            <DataTable
              head={[labels.colMonth, labels.colRevenue]}
              rows={monthRows((point) => usd.format(point.revenue))}
            />
          ) : (
            <ChartCanvas config={charts.revenue} label={labels.revenueByMonth} />
          )}
        </Card>

        <Card title={labels.ordersByMonth} scroll={tables}>
          {tables ? (
            <DataTable
              head={[labels.colMonth, labels.colOrders]}
              rows={monthRows((point) => integer.format(point.orders))}
            />
          ) : (
            <ChartCanvas config={charts.orders} label={labels.ordersByMonth} />
          )}
        </Card>

        <Card
          title={labels.channelShare}
          scroll={tables}
          legend={
            <ul className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {channels.map((channel) => (
                <li key={channel} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-[2px]"
                    style={{
                      backgroundColor:
                        filter.channel === "all" || filter.channel === channel
                          ? model.colorOf(channel)
                          : DEEMPHASIS,
                    }}
                  />
                  {channel}
                </li>
              ))}
            </ul>
          }
        >
          {tables ? (
            <DataTable
              head={[
                labels.colMonth,
                ...model.shares.series.map((entry) => entry.channel),
              ]}
              rows={model.shares.months.map((month, i) => [
                model.months[i] ?? month,
                ...model.shares.series.map((entry) =>
                  percent.format(entry.share[i] ?? 0),
                ),
              ])}
            />
          ) : (
            <ChartCanvas config={charts.share} label={labels.channelShare} />
          )}
        </Card>

        <Card title={labels.revenueByCategory} scroll={tables}>
          {tables ? (
            <DataTable
              head={[labels.colCategory, labels.colRevenue]}
              rows={model.categories.map((row) => [
                row.category,
                usd.format(row.revenue),
              ])}
            />
          ) : (
            <ChartCanvas
              config={charts.categories}
              label={labels.revenueByCategory}
            />
          )}
        </Card>

        <Card title={labels.topProducts} scroll={tables}>
          {tables ? (
            <DataTable
              head={[
                labels.colProduct,
                labels.colCategory,
                labels.colUnits,
                labels.colRevenue,
              ]}
              rows={model.products.map((row) => [
                row.product,
                row.category,
                integer.format(row.units),
                usd.format(row.revenue),
              ])}
            />
          ) : (
            <ChartCanvas config={charts.products} label={labels.topProducts} />
          )}
        </Card>

        <Card title={labels.revenueByCountry} scroll={tables}>
          {tables ? (
            <DataTable
              head={[labels.colCountry, labels.colRevenue]}
              rows={model.countries.map((row) => [
                row.country,
                usd.format(row.revenue),
              ])}
            />
          ) : (
            <ChartCanvas
              config={charts.countries}
              label={labels.revenueByCountry}
            />
          )}
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">{labels.footnote}</p>
    </div>
  );
}
