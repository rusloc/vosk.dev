import { describe, expect, it } from "vitest";
import { toColumns } from "@/lib/report-data/columns";
import { ARTIFACT_NAMES, resolveArtifact } from "./artifacts";
import { columnsSource, loadDataset, parquetSource } from "./data/loader";
import { FILES } from "./data/manifest";
import { readRows } from "./data/parquet-columns";
import { packReader } from "./test-utils/dataset";

// The route's contract (2026-11-26, after the nordmark test): every artifact name maps to a whole cashflow_demo table (or
// the manifest document), nothing else resolves, and a table sent as JSON columns loads back to exactly the Parquet's rows.

describe("cash flow artifacts", () => {
  it("resolves the manifest and the four tables, and nothing else", () => {
    expect(ARTIFACT_NAMES).toEqual([
      "manifest.json",
      "month.parquet",
      "statement-month.parquet",
      "ledger.parquet",
      "control.parquet",
    ]);
    expect(resolveArtifact("manifest.json")).toEqual({
      kind: "document",
      name: "manifest.json",
    });
    expect(resolveArtifact("statement-month.parquet")).toMatchObject({
      kind: "rows",
      table: "statement_month",
    });
    for (const bad of [
      "",
      "../manifest.json",
      "MANIFEST.JSON",
      "ledger.parquet/x",
      "ledger",
      "__proto__",
      "x.json",
    ])
      expect(resolveArtifact(bad)).toBeNull();
  });

  it("the columnar wire format loads back to the Parquet rows", async () => {
    const wire = columnsSource(async (name) => {
      const q = resolveArtifact(name);
      if (!q) throw new Error(`404 ${name}`);
      if (q.kind === "document")
        return JSON.parse(new TextDecoder().decode(await packReader(name)));
      const spec = Object.values(FILES).find((f) => f.file === name)?.columns;
      if (!spec) throw new Error(`no spec ${name}`);
      const rows = await readRows(await packReader(name), spec, name);
      return JSON.parse(JSON.stringify(toColumns(rows, q.columns))) as unknown;
    });
    const viaRoute = await loadDataset(wire);
    const viaParquet = await loadDataset(parquetSource(packReader));
    expect(viaRoute).toEqual(viaParquet);
    expect(viaRoute.ledger).toHaveLength(2838);
  });
});
