import { describe, expect, it } from "vitest";
import {
  dayLabel,
  differentDay,
  relativeTime,
  threadRows,
  videoCall,
} from "./thread";

describe("videoCall", () => {
  it("finds a call link in a message of Kirill's and takes it out of the text", () => {
    expect(
      videoCall(
        "owner",
        "Ok. Lets meet any time today. https://meet.jit.si/vosk-quick-call",
      ),
    ).toEqual({
      url: "https://meet.jit.si/vosk-quick-call",
      host: "meet.jit.si",
      rest: "Ok. Lets meet any time today.",
    });
  });

  it("leaves no text when the link is the whole message", () => {
    expect(
      videoCall("owner", "https://meet.google.com/abc-defg-hij")?.rest,
    ).toBe("");
  });

  it("keeps the sentence's punctuation out of the link", () => {
    const call = videoCall("owner", "Join here: https://whereby.com/vosk.");
    expect(call?.url).toBe("https://whereby.com/vosk");
    expect(call?.rest).toBe("Join here:");
  });

  it.each([
    ["https://meet.jit.si/room", "meet.jit.si"],
    ["https://meet.jeet.si/room", "meet.jeet.si"],
    ["https://meet.google.com/abc-defg-hij", "meet.google.com"],
    ["https://zoom.us/j/123456789", "zoom.us"],
    ["https://us02web.zoom.us/j/123456789?pwd=x", "us02web.zoom.us"],
    ["https://teams.microsoft.com/l/meetup-join/abc", "teams.microsoft.com"],
    ["https://whereby.com/vosk", "whereby.com"],
    ["https://vosk.whereby.com/room", "vosk.whereby.com"],
    ["HTTPS://MEET.JIT.SI/Room", "meet.jit.si"],
  ])("accepts %s", (link, host) => {
    expect(videoCall("owner", `Call: ${link}`)?.host).toBe(host);
  });

  it.each([
    ["http, not https", "http://meet.jit.si/room"],
    ["another scheme", "javascript:https://meet.jit.si/room"],
    ["no scheme", "meet.jit.si/room"],
    ["another site", "https://vosk.dev/work"],
    ["Zoom outside a join link", "https://zoom.us/pricing"],
    ["a lookalike host", "https://notzoom.us/j/1"],
    ["a call host as a subdomain label", "https://whereby.com.evil.example/x"],
    ["a call host in the path", "https://evil.example/meet.jit.si/room"],
    ["a user@host link", "https://meet.jit.si@evil.example/room"],
    ["no link", "Lets meet any time today."],
  ])("ignores %s", (_, body) => {
    expect(videoCall("owner", body)).toBeNull();
  });

  it("never reads a visitor's or a system message", () => {
    const body = "https://meet.jit.si/room";
    expect(videoCall("visitor", body)).toBeNull();
    expect(videoCall("system", body)).toBeNull();
  });

  it("takes the first call link when a message has two links", () => {
    expect(
      videoCall("owner", "See https://vosk.dev/work then https://zoom.us/j/42")
        ?.url,
    ).toBe("https://zoom.us/j/42");
  });
});

// Local-time constructors, so the checks hold in any time zone.
const at = (day: number, hour = 12, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime();

describe("dayLabel", () => {
  it("names today and yesterday", () => {
    expect(dayLabel(at(28, 0, 1), at(28, 23, 59))).toBe("Today");
    expect(dayLabel(at(27, 23, 59), at(28, 0, 1))).toBe("Yesterday");
  });

  it("gives a short date before that, with the year when it differs", () => {
    expect(dayLabel(at(12), at(28))).toBe("12 Nov");
    expect(dayLabel(new Date(2025, 11, 31, 12).getTime(), at(28))).toBe(
      "31 Dec 2025",
    );
  });

  it("calls a message ahead of the visitor's clock today", () => {
    expect(dayLabel(at(29), at(28))).toBe("Today");
  });
});

describe("differentDay", () => {
  it("splits at midnight, not after 24 hours", () => {
    expect(differentDay(at(27, 23, 59), at(28, 0, 1))).toBe(true);
    expect(differentDay(at(28, 0, 1), at(28, 23, 59))).toBe(false);
  });
});

describe("relativeTime", () => {
  it("goes from just now to minutes to the time of day", () => {
    const now = at(28, 15, 30);
    expect(relativeTime(now - 59_000, now)).toBe("just now");
    expect(relativeTime(now + 5_000, now)).toBe("just now");
    expect(relativeTime(now - 60_000, now)).toBe("1 min ago");
    expect(relativeTime(now - 59 * 60_000, now)).toBe("59 min ago");
    expect(relativeTime(at(28, 9, 5), now)).toBe("09:05");
  });
});

describe("threadRows", () => {
  const msg = (direction: "visitor" | "owner" | "system", time: number) =>
    ({ kind: "msg", direction, at: time }) as const;
  const now = at(28, 15, 30);

  it("groups each side, and signs the last bubble of a run of Kirill's", () => {
    const t = threadRows(
      [
        msg("visitor", now - 300_000),
        msg("owner", now - 240_000),
        msg("owner", now - 180_000),
        msg("visitor", now - 120_000),
        msg("owner", now - 10_000),
      ],
      now,
    );
    expect(t.firstDay).toBe("Today");
    expect(t.greetingMeta).toBe("Kirill");
    expect(t.rows.map((r) => r.tight)).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(t.rows.map((r) => r.meta)).toEqual([
      null,
      null,
      "Kirill · 3 min ago",
      null,
      "Kirill · just now",
    ]);
    expect(t.rows.every((r) => r.day === null)).toBe(true);
  });

  it("joins the greeting to a first message of Kirill's", () => {
    const t = threadRows([msg("owner", now)], now);
    expect(t.greetingMeta).toBeNull();
    expect(t.rows[0]).toMatchObject({ tight: true, meta: "Kirill · just now" });
  });

  it("puts one divider at each change of day and starts a new run there", () => {
    const t = threadRows(
      [
        msg("owner", at(27, 10)),
        msg("owner", at(27, 11)),
        msg("owner", at(28, 15)),
      ],
      now,
    );
    expect(t.firstDay).toBe("Yesterday");
    expect(t.rows.map((r) => r.day)).toEqual([null, null, "Today"]);
    expect(t.rows.map((r) => r.tight)).toEqual([true, true, false]);
    expect(t.rows.map((r) => r.meta)).toEqual([
      null,
      "Kirill · 11:00",
      "Kirill · 30 min ago",
    ]);
  });

  it("breaks a run at the email prompt and at a system line", () => {
    const t = threadRows(
      [
        msg("visitor", now),
        { kind: "email" } as const,
        msg("visitor", now),
        msg("system", now),
        msg("system", now),
      ],
      now,
    );
    expect(t.rows.map((r) => r.tight)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("heads an empty thread with today", () => {
    expect(threadRows([], now)).toEqual({
      firstDay: "Today",
      greetingMeta: "Kirill",
      rows: [],
    });
  });
});
