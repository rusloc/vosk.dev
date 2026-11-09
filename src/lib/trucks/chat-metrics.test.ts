import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createMetricCatalogue, formatValue } from "./chat-metrics";
import type { Column, MetricCatalogue } from "./chat-metrics";
import type { Dataset } from "./engine/data";
import type { Selection } from "./engine/selection";
import { parseSelection } from "./engine/url-state";
import { csvTable } from "./test-utils/csv";
import { loadDataset } from "./test-utils/trucks-data";

// The ACME Trucks chat's answer key, level 1 (the numbers): the catalogue against values captured from the Power BI model,
// never against the JS engine. Every WF / KPI / HRS row of the parity file for the selections the shipped data can answer,
// then the golden questions of data/trucks/checks/chat-golden.csv.

const ROOT = join(process.cwd(), "data", "trucks", "checks");
const PARITY = join(
  process.cwd(),
  "src",
  "lib",
  "trucks",
  "test-utils",
  "parity",
  "parity_selections_trucks.csv",
);
const COLUMNS = [
  "sel_id",
  "week",
  "offices",
  "loaders",
  "work_types",
  "plan_type",
  "calculation",
  "element",
  "kind",
  "expected",
  "tol",
  "c_status",
  "b_status",
  "source",
  "c_value",
  "note",
];

let ds: Dataset;
let cat: MetricCatalogue;
beforeAll(async () => {
  ds = await loadDataset();
  cat = createMetricCatalogue(ds);
});

function selection(
  week: string,
  offices: string,
  loaders: string,
  wt: string,
  plan: string,
  calc: string,
): Selection {
  const q = new URLSearchParams();
  if (week) q.set("w", week);
  if (offices) q.set("o", offices);
  if (loaders) q.set("l", loaders);
  if (wt) q.set("wt", wt);
  q.set("pt", plan);
  q.set("calc", calc);
  return parseSelection(q, ds.m);
}

const ID_OF = new Map<number, string>([
  [1, "total_time"],
  [2, "maintenance"],
  [3, "capital_repairs"],
  [4, "accidents"],
  [5, "spare_part"],
  [6, "ready_for_work"],
  [7, "shift_change"],
  [8, "lunch"],
  [9, "personal_issues"],
  [10, "refueling"],
  [11, "explosion_works"],
  [12, "field_switch"],
  [14, "awaiting_trucks"],
  [15, "conservation_reserve"],
  [21, "other_idles"],
  [22, "not_classified"],
  [24, "effective_work_time"],
  [25, "auxiliary_work"],
  [27, "truck_loading"],
]);
const TILE: Record<string, string> = {
  tl: "truck_loading",
  ew: "effective_work_time",
  pf: "performance_per_truck",
  rm: "mass_loaded_per_truck",
};

/** The catalogue's reading of a parity element, in that element's own unit; undefined = not a catalogue figure. */
function read(s: Selection, element: string): number | null | undefined {
  const [area = "", code = "", field = ""] = element.split(".");
  if (area === "KPI") {
    const id = TILE[code];
    if (!id || !["plan", "fact", "delta"].includes(field)) return undefined;
    const v = cat.value(s, id, field as Column);
    return v !== null && field === "delta" && (code === "tl" || code === "ew")
      ? v * 100 // a tile's share delta is in pp, a row's a fraction
      : v;
  }
  const id = ID_OF.get(Number(code));
  if (!id) return undefined;
  if (area === "WF") {
    if (field === "plan_pct") return cat.value(s, id, "plan") ?? 0;
    if (field === "fact_pct") return cat.value(s, id, "fact") ?? 0;
    return field === "delta" ? cat.value(s, id, "delta") : undefined;
  }
  if (area === "HRS" && (field === "plan" || field === "fact"))
    return cat.value(s, `${id}_hours`, field);
  return undefined;
}

const parity = [
  ...csvTable(
    readFileSync(PARITY, "utf8"),
    COLUMNS,
    "parity_selections_trucks.csv",
  ),
].filter(
  (r) =>
    r[8] === "number" &&
    r[0] !== "PT-06" && // needs the unfiltered fixture
    r[0] !== "PT-07" && // URL behaviour
    /^(WF|KPI|HRS)\./.test(r[7] ?? ""),
);

describe("catalogue vs the Power BI captures", () => {
  it("covers the rows it should", () => {
    expect(parity.length).toBeGreaterThan(300);
  });

  it("matches every captured figure it can read", () => {
    let checked = 0;
    const misses: string[] = [];
    for (const r of parity) {
      const [sel = "", week = "", offices = "", loaders = "", wt = ""] = r;
      const element = r[7] ?? "";
      const s = selection(week, offices, loaders, wt, r[5] ?? "", r[6] ?? "");
      const got = read(s, element);
      if (got === undefined) continue;
      checked++;
      const raw = r[9] ?? "";
      const tol = Math.max(Number(r[10]) || 1e-9, 1e-9);
      if (raw === "BLANK ()" || raw === "") {
        if (got !== null) misses.push(`${sel} ${element}: ${got} vs blank`);
      } else if (got === null || Math.abs(got - Number(raw)) > tol) {
        misses.push(`${sel} ${element}: ${got} vs ${raw}`);
      }
    }
    expect(misses.slice(0, 10)).toEqual([]);
    expect(checked).toBeGreaterThan(250);
  });
});

const golden = [
  ...csvTable(
    readFileSync(join(ROOT, "chat-golden.csv"), "utf8"),
    ["key", "expected", "question"],
    "chat-golden.csv",
  ),
].map(([key = "", expected = "", question = ""]) => ({
  key,
  expected,
  question,
}));

describe("golden questions", () => {
  it("has rows", () => expect(golden.length).toBeGreaterThanOrEqual(50));

  it.each(golden)("$key", ({ key, expected }) => {
    const [
      metric = "",
      week = "",
      o = "",
      l = "",
      wt = "",
      plan = "",
      calc = "",
      col = "",
    ] = key.split("|");
    const comma = (s: string) => s.replaceAll("+", ",");
    const s = selection(week, comma(o), comma(l), comma(wt), plan, calc);
    const got = cat.value(s, metric, col as Column);
    if (expected === "") return expect(got).toBeNull();
    expect(got ?? 0).toBeCloseTo(Number(expected), 8);
  });

  it("formats what the report prints", () => {
    expect(formatValue("share", 0.5232847)).toBe("52.33%");
    expect(formatValue("pp", -0.00574761)).toBe("−0.57 pp");
    expect(formatValue("int", 763.83)).toBe("764");
    expect(formatValue("sint", -122.6)).toBe("−123");
    expect(formatValue("share", null)).toBe("n/a");
  });
});
