import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { csvTable } from "@/lib/trucks/test-utils/csv";

// The ACME Trucks chat's answer key: natural questions pinned to values captured from the Power BI model (the parity
// file's `expected` column, never the JS engine), so the catalogue is checked against the report it copies. Frozen in
// data/trucks/checks/chat-golden.csv; src/lib/trucks/chat-metrics.test.ts and scripts/chat-eval.ts read it. Re-run after
// a data re-issue:
//
//     node --import tsx scripts/trucks-golden.ts
//
// Key: metric | week | offices | loaders | work types | plan | calculation | column. Lists use "+". Empty expected = n/a.

const PARITY = new URL(
  "../src/lib/trucks/test-utils/parity/parity_selections_trucks.csv",
  import.meta.url,
);
const OUT = new URL("../data/trucks/checks/chat-golden.csv", import.meta.url);

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

const SORT: Record<string, number> = {
  total_time: 1,
  maintenance: 2,
  capital_repairs: 3,
  accidents: 4,
  spare_part: 5,
  ready_for_work: 6,
  shift_change: 7,
  lunch: 8,
  refueling: 10,
  awaiting_trucks: 14,
  other_idles: 21,
  not_classified: 22,
  effective_work_time: 24,
  auxiliary_work: 25,
  truck_loading: 27,
};
const WF_SELECTIONS = new Set(["PT-01", "PT-02", "PT-08"]);

type Col = "plan" | "fact" | "delta";
const Q: readonly [string, string, Col, string][] = [
  // the chat's starter questions, word for word (TRUCKS_SUGGESTIONS, ask-ai.tsx), at the report's opening view
  [
    "PT-01",
    "effective_work_time",
    "plan",
    "How does effective work time compare with plan?",
  ],
  [
    "PT-01",
    "effective_work_time",
    "fact",
    "How does effective work time compare with plan?",
  ],
  [
    "PT-01",
    "truck_loading",
    "plan",
    "How does truck loading compare with plan?",
  ],
  [
    "PT-01",
    "truck_loading",
    "fact",
    "How does truck loading compare with plan?",
  ],
  [
    "PT-01",
    "performance_per_truck",
    "plan",
    "What is performance per truck against plan?",
  ],
  [
    "PT-01",
    "performance_per_truck",
    "fact",
    "What is performance per truck against plan?",
  ],
  // the opening view
  [
    "PT-01",
    "ready_for_work",
    "fact",
    "What share of total time was ready for work?",
  ],
  [
    "PT-01",
    "ready_for_work",
    "plan",
    "What was the planned share of ready for work?",
  ],
  [
    "PT-01",
    "ready_for_work",
    "delta",
    "How far is ready for work from plan, in percentage points?",
  ],
  [
    "PT-01",
    "maintenance",
    "fact",
    "What share of total time went to maintenance?",
  ],
  [
    "PT-01",
    "capital_repairs",
    "plan",
    "What share of time was planned for capital repairs?",
  ],
  [
    "PT-01",
    "accidents",
    "fact",
    "How much of the total time was lost to accidents?",
  ],
  [
    "PT-01",
    "shift_change",
    "delta",
    "How far is shift change from plan, in percentage points?",
  ],
  ["PT-01", "lunch", "fact", "What share of total time goes to lunch?"],
  [
    "PT-01",
    "awaiting_trucks",
    "fact",
    "What share of time do loaders spend awaiting trucks?",
  ],
  [
    "PT-01",
    "awaiting_trucks",
    "plan",
    "What is the plan for awaiting trucks as a share of time?",
  ],
  ["PT-01", "refueling", "fact", "What share of total time is refueling?"],
  [
    "PT-01",
    "other_idles",
    "plan",
    "What share of time was planned for other idles?",
  ],
  [
    "PT-01",
    "not_classified",
    "fact",
    "How much time is not classified, as a share of the total?",
  ],
  [
    "PT-01",
    "auxiliary_work",
    "fact",
    "What share of time goes to auxiliary work?",
  ],
  [
    "PT-01",
    "mass_loaded_per_truck",
    "fact",
    "How much mass was loaded per truck, in thousand cubic metres?",
  ],
  [
    "PT-01",
    "mass_loaded_per_truck",
    "plan",
    "What is the plan for mass loaded per truck?",
  ],
  [
    "PT-01",
    "mass_loaded_per_truck",
    "delta",
    "How far is mass loaded per truck from plan?",
  ],
  [
    "PT-01",
    "performance_per_truck",
    "delta",
    "How far is performance per truck from plan?",
  ],
  [
    "PT-02",
    "maintenance_hours",
    "fact",
    "How many maintenance hours were there in week 9 of 2023?",
  ],
  [
    "PT-02",
    "effective_work_time_hours",
    "plan",
    "How many hours of effective work were planned in week 9 of 2023?",
  ],
  // one week
  [
    "PT-02",
    "effective_work_time",
    "fact",
    "What was effective work time in week 9 of 2023?",
  ],
  [
    "PT-02",
    "effective_work_time",
    "plan",
    "What was the plan for effective work time in week 9 of 2023?",
  ],
  [
    "PT-02",
    "effective_work_time",
    "delta",
    "In week 9 of 2023, how far was effective work time from plan in percentage points?",
  ],
  [
    "PT-02",
    "truck_loading",
    "fact",
    "What was truck loading in week 9 of 2023?",
  ],
  [
    "PT-02",
    "spare_part",
    "fact",
    "In week 9 of 2023, what share of time was lost waiting for spare parts?",
  ],
  [
    "PT-02",
    "awaiting_trucks",
    "delta",
    "In week 9 of 2023, how far was awaiting trucks from plan in percentage points?",
  ],
  [
    "PT-02",
    "performance_per_truck",
    "fact",
    "What was performance per truck in week 9 of 2023?",
  ],
  [
    "PT-02",
    "mass_loaded_per_truck",
    "fact",
    "How much mass was loaded per truck in week 9 of 2023?",
  ],
  [
    "PT-02",
    "maintenance_hours",
    "plan",
    "How many maintenance hours were planned in week 9 of 2023?",
  ],
  [
    "PT-03",
    "truck_loading",
    "fact",
    "What was truck loading in week 10 of 2023?",
  ],
  [
    "PT-03",
    "performance_per_truck",
    "plan",
    "What was the plan for performance per truck in week 10 of 2023?",
  ],
  [
    "PT-03",
    "mass_loaded_per_truck",
    "fact",
    "How much mass was loaded per truck in week 10 of 2023?",
  ],
  [
    "PT-08",
    "effective_work_time",
    "fact",
    "What was effective work time in week 44 of 2022?",
  ],
  [
    "PT-08",
    "truck_loading",
    "fact",
    "What was truck loading in week 44 of 2022?",
  ],
  [
    "PT-08",
    "maintenance",
    "fact",
    "In week 44 of 2022, what share of time went to maintenance?",
  ],
  [
    "PT-08",
    "mass_loaded_per_truck",
    "fact",
    "How much mass was loaded per truck in week 44 of 2022?",
  ],
  [
    "PT-08",
    "performance_per_truck",
    "plan",
    "What was the plan for performance per truck in week 44 of 2022?",
  ], // blank → n/a
  // other plans, calculations and filters
  [
    "PT-04",
    "truck_loading",
    "plan",
    "Against the week plan with the linear calculation, what is planned truck loading across all weeks?",
  ],
  [
    "PT-04",
    "truck_loading",
    "fact",
    "With the linear calculation and the week plan, what was truck loading across all weeks?",
  ],
  [
    "PT-04",
    "performance_per_truck",
    "fact",
    "With the linear calculation and the week plan, what was performance per truck across all weeks?",
  ],
  [
    "PT-04",
    "mass_loaded_per_truck",
    "plan",
    "What is the week plan for mass loaded per truck across all weeks, with the linear calculation?",
  ],
  [
    "PT-05",
    "effective_work_time",
    "fact",
    "For office K3 in week 5 of 2023, all work types and the linear calculation, what was effective work time?",
  ],
  [
    "PT-05",
    "performance_per_truck",
    "fact",
    "For office K3 in week 5 of 2023, all work types and the linear calculation, what was performance per truck?",
  ],
  [
    "PT-05b",
    "truck_loading",
    "fact",
    "For offices K1 and T1, all work types and the linear calculation across all weeks, what was truck loading?",
  ],
  [
    "PT-05b",
    "mass_loaded_per_truck",
    "fact",
    "For offices K1 and T1, all work types and the linear calculation across all weeks, how much mass was loaded per truck?",
  ],
];

const pad = (n: number | undefined) => String(n).padStart(2, "0");
const plus = (s: string | undefined) => (s ?? "").replaceAll(",", "+");

function elementOf(sel: string, metric: string, col: Col): string {
  if (metric === "performance_per_truck") return `KPI.pf.${col}`;
  if (metric === "mass_loaded_per_truck") return `KPI.rm.${col}`;
  if (metric.endsWith("_hours"))
    return `HRS.${pad(SORT[metric.replace(/_hours$/, "")])}.${col}`;
  if (WF_SELECTIONS.has(sel))
    return `WF.${pad(SORT[metric])}.${col === "delta" ? "delta" : `${col}_pct`}`;
  return `KPI.${metric === "truck_loading" ? "tl" : "ew"}.${col}`;
}

async function main() {
  const table = csvTable(
    await readFile(fileURLToPath(PARITY), "utf8"),
    COLUMNS,
    "parity_selections_trucks.csv",
  );
  const rows = new Map(table.map((r) => [`${r[0]}|${r[7]}`, r]));
  const out = ["key,expected,question"];
  for (const [sel, metric, col, question] of Q) {
    const element = elementOf(sel, metric, col);
    const r = rows.get(`${sel}|${element}`);
    if (!r) throw new Error(`no parity row ${sel} ${element}`);
    const raw = r[9] ?? "";
    const expected = raw === "BLANK ()" ? "" : raw;
    const key = [
      metric,
      r[1] ?? "",
      plus(r[2]),
      plus(r[3]),
      plus(r[4]),
      r[5] ?? "",
      r[6] ?? "",
      col,
    ].join("|");
    out.push(
      `${key},${expected},${question.includes(",") ? `"${question}"` : question}`,
    );
  }
  await writeFile(fileURLToPath(OUT), `${out.join("\n")}\n`);
  console.log(`${Q.length} rows → ${fileURLToPath(OUT)}`);
}

void main();
