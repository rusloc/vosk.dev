import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReadArtifact } from "@/lib/report-data/columns";
import { loadDataset, parquetSource } from "../data/loader";
import type { Dataset } from "../engine/data";

// The tests read the committed pack (data/cashflow/parquet) straight from disk, the same bytes the load script puts
// into Supabase, through the same loader the browser uses (its Zod, row-count and file-named checks included).

const DIR = join(process.cwd(), "data", "cashflow", "parquet");

export const packReader: ReadArtifact = async (name) => {
  const b = readFileSync(join(DIR, name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};

let cached: Promise<Dataset> | undefined;

export function loadTestDataset(): Promise<Dataset> {
  cached ??= loadDataset(parquetSource(packReader));
  return cached;
}

/** The full control CSV (2,662 rows), the AT-02 fixture. */
export function controlCsv(): {
  period: string;
  metric: string;
  scope: string;
  value: number;
}[] {
  return readFileSync(
    join(process.cwd(), "data", "cashflow", "checks", "control_totals_usd.csv"),
    "utf8",
  )
    .trim()
    .split("\n")
    .slice(1)
    .map((l) => {
      const [period, metric, scope, value] = l.split(",");
      return {
        period: period!,
        metric: metric!,
        scope: scope!,
        value: Number(value),
      };
    });
}
