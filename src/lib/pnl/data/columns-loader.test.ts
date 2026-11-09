import { describe, expect, it } from "vitest";
import { loadPublicDataset } from "../test-utils/public-data";
import {
  OPS_COLUMNS,
  PL_COLUMNS,
  columnsSource,
  opsFromColumns,
  parsePlChunkName,
  plChunkNames,
  toColumns,
} from "./columns-loader";
import { createDatasetLoader } from "./dataset";

// The JSON-columns path (2026-11-09) rebuilds exactly what parquet-loader.ts builds from the files: the chunks are
// cut and served the way src/lib/pnl/artifacts.ts cuts them (version × twelve months, rows in file order), joined
// back by columns-loader.ts.

describe("P&L JSON columns", () => {
  it("names nine chunks per entity for three versions × 36 months, and parses them back", async () => {
    const ds = await loadPublicDataset([]);
    const names = plChunkNames(ds.manifest, "P");
    expect(names).toHaveLength(9);
    expect(names[0]).toBe("pl-P/v0-m0-11.json");
    expect(names[8]).toBe("pl-P/v2-m24-35.json");
    expect(parsePlChunkName("pl-S/v1-m12-23.json")).toEqual({
      entity: "S",
      version: 1,
      from: 12,
      to: 23,
    });
    for (const bad of [
      "pl-P/v0-m0-12.json", // thirteen months
      "pl-P/v0-m5-4.json", // backwards
      "pl-X/v0-m0-11.json",
      "pl-P.parquet",
    ])
      expect(parsePlChunkName(bad), bad).toBeNull();
  });

  it("rebuilds the typed arrays from chunks served as JSON columns", async () => {
    const want = await loadPublicDataset(["S"]);
    const m = want.manifest;
    const pl = want.pl.get("S")!;
    // What the route would serve: rows filtered by the chunk's version and months, in file order, as columns.
    const serve = (name: string): unknown => {
      if (name === "manifest.json") return JSON.parse(JSON.stringify(m));
      if (name === "ops.json") {
        const o = want.ops;
        const rows = Array.from({ length: o.n }, (_, i) => ({
          entity: o.entity[i],
          month_idx: o.monthIdx[i],
          version: o.version[i],
          region: o.region[i],
          channel: o.channel[i],
          line: o.line[i],
          segment: o.segment[i],
          units: o.units[i],
          gmv_cents: o.gmvCents[i],
          merchants: o.merchants[i],
        }));
        return JSON.parse(JSON.stringify(toColumns(rows, OPS_COLUMNS)));
      }
      const c = parsePlChunkName(name);
      if (!c) throw new Error(name);
      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i < pl.n; i++)
        if (
          pl.version[i] === c.version &&
          pl.monthIdx[i]! >= c.from &&
          pl.monthIdx[i]! <= c.to
        )
          rows.push({
            month_idx: pl.monthIdx[i],
            version: pl.version[i],
            region: pl.region[i],
            channel: pl.channel[i],
            line: pl.line[i],
            segment: pl.segment[i],
            account: pl.account[i],
            counterparty: pl.counterparty[i],
            cents: pl.cents[i],
          });
      return JSON.parse(JSON.stringify(toColumns(rows, PL_COLUMNS)));
    };
    const got = await createDatasetLoader(
      columnsSource(async (name) => serve(name)),
    ).load(["S"]);
    const g = got.pl.get("S")!;
    expect(g.n).toBe(pl.n);
    // Chunks come version-major; the file has its own order: the same rows, as sorted keys.
    const keys = (p: typeof pl) =>
      Array.from({ length: p.n }, (_, i) =>
        [
          p.monthIdx[i],
          p.version[i],
          p.region[i],
          p.channel[i],
          p.line[i],
          p.segment[i],
          p.account[i],
          p.counterparty[i],
          p.cents[i],
        ].join(","),
      ).sort();
    expect(keys(g)).toEqual(keys(pl));
    expect(Array.from(got.ops.gmvCents)).toEqual(Array.from(want.ops.gmvCents));
    expect(Array.from(got.ops.merchants)).toEqual(
      Array.from(want.ops.merchants),
    );
  });

  it("rejects a drifted chunk loudly", async () => {
    const { manifest: m } = await loadPublicDataset([]);
    const empty = Object.fromEntries(PL_COLUMNS.map((c) => [c, []]));
    expect(() => opsFromColumns({ ...empty, entity: [1.5] }, m)).toThrow(
      /column/,
    );
    expect(() =>
      opsFromColumns(
        Object.fromEntries(
          OPS_COLUMNS.map((c) => [c, [c === "region" ? 9 : 0]]),
        ),
        m,
      ),
    ).toThrow(/code 9 outside/);
  });
});
