import { describe, expect, it } from "vitest";
import {
  cleanText,
  ipHash,
  isConversationLimited,
  LIMITS,
  takeSend,
  type SendState,
} from "./limits";

const T0 = new Date("2026-11-27T10:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);
const empty: SendState = { lastSendAt: null, hourStart: null, hourCount: 0 };

describe("takeSend (per conversation: every message, retry and email)", () => {
  it("allows the first send and starts the hour", () => {
    expect(takeSend(empty, T0)).toEqual({
      lastSendAt: T0,
      hourStart: T0,
      hourCount: 1,
    });
  });

  it("refuses a second send within 2 seconds, allows it at 2 s", () => {
    const s = takeSend(empty, T0)!;
    expect(takeSend(s, at(1999))).toBeNull();
    expect(takeSend(s, at(2000))).toMatchObject({ hourCount: 2 });
  });

  it("allows 30 an hour, refuses the 31st, and starts over after the hour", () => {
    let s: SendState = empty;
    for (let i = 0; i < LIMITS.perHour; i++) s = takeSend(s, at(i * 3000))!;
    expect(s.hourCount).toBe(30);
    expect(takeSend(s, at(31 * 3000))).toBeNull();
    expect(takeSend(s, at(60 * 60 * 1000))).toEqual({
      lastSendAt: at(3600_000),
      hourStart: at(3600_000),
      hourCount: 1,
    });
  });
});

describe("isConversationLimited", () => {
  it("allows 5 a day per IP, refuses the 6th", () => {
    expect(isConversationLimited({ perIp: 4, site: 0 })).toBe(false);
    expect(isConversationLimited({ perIp: 5, site: 0 })).toBe(true);
  });

  it("caps the whole site at 50 new conversations an hour", () => {
    expect(isConversationLimited({ perIp: 0, site: 49 })).toBe(false);
    expect(isConversationLimited({ perIp: 0, site: 50 })).toBe(true);
  });
});

describe("ipHash", () => {
  const req = (ip: string) =>
    new Request("https://vosk.dev/", { headers: { "x-forwarded-for": ip } });

  it("is SHA-256 hex of salt and IP, never the IP", () => {
    const h = ipHash(req("203.0.113.7, 10.0.0.1"), "a-salt-of-16-chars");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("203");
    expect(ipHash(req("203.0.113.7"), "a-salt-of-16-chars")).toBe(h); // the first hop only
    expect(ipHash(req("203.0.113.8"), "a-salt-of-16-chars")).not.toBe(h);
    expect(ipHash(req("203.0.113.7"), "another-salt-16ch")).not.toBe(h);
  });
});

describe("cleanText", () => {
  it("trims, keeps line breaks and tabs, normalises CRLF", () => {
    expect(cleanText("  hi\r\nthere\tyou  ")).toBe("hi\nthere\tyou");
    expect(cleanText("<b>*_</b>")).toBe("<b>*_</b>");
    expect(cleanText("x".repeat(2000))).toHaveLength(2000);
  });

  it.each([
    ["empty", ""],
    ["whitespace", "  \n\t "],
    ["zero-width only", "\u200B\u200C\u200D\uFEFF"],
    ["blank letters", "\u3164 \u2800"],
    ["NUL", "hi\u0000"],
    ["another control character", "a\u0007b"],
    ["2001 characters", "x".repeat(2001)],
  ])("refuses %s", (_, raw) => {
    expect(cleanText(raw)).toBeNull();
  });
});
