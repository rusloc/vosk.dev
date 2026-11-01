import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parquetRead } from "hyparquet";
import { beforeAll, describe, expect, it } from "vitest";
import {
  SALES_DATA_DIR,
  loadSalesBase,
  loadSalesDetail,
} from "./test-utils/sales-data";
import { createCube } from "./cube";
import type { Cube } from "./cube";
import { cohortClients, overdueLoans, topLoans } from "./detail";
import { createSalesEngine } from "./index";
import type { DetailIndex, SalesEngine } from "./index";
import { bridge } from "./loans";
import type { MarketSel, SalesSelection, TimeView, ViewId } from "./types";
import { monthIndex, windowOf } from "./windows";

// View models end to end (default window + a sweep), the originations bridge, and the detail sample's exactness
// against the raw fact_loan of the generator.

let engine: SalesEngine;
let cube: Cube;
let ix: DetailIndex;
// `tv` builds the period the old way (Month / QTD / YTD / R12M on the anchor, clamped to the data start): the period
// is a range `from`…`anchor` since 2026-11-01, and these windows are the ones the window stats cover.
const sel = ({
  tv = "M",
  ...patch
}: Partial<SalesSelection> & { tv?: TimeView } = {}): SalesSelection => {
  const anchor = patch.anchor ?? monthIndex("2026-09");
  return {
    view: "overview",
    market: "ALL",
    from: Math.max(0, windowOf(tv, anchor).start),
    anchor,
    cmp: "BUD",
    drill: null,
    ...patch,
  };
};

beforeAll(async () => {
  const base = await loadSalesBase();
  engine = createSalesEngine(base);
  cube = createCube(base);
  ix = engine.indexDetail(await loadSalesDetail());
});

describe("Overview (default window: Month · Sep 2026 · All markets · vs Budget)", () => {
  it("hero values match the README headline row for Sep 2026", () => {
    const vm = engine.overview(sel());
    expect(vm.heroes.map((h) => [h.label, h.value, h.second])).toEqual([
      ["Loans issued", "24.4k", "€9.6m"],
      ["New clients locked in", "9,796", null],
      ["Returning clients", "59.9%", null],
      ["Bad / overdue loans", "4.6%", null],
    ]);
    expect(vm.heroes[2]?.rows[0].text).toBe("n/a"); // returning % has no Budget
    expect(vm.heroes.every((h) => !("spark" in h))).toBe(true); // design-requirements §1: no in-card sparklines
    expect(vm.charts.map((c) => c.id)).toEqual(["o5", "o6", "o7", "o8"]);
    expect(vm.table.rows.map((r) => r.cells[0]?.text)).toEqual([
      "Poland",
      "Romania",
      "Portugal",
    ]);
  });

  it("Romania runs behind Budget and Portugal ahead in FY2026 YTD (README story)", () => {
    const vm = engine.overview(sel({ tv: "Y" }));
    const status = Object.fromEntries(
      vm.table.rows.map((r) => [r.key, r.cells[2]?.status]),
    );
    expect(status).toMatchObject({ RO: "off", PT: "good" });
  });

  it("builds the header period line from the selection", () => {
    expect(
      engine.header(sel({ market: "RO", tv: "Q", cmp: "PY" })).periodLine,
    ).toBe(
      "Showing Jul–Sep 2026 - Quarter - Romania - Actual vs Prior year and Budget - Closed through Sep 2026",
    );
    expect(
      engine.header(sel({ tv: "R", anchor: monthIndex("2024-06") })).periodLine,
    ).toContain("Showing Jan–Jun 2024 - Custom range"); // the window starts at the data start, never before it
  });
});

describe("ADR-0012: card face = title · value · delta rows · status chip; the rest behind ⓘ / How to read", () => {
  const views: ViewId[] = [
    "overview",
    "loans",
    "clients",
    "portfolio",
    "revenue",
  ];
  it.each(views)(
    "%s: every card and panel carries a complete ⓘ, no sub-line or footnote on the face",
    (view) => {
      const s = sel({ view });
      const vm = view === "overview" ? engine.overview(s) : engine.band(s);
      const cards =
        "heroes" in vm
          ? [...vm.heroes, ...vm.charts, vm.table]
          : [...vm.kpis, ...vm.charts, vm.table];
      for (const c of cards) {
        expect(c, c.id).not.toHaveProperty("sub");
        expect(c, c.id).not.toHaveProperty("note");
        for (const k of ["what", "why", "formula"] as const)
          expect(c.info[k].length, `${c.id}.${k}`).toBeGreaterThan(8);
      }
      const band = "heroes" in vm ? vm.heroes : vm.kpis;
      expect(band.some((c) => c.info.values.length > 0)).toBe(true); // the former sub-lines live in the pop-up
    },
  );

  it("one How to read per view, opening with the Showing sentence", () => {
    for (const view of views) {
      const h = engine.header(
        sel({ view, tv: "R", anchor: monthIndex("2024-06") }),
      ).howToRead;
      expect(h.title).toMatch(/^How to read - /);
      expect(h.lines[0]?.value).toMatch(/^Showing Jan–Jun 2024 - /); // the Showing sentence opens it
    }
    expect(
      new Set(views.map((view) => engine.header(sel({ view })).howToRead.title))
        .size,
    ).toBe(5);
  });

  it("hero chips follow the header comparator and fall back when it has no value", () => {
    const vm = engine.overview(sel());
    expect(vm.heroes[0]?.status?.text).toMatch(/^[▲▼◦] (Good|Watch|Off)$/);
    expect(vm.heroes[2]?.status).toEqual(
      vm.heroes[2]
        ? { text: expect.any(String), status: vm.heroes[2].rows[1].status }
        : null,
    ); // returning % has no Budget → PY
  });
});

describe("every view renders for every market × time view × comparator", () => {
  const views: ViewId[] = [
    "overview",
    "loans",
    "clients",
    "portfolio",
    "revenue",
  ];
  const markets: MarketSel[] = ["ALL", "PL", "RO", "PT"];
  const tvs: TimeView[] = ["M", "Q", "Y", "R"];
  it.each(views)("%s", (view) => {
    for (const market of markets)
      for (const tv of tvs)
        for (const anchor of [
          monthIndex("2024-01"),
          monthIndex("2025-06"),
          monthIndex("2026-09"),
        ]) {
          const s = sel({
            view,
            market,
            tv,
            anchor,
            cmp: anchor % 2 ? "PY" : "BUD",
          });
          const vm = view === "overview" ? engine.overview(s) : engine.band(s);
          const text = JSON.stringify(vm);
          expect(text, `${view} ${market} ${tv} ${anchor}`).not.toMatch(
            /NaN|Infinity|undefined/,
          );
          if (view !== "overview")
            expect((vm as ReturnType<SalesEngine["band"]>).kpis).toHaveLength(
              6,
            );
        }
  });
});

describe("originations bridge", () => {
  it("steps add up from Budget to Actual for every market and time view", () => {
    for (const mk of ["ALL", "PL", "RO", "PT"] as MarketSel[])
      for (const tv of ["M", "Q", "Y", "R"] as TimeView[]) {
        const b = bridge(cube, windowOf(tv, monthIndex("2026-09")), mk);
        expect(b, `${mk} ${tv}`).not.toBeNull();
        expect(Math.abs(b?.residual ?? 1), `${mk} ${tv}`).toBeLessThan(1e-4);
      }
    // README: Poland beats Budget in constant currency but misses in EUR, so its FX step is negative in FY2026 YTD.
    expect(
      bridge(cube, windowOf("Y", monthIndex("2026-09")), "PL")?.fx,
    ).toBeLessThan(0);
  });
});

// The raw fact_loan.parquet stays in rusloc/pnl (19.6 MB, never shipped): this block runs there and skips here.
const FACT_LOAN = join(SALES_DATA_DIR, "parquet", "fact_loan.parquet");
const HAS_FACT_LOAN = existsSync(FACT_LOAN);

describe.skipIf(!HAS_FACT_LOAN)(
  "detail sample is exact for its caps (checked against the raw fact_loan)",
  () => {
    type Raw = {
      id: number;
      client: number;
      market: string;
      day: string;
      principal: number;
      eur: number;
      dpd: number;
      out: number;
      agent: string | null;
    };
    let raw: Raw[];
    beforeAll(async () => {
      const b = readFileSync(FACT_LOAN);
      const cols: Record<string, unknown[]> = {};
      await parquetRead({
        file: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
        columns: [
          "loan_id",
          "client_id",
          "market_code",
          "disbursed_date",
          "principal_local",
          "principal_eur",
          "dpd_days_close",
          "outstanding_local_close",
          "agent_code",
        ],
        onChunk: ({ columnName, columnData, rowStart }) => {
          const c = (cols[columnName] ??= []);
          for (let i = 0; i < columnData.length; i++)
            c[rowStart + i] = columnData[i];
        },
      });
      const g = (name: string, i: number) => cols[name]?.[i];
      raw = (cols.loan_id ?? []).map((_, i) => ({
        id: Number(g("loan_id", i)),
        client: Number(g("client_id", i)),
        market: String(g("market_code", i)),
        day: (g("disbursed_date", i) as Date).toISOString().slice(0, 10),
        principal: Number(g("principal_local", i)),
        eur: Number(g("principal_eur", i)),
        dpd: Number(g("dpd_days_close", i) ?? 0),
        out: Number(g("outstanding_local_close", i) ?? 0),
        agent: (g("agent_code", i) as string | null) ?? null,
      }));
    });

    it("top 50 by principal of a window × market", () => {
      for (const [mk, tv] of [
        ["RO", "M"],
        ["ALL", "Q"],
        ["PT", "Y"],
      ] as [MarketSel, TimeView][]) {
        const w = windowOf(tv, monthIndex("2026-09"));
        const inW = (r: Raw) => {
          const m = monthIndex(r.day.slice(0, 7));
          return (
            m >= w.start && m <= w.end && (mk === "ALL" || r.market === mk)
          );
        };
        const expected = raw
          .filter(inW)
          .sort((a, b) => b.eur - a.eur || a.id - b.id)
          .slice(0, 50)
          .map((r) => r.id);
        expect(
          topLoans(ix, w, mk, 50).map((r) => r.loan_id),
          `${mk} ${tv}`,
        ).toEqual(expected);
      }
    });

    it("top 10 of an agent and the worst overdue loans", () => {
      const w = windowOf("Y", monthIndex("2026-09"));
      const agent = raw
        .filter(
          (r) =>
            r.agent === "A001" &&
            monthIndex(r.day.slice(0, 7)) >= w.start &&
            monthIndex(r.day.slice(0, 7)) <= w.end,
        )
        .sort((a, b) => b.eur - a.eur || a.id - b.id)
        .slice(0, 10)
        .map((r) => r.id);
      expect(topLoans(ix, w, "PL", 10, "A001").map((r) => r.loan_id)).toEqual(
        agent,
      );
      const overdue = raw
        .filter((r) => r.market === "RO" && r.dpd >= 30 && r.out > 0)
        .sort((a, b) => b.dpd - a.dpd || b.out - a.out || a.id - b.id)
        .slice(0, 100)
        .map((r) => r.id);
      expect(overdueLoans(ix, "RO", 100).map((r) => r.loan_id)).toEqual(
        overdue,
      );
    });

    it("cohort clients carry their whole loan history (principal to date)", () => {
      const list = cohortClients(
        ix,
        cube,
        windowOf("M", monthIndex("2025-03")),
        "PL",
        20,
      );
      expect(list).toHaveLength(20);
      for (const s of list) {
        const own = raw.filter(
          (r) => r.client === s.client.client_id && r.day <= "2026-09-30",
        );
        expect(s.loans).toBe(own.length + s.client.loans_before_2024);
        expect(
          Math.abs(s.principalToDate - own.reduce((t, r) => t + r.eur, 0)),
        ).toBeLessThan(0.01);
      }
    });

    it("slide-over titles count from the aggregates, rows from the sample", () => {
      const vm = engine.slideOver(sel(), ix, { kind: "loans", market: "RO" });
      expect(vm.kind).toBe("loans");
      if (vm.kind !== "loans") return;
      const ro = raw.filter(
        (r) => r.market === "RO" && r.day.startsWith("2026-09"),
      ).length;
      expect(vm.title).toBe(
        `${ro.toLocaleString("en-US")} loans - Romania - Sep 2026`,
      );
      expect(vm.rows).toHaveLength(50);
      expect(vm.csv.split("\n")).toHaveLength(51);
      const client = engine.slideOver(sel(), ix, {
        kind: "client",
        client: vm.rows[0]?.client ?? 0,
      });
      expect(client.kind).toBe("client");
    });
  },
);

describe("2026-11-01, third round: funnel scale, heatmaps, returning approval, subscriber flow", () => {
  const card = (view: ViewId, id: string) => {
    const vm = engine.band(sel({ view }));
    if ("heroes" in vm) throw new Error("band expected");
    const c = vm.charts.find((x) => x.id === id);
    if (!c) throw new Error(`no ${id}`);
    return c;
  };

  it("L8: Started fills the scale; the yellow line = did not reach the next stage; none on the last", () => {
    const ch = card("loans", "l8").chart;
    if (ch.kind !== "funnel") throw new Error("funnel expected");
    const v = ch.rows.map((r) => r.value);
    expect(Math.max(...v)).toBe(v[0]);
    ch.rows.forEach((r, k) =>
      expect(r.lost).toBe(k < v.length - 1 ? r.value - (v[k + 1] ?? 0) : null),
    );
    expect(ch.rows[0]?.sub).toMatch(/^\d+% of leads - /);
  });

  it("L10 and C9 are heatmaps; C9 runs oldest cohort first, blank where a cohort is too young", () => {
    const l10 = card("loans", "l10").chart;
    expect(l10.kind).toBe("heat");
    if (l10.kind !== "heat") return;
    expect(l10.cols).toEqual(["Poland", "Romania", "Portugal"]);
    expect(l10.rows[0]?.cells[0]?.text).toBe("3,571"); // Flex 30 × PL, Sep 2026
    const c9 = card("clients", "c9").chart;
    expect(c9.kind).toBe("heat");
    if (c9.kind !== "heat") return;
    expect(c9.rows.map((r) => r.label)).toEqual([
      "Q4 2025",
      "Q1 2026",
      "Q2 2026",
      "Q3 2026",
    ]);
    expect(c9.cols[0]).toBe("45 d"); // nobody repeats within 30 days: those columns are dropped
    expect(c9.cols.at(-1)).toBe("180 d");
    expect(c9.rows.at(-1)?.cells.at(-1)).toEqual({ text: "", bin: null });
  });

  it("C5 is the returning-client approval rate", () => {
    const vm = engine.band(sel({ view: "clients" }));
    if ("heroes" in vm) return;
    const c5 = vm.kpis.find((k) => k.id === "c5");
    const f = cube.funnel(windowOf("M", monthIndex("2026-09")), "ALL", true);
    expect(c5?.label).toBe("Returning-client approval rate");
    expect(c5?.value).toBe(`${((f.approved / f.submitted) * 100).toFixed(1)}%`);
  });

  it("R11 plots new and churned paying subscribers (Feb 2026: churn above sign-ups)", () => {
    const ch = card("revenue", "r11").chart;
    if (ch.kind !== "line") throw new Error("line expected");
    const feb = ch.x.indexOf("Feb");
    expect(ch.series.map((s) => [s.name, s.values[feb]])).toEqual([
      ["New", 665],
      ["Churned", 754],
    ]);
  });
});

describe("2026-11-01: aggregate tables on Clients and Portfolio, their rows open sample lists", () => {
  it("C11: one row per channel; new clients add up to the C1 card; rows open that channel's clients", () => {
    const vm = engine.band(sel({ view: "clients" }));
    if ("heroes" in vm) return;
    expect(vm.table.title).toBe(
      "Acquisition by channel - Sep 2026 - All markets",
    );
    expect(vm.table.rows.map((r) => r.cells[0]?.text)).toEqual([
      "App",
      "Paid",
      "Partner",
      "Agent",
    ]);
    const sum = vm.table.rows.reduce(
      (t, r) => t + Number(r.cells[1]?.text.replace(/,/g, "")),
      0,
    );
    expect(sum.toLocaleString("en-US")).toBe(vm.kpis[0]?.value);
    expect(vm.table.rows[2]?.action).toEqual({
      kind: "drill",
      drill: { kind: "clients", market: "ALL", channel: "PARTNER" },
    });
    expect(vm.table.action?.drill).toEqual({
      kind: "clients",
      market: "ALL",
      channel: null,
    });
  });

  it("P13: one row per microloan product; buckets add up to the outstanding minus current", () => {
    const vm = engine.band(sel({ view: "portfolio" }));
    if ("heroes" in vm) return;
    expect(vm.table.title).toBe("Overdue by product - Sep 2026 - All markets");
    expect(vm.table.rows.map((r) => r.key)).toEqual([
      "FLEX30",
      "FLEX90",
      "STEP6",
      "STEP12",
      "BIZ",
    ]);
    const snap = cube.snapshotBy(
      monthIndex("2026-09"),
      "ALL",
      (r) => r.product,
    );
    const s = snap?.get("STEP6");
    expect(s && s.b1_29 + s.b30_59 + s.b60_89 + s.b90p + s.current).toBeCloseTo(
      s?.outstanding ?? 0,
      0,
    );
  });

  it("the lists: one channel's clients, one product's overdue loans, each row opens a client card", () => {
    const clients = engine.slideOver(sel(), ix, {
      kind: "clients",
      market: "ALL",
      channel: "PARTNER",
    });
    expect(clients.kind).toBe("clients");
    if (clients.kind !== "clients") return;
    expect(clients.title).toMatch(
      /^[\d,]+ new clients - Partner - All markets - Sep 2026$/,
    );
    expect(clients.rows.length).toBeGreaterThan(0);
    expect(clients.rows.every((r) => r.cells[5] === "Partner")).toBe(true);

    const overdue = engine.slideOver(sel(), ix, {
      kind: "overdue",
      market: "RO",
      product: "STEP6",
    });
    expect(overdue.kind).toBe("loans");
    if (overdue.kind !== "loans") return;
    expect(overdue.title).toMatch(
      /^[\d,]+ loans 30\+ DPD - Step 6 - Romania - Sep 2026$/,
    );
    expect(overdue.rows.length).toBeGreaterThan(0);
    expect(overdue.rows.every((r) => r.cells[2] === "Step 6")).toBe(true);
    expect(overdue.rows.every((r) => Number(r.cells[7]) >= 30)).toBe(true);
  });
});
