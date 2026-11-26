import { describe, expect, it } from "vitest";
import type { ReadArtifact } from "@/lib/report-data/columns";
import { packReader } from "../test-utils/dataset";
import { loadDataset, parquetSource } from "./loader";

// The loader's failure paths (CF-ARC-06): each error names the file, and nothing partial reaches the engine.

const withManifest =
  (
    edit: (m: { files: { name: string; rows: number }[] }) => void,
  ): ReadArtifact =>
  async (name) => {
    if (name !== "manifest.json") return packReader(name);
    const m = JSON.parse(new TextDecoder().decode(await packReader(name))) as {
      files: { name: string; rows: number }[];
    };
    edit(m);
    return new TextEncoder().encode(JSON.stringify(m)).buffer as ArrayBuffer;
  };

describe("cash flow loader", () => {
  it("loads the committed pack", async () => {
    const ds = await loadDataset(parquetSource(packReader));
    expect(ds.company).toBe("ACME Advisory Services LLC");
  });

  it("rejects a table whose row count differs from the manifest, naming the file", async () => {
    const read = withManifest((m) => {
      m.files.find((f) => f.name === "ledger.parquet")!.rows += 1;
    });
    await expect(loadDataset(parquetSource(read))).rejects.toThrow(
      /^ledger\.parquet: 2838 rows, manifest says 2839$/,
    );
  });

  it("rejects a manifest with an unknown field", async () => {
    const read = withManifest((m) => {
      (m as Record<string, unknown>).extra = 1;
    });
    await expect(loadDataset(parquetSource(read))).rejects.toThrow(
      /^manifest\.json: /,
    );
  });

  it("names the file a read fails on", async () => {
    const read: ReadArtifact = async (name) => {
      if (name === "month.parquet") throw new Error("HTTP 500");
      return packReader(name);
    };
    await expect(loadDataset(parquetSource(read))).rejects.toThrow(
      "month.parquet: HTTP 500",
    );
  });
});
