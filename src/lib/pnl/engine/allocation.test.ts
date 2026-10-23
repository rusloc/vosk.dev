import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { csvTable } from "../csv";
import type { Dataset } from "../data/dataset";
import { DATA_DIR, loadPublicDataset } from "../test-utils/public-data";
import { selection } from "../test-utils/selection";
import { createAggregator, sliceFilter } from "./aggregate";
import { createFx } from "./fx";
import { createEngine } from "./index";
import type { Engine } from "./index";
import type { EntityCode, EntityView, Selection } from "./types";

// Build step 5 (ADR-0002 §2.8): slice filters and the C-31 allocation computed in the engine.
// T-03: for each slice dimension the slices add up to the unfiltered total on every line, allocated lines included.
// Parity: the engine's allocation reproduces the generator's fact_pl_allocated (ADR-0002 §2.2), checked against
// allocation_parity.csv — Σ cents per entity × version × month × region × slice value, Jan–Sep 2026.

let ds: Dataset;
let engine: Engine;
beforeAll(async () => {
  ds = await loadPublicDataset(["P", "S"]);
  engine = createEngine(ds);
});

type Slice = "region" | "channel" | "line" | "segment";

function values(entity: EntityCode, slice: Slice): string[] {
  const t = ds.manifest.tables;
  const own = (
    rows: readonly { entity_code: string; is_unassigned: boolean }[],
    code: (r: never) => string,
  ) =>
    rows
      .filter((r) => r.entity_code === entity && !r.is_unassigned)
      .map((r) => code(r as never));
  switch (slice) {
    case "region":
      return t.dim_region.map((r) => r.region_code);
    case "channel":
      return own(
        t.dim_channel,
        (r: { channel_code: string }) => r.channel_code,
      );
    case "line":
      return own(t.dim_line, (r: { line_code: string }) => r.line_code);
    case "segment":
      return own(
        t.dim_segment,
        (r: { segment_code: string }) => r.segment_code,
      );
  }
}

const valueRows = (sel: Selection) =>
  engine
    .statement(sel)
    .rows.filter((r) => r.kind !== "ratio")
    .map((r) => ({
      code: r.code,
      cols: [
        r.base,
        r.compareA?.value,
        r.compareB?.value,
        r.fyBudget,
        r.fyLE.value,
      ],
    }));

describe("T-03 slices add up to the unfiltered total (allocated lines included)", () => {
  const cases: [EntityView, Slice][] = [
    ["P", "region"],
    ["P", "channel"],
    ["P", "line"],
    ["P", "segment"],
    ["S", "region"],
    ["S", "channel"],
    ["S", "line"],
    ["S", "segment"],
    ["GROUP", "region"],
  ];
  for (const [entity, slice] of cases)
    it(`${entity} by ${slice}`, () => {
      const base: Partial<Selection> = { entity, timeView: "YTD" };
      const total = valueRows(selection(base));
      const codes = values(entity === "GROUP" ? "P" : entity, slice);
      const parts = codes.map((c) =>
        valueRows(selection({ ...base, [slice]: [c] })),
      );
      total.forEach((row, i) =>
        row.cols.forEach((v, j) => {
          const sum = parts.reduce((s, p) => s + (p[i]?.cols[j] ?? 0), 0);
          expect(Math.abs((v ?? 0) - sum), `${row.code} col ${j}`).toBeLessThan(
            0.01,
          );
        }),
      );
    });

  it("allocated leaves carry the alloc. tag, direct ones do not (L-14)", () => {
    const rows = engine.statement(selection({ channel: ["MKT"] })).rows;
    expect(rows.find((r) => r.code === "SM_P1")?.tag).toBe("alloc.");
    expect(rows.find((r) => r.code === "GR_P1")?.tag).toBeNull();
    expect(
      engine.statement(selection()).rows.find((r) => r.code === "SM_P1")?.tag,
    ).toBeNull();
  });
});

describe("C-31 parity with the generator's fact_pl_allocated", () => {
  const PARITY = [
    ...csvTable(
      readFileSync(join(DATA_DIR, "checks", "allocation_parity.csv"), "utf8"),
      [
        "entity_code",
        "version_key",
        "month_key",
        "region_code",
        "dimension",
        "value_code",
        "cents",
      ],
      "allocation_parity.csv",
    ),
  ];

  it(`reproduces all ${PARITY.length} entity × version × month × region × slice totals`, () => {
    const m = ds.manifest;
    const fx = createFx(m);
    const agg = createAggregator(ds);
    const below = m.dict.account.flatMap((c, i) =>
      m.tables.dim_account.find((a) => a.account_code === c)?.is_below_cm
        ? [i]
        : [],
    );
    const month = new Map(
      m.tables.dim_month.map((d) => [d.month_key, d.month_index]),
    );
    const ccy = new Map(
      m.tables.dim_region.map((r) => [r.region_code, r.functional_currency]),
    );
    for (const [
      entity = "",
      version = "",
      monthKey = "",
      region = "",
      dimension = "",
      value = "",
      cents = "",
    ] of PARITY) {
      const t = month.get(monthKey) ?? -1;
      const f = sliceFilter(m, {
        region: [region],
        channel: dimension === "channel" ? [value] : [],
        line: dimension === "line" ? [value] : [],
        segment: dimension === "segment" ? [value] : [],
      });
      const { all } = agg.accounts(
        entity as EntityCode,
        {
          choice: "A",
          parts: [{ version, months: [t] }],
          missingMonths: [],
          forecastMonths: [],
        },
        f,
        { fx, currency: "USD", basis: "ACT", fy: 2026 },
      );
      const engineUsd = below.reduce((s, a) => s + (all[a] ?? 0), 0);
      const local = ccy.get(region) ?? "USD";
      const rate = fx.rate(
        local,
        t,
        version === "BUD" ? "BUDGET" : "ACTUAL_AVG",
      );
      const expectedUsd = Number(cents) / 100 / rate;
      // The generator rounds each allocated row to cents and pushes the residual to the largest slice: the worst
      // case measured on 2026-10-22 was 0.36 USD, on totals in the millions.
      expect(
        Math.abs(engineUsd - expectedUsd),
        `${entity} ${version} ${monthKey} ${region} ${dimension}=${value}`,
      ).toBeLessThan(0.5);
    }
  });
});
