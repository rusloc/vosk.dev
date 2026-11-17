import { describe, expect, it } from "vitest";
import {
  VIEW_STATE_DEFAULTS,
  joinQuery,
  parseViewState,
  serializeViewState,
} from "./view-state";

const q = (s: string) => new URLSearchParams(s);

describe("view state (lvr, lvch, lvln, lvsg)", () => {
  it("defaults are omitted and round-trip", () => {
    expect(parseViewState(q(""))).toEqual(VIEW_STATE_DEFAULTS);
    expect(serializeViewState(VIEW_STATE_DEFAULTS)).toBe("");
    const s = "lvr=NA&lvch=MKT&lvln=HOME&lvsg=PREM";
    expect(serializeViewState(parseViewState(q(s)))).toBe(s);
  });
  it("invalid values fall back to the default", () => {
    expect(
      parseViewState(q("lvr=na&lvch=&lvln=x%20y&lvsg=TOO_LONG_A_CODE_1")),
    ).toEqual(VIEW_STATE_DEFAULTS);
  });
  it("the retired sub-page key `p` (2026-11-15) is ignored, so the rewrite drops it", () => {
    expect(parseViewState(q("p=2&lvr=EU"))).toEqual({
      filter: { ...VIEW_STATE_DEFAULTS.filter, region: "EU" },
    });
    expect(serializeViewState(parseViewState(q("p=2")))).toBe("");
  });
  it("joins with the selection query", () => {
    expect(joinQuery("e=S&v=analysis", "lvr=EU")).toBe("e=S&v=analysis&lvr=EU");
    expect(joinQuery("", "")).toBe("");
  });
});
