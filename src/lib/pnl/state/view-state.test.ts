import { describe, expect, it } from "vitest";
import {
  VIEW_STATE_DEFAULTS,
  joinQuery,
  parseViewState,
  serializeViewState,
} from "./view-state";

const q = (s: string) => new URLSearchParams(s);

describe("view state (p, lvr, lvch, lvln, lvsg)", () => {
  it("defaults are omitted and round-trip", () => {
    expect(parseViewState(q(""))).toEqual(VIEW_STATE_DEFAULTS);
    expect(serializeViewState(VIEW_STATE_DEFAULTS)).toBe("");
    const s = "p=2&lvr=NA&lvch=MKT&lvln=HOME&lvsg=PREM";
    expect(serializeViewState(parseViewState(q(s)))).toBe(s);
  });
  it("invalid values fall back to the default", () => {
    expect(
      parseViewState(q("p=3&lvr=na&lvch=&lvln=x%20y&lvsg=TOO_LONG_A_CODE_1")),
    ).toEqual(VIEW_STATE_DEFAULTS);
  });
  it("joins with the selection query", () => {
    expect(joinQuery("e=S&v=analysis", "lvr=EU")).toBe("e=S&v=analysis&lvr=EU");
    expect(joinQuery("", "")).toBe("");
  });
});
