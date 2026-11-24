import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { AsyncBuffer } from "hyparquet";
import { loadDataset, toDay } from "./data";
import type { Dataset } from "./data";
import {
  clientTotals,
  defaultPeriod,
  flatTable,
  kpiPanel,
  OPER_DEFAULT,
  ACC_DEFAULT,
  pivotTable,
  shipmentDetail,
  topN,
  totals,
} from "./engine";
import { compact, money2, periodLabel, tileValue } from "./format";

// Parity with the published Power BI report (read 11-24 on its first screen: company CO-FRA, 1 Jun – 31 Oct 2026,
// USD). Every expected figure below is what Power BI shows, not what this engine computed.

const DIR = path.join(process.cwd(), "public", "data", "freight");

function fileBuffer(name: string): AsyncBuffer {
  const b = readFileSync(path.join(DIR, name));
  const ab = b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
  return { byteLength: ab.byteLength, slice: (s, e) => ab.slice(s, e) };
}

let ds: Dataset;
beforeAll(async () => {
  ds = await loadDataset(async (name) => fileBuffer(name));
}, 60_000);

const P = { from: toDay("2026-06-01"), to: toDay("2026-10-31") };
const F = { company: "CO-FRA" };

describe("freight dataset", () => {
  it("loads every row and the demo calendar", () => {
    expect(ds.shipments.n).toBe(66_131);
    expect(ds.postings.n).toBe(468_668);
    expect(defaultPeriod(ds)).toEqual(P);
    expect(periodLabel(P)).toBe("1 Jun – 31 Oct 2026");
  });
});

describe("KPI panel matches Power BI (CO-FRA, 1 Jun – 31 Oct 2026, USD)", () => {
  it("expected, by operational date", () => {
    const k = kpiPanel(ds, P, F, "usd");
    expect(k.prevDays).toBe(153);
    expect(k.expected.map((t) => tileValue(t.kind, t.value))).toEqual([
      "21.0M",
      "956.3K",
      "3,278",
      "792",
    ]);
    expect(k.expected.map((t) => tileValue(t.kind, t.prev))).toEqual([
      "11.4M",
      "1.0M",
      "2,879",
      "742",
    ]);
    expect(k.expected.map((t) => (t.change! * 100).toFixed(1))).toEqual([
      "84.7",
      "-7.7",
      "13.9",
      "6.7",
    ]);
  });

  it("actual, by accounting date", () => {
    const k = kpiPanel(ds, P, F, "usd");
    expect(k.actual.map((t) => tileValue(t.kind, t.value))).toEqual([
      "17.7M",
      "885.6K",
      "3,843",
      "922",
    ]);
    expect(k.actual.map((t) => tileValue(t.kind, t.prev))).toEqual([
      "11.5M",
      "706.9K",
      "3,447",
      "865",
    ]);
    expect(k.actual.map((t) => (t.change! * 100).toFixed(1))).toEqual([
      "53.5",
      "25.3",
      "11.5",
      "6.6",
    ]);
  });
});

describe("tables match Power BI", () => {
  it("accounting date pivot by client: the Total row", () => {
    const t = pivotTable(ds, "acc", P, F, "client");
    const sum = totals(t);
    expect(money2(sum[1] as number)).toBe("2,477,939,058.00");
    expect(money2(sum[2] as number)).toBe("17,699,564.70");
    expect(money2(sum[3] as number)).toBe("123,983,448.40");
    expect(Math.round(sum[4] as number)).toBe(885_596);
    expect(t.rows[0]![0]).toBe("Bacaino AB");
  });

  it("operational date flat: one row per shipment, first rows as in Power BI", () => {
    const t = flatTable(ds, "oper", P, F, OPER_DEFAULT);
    expect(t.rows).toHaveLength(3_278);
    expect(t.serials!.slice(0, 3)).toEqual([
      "DMO-26-035867",
      "DMO-26-035890",
      "DMO-26-035898",
    ]);
    expect(t.rows[0]!.slice(0, 6)).toEqual([
      "CO-FRA",
      "DMO-26-035867",
      "2026-05-28",
      "Zogaar Textiles Co., Ltd",
      "DAPHNE LINDGREN",
      "DAPHNE LINDGREN",
    ]);
    expect(compact(totals(t)[7] as number)).toBe("21.0M");
  });

  it("accounting date flat totals equal the actual KPIs", () => {
    const t = flatTable(ds, "acc", P, F, ACC_DEFAULT);
    const sum = totals(t);
    expect(money2(sum[7] as number)).toBe("17,699,564.70");
    expect(Math.round(sum[9] as number)).toBe(885_596);
  });
});

describe("top N clients match Power BI", () => {
  it("top 10 by actual gross profit and by TEU", () => {
    const tot = clientTotals(ds, P, F, "usd");
    const gp = topN(tot, "gpAct", 10);
    expect(gp[0]!.client).toBe("Gioen Pharma PLC");
    expect((gp[0]!.value / 1e6).toFixed(2)).toBe("0.12");
    expect(gp.map((b) => b.client).slice(1, 3)).toEqual([
      "Foode Components S.A.",
      "Saraax Beverages FZCO",
    ]);
    const teu = topN(tot, "teu", 10);
    expect(teu.slice(0, 4).map((b) => [b.client, Math.round(b.value)])).toEqual(
      [
        ["Saraax Beverages FZCO", 541],
        ["Deune Trading Ltd", 277],
        ["Foode Components S.A.", 254],
        ["Plaflioode Electronics Co., Ltd", 222],
      ],
    );
  });
});

describe("shipment detail", () => {
  it("lists the shipment's fields and its postings", () => {
    const d = shipmentDetail(ds, "DMO-26-035867");
    expect(d.fields).not.toBeNull();
    expect(d.fields!.find(([l]) => l === "Client")![1]).toBe(
      "Zogaar Textiles Co., Ltd",
    );
    expect(d.postings.length).toBeGreaterThan(0);
  });
});
