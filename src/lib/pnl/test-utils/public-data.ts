import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createDatasetLoader, parquetSource } from "../data/dataset";
import type { Dataset } from "../data/dataset";
import type { EntityCode } from "../engine/types";

// Node side of the loader for Vitest: reads the Parquet in data/pnl/parquet (prebuilt in rusloc/pnl, js-report/; until
// 2026-11-09 shipped as public/data/pnl, now loaded into Supabase schema pnl_demo by scripts/pnl-load.ts).
const DIR = new URL("../../../../data/pnl/parquet/", import.meta.url);

const loader = createDatasetLoader(
  parquetSource(async (name) => {
    try {
      const bytes = await readFile(fileURLToPath(new URL(name, DIR)));
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
    } catch (error) {
      throw new Error(
        `data/pnl/parquet/${name} unreadable — copy it from the pack (rebuilt in rusloc/pnl)`,
        { cause: error },
      );
    }
  }),
);

export const loadPublicDataset = (
  entities: readonly EntityCode[] = ["P", "S"],
): Promise<Dataset> => loader.load(entities);

// Test fixtures copied from rusloc/pnl data/acme_pl_dummy_data/ (checks/control_totals_usd.csv, T-06).
export const DATA_DIR = fileURLToPath(
  new URL("../../../../data/pnl/", import.meta.url),
);
