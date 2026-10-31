import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { csvTable } from "@/lib/csv";
import { createLoader } from "../data/loader";
import { createData } from "../engine/cube";
import type { ExecData } from "../engine/cube";

// Node side of the loader for Vitest: reads the built public/data/nordmark artifacts through the same loader the
// browser uses (prebuilt in the .sync pack; rebuilt in rusloc/pnl js-exec/). Control totals: data/nordmark/checks/.

const DIR = new URL("../../../../public/data/nordmark/", import.meta.url);

const load = createLoader(async (name) => {
  try {
    const bytes = await readFile(fileURLToPath(new URL(name, DIR)));
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
  } catch (error) {
    throw new Error(
      `public/data/${name} unreadable — the pack ships public/data prebuilt; re-copy it from rusloc/pnl js-exec/`,
      { cause: error },
    );
  }
});

export const loadExecData = async (): Promise<ExecData> =>
  createData(await load());

const checks = (name: string) =>
  [new URL(`../../../../data/nordmark/checks/${name}`, import.meta.url)].map(
    (u) => fileURLToPath(u),
  );
const CHECKS = checks("control_totals_eur.csv");
/** Category control totals (E-104), a separate CSV from ginee (2026-10-30); absent until it lands. */
export const CATEGORY_CHECKS = checks("control_totals_category_eur.csv");

export interface ControlRow {
  scope: string;
  periodKey: string;
  metric: string;
  value: number;
}

export function controlTotals(): ControlRow[] {
  const path = CHECKS.find((p) => existsSync(p));
  if (!path)
    throw new Error(
      `control_totals_eur.csv not found in ${CHECKS.join(" or ")}`,
    );
  return readRows(path);
}

/** The category control rows (E-104), or null while the file does not exist yet. */
export function categoryControlTotals(): ControlRow[] | null {
  const path = CATEGORY_CHECKS.find((p) => existsSync(p));
  return path ? readRows(path) : null;
}

function readRows(path: string): ControlRow[] {
  const name = basename(path);
  return [
    ...csvTable(
      readFileSync(path, "utf8"),
      ["scope", "period_key", "metric_code", "value"],
      name,
    ),
  ].map(([scope = "", periodKey = "", metric = "", value = ""]) => ({
    scope,
    periodKey,
    metric,
    value: Number(value),
  }));
}

/** Tolerance per metric, as data/nordmark_retail_dummy_data/checks/verify.py tol(): amounts 0.005, ratios 1e-6. */
export function tolerance(metric: string): number {
  if (
    metric.startsWith("status.") ||
    [
      "lfl_store_count",
      "po_lines_due",
      "po_lines_otif",
      "mix_max_dev_channel",
      "otif_suppliers_below_85",
    ].includes(metric)
  )
    return 0;
  if (
    metric.includes("pct") ||
    /(_pp|_target|_target_wks)$/.test(metric) ||
    metric === "gmroi" ||
    metric === "weeks_of_cover" ||
    metric.startsWith("gmroi.")
  )
    return 1e-6;
  return /(_units|_sku_days)$/.test(metric) ? 0.06 : 0.0051;
}
