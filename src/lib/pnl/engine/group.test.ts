import { beforeAll, describe, expect, it } from "vitest";
import type { Dataset } from "../data/dataset";
import { loadPublicDataset } from "../test-utils/public-data";
import { selection } from "../test-utils/selection";
import { createEngine } from "./index";
import type { Engine } from "./index";
import type { Selection, StatementRow } from "./types";

// Build step 4 (ADR-0002 §2.8): the Group view. T-01 Group = Consumer Products + Commerce Cloud + eliminations on
// every line and column; T-02 eliminations leave contribution margin and everything below it unchanged (C-36).

let ds: Dataset;
let engine: Engine;
beforeAll(async () => {
  ds = await loadPublicDataset(["P", "S"]);
  engine = createEngine(ds);
});

const WINDOWS: Partial<Selection>[] = [
  {}, // YTD Sep 2026: closed months, Budget and prior year
  { timeView: "MTD", fy: 2025, month: 3 },
  { timeView: "FY", fy: 2024, month: 12 }, // first year: prior year n/a
  { base: "LE", timeView: "FY", month: 12 }, // open months from the forecast
];
const columns = (r: StatementRow | undefined) => [
  r?.base ?? null,
  r?.compareA?.value ?? null,
  r?.compareB?.value ?? null,
  r?.fyBudget ?? null,
  r?.fyLE.value ?? null,
];
const rowsOf = (sel: Selection) =>
  new Map(engine.statement(sel).rows.map((r) => [r.code, r]));

describe("Group view (build step 4)", () => {
  it("Group YTD Sep 2026 net revenue is 3,972.7 m (hand-off figure)", () => {
    const nr = rowsOf(selection({ entity: "GROUP" })).get("NR")?.base ?? 0;
    expect(nr / 1e6).toBeCloseTo(3972.7, 1);
  });

  it("each block holds the two companies, blocks 1 and 6 an eliminations node (M-05)", () => {
    const rows = engine.statement(selection({ entity: "GROUP" })).rows;
    const children = (code: string) =>
      rows.filter((r) => r.parent === code).map((r) => r.code);
    expect(children("GR")).toEqual(["GR@P", "GR@S", "ELIM_GR"]);
    expect(children("VSC")).toEqual(["VSC@P", "VSC@S", "ELIM_VSC"]);
    expect(children("COR")).toEqual(["COR@P", "COR@S"]);
    expect(rows.find((r) => r.code === "GR@P")).toMatchObject({
      kind: "entity",
      label: "Consumer Products",
      entity: "P",
    });
    // shared blocks put the same account under both companies, with distinct codes
    expect(children("GA@P")).toContain("GA_1@P");
    expect(children("GA@S")).toContain("GA_1@S");
    // C-37: the two intercompany sides match in this data, so no Intercompany difference row
    expect(rows.some((r) => r.code === "OOI_4")).toBe(false);
  });

  for (const w of WINDOWS)
    it(`T-01 / T-02 on every line and column: ${JSON.stringify(w)}`, () => {
      const g = rowsOf(selection({ ...w, entity: "GROUP" }));
      const p = rowsOf(selection({ ...w, entity: "P" }));
      const s = rowsOf(selection({ ...w, entity: "S" }));
      const elimGr = columns(g.get("ELIM_GR"));
      const elimVsc = columns(g.get("ELIM_VSC"));
      // eliminations are equal and opposite, so they cancel from contribution margin down (T-02)
      elimGr.forEach((v, i) =>
        expect((v ?? 0) + (elimVsc[i] ?? 0)).toBeCloseTo(0, 6),
      );

      const lines = [...p.values()].filter(
        (r) => r.kind !== "leaf" && r.kind !== "ratio",
      );
      expect(lines.length).toBeGreaterThan(20);
      for (const line of lines) {
        const elim =
          line.code === "GR" || line.code === "NR" || line.code === "GP"
            ? elimGr
            : line.code === "VSC"
              ? elimVsc
              : null; // CM and every line below it: no elimination (T-02)
        const gv = columns(g.get(line.code));
        const pv = columns(line);
        const sv = columns(s.get(line.code));
        gv.forEach((v, i) => {
          if (v === null) {
            expect(pv[i]).toBeNull();
            return;
          }
          const expected =
            (pv[i] ?? 0) + (sv[i] ?? 0) + (elim ? (elim[i] ?? 0) : 0);
          expect(Math.abs(v - expected), line.code).toBeLessThan(0.01);
        });
      }

      // company nodes equal the standalone company block
      for (const [code, standalone] of [
        ["GR@P", p.get("GR")],
        ["OPEX", null],
        ["SM@S", s.get("SM")],
      ] as const)
        if (standalone)
          expect(g.get(code)?.base ?? 0).toBeCloseTo(standalone.base ?? 0, 4);
    });
});
