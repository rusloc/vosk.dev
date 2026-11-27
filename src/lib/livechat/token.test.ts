import { describe, expect, it } from "vitest";
import { COOKIE, hashToken, newToken, readToken, tokenCookie } from "./token";

const req = (cookie?: string) =>
  new Request("https://vosk.dev/api/livechat/messages", {
    headers: cookie ? { cookie } : {},
  });

describe("visitor token", () => {
  it("is 32 random bytes, base64url, different every time", () => {
    const a = newToken();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(Buffer.from(a, "base64url")).toHaveLength(32);
    expect(newToken()).not.toBe(a);
  });

  it("is stored as its SHA-256 hex only", () => {
    const t = newToken();
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
  });

  it("sets an httpOnly, Secure, SameSite=Lax cookie on / for 90 days", () => {
    const c = tokenCookie("x".repeat(43));
    expect(c).toMatch(new RegExp(`^${COOKIE}=x{43};`));
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
    expect(c).toContain(`Max-Age=${90 * 86400}`);
  });

  it("reads the token back from the cookie header among others", () => {
    const t = newToken();
    expect(readToken(req(`a=1; ${COOKIE}=${t}; b=2`))).toBe(t);
    expect(readToken(req(`${COOKIE}=${t}`))).toBe(t);
  });

  it("ignores a missing, empty or malformed cookie", () => {
    expect(readToken(req())).toBeNull();
    expect(readToken(req("other=1"))).toBeNull();
    expect(readToken(req(`${COOKIE}=`))).toBeNull();
    expect(readToken(req(`${COOKIE}=short`))).toBeNull();
    expect(readToken(req(`${COOKIE}=${"a".repeat(42)}'`))).toBeNull();
    expect(readToken(req(`x${COOKIE}=${newToken()}`))).toBeNull();
  });
});
