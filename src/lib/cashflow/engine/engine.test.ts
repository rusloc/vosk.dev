import { beforeAll, describe, expect, it } from "vitest";
import { SECTIONS, type Section } from "../data/manifest";
import { controlCsv, loadTestDataset } from "../test-utils/dataset";
import {
  keyPeriod,
  period,
  priorPeriod,
  quickPeriod,
  type Period,
} from "./calendar";
import type { Dataset } from "./data";
import {
  cellValue,
  heat,
  ledgerRows,
  lineTotals,
  sectionFlows,
} from "./direct";
import { days, money, ratio } from "./format";
import { metrics } from "./metrics";
import { quintiles } from "./quintile";
import { selfCheck } from "./self-check";
import { statement } from "./statement";

// AT-02, AT-03, AT-04 (handoff 05 § 3): the engine over the committed pack against the control totals and the spec's
// reference values (02 § 4).

let ds: Dataset;
beforeAll(async () => {
  ds = await loadTestDataset();
});

const usd = (c: number) => c / 100;

describe("AT-03 self-check", () => {
  it("passes 1,666 of 1,666 (37 × 44 + 2 × 19)", () => {
    const sc = selfCheck(ds);
    expect(sc.rows.length).toBe(1666);
    expect(sc.rows.filter((r) => !r.ok)).toEqual([]);
  });

  it("checks one period on its own (Reconciliation): 44 rows", () => {
    expect(selfCheck(ds, "M-2026-10").rows).toHaveLength(44);
  });
});

describe("AT-02 engine ties to the full control file", () => {
  it("reproduces every control value of the build's set, both ways for M05 and DIRECT_LINE", () => {
    const csv = controlCsv();
    const keys = [
      ...ds.months.map((m) => `M-${m}`),
      "Y-2024",
      "Y-2025",
      "Y-2026",
      "ALL",
    ];
    let checked = 0;
    const fails: string[] = [];
    for (const key of keys) {
      const p: Pick<Period, "a" | "b"> =
        key === "ALL" ? { a: 0, b: ds.months.length - 1 } : keyPeriod(ds, key);
      const st = statement(ds, p.a, p.b);
      const mt = metrics(ds, p);
      const lt = lineTotals(ds, p.a, p.b);
      const fl = sectionFlows(ds, p.a, p.b);
      const got = new Map<string, number>([
        ["M01|ALL", usd(st.open)],
        ["M02|ALL", usd(st.close)],
        ["M03|ALL", usd(st.net)],
        ["M04|ALL", usd(st.ni)],
        ["REVENUE|ALL", usd(mt.revenue)],
        ["M06|OVERRIDES_ON", usd(st.op)],
        ["M07|OVERRIDES_ON", usd(st.iv)],
        ["M08|OVERRIDES_ON", usd(st.fn)],
        ["M09|ALL", usd(SECTIONS.reduce((s, k) => s + fl[k].in, 0))],
        ["M10|ALL", usd(SECTIONS.reduce((s, k) => s + fl[k].out, 0))],
        ["M15|ALL", usd(mt.fcf)],
      ]);
      if (mt.conv !== null) got.set("M16|ALL", mt.conv);
      for (const a of ds.accounts)
        got.set(
          `M05|${a.id}`,
          usd(a.adj.slice(p.a, p.b + 1).reduce((s, v) => s + v, 0)),
        );
      ds.lines.forEach((l, i) =>
        got.set(`DIRECT_LINE|${l.code}`, usd(lt[i]!.net)),
      );
      const want = new Map(
        csv
          .filter(
            (r) =>
              r.period === key &&
              (got.has(`${r.metric}|${r.scope}`) ||
                r.metric === "M05" ||
                r.metric === "DIRECT_LINE"),
          )
          .map((r) => [`${r.metric}|${r.scope}`, r.value]),
      );
      for (const k of new Set([
        ...want.keys(),
        ...[...got.keys()].filter((g) => /^(M05|DIRECT_LINE)\|/.test(g)),
      ])) {
        const w = want.get(k) ?? 0;
        const g = got.get(k) ?? 0;
        const ok = k.startsWith("M16")
          ? Math.abs(g - w) <= 1e-6 * Math.max(1, Math.abs(w))
          : Math.abs(g - w) <= 0.005;
        checked++;
        if (!ok) fails.push(`${key} ${k}: ${g} vs ${w}`);
      }
    }
    expect(fails).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(1554);
  });
});

describe("AT-04 reference values (02 § 4)", () => {
  const cases: [
    string,
    () => Period,
    Record<string, number | string | null>,
  ][] = [
    [
      "Oct 2026",
      () => period(ds, "M", 2026, 10),
      {
        open: 351232.32,
        ni: -662.97,
        adj: -18117.94,
        op: -18780.91,
        iv: 0,
        fn: -17321.95,
        net: -36102.86,
        close: 315129.46,
        cin: 175915.04,
        cout: -212017.9,
        fcf: -18780.91,
        conv: "n/m",
        dso: "46.4",
        dpo: "4.7",
        ccc: "41.7",
        dscr: "−6.27×",
        nde: "−5.46×",
        prior: "Sep 2026",
      },
    ],
    [
      "YTD Oct 2026",
      () => quickPeriod(ds, "YTD"),
      {
        open: 299118.89,
        ni: 193818.52,
        adj: 8204.35,
        op: 202022.87,
        iv: -28400,
        fn: -157612.3,
        net: 16010.57,
        close: 315129.46,
        cin: 1616433.28,
        cout: -1600422.71,
        fcf: 173622.87,
        conv: "1.04×",
        dso: "48.0",
        dpo: "5.0",
        ccc: "43.0",
        dscr: "6.59×",
        nde: "−0.64×",
        prior: "YTD 2025",
      },
    ],
    [
      "2025",
      () => period(ds, "A", 2025, 12),
      {
        open: 268734.16,
        ni: 269257.71,
        adj: -36531.96,
        op: 232725.75,
        iv: -9500,
        fn: -192841.02,
        net: 30384.73,
        close: 299118.89,
        cin: 1623589.07,
        cout: -1593204.34,
        fcf: 246225.75,
        conv: "0.86×",
        dso: "49.9",
        dpo: "5.9",
        ccc: "44.0",
        dscr: "7.47×",
        nde: "−0.67×",
        prior: "2024",
      },
    ],
    [
      "Q3 2026",
      () => period(ds, "Q", 2026, 9),
      {
        open: 302988,
        ni: 57031.24,
        adj: 18097.01,
        op: 75128.25,
        iv: 0,
        fn: -26883.93,
        net: 48244.32,
        close: 351232.32,
        cin: 467339.2,
        cout: -419094.88,
        fcf: 75128.25,
        conv: "1.32×",
        dso: "45.1",
        dpo: "9.9",
        ccc: "35.2",
        dscr: "8.42×",
        nde: "−0.91×",
        prior: "Q2 2026",
      },
    ],
    [
      "Jan 2024",
      () => period(ds, "M", 2024, 1),
      {
        open: 110650,
        ni: 7423.32,
        adj: 2138.93,
        op: 9562.25,
        iv: 0,
        fn: 12000,
        net: 21562.25,
        close: 132212.25,
        cin: 151550.07,
        cout: -129987.82,
        fcf: 9562.25,
        conv: "1.29×",
        dso: "46.4",
        dpo: "12.9",
        ccc: "33.5",
        dscr: "n/m",
        nde: "−1.07×",
        prior: null,
      },
    ],
  ];
  it.each(cases)("%s", (_, mk, want) => {
    const p = mk();
    const st = statement(ds, p.a, p.b);
    const mt = metrics(ds, p);
    const fl = sectionFlows(ds, p.a, p.b);
    const got = {
      open: usd(st.open),
      ni: usd(st.ni),
      adj: usd(st.adj),
      op: usd(st.op),
      iv: usd(st.iv),
      fn: usd(st.fn),
      net: usd(st.net),
      close: usd(st.close),
      cin: usd(fl.OP.in + fl.INV.in + fl.FIN.in),
      cout: usd(fl.OP.out + fl.INV.out + fl.FIN.out),
      fcf: usd(mt.fcf),
      conv: mt.convMeaningful ? ratio(mt.conv) : "n/m",
      dso: days(mt.dso),
      dpo: days(mt.dpo),
      ccc: days(mt.ccc),
      dscr: ratio(mt.dscr),
      nde: ratio(mt.netDebtEbitda),
      prior: p.prior ? p.priorLabel : null,
    };
    expect(got).toEqual(want);
  });

  it("2025 direct section nets and the raw Oct 2026 cash conversion", () => {
    const fl = sectionFlows(ds, ...ab(period(ds, "A", 2025, 12)));
    expect([fl.OP.net, fl.INV.net, fl.FIN.net].map(usd)).toEqual([
      251225.75, 13500, -234341.02,
    ]);
    const conv = metrics(ds, period(ds, "M", 2026, 10)).conv!;
    expect(conv).toBeCloseTo(28.328446, 6);
  });

  it("default landing statement rows (Oct 2026)", () => {
    const st = statement(ds, ...ab(period(ds, "M", 2026, 10)));
    const rows = [...st.dep, ...st.wc, ...st.inv, ...st.fin].map(
      (x) =>
        `${x.label} ${money(x.val, "USD", { exact: true })}${x.override ? " [S01]" : ""}`,
    );
    expect(rows).toEqual([
      "Depreciation · Office Equipment 1,968.89",
      "Depreciation · Vehicles 691.67",
      "Accounts Receivable (A/R) (22,826.92)",
      "Prepaid Expenses 1,010.00",
      "Accounts Payable (A/P) (6,415.10)",
      "Harborline Visa Business (22.70)",
      "Payroll Liabilities · Federal Payroll Taxes 7,639.61",
      "Payroll Liabilities · State Payroll Taxes 1,486.21",
      "Sales Tax Payable (1,649.60)",
      "Line of Credit - Larkspur Bank 35,000.00 [S01]",
      "Term Loan - Larkspur Bank (1,496.37)",
      "Vehicle Loan - Crestline Auto Finance (825.58)",
      "Owner's Equity · Owner Draws (50,000.00)",
    ]);
  });

  it("default landing KPI faces", () => {
    const p = period(ds, "M", 2026, 10);
    const cur = metrics(ds, p);
    const pr = metrics(ds, priorPeriod(ds, p)!);
    const m = (c: number) => money(c, "USD", { suffix: true });
    expect([
      m(cur.close),
      m(Math.abs(cur.close - pr.close)),
      m(cur.net),
      m(Math.abs(cur.net - pr.net)),
      m(cur.cfo),
      m(Math.abs(cur.cfo - pr.cfo)),
      m(cur.fcf),
      days(cur.dso),
      days(Math.abs(cur.dso! - pr.dso!)),
    ]).toEqual([
      "315,129",
      "36,103",
      "(36,103)",
      "50,491",
      "(18,781)",
      "35,477",
      "(18,781)",
      "46.4",
      "4.5",
    ]);
  });

  it("Activities, Operating, Oct 2026: blocks, bounds, row totals; Financing and Investing", () => {
    const p = period(ds, "M", 2026, 10);
    const h = heat(ds, "OP", p);
    const vals = h.grid.flatMap((row) =>
      row.map(cellValue).filter((v) => v > 0),
    );
    expect(vals).toHaveLength(37);
    const q = quintiles(vals);
    const sizes = [1, 2, 3, 4, 5].map(
      (b) => vals.filter((v) => q.block(v) === b).length,
    );
    expect(sizes).toEqual([7, 7, 8, 7, 8]);
    expect(
      q.bounds.map(
        (b) =>
          `${money(b!.min, "USD", { exact: true })}–${money(b!.max, "USD", { exact: true })}`,
      ),
    ).toEqual([
      "55.40–296.37",
      "410.85–2,666.41",
      "2,682.50–5,299.34",
      "6,431.25–10,930.00",
      "12,602.57–37,698.01",
    ]);
    const lt = lineTotals(ds, p.a, p.b);
    const op = h.rows.map((l) => lt[l.i]!);
    expect(
      op.map((x) => `${money(x.net, "USD", { exact: true })} (${x.n})`),
    ).toEqual([
      "110,957.79 (30)",
      "653.49 (1)",
      "(39,035.34) (14)",
      "(76,208.75) (34)",
      "(1,817.91) (6)",
      "(672.22) (3)",
      "(12,602.57) (1)",
      "(55.40) (1)",
    ]);
    const tq = quintiles(op.map((x) => Math.abs(x.net)).filter((v) => v > 0));
    expect(op.map((x) => tq.block(Math.abs(x.net)))).toEqual([
      5, 2, 4, 5, 3, 2, 4, 1,
    ]);

    const fin = heat(ds, "FIN", p);
    const fv = fin.grid.flatMap((row) =>
      row.map(cellValue).filter((v) => v > 0),
    );
    const fq = quintiles(fv);
    expect(fv.map((v) => fq.block(v)).sort()).toEqual([2, 3, 4, 5]);
    const flt = fin.rows.map((l) => lt[l.i]!.net);
    expect(flt.map((v) => money(v, "USD", { exact: true }))).toEqual([
      "35,000.00",
      "(2,321.95)",
      "–",
      "(50,000.00)",
    ]);
    const ftq = quintiles(flt.map(Math.abs).filter((v) => v > 0));
    expect(flt.map((v) => (v === 0 ? 0 : ftq.block(Math.abs(v))))).toEqual([
      4, 2, 0, 5,
    ]);

    expect(
      heat(ds, "INV", p)
        .grid.flat()
        .some((c) => c.n > 0),
    ).toBe(false);
    expect(
      ledgerRows(ds, { sec: "OP", line: null, d0: p.d0, d1: p.d1 }),
    ).toHaveLength(90);
  });
});

function ab(p: Period): [number, number] {
  return [p.a, p.b];
}

export type { Section };
