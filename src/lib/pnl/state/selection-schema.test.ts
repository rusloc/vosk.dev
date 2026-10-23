import { beforeAll, describe, expect, it } from "vitest";
import type { Manifest } from "../data/manifest";
import { loadPublicDataset } from "../test-utils/public-data";
import {
  createSelectionCodec,
  parseEntity,
  resetSelection,
  switchEntity,
  toggleSlice,
} from "./selection-schema";
import type { SelectionCodec } from "./selection-schema";

// F-37 link state validated at the boundary (ADR-0002 §2.4).
let codec: SelectionCodec;
let manifest: Manifest;
beforeAll(async () => {
  manifest = (await loadPublicDataset(["P"])).manifest;
  codec = createSelectionCodec(manifest);
});
const q = (s: string) => new URLSearchParams(s);

describe("selection codec", () => {
  it("the bare URL is the spec default (F-01 … F-21): Consumer Products, YTD Sep 2026, Actual vs Budget and PY", () => {
    const sel = codec.parse(q(""));
    expect(sel).toEqual(codec.defaults("P"));
    expect(sel).toMatchObject({
      entity: "P",
      fy: 2026,
      month: 9,
      timeView: "YTD",
      base: "A",
      compareA: "B",
      compareB: "PY",
    });
    expect(codec.serialize(sel)).toBe("");
  });

  it("round-trips every non-default field", () => {
    const sel = {
      ...codec.defaults("S"),
      fy: 2025,
      month: 3 as const,
      timeView: "LTM" as const,
      base: "B" as const,
      compareA: "LE" as const,
      compareB: "NONE" as const,
      region: ["EU", "UK"],
      channel: ["SELF"],
      currency: "GBP" as const,
      costSign: "POS" as const,
      showTags: false,
      view: "kpi" as const,
    };
    const text = codec.serialize(sel);
    expect(text).toBe(
      "e=S&fy=2025&m=3&tv=LTM&b=B&ca=LE&cb=NONE&r=EU%2CUK&ch=SELF&cur=GBP&cs=POS&tg=0&v=kpi",
    );
    expect(codec.parse(q(text))).toEqual(sel);
  });

  it("replaces invalid values with the default and drops unknown keys", () => {
    const sel = codec.parse(
      q("e=X&fy=1999&m=13&tv=WEEK&cur=JPY&pn=yes&utm_source=mail"),
    );
    expect(sel).toEqual(codec.defaults("P"));
    expect(codec.serialize(sel)).toBe("");
  });

  it("slice codes: unknown or other-entity codes dropped; all selected means all (F-33)", () => {
    expect(codec.parse(q("ch=GRO,SELF,NOPE")).channel).toEqual(["GRO"]);
    expect(codec.parse(q("r=NA,EU,UK,AP")).region).toEqual([]);
  });

  it("Group view: entity-specific slices off (F-32), Entity breakdown by default (F-21)", () => {
    const sel = codec.parse(q("e=GROUP&ch=GRO"));
    expect(sel).toMatchObject({
      entity: "GROUP",
      channel: [],
      breakdown: "ENTITY",
    });
    expect(codec.parse(q("bd=ENTITY")).breakdown).toBe("CHANNEL");
    expect(codec.parse(q("e=GROUP&bd=SEGMENT")).breakdown).toBe("ENTITY");
  });

  it("old layout, cost lens and detail keys are dropped (ADR-0007)", () => {
    expect(codec.serialize(codec.parse(q("lay=TREND_M&lens=NAT&d=FULL")))).toBe(
      "",
    );
  });

  it("reads the entity before the manifest is loaded", () => {
    expect(parseEntity(q("e=S"))).toBe("S");
    expect(parseEntity(q("e=bad"))).toBe("P");
  });
});

describe("company switch (F-30, F-31, F-32, T-14, T-15)", () => {
  it("T-14: keeps period, versions, currency and region; restores each company's own slices", () => {
    const p = codec.parse(
      q("fy=2025&m=6&tv=QTD&b=LE&ca=PY&cur=EUR&r=EU,UK&ch=MKT&sg=PREM"),
    );
    const toS = switchEntity(p, "S", {}, codec.defaults);
    expect(toS.sel).toMatchObject({
      entity: "S",
      fy: 2025,
      month: 6,
      timeView: "QTD",
      base: "LE",
      compareA: "PY",
      currency: "EUR",
      region: ["EU", "UK"],
      channel: [],
      segment: [],
    });
    const sWithSlice = { ...toS.sel, line: ["PAY"] };
    const backToP = switchEntity(sWithSlice, "P", toS.memory, codec.defaults);
    expect(backToP.sel).toMatchObject({
      channel: ["MKT"],
      segment: ["PREM"],
      line: [],
    });
    const backToS = switchEntity(
      backToP.sel,
      "S",
      backToP.memory,
      codec.defaults,
    );
    expect(backToS.sel.line).toEqual(["PAY"]);
  });

  it("T-15 / F-32: the Group view has no channel, category or segment; its breakdowns are Region and Entity", () => {
    const p = codec.parse(q("ch=MKT&bd=SEGMENT&r=NA"));
    const g = switchEntity(p, "GROUP", {}, codec.defaults).sel;
    expect(g).toMatchObject({
      entity: "GROUP",
      channel: [],
      line: [],
      segment: [],
      region: ["NA"],
      breakdown: "ENTITY",
    });
  });

  it("F-35 Reset: defaults, keeping the company and the view", () => {
    const sel = codec.parse(q("e=S&cur=GBP&r=NA&v=kpi"));
    expect(resetSelection(sel, codec.defaults)).toEqual({
      ...codec.defaults("S"),
      view: "kpi",
    });
  });
});

describe("F-33 multi-select", () => {
  const all = ["NA", "EU", "UK", "AP"];
  it("from all, a click selects just that value; then clicks add or remove; the last stays; all again is []", () => {
    expect(toggleSlice([], all, "EU")).toEqual(["EU"]);
    expect(toggleSlice(["EU"], all, "NA")).toEqual(["NA", "EU"]);
    expect(toggleSlice(["NA", "EU"], all, "NA")).toEqual(["EU"]);
    expect(toggleSlice(["UK"], all, "UK")).toEqual(["UK"]);
    expect(toggleSlice(["NA", "UK", "AP"], all, "EU")).toEqual([]);
  });
});
