import type { Dataset } from "./engine/data";
import {
  integer,
  ppText,
  roundValue,
  signedInteger,
  tablePct,
} from "./engine/format";
import {
  colOf,
  hoursUnder,
  nullOf,
  planTable,
  windowSums,
} from "./engine/hours";
import { computeKpis } from "./engine/kpi";
import type { Selection } from "./engine/selection";
import { sideShares } from "./engine/shares";
import type { RowShares } from "./engine/shares";
import { scopeOf } from "./engine/view";
import { timeShareDelta } from "./engine/waterfall";

// The ACME Trucks metric catalogue for the report chat (2026-11-09, on the ACME Marketing recipe): every figure the chat
// may name, with its meaning and how it reads on the engine (shares.ts, kpi.ts, hours.ts: the functions the board uses).
// The chat's `get_metric` tool computes and formats here, so the model quotes and never computes. `derived` = no tile or
// table cell shows this figure; the answer says so. Answer key: data/trucks/checks/chat-golden.csv, built from values
// captured from the Power BI model (chat-metrics.test.ts).

export type Column = "plan" | "fact" | "delta";
export type Unit = "share" | "pp" | "int" | "sint" | "hours" | "shours";

export interface MetricDef {
  id: string;
  name: string;
  aliases: string;
  meaning: string;
  derived: boolean;
  kind: "row" | "kpi" | "hours";
  /** The waterfall row (row, hours). */
  sort?: number;
  /** The tile (kpi). */
  tile?: "performance" | "mass";
}

const ROWS: readonly [number, string, string, string][] = [
  [
    1,
    "total_time",
    "calendar time, 100%",
    "All the time in scope; every other row is a share of it.",
  ],
  [
    2,
    "maintenance",
    "planned maintenance, servicing",
    "Time lost to maintenance.",
  ],
  [
    3,
    "capital_repairs",
    "overhaul, major repair",
    "Time lost to capital repairs.",
  ],
  [4, "accidents", "breakdowns, emergency repairs", "Time lost to accidents."],
  [
    5,
    "spare_part",
    "waiting for spare parts",
    "Time lost waiting for spare parts.",
  ],
  [
    6,
    "ready_for_work",
    "availability, readiness",
    "Subtotal: total time minus the four technical losses above it.",
  ],
  [7, "shift_change", "shift handover", "Time lost to shift changes."],
  [8, "lunch", "meal breaks", "Time lost to lunch."],
  [9, "personal_issues", "personal needs", "Time lost to personal issues."],
  [10, "refueling", "fuelling", "Time lost to refueling."],
  [11, "explosion_works", "blasting", "Time lost to explosion works."],
  [
    12,
    "field_switch",
    "relocation between fields",
    "Time lost to field switches.",
  ],
  [
    14,
    "awaiting_trucks",
    "waiting for trucks, idle loader",
    "Time lost waiting for trucks.",
  ],
  [
    15,
    "conservation_reserve",
    "reserve, mothballed",
    "Time in conservation or reserve.",
  ],
  [21, "other_idles", "other downtime", "Other idle time."],
  [22, "not_classified", "unclassified time", "Time with no classification."],
  [
    24,
    "effective_work_time",
    "effective work, productive time",
    "Subtotal: ready for work minus the organisational losses; also a KPI tile.",
  ],
  [25, "auxiliary_work", "support work", "Time on auxiliary work."],
  [
    27,
    "truck_loading",
    "loading time, loader utilisation",
    "Subtotal: effective work minus auxiliary work; also a KPI tile.",
  ],
];

export function createMetricCatalogue(ds: Dataset) {
  const nameOf = new Map(
    ds.m.categories.map((c) => [c.sort_order, c.category_name]),
  );
  const defs: MetricDef[] = [
    ...ROWS.map(([sort, id, aliases, meaning]): MetricDef => ({
      id,
      name: nameOf.get(sort) ?? id,
      aliases,
      meaning,
      derived: false,
      kind: "row",
      sort,
    })),
    {
      id: "performance_per_truck",
      name: "Performance per truck",
      aliases: "m3 per hour, productivity, loading rate",
      meaning:
        "Rock mass loaded onto trucks ÷ truck-loading hours × 1000, in m³/h. A KPI tile.",
      derived: false,
      kind: "kpi",
      tile: "performance",
    },
    {
      id: "mass_loaded_per_truck",
      name: "Mass loaded per truck",
      aliases: "rock mass, volume loaded, tonnage",
      meaning: "Rock mass loaded onto trucks, in thousand m³. A KPI tile.",
      derived: false,
      kind: "kpi",
      tile: "mass",
    },
    ...ROWS.map(([sort, id]): MetricDef => ({
      id: `${id}_hours`,
      name: `${nameOf.get(sort) ?? id} hours`,
      aliases: "hours",
      meaning: `Hours of ${nameOf.get(sort) ?? id}. Under Weighted, a bucket-volume-weighted average per loader; under Linear, the plain sum over the loaders.`,
      derived: true,
      kind: "hours",
      sort,
    })),
  ];
  const byId = new Map(defs.map((d) => [d.id, d]));

  const rowOf = (rows: readonly RowShares[], sort: number) =>
    rows.find((r) => r.sort === sort)?.share ?? null;

  /** One figure, unrounded; null = blank (the board prints a dash). A row's delta is a fraction, a tile's is in its unit. */
  function value(sel: Selection, id: string, col: Column): number | null {
    const d = byId.get(id);
    if (!d) throw new Error(`unknown metric ${id}`);
    const scope = scopeOf(ds, sel);
    if (d.kind === "row") {
      const plan = rowOf(sideShares(ds, scope, "plan"), d.sort as number);
      const fact = rowOf(sideShares(ds, scope, "fact"), d.sort as number);
      return col === "plan"
        ? plan
        : col === "fact"
          ? fact
          : timeShareDelta(fact, plan);
    }
    if (d.kind === "kpi") {
      const k = computeKpis(
        ds,
        scope,
        sideShares(ds, scope, "plan"),
        sideShares(ds, scope, "fact"),
      );
      return k[d.tile as "performance" | "mass"][col];
    }
    const c = colOf(d.sort as number);
    const hours = (side: "plan" | "fact") =>
      nullOf(
        side === "plan"
          ? hoursUnder(
              ds,
              windowSums(ds, planTable(ds, scope.planType), scope.week),
              scope.mask,
              c,
              scope.calculation,
              1,
            )
          : hoursUnder(
              ds,
              windowSums(ds, ds.time, scope.week),
              scope.mask,
              c,
              scope.calculation,
              3600,
            ),
      );
    if (col !== "delta") return hours(col);
    const p = hours("plan");
    const f = hours("fact");
    return p === null || f === null ? null : f - p;
  }

  const unitOf = (id: string, col: Column): Unit => {
    const d = byId.get(id);
    if (!d) throw new Error(`unknown metric ${id}`);
    if (d.kind === "row") return col === "delta" ? "pp" : "share";
    if (d.kind === "kpi") return col === "delta" ? "sint" : "int";
    return col === "delta" ? "shours" : "hours";
  };

  return { defs, byId, value, unitOf };
}

/** A figure as the report prints it: a share to 2 decimals, a row's delta in pp, a tile's as a whole number. */
export function formatValue(unit: Unit, v: number | null): string {
  if (v === null) return "n/a";
  switch (unit) {
    case "share":
      return v === 0 ? "0.00%" : tablePct(v);
    case "pp":
      return ppText(roundValue(v * 100, 2));
    case "int":
      return integer(v);
    case "sint":
      return signedInteger(v);
    case "hours":
      return `${integer(v)} h`;
    case "shours":
      return `${signedInteger(v)} h`;
  }
}

export type MetricCatalogue = ReturnType<typeof createMetricCatalogue>;
