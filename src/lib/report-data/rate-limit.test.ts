import { describe, expect, it } from "vitest";
import { clientIp, rateLimiter } from "./rate-limit";

const WINDOW = 10 * 60 * 1000;
const T0 = 1_800_000_000_000;

describe("rateLimiter", () => {
  it("allows max calls per key in a window, then limits, then forgets once the window passes", () => {
    const limited = rateLimiter({ max: 3, windowMs: WINDOW });
    expect([1, 2, 3].map((i) => limited("a", T0 + i))).toEqual([
      false,
      false,
      false,
    ]);
    expect(limited("a", T0 + 4)).toBe(true);
    expect(limited("b", T0 + 5)).toBe(false); // keys are counted apart
    expect(limited("a", T0 + 4 + WINDOW)).toBe(false); // the first four calls aged out
  });

  it("drops keys whose window has emptied (S2: the map no longer keeps every IP it has seen)", () => {
    const hits = new Map<string, number[]>();
    const limited = rateLimiter({ max: 3, windowMs: WINDOW, hits });
    for (let i = 0; i < 100; i++) limited(`ip-${i}`, T0 + i);
    expect(hits.size).toBe(100);
    limited("late", T0 + WINDOW + 50); // ip-0…ip-50 have aged out, ip-51…ip-99 are still in the window
    expect(hits.size).toBe(49 + 1);
    limited("later", T0 + 3 * WINDOW);
    expect([...hits.keys()]).toEqual(["later"]);
  });

  it("does not sweep a key that is still within its window", () => {
    const hits = new Map<string, number[]>();
    const limited = rateLimiter({ max: 1, windowMs: WINDOW, hits });
    limited("a", T0);
    limited("a", T0 + WINDOW - 1);
    expect(limited("a", T0 + WINDOW + 1)).toBe(true); // the second call still counts
  });
});

describe("clientIp", () => {
  it("takes the first forwarded hop, or unknown", () => {
    const req = (h?: string) =>
      new Request("https://example.test/", {
        headers: h ? { "x-forwarded-for": h } : {},
      });
    expect(clientIp(req(" 203.0.113.7 , 10.0.0.1"))).toBe("203.0.113.7");
    expect(clientIp(req())).toBe("unknown");
  });
});
