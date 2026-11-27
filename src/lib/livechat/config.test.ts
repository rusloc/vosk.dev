import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { isLiveChatConfigured, liveChatConfig } from "./config";

const GOOD = {
  LIVECHAT_DATABASE_URL: "postgres://u:p@db.example:5432/postgres",
  TELEGRAM_BOT_TOKEN: "123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  TELEGRAM_CHAT_ID: "-1001234567890",
  TELEGRAM_WEBHOOK_SECRET: "w".repeat(40),
  TELEGRAM_ALLOWED_USER_IDS: "42",
  CHAT_IP_HASH_SALT: "s".repeat(16),
};

let warn: MockInstance<typeof console.warn>;
beforeEach(() => {
  for (const [k, v] of Object.entries(GOOD)) vi.stubEnv(k, v);
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("liveChatConfig", () => {
  it("reads the six variables", () => {
    expect(liveChatConfig()).toMatchObject({
      chatId: "-1001234567890",
      ipSalt: "s".repeat(16),
    });
    expect(isLiveChatConfigured()).toBe(true);
  });

  it.each(Object.keys(GOOD))("is off while %s is unset or blank", (name) => {
    vi.stubEnv(name, " ");
    expect(liveChatConfig()).toBeNull();
    expect(isLiveChatConfigured()).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it("takes a trailing comma and spaces in the allowlist", () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_IDS", "123, 456,");
    expect([...liveChatConfig()!.allowedUserIds]).toEqual(["123", "456"]);
  });

  it.each([
    ["TELEGRAM_CHAT_ID", "1001234567890"],
    ["TELEGRAM_BOT_TOKEN", "not-a-token"],
    ["TELEGRAM_WEBHOOK_SECRET", "short"],
    ["TELEGRAM_ALLOWED_USER_IDS", "42,abc"],
    ["TELEGRAM_ALLOWED_USER_IDS", ",,"],
    ["CHAT_IP_HASH_SALT", "fifteen-chars!!"],
    ["LIVECHAT_DATABASE_URL", "not a url"],
  ])(
    "a malformed %s turns the chat off, never throws, and warns with the name only",
    (name, value) => {
      vi.stubEnv(name, value);
      expect(() => isLiveChatConfigured()).not.toThrow();
      expect(isLiveChatConfigured()).toBe(false);
      const said = warn.mock.calls.map((c) => c.join(" ")).join("\n");
      if (said) {
        expect(said).toContain(name);
        expect(said).not.toContain(value);
      }
    },
  );
});
