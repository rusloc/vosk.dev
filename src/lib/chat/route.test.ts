import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./route";

// The chat routes answer pages of this site only (11-25): a browser's fetch POST carries `Origin`, a bare script does
// not, and another site's page carries its own.

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
