import { describe, expect, it } from "vitest";
import { classifyUpdate, secretMatches } from "./webhook";

const cfg = { chatId: "-1001234567890", allowedUserIds: new Set(["42"]) };

const update = (message: Record<string, unknown>) => ({
  update_id: 1,
  message: {
    message_id: 900,
    message_thread_id: 77,
    is_topic_message: true,
    chat: { id: -1001234567890, type: "supergroup", is_forum: true },
    from: { id: 42, is_bot: false },
    text: "Hello there",
    ...message,
  },
});

describe("secretMatches", () => {
  const secret = "s".repeat(40);
  it("accepts the exact secret only", () => {
    expect(secretMatches(secret, secret)).toBe(true);
    expect(secretMatches(`${secret}x`, secret)).toBe(false);
    expect(secretMatches("s".repeat(39), secret)).toBe(false);
    expect(secretMatches("", secret)).toBe(false);
    expect(secretMatches(null, secret)).toBe(false);
  });
});

describe("classifyUpdate", () => {
  it("relays an allowed user's text in a topic of the group, trimmed", () => {
    expect(classifyUpdate(update({ text: "  Hi <b>*_ \n" }), cfg)).toEqual({
      kind: "relay",
      threadId: 77,
      messageId: 900,
      text: "Hi <b>*_",
    });
  });

  it.each([
    ["not an object", null],
    ["no message (an edited_message)", { update_id: 1, edited_message: {} }],
    ["another chat", update({ chat: { id: -100999, type: "supergroup" } })],
    ["no topic (General)", update({ message_thread_id: undefined })],
    ["a bot", update({ from: { id: 42, is_bot: true } })],
    ["no sender", update({ from: undefined })],
    [
      "a user outside the allowlist",
      update({ from: { id: 43, is_bot: false } }),
    ],
    [
      "a service message (topic renamed)",
      update({ text: undefined, forum_topic_edited: { name: "x" } }),
    ],
    ["blank text", update({ text: "   " })],
    ["a chat id given as a string", update({ chat: { id: "-1001234567890" } })],
  ])("ignores %s", (_, u) => {
    expect(classifyUpdate(u, cfg)).toEqual({ kind: "ignore" });
  });

  it("turns /close and /block (also /close@bot) into actions, not messages", () => {
    expect(classifyUpdate(update({ text: "/close" }), cfg)).toEqual({
      kind: "close",
      threadId: 77,
    });
    expect(
      classifyUpdate(update({ text: "/close@vosk_bot thanks" }), cfg),
    ).toEqual({
      kind: "close",
      threadId: 77,
    });
    expect(classifyUpdate(update({ text: "/block" }), cfg)).toEqual({
      kind: "block",
      threadId: 77,
    });
  });

  it.each(["/closely", "/start", "/clsoe", "/help@vosk_bot"])(
    "never relays another command (%s): the owner is told in the topic",
    (text) => {
      expect(classifyUpdate(update({ text }), cfg)).toEqual({
        kind: "unknown_command",
        threadId: 77,
      });
    },
  );

  it("relays text that merely contains a slash, and drops NUL", () => {
    expect(
      classifyUpdate(update({ text: "see vosk.dev/work" }), cfg),
    ).toMatchObject({
      kind: "relay",
      text: "see vosk.dev/work",
    });
    expect(classifyUpdate(update({ text: "a\u0000b" }), cfg)).toMatchObject({
      kind: "relay",
      text: "ab",
    });
  });

  it.each(["photo", "document", "sticker", "voice", "video"])(
    "answers a %s with the text-only reply instead of relaying it",
    (key) => {
      expect(
        classifyUpdate(
          update({ text: undefined, caption: "x", [key]: {} }),
          cfg,
        ),
      ).toEqual({ kind: "non_text", threadId: 77 });
    },
  );

  it("never answers media from someone outside the allowlist", () => {
    expect(
      classifyUpdate(
        update({ text: undefined, photo: [], from: { id: 43, is_bot: false } }),
        cfg,
      ),
    ).toEqual({ kind: "ignore" });
  });
});
