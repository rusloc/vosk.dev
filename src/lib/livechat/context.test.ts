import { describe, expect, it } from "vitest";
import { contextText, deviceOf, pageUrlOf, referrerOf } from "./context";

const req = new Request("https://vosk.dev/api/livechat/messages");

describe("pageUrlOf", () => {
  it("keeps a page of this host as origin + path, no query or hash", () => {
    expect(
      pageUrlOf("https://vosk.dev/services?utm_source=x&t=secret#top", req),
    ).toBe("https://vosk.dev/services");
  });

  it("drops another host, a non-http URL or garbage", () => {
    expect(pageUrlOf("https://evil.example/x", req)).toBeNull();
    expect(pageUrlOf("javascript:alert(1)", req)).toBeNull();
    expect(pageUrlOf("not a url", req)).toBeNull();
    expect(pageUrlOf("", req)).toBeNull();
  });

  it("caps at 500 characters", () => {
    expect(pageUrlOf(`https://vosk.dev/${"a".repeat(800)}`, req)!.length).toBe(
      500,
    );
  });
});

describe("referrerOf", () => {
  it("keeps any site, origin + path, capped", () => {
    expect(referrerOf("https://www.google.com/search?q=power+bi")).toBe(
      "https://www.google.com/search",
    );
    expect(referrerOf(`https://x.example/${"b".repeat(800)}`)!.length).toBe(
      500,
    );
    expect(referrerOf(undefined)).toBeNull();
    expect(referrerOf("data:text/html,hi")).toBeNull();
  });
});

describe("deviceOf and contextText", () => {
  it("is coarse", () => {
    expect(
      deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile"),
    ).toBe("Mobile, iOS");
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
      "Desktop, Windows",
    );
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-X200)")).toBe(
      "Tablet, Android",
    );
    expect(deviceOf(null)).toBe("unknown");
  });

  it("lists page, referrer, country and device", () => {
    expect(
      contextText({
        label: "Visitor 0A1B2C3D",
        pageUrl: null,
        referrer: null,
        country: null,
        device: "Desktop, macOS",
        email: null,
        recreated: false,
      }),
    ).toBe(
      "New chat: Visitor 0A1B2C3D\nPage: unknown\nReferrer: none\nCountry: unknown\nDevice: Desktop, macOS",
    );
  });
});
