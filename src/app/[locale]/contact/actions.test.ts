import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContactState } from "@/lib/schema";
import { en } from "@/lib/i18n/en";
import { siteConfig } from "@/lib/site";

/**
 * Tests for the contact Server Action.
 *
 * Mocked: `next/headers` (no request context in a unit run), `resend` (no real
 * mail), `@/lib/contact-config` (no env plumbing). Deliberately NOT mocked:
 * `@/lib/schema` and the i18n dictionaries — the Zod rules and the real message
 * catalogue are exactly what these tests are meant to exercise.
 *
 * Module state: `hits` (the rate-limit map) lives at module scope in
 * `actions.ts` and is unreachable from a test. Rather than papering over that by
 * giving every test a unique IP — which silently couples tests to each other's
 * hit counts and rots the moment someone reuses an address — each test gets a
 * fresh module registry via `vi.resetModules()` + a dynamic `import()`. Tests
 * are then free to reuse IPs and to assert on exact counts.
 */

const mocks = vi.hoisted(() => {
  const send = vi.fn();
  return {
    send,
    // Must be a `function`, not an arrow: `actions.ts` calls it with `new`.
    resendCtor: vi.fn(function () {
      return { emails: { send } };
    }),
    headers: vi.fn(),
    getContactConfig: vi.fn(),
  };
});

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("resend", () => ({ Resend: mocks.resendCtor }));
vi.mock("@/lib/contact-config", () => ({
  getContactConfig: mocks.getContactConfig,
}));

const CONFIG = {
  apiKey: "re_test_key",
  to: "owner@example.com",
  from: "VOSK Website <noreply@example.com>",
};

const IDLE: ContactState = { status: "idle" };
const IP = "203.0.113.7";
const VISITOR = "visitor@example.com";
const VALID_MESSAGE = "Hello, I would like a dashboard.";

type Fields = Record<string, string>;

function formData(fields: Fields): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

function validFields(overrides: Fields = {}): Fields {
  return { email: VISITOR, message: VALID_MESSAGE, ...overrides };
}

/** Fresh module instance → empty rate-limit map. */
async function loadAction() {
  const { submitContactForm } = await import("./actions");
  return submitContactForm;
}

function setIp(value: string | null) {
  mocks.headers.mockResolvedValue(
    new Headers(value === null ? {} : { "x-forwarded-for": value }),
  );
}

/** Load a fresh action and submit once. */
async function submit(fields: Fields = validFields()) {
  const action = await loadAction();
  return action(IDLE, formData(fields));
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.getContactConfig.mockReturnValue(CONFIG);
  mocks.send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
  setIp(IP);
});

describe("submitContactForm — happy path", () => {
  it("sends the notification and the auto-reply, and reports success", async () => {
    const result = await submit(validFields({ subject: "Dashboard help" }));

    expect(result).toEqual({ status: "success", message: en.form.success });
    expect(mocks.resendCtor).toHaveBeenCalledWith(CONFIG.apiKey);
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ subject: "Contact: Dashboard help" }),
    );
  });

  it("falls back to a generated subject when the subject field is empty", async () => {
    await submit(validFields({ subject: "" }));

    expect(mocks.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ subject: `New message from ${VISITOR}` }),
    );
  });

  it("points the notification's replyTo at the visitor and the auto-reply's at the owner", async () => {
    await submit();

    // Getting these backwards silently breaks every reply.
    expect(mocks.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        from: CONFIG.from,
        to: CONFIG.to,
        replyTo: VISITOR,
      }),
    );
    expect(mocks.send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        from: CONFIG.from,
        to: VISITOR,
        replyTo: CONFIG.to,
      }),
    );
  });
});

describe("submitContactForm — honeypot", () => {
  it("reports success without sending anything when `company` is filled", async () => {
    const result = await submit(validFields({ company: "Acme Bots Inc" }));

    // The result must be indistinguishable from a real success (don't tip off
    // the bot), but no mail may leave the building.
    expect(result).toEqual({ status: "success", message: en.form.success });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("does not treat a whitespace-only `company` as a bot", async () => {
    const result = await submit(validFields({ company: "   " }));

    expect(result.status).toBe("success");
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it("skips validation entirely when the honeypot trips", async () => {
    const result = await submit({ email: "not-an-email", company: "bot" });

    expect(result).toEqual({ status: "success", message: en.form.success });
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe("submitContactForm — validation", () => {
  it.each([
    {
      name: "malformed email",
      fields: validFields({ email: "not-an-email" }),
      field: "email" as const,
      expected: en.form.invalidEmail,
    },
    {
      name: "message under 10 characters",
      fields: validFields({ message: "too short" }),
      field: "message" as const,
      expected: en.form.messageTooShort,
    },
    {
      name: "message over 5000 characters",
      fields: validFields({ message: "a".repeat(5001) }),
      field: "message" as const,
      expected: en.form.messageTooLong,
    },
    {
      // The schema trims before .min(10), so whitespace never counts as length.
      name: "message of nothing but whitespace",
      fields: validFields({ message: " ".repeat(40) }),
      field: "message" as const,
      expected: en.form.messageTooShort,
    },
  ])("rejects a $name", async ({ fields, field, expected }) => {
    const result = await submit(fields);

    expect(result.status).toBe("error");
    expect(result.message).toBe(en.form.errorFields);
    expect(result.fieldErrors?.[field]).toContain(expected);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects a submission with no message field at all", async () => {
    const result = await submit({ email: VISITOR });

    expect(result.status).toBe("error");
    expect(result.message).toBe(en.form.errorFields);
    expect(result.fieldErrors?.message?.length).toBeGreaterThan(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("accepts a message of exactly 10 characters after trimming", async () => {
    const result = await submit(validFields({ message: "  abcdefghij  " }));

    expect(result.status).toBe("success");
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });
});

describe("submitContactForm — rate limit", () => {
  it("allows 5 submissions per IP and rejects the 6th", async () => {
    const action = await loadAction();

    for (let i = 0; i < 5; i++) {
      const ok = await action(IDLE, formData(validFields()));
      expect(ok.status).toBe("success");
    }

    const blocked = await action(IDLE, formData(validFields()));

    expect(blocked).toEqual({
      status: "error",
      message: en.form.errorRateLimit,
    });
    expect(mocks.send).toHaveBeenCalledTimes(10); // 5 × (notification + reply)
  });

  it("does not limit a different IP because of the first IP's hits", async () => {
    const action = await loadAction();

    for (let i = 0; i < 6; i++) {
      setIp("198.51.100.1");
      await action(IDLE, formData(validFields()));
    }

    setIp("198.51.100.2");
    const other = await action(IDLE, formData(validFields()));

    expect(other.status).toBe("success");
  });

  it("keys off the first entry of a multi-hop x-forwarded-for chain", async () => {
    const action = await loadAction();

    for (let i = 0; i < 5; i++) {
      setIp("203.0.113.9, 70.41.3.18, 150.172.238.178");
      await action(IDLE, formData(validFields()));
    }

    setIp("203.0.113.9");
    const blocked = await action(IDLE, formData(validFields()));

    expect(blocked.message).toBe(en.form.errorRateLimit);
  });

  it("still works when x-forwarded-for is absent", async () => {
    setIp(null);

    const result = await submit();

    expect(result.status).toBe("success");
  });

  it("does not count invalid submissions against the limit", async () => {
    const action = await loadAction();

    for (let i = 0; i < 10; i++) {
      await action(IDLE, formData(validFields({ email: "nope" })));
    }
    const result = await action(IDLE, formData(validFields()));

    expect(result.status).toBe("success");
  });
});

describe("submitContactForm — not configured", () => {
  it("returns the fallback address when there is no API key", async () => {
    mocks.getContactConfig.mockReturnValue({ ...CONFIG, apiKey: undefined });

    const result = await submit();

    expect(result).toEqual({
      status: "error",
      message: `${en.form.errorNotConfigured} ${siteConfig.contactEmail}.`,
    });
    expect(mocks.resendCtor).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe("submitContactForm — delivery failures", () => {
  const sendFailed = `${en.form.errorSendFailed} ${siteConfig.contactEmail}.`;

  it("reports failure when Resend returns an error object", async () => {
    mocks.send.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", message: "domain not verified" },
    });

    const result = await submit();

    expect(result).toEqual({ status: "error", message: sendFailed });
    expect(mocks.send).toHaveBeenCalledTimes(1); // no auto-reply after a failure
  });

  it("reports failure without crashing when Resend throws", async () => {
    mocks.send.mockRejectedValueOnce(new Error("ECONNRESET"));

    const result = await submit();

    expect(result).toEqual({ status: "error", message: sendFailed });
  });

  it("reports failure when the Resend constructor throws", async () => {
    mocks.resendCtor.mockImplementationOnce(function () {
      throw new Error("Missing API key");
    });

    const result = await submit();

    expect(result).toEqual({ status: "error", message: sendFailed });
  });

  it("still succeeds when the best-effort auto-reply throws", async () => {
    mocks.send
      .mockResolvedValueOnce({ data: { id: "msg_1" }, error: null })
      .mockRejectedValueOnce(new Error("recipient bounced"));

    const result = await submit();

    // The lead already reached the inbox — the confirmation is non-critical.
    expect(result).toEqual({ status: "success", message: en.form.success });
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it("still succeeds when the auto-reply returns an error object", async () => {
    mocks.send
      .mockResolvedValueOnce({ data: { id: "msg_1" }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { name: "not_found", message: "nope" },
      });

    const result = await submit();

    expect(result).toEqual({ status: "success", message: en.form.success });
  });
});

// The site is English-only. The three cases that asserted Russian responses,
// Russian validation errors and a Russian rate-limit message were deleted with
// the locale, not disabled — they covered behaviour that no longer exists. The
// fallback cases below are what still matters: the hidden `locale` field is
// visitor-supplied, so every value that is not a live locale must land on English.
describe("submitContactForm — locale", () => {
  it.each([
    { name: "a retired locale", fields: validFields({ locale: "ru" }) },
    { name: "an unknown locale", fields: validFields({ locale: "de" }) },
    { name: "an absent locale", fields: validFields() },
    { name: "an empty locale", fields: validFields({ locale: "" }) },
  ])("falls back to English for $name", async ({ fields }) => {
    const result = await submit(fields);

    expect(result.message).toBe(en.form.success);
  });
});
