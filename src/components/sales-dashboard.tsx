"use client";

import { RiArrowDownSFill, RiArrowUpSFill } from "@remixicon/react";
import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/tremor/badge";
import { BarChart } from "@/components/tremor/bar-chart";
import { Card } from "@/components/tremor/card";
import {
  getColorClassName,
  type AvailableChartColorsKeys,
} from "@/components/tremor/chart-utils";
import { ComboChart, type TooltipProps } from "@/components/tremor/combo-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from "@/components/tremor/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/tremor/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/tremor/toggle";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  channelMatrix,
  computeKpis,
  filterOptions,
  monthlyCombo,
  topItems,
  type SalesDashboardData,
  type SalesFilter,
  type TopKind,
  type TopMetric,
} from "@/lib/sales-dashboard-calc";

/**
 * The online-sales dashboard (docs/08-cube-sales-showcase.md §7), drawn with Tremor's
 * copy-paste components (components/tremor/). Receives the whole pre-aggregated payload as
 * props from the ISR page and re-slices it here on every filter change — the browser never
 * talks to Cube. All arithmetic lives in lib/sales-dashboard-calc.ts; this file is the
 * filter, tiles, charts and table.
 *
 * Three layers sized to fit a 1440×900 laptop under the sticky nav: KPI tiles; a monthly
 * combo beside a top-5 ranking; a per-channel matrix that flips to a bar chart. Every chart
 * height below is part of that budget — grow one and another has to give.
 */

type Labels = Dictionary["salesDashboard"];
type Metric = TopMetric | "orders";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumSignificantDigits: 3,
});
const integer = new Intl.NumberFormat("en-US");
const integerCompact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumSignificantDigits: 3,
});
// Fixed at one decimal: "22%" beside "27.1%" in a column reads as two different precisions.
const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const signedPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const signedPoints = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const METRICS = [
  "revenue",
  "profit",
  "orders",
  "margin",
] as const satisfies readonly Metric[];
// Orders are left out of the top 5: an order can span categories, so they don't add up.
const TOP_METRICS = [
  "revenue",
  "profit",
  "margin",
] as const satisfies readonly TopMetric[];

/** Axis and tooltip format per metric — compact, because both sit in narrow spaces. */
const COMPACT: Record<Metric, (value: number) => string> = {
  revenue: (value) => usdCompact.format(value),
  profit: (value) => usdCompact.format(value),
  orders: (value) => integerCompact.format(value),
  margin: (value) => percent.format(value),
};

/** Full-precision format per metric, for the table. */
const FULL: Record<Metric, (value: number | null) => string> = {
  revenue: (value) => usd.format(value ?? 0),
  profit: (value) => usd.format(value ?? 0),
  orders: (value) => integer.format(value ?? 0),
  margin: (value) => (value === null ? "—" : percent.format(value)),
};

/** Tile format per metric: compact money, whole orders. */
const TILE: Record<Metric, (value: number | null) => string> = {
  ...FULL,
  revenue: (value) => usdCompact.format(value ?? 0),
  profit: (value) => usdCompact.format(value ?? 0),
};

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

// Tremor's toggles and tabs are sized for a form (h-9, text-sm); the dashboard's controls
// sit in card headers, so they come down to the height of the tile labels' line.
const TOGGLE = "h-7 min-w-0 px-2 text-xs shadow-none";
const TAB = "px-2.5 py-0.5 text-xs";

/**
 * The combo chart's tooltip. The bars are stacked as profit + (revenue − profit) so the
 * column's full height reads as revenue — which makes the raw upper value a number nobody
 * should see. Each row therefore carries its own display lines, and this reads them.
 */
type TooltipLine = {
  label: string;
  value: string;
  color: AvailableChartColorsKeys;
  line?: boolean;
};
// Series values sit under their localized labels (they're the legend text), beside these two.
type ComboRow = { month: string; tooltip: TooltipLine[] } & Record<
  string,
  unknown
>;

function ComboTooltip({ active, payload, label }: TooltipProps) {
  const row: ComboRow | undefined = payload[0]?.payload;
  if (!active || !row) return null;
  const lines = row.tooltip;
  return (
    <div className="border-border rounded-md border bg-white text-sm shadow-md">
      <p className="text-foreground border-border border-b px-3 py-1.5 font-medium">
        {label}
      </p>
      <div className="space-y-1 px-3 py-1.5">
        {lines.map((line) => (
          <div
            key={line.label}
            className="flex items-center justify-between gap-6"
          >
            <span className="text-muted-foreground flex items-center gap-2 whitespace-nowrap">
              <span
                aria-hidden="true"
                className={cn(
                  "shrink-0",
                  line.line
                    ? "h-[3px] w-3.5 rounded-full"
                    : "size-2 rounded-xs",
                  getColorClassName(line.color, "bg"),
                )}
              />
              {line.label}
            </span>
            <span className="text-foreground font-medium tabular-nums">
              {line.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A single-choice toggle row. Radix lets a click clear the pressed item; a filter can't be empty. */
function Picker<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(next) => next && onChange(next as Value)}
      className="flex-wrap justify-start"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={TOGGLE}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function Panel({
  title,
  controls,
  children,
}: {
  title: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card asChild className="flex flex-col p-4">
      <section>
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
          <h3 className="text-foreground text-sm font-medium">{title}</h3>
          {controls}
        </div>
        <div className="mt-2">{children}</div>
      </section>
    </Card>
  );
}

function Delta({
  change,
  inPoints,
}: {
  change: number | undefined;
  inPoints?: boolean;
}) {
  if (change === undefined) return null;
  // Tone follows the printed figure, not the raw one: both formats round to 0.001 of
  // `change`, so +0.04% must read "0.0%" and neutral, never green "0.0%".
  const tone = Math.sign(change) * Math.round(Math.abs(change) * 1000); // Intl rounds half away from zero
  const Arrow = tone > 0 ? RiArrowUpSFill : tone < 0 ? RiArrowDownSFill : null;
  return (
    // Glyph + sign carry the direction; the colour only repeats it. Up is good on all four.
    <Badge
      variant={tone > 0 ? "success" : tone < 0 ? "error" : "neutral"}
      className="gap-0.5 px-1.5 py-0.5 tabular-nums"
    >
      {Arrow && <Arrow aria-hidden="true" className="-ml-0.5 size-4" />}
      {inPoints
        ? `${signedPoints.format(change * 100)} pp`
        : signedPercent.format(change)}
    </Badge>
  );
}

export function SalesDashboard({
  data,
  labels,
}: {
  data: SalesDashboardData;
  labels: Labels;
}) {
  const { years } = useMemo(() => filterOptions(data.monthly), [data.monthly]);
  const [filter, setFilter] = useState<SalesFilter>({
    year: years.at(-1) ?? "all",
  });
  const [topKind, setTopKind] = useState<TopKind>("category");
  const [topMetric, setTopMetric] = useState<TopMetric>("revenue");
  const [channelView, setChannelView] = useState<"table" | "chart">("table");
  const [channelMetric, setChannelMetric] = useState<Metric>("revenue");

  const model = useMemo(() => {
    const allYears = filter.year === "all";
    const points = monthlyCombo(data.monthly, filter);
    return {
      kpis: computeKpis(data.monthly, filter),
      partialYear: !allYears && points.length < 12,
      months: points.map((point) => monthLabel(point.month, allYears)),
      points,
      channels: channelMatrix(data.monthly, filter),
    };
  }, [data.monthly, filter]);

  const top = useMemo(
    () =>
      topItems(topKind, data, filter, topMetric).filter(
        (item) => item[topMetric] !== null,
      ),
    [data, filter, topKind, topMetric],
  );

  const { kpis } = model;
  // A year still in progress is compared against the same months only — so name them.
  const firstMonth = model.months[0];
  const lastMonth = model.months.at(-1);
  const caption =
    filter.year === "all" || kpis.revenue.change === undefined
      ? labels.noPriorYear
      : labels.vsPrior.replace(
          "{period}",
          model.partialYear && firstMonth && lastMonth
            ? `${firstMonth}–${lastMonth} ${filter.year - 1}`
            : String(filter.year - 1),
        );

  // Chart data is memoised: recharts re-runs its whole layout pipeline whenever the data
  // array's identity changes, and every toggle click re-renders this component.
  const combo = useMemo(() => {
    const rows = model.points.map((point, i): ComboRow => ({
      month: model.months[i] ?? point.month,
      [labels.profit]: point.profit,
      [labels.revenue]: point.revenue - point.profit,
      [labels.orders]: point.orders,
      tooltip: [
        {
          label: labels.revenue,
          value: usd.format(point.revenue),
          color: "primaryLight",
        },
        {
          label: labels.profit,
          value: usd.format(point.profit),
          color: "primary",
        },
        {
          label: labels.orders,
          value: integer.format(point.orders),
          color: "accentStrong",
          line: true,
        },
      ],
    }));
    // The chart's text alternative: it has no table twin, so it carries the numbers.
    const desc = `${labels.revenue} / ${labels.profit} / ${labels.orders}. ${model.points
      .map(
        (point, i) =>
          `${model.months[i] ?? point.month}: ${usdCompact.format(point.revenue)} / ${usdCompact.format(point.profit)} / ${integerCompact.format(point.orders)}`,
      )
      .join("; ")}`;
    return { rows, desc };
  }, [model, labels]);

  const topChart = useMemo(
    () => ({
      rows: top.map((item) => ({
        name: item.name,
        [labels[topMetric]]: item[topMetric],
      })),
      desc: top
        .map((item) => `${item.name}: ${FULL[topMetric](item[topMetric])}`)
        .join("; "),
    }),
    [top, topMetric, labels],
  );

  const channelChart = useMemo(() => {
    const rows = model.channels.rows.filter(
      (row) => row[channelMetric] !== null,
    );
    return {
      rows: rows.map((row) => ({
        name: row.channel,
        [labels[channelMetric]]: row[channelMetric],
      })),
      desc: rows
        .map(
          (row) => `${row.channel}: ${FULL[channelMetric](row[channelMetric])}`,
        )
        .join("; "),
    };
  }, [model, channelMetric, labels]);

  const options = <Key extends Metric>(keys: readonly Key[]) =>
    keys.map((key) => ({ value: key, label: labels[key] }));

  return (
    <div className="space-y-3">
      {/* One filter row above everything it scopes. The comparison period is named once
          here rather than under each of the four tiles. */}
      <div
        role="group"
        aria-label={labels.filtersAria}
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
      >
        <Picker
          label={labels.yearLabel}
          value={String(filter.year)}
          onChange={(year) =>
            setFilter({ year: year === "all" ? "all" : Number(year) })
          }
          options={[
            ...years.map((year) => ({
              value: String(year),
              label: String(year),
            })),
            { value: "all", label: labels.allYears },
          ]}
        />
        <p className="text-muted-foreground text-xs">{caption}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRICS.map((key) => (
          <Card key={key} className="p-3">
            <dt className="text-muted-foreground text-xs font-medium">
              {labels[key]}
            </dt>
            <dd className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              {/* Proportional figures: tabular-nums makes a large standalone number look loose. */}
              <span className="text-foreground text-2xl font-semibold tracking-tight">
                {TILE[key](kpis[key].value)}
              </span>
              <Delta change={kpis[key].change} inPoints={key === "margin"} />
            </dd>
          </Card>
        ))}
      </dl>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Revenue with profit inside it, orders on their own axis. Stacked as profit +
            (revenue − profit): Tremor has no overlapping bars, and profit is never negative
            here (margin ~48%, deepest discount 20%), so the stack's top is revenue. */}
        <Panel title={labels.monthlyTitle}>
          <ComboChart
            className="h-52"
            title={labels.monthlyTitle}
            desc={combo.desc}
            data={combo.rows}
            index="month"
            enableBiaxial
            barSeries={{
              type: "stacked",
              categories: [labels.profit, labels.revenue],
              colors: ["primary", "primaryLight"],
              valueFormatter: COMPACT.revenue,
              yAxisWidth: 52,
            }}
            lineSeries={{
              categories: [labels.orders],
              colors: ["accentStrong"],
              valueFormatter: COMPACT.orders,
              yAxisWidth: 40,
            }}
            customTooltip={ComboTooltip}
          />
        </Panel>

        <Panel
          title={labels.topTitle}
          controls={
            <div className="flex flex-wrap items-center gap-2">
              <Picker
                label={labels.topKindAria}
                value={topKind}
                onChange={setTopKind}
                options={[
                  { value: "category", label: labels.byCategory },
                  { value: "country", label: labels.byCountry },
                ]}
              />
              <Picker
                label={labels.metricAria}
                value={topMetric}
                onChange={setTopMetric}
                options={options(TOP_METRICS)}
              />
            </div>
          }
        >
          <BarChart
            className="h-52"
            title={`${labels.topTitle}: ${topKind === "category" ? labels.byCategory : labels.byCountry}, ${labels[topMetric]}`}
            desc={topChart.desc}
            layout="vertical"
            data={topChart.rows}
            index="name"
            categories={[labels[topMetric]]}
            colors={["primary"]}
            valueFormatter={COMPACT[topMetric]}
            yAxisWidth={132}
            showLegend={false}
          />
        </Panel>
      </div>

      <Tabs
        value={channelView}
        onValueChange={(view) => setChannelView(view as "table" | "chart")}
      >
        <Panel
          title={labels.channelsTitle}
          controls={
            <div className="flex flex-wrap items-center gap-2">
              {channelView === "chart" && (
                <Picker
                  label={labels.metricAria}
                  value={channelMetric}
                  onChange={setChannelMetric}
                  options={options(METRICS)}
                />
              )}
              <TabsList variant="solid" aria-label={labels.viewAria}>
                <TabsTrigger value="table" className={TAB}>
                  {labels.viewTable}
                </TabsTrigger>
                <TabsTrigger value="chart" className={TAB}>
                  {labels.viewChart}
                </TabsTrigger>
              </TabsList>
            </div>
          }
        >
          {/* Both views share one fixed height, so flipping them never moves the page. */}
          <TabsContent value="table" className="h-52">
            <TableRoot>
              <Table className="text-xs">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell className="py-1.5 text-xs">
                      {labels.colChannel}
                    </TableHeaderCell>
                    {METRICS.map((key) => (
                      <TableHeaderCell
                        key={key}
                        className="py-1.5 text-right text-xs"
                      >
                        {labels[key]}
                      </TableHeaderCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {model.channels.rows.map((row) => (
                    <TableRow key={row.channel}>
                      <TableCell className="text-foreground py-1 text-xs">
                        {row.channel}
                      </TableCell>
                      {METRICS.map((key) => (
                        <TableCell
                          key={key}
                          className="py-1 text-right text-xs tabular-nums"
                        >
                          {FULL[key](row[key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFoot>
                  <TableRow>
                    <TableHeaderCell scope="row" className="py-1.5 text-xs">
                      {labels.total}
                    </TableHeaderCell>
                    {METRICS.map((key) => (
                      <TableHeaderCell
                        key={key}
                        className="py-1.5 text-right text-xs tabular-nums"
                      >
                        {FULL[key](model.channels.total[key])}
                      </TableHeaderCell>
                    ))}
                  </TableRow>
                </TableFoot>
              </Table>
            </TableRoot>
          </TabsContent>
          <TabsContent value="chart" className="h-52">
            <BarChart
              className="h-full"
              title={`${labels.channelsTitle}: ${labels[channelMetric]}`}
              desc={channelChart.desc}
              layout="vertical"
              data={channelChart.rows}
              index="name"
              categories={[labels[channelMetric]]}
              colors={["primary"]}
              valueFormatter={COMPACT[channelMetric]}
              yAxisWidth={112}
              showLegend={false}
            />
          </TabsContent>
        </Panel>
      </Tabs>

      <p className="text-muted-foreground text-xs">{labels.footnote}</p>
    </div>
  );
}
