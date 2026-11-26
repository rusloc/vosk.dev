import { beforeAll, describe, expect, it } from "vitest";
import { loadTestDataset } from "../test-utils/dataset";
import { period, quickPeriod } from "./calendar";
import type { Dataset } from "./data";
import {
  compact,
  days,
  fmtDay,
  fmtDayLedger,
  fmtDayLong,
  fmtIsoDate,
  fmtRange,
  money,
  pctOfNi,
  percent,
  ratio,
  txnType,
} from "./format";
import {
  back,
  canonicalStack,
  goStep,
  initialNav,
  menuDrill,
  push,
  replaceTop,
  top,
} from "./nav";
import { quintiles } from "./quintile";
import { parseUrlState, serializeUrlState } from "./url-state";

// AT-06 … AT-10 (handoff 05 § 3).

let ds: Dataset;
beforeAll(async () => {
  ds = await loadTestDataset();
});

describe("AT-06 period model", () => {
  it("month, quarter, year, YTD: labels, keys, priors, days, partial", () => {
    const pick = (p: ReturnType<typeof period>) => [
      p.label,
      p.key,
      p.priorLabel,
      p.days,
      p.partial,
    ];
    expect(pick(period(ds, "M", 2026, 10))).toEqual([
      "Oct 2026",
      "M-2026-10",
      "Sep 2026",
      31,
      false,
    ]);
    expect(pick(period(ds, "Q", 2026, 9))).toEqual([
      "Q3 2026",
      null,
      "Q2 2026",
      92,
      false,
    ]);
    expect(pick(period(ds, "A", 2025, 12))).toEqual([
      "2025",
      "Y-2025",
      "2024",
      365,
      false,
    ]);
    expect(pick(period(ds, "A", 2026, 10))).toEqual([
      "2026",
      "Y-2026",
      "Jan–Oct 2025",
      304,
      true,
    ]);
    expect(pick(period(ds, "Y", 2026, 10))).toEqual([
      "YTD Oct 2026",
      "Y-2026",
      "YTD 2025",
      304,
      false,
    ]);
    expect(period(ds, "Y", 2026, 6).key).toBeNull();
  });

  it("a one-month Q4 compares with the first month of Q3; first month and first quarter have no prior", () => {
    const q4 = period(ds, "Q", 2026, 10);
    expect([q4.label, q4.partial, q4.days, q4.prior, q4.priorLabel]).toEqual([
      "Q4 2026",
      true,
      31,
      { a: 30, b: 30 },
      "Q3 2026",
    ]);
    expect(period(ds, "M", 2024, 1).prior).toBeNull();
    expect(period(ds, "Q", 2024, 3).prior).toBeNull();
    expect(period(ds, "A", 2024, 12).prior).toBeNull();
  });

  it("quick handles resolve against the last data month", () => {
    expect(quickPeriod(ds, "YTD").label).toBe("YTD Oct 2026");
    expect(quickPeriod(ds, "QTD").label).toBe("Q4 2026");
    expect(quickPeriod(ds, "MTD").label).toBe("Oct 2026");
  });
});

describe("AT-07 quintiles", () => {
  const blocks = (v: number[]) => {
    const q = quintiles(v);
    return v.map((x) => q.block(x));
  };
  it("empty, one value, ties, 3 and 4 values", () => {
    expect(quintiles([]).block(5)).toBe(0);
    expect(blocks([7])).toEqual([5]);
    expect(blocks([1, 2, 3])).toEqual([2, 4, 5]);
    expect(blocks([1, 2, 3, 4])).toEqual([2, 3, 4, 5]);
    expect(blocks([5, 5, 5, 5, 1])).toEqual([5, 5, 5, 5, 1]);
  });
});

describe("AT-08 formats", () => {
  it("money in both units", () => {
    expect(money(-3610286, "USD")).toBe("(36,103)");
    expect(money(-3610286, "USDk")).toBe("(36.1)");
    expect(money(31512946, "USDk", { suffix: true })).toBe("315.1k");
    expect(money(31512946, "USD", { suffix: true })).toBe("315,129");
    expect(money(31512946, "USDk", { exact: true })).toBe("315,129.46");
    expect(money(0, "USD")).toBe("–");
    expect(money(40, "USD")).toBe("–");
    expect(money(null, "USD")).toBe("–");
  });
  it("% of NI, ratios, days, percent, compact", () => {
    expect(pctOfNi(-1, 100000000)).toBe("0.0%");
    expect(pctOfNi(-5000, 10000)).toBe("(50%)");
    expect(pctOfNi(500, 10000)).toBe("5.0%");
    expect(pctOfNi(500, -10000)).toBe("n/m");
    expect(ratio(-6.2712)).toBe("−6.27×");
    expect(ratio(null)).toBe("n/m");
    expect(days(46.42)).toBe("46.4");
    expect(days(43, true)).toBe("43.0 d");
    expect(percent(0.159)).toBe("15.9%");
    expect([compact(55.4), compact(12602.57), compact(126000)]).toEqual([
      "55",
      "12.6k",
      "126k",
    ]);
  });
  it("dates and transaction types", () => {
    const d = period(ds, "M", 2026, 10).d0 + 4;
    expect([fmtDay(ds, d), fmtDayLedger(ds, d), fmtDayLong(ds, d)]).toEqual([
      "5 Oct",
      "5 Oct 26",
      "Mon 5 Oct 2026",
    ]);
    const p = period(ds, "M", 2026, 10);
    expect(fmtRange(ds, p.d0, p.d1)).toBe("1 Oct – 31 Oct 2026");
    expect(fmtIsoDate("2026-11-05")).toBe("5 Nov 2026");
    expect(txnType("BillPayment")).toBe("Bill Payment");
  });
});

describe("AT-09 URL codec", () => {
  const round = (q: string) => serializeUrlState(ds, parseUrlState(ds, q));
  it("defaults are omitted; invalid and unknown keys fall away", () => {
    expect(round("")).toBe("");
    expect(round("p=y-2031&u=x&l=zzz&foo=1")).toBe("");
    expect(round("a=fin")).toBe("");
    expect(round("v=activities&a=xyz")).toBe("v=activities");
  });
  it("round trips and canonical order", () => {
    for (const q of [
      "v=transactions&a=fin&l=d_fin_repaid",
      "p=q-2026-3&v=activities&a=fin&s=total",
      "pop=diagram&g=quality,wc",
      "p=ytd&u=k&v=transactions&l=d_rec_cust&d=2026-10-15",
      "p=y-2025&c=op,fin&s=name-desc&pop=rec",
      "p=m-2024-01",
    ])
      expect(round(q)).toBe(q);
    expect(round("g=wc,quality,wc&c=fin,op&pop=cash&p=mtd")).toBe(
      "p=mtd&c=op,fin&pop=cash&g=quality,wc",
    );
  });
  it("cross-checks: line outside the activity, day outside the period, period without data", () => {
    expect(round("v=transactions&a=fin&l=d_rec_cust")).toBe(
      "v=transactions&a=fin",
    );
    expect(round("v=transactions&l=d_rec_cust&d=2026-09-15")).toBe(
      "v=transactions&l=d_rec_cust",
    );
    expect(round("d=2026-10-15&v=transactions")).toBe("v=transactions");
    expect(round("p=m-2026-11")).toBe("");
    expect(round("p=q-2026-4")).toBe("p=q-2026-4");
  });
});

describe("AT-10 view stack", () => {
  it("pushes, replaces, steps back; Statement alone does nothing", () => {
    let n = initialNav();
    expect(back(n)).toBeNull();
    n = push(n, { view: "heat", sec: "FIN" });
    n = replaceTop(n, { view: "heat", sec: "OP" });
    n = push(n, { view: "ledger", sec: "OP", line: 0, day: 5 });
    expect(n.stack.map((e) => e.view)).toEqual(["stmt", "heat", "ledger"]);
    n = back(n)!;
    expect(top(n)).toEqual({ view: "heat", sec: "OP" });
    expect(back(back(n)!)).toBeNull();
  });
  it("a Diagram node from Transactions returns to Transactions on Esc", () => {
    let n = goStep(initialNav(), 2);
    n = push(n, { view: "heat", sec: "INV" });
    expect(top(back(n)!).view).toBe("ledger");
  });
  it("path steps and menu items reset; deep links build the canonical stack", () => {
    let n = push(initialNav(), { view: "heat", sec: "FIN" });
    n = push(n, { view: "ledger", sec: "FIN", line: 13, day: null });
    expect(goStep(n, 1).stack).toEqual([
      { view: "stmt" },
      { view: "heat", sec: "FIN" },
    ]);
    expect(goStep(n, 0).stack).toEqual([{ view: "stmt" }]);
    const m = menuDrill(initialNav(), 2);
    expect(m.stack.map((e) => e.view)).toEqual(["stmt", "heat", "ledger"]);
    expect(top(back(m)!)).toEqual({ view: "heat", sec: "OP" });
    expect(
      canonicalStack({ view: "ledger", sec: "INV", line: null, day: null }),
    ).toHaveLength(3);
  });
});
