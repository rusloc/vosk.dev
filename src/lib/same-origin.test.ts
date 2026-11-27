import { describe, expect, it } from "vitest";
import { isRequestHost, isSameOrigin } from "./same-origin";

// The POST routes (AI chat, live chat) answer pages of this site only (11-25): a browser's fetch POST carries `Origin`,
// a bare script does not, and another site's page carries its own. Moved from src/lib/chat/route.test.ts (11-27).

const post = (origin?: string, url = "https://vosk.dev/api/chat/mirelo") =>
  new Request(url, {
    method: "POST",
    headers: origin ? { origin } : {},
  });

describe("isSameOrigin", () => {
  it("accepts a page of the same host, also on a preview deploy", () => {
    expect(isSameOrigin(post("https://vosk.dev"))).toBe(true);
    expect(
      isSameOrigin(
        post(
          "https://vosk-abc-yaga.vercel.app",
          "https://vosk-abc-yaga.vercel.app/api/chat/pnl",
        ),
      ),
    ).toBe(true);
  });

  it("refuses a request without Origin, another site, or a malformed Origin", () => {
    expect(isSameOrigin(post())).toBe(false);
    expect(isSameOrigin(post("https://evil.example"))).toBe(false);
    expect(isSameOrigin(post("https://vosk.dev.evil.example"))).toBe(false);
    expect(isSameOrigin(post("null"))).toBe(false);
  });
});

describe("isRequestHost", () => {
  it("matches the request's host or the forwarded host only", () => {
    const req = new Request("https://vosk.dev/api/livechat/messages", {
      headers: { "x-forwarded-host": "www.vosk.dev" },
    });
    expect(isRequestHost(req, new URL("https://vosk.dev/services"))).toBe(true);
    expect(isRequestHost(req, new URL("https://www.vosk.dev/"))).toBe(true);
    expect(isRequestHost(req, new URL("https://evil.example/"))).toBe(false);
  });
});
