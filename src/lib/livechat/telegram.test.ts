import { afterEach, describe, expect, it, vi } from "vitest";
import {
  botApi,
  isThreadGone,
  telegramBot,
  TelegramError,
  withFloodRetry,
} from "./telegram";

afterEach(() => vi.unstubAllGlobals());

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("botApi", () => {
  it("posts JSON to the method and returns the result", async () => {
    const fetch = vi.fn(async () =>
      reply({ ok: true, result: { message_id: 5 } }),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(botApi("1:t", "sendMessage", { text: "hi" })).resolves.toEqual(
      {
        message_id: 5,
      },
    );
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot1:t/sendMessage");
    expect(JSON.parse(init.body as string)).toEqual({ text: "hi" });
  });

  it("maps an error answer, with retry_after, to TelegramError (no token in the message)", async () => {
    vi.stubGlobal("fetch", async () =>
      reply(
        {
          ok: false,
          error_code: 429,
          description: "Too Many Requests: retry after 2",
          parameters: { retry_after: 2 },
        },
        429,
      ),
    );
    const error = await botApi("1:secret", "sendMessage").catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(TelegramError);
    expect(error).toMatchObject({
      code: 429,
      retryAfter: 2,
      method: "sendMessage",
    });
    expect(String((error as Error).message)).not.toContain("secret");
  });

  it("maps a network failure to code 0", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    await expect(botApi("1:t", "getMe")).rejects.toMatchObject({ code: 0 });
  });
});

describe("telegramBot.send", () => {
  it("sends plain text in the topic: no parse_mode, link previews off", async () => {
    const fetch = vi.fn(async () =>
      reply({ ok: true, result: { message_id: 9 } }),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(
      telegramBot("1:t", "-100").send(7, "<b>*x*</b>"),
    ).resolves.toBe(9);
    const body = JSON.parse(
      (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]
        .body as string,
    );
    expect(body).toEqual({
      chat_id: "-100",
      message_thread_id: 7,
      text: "<b>*x*</b>",
      link_preview_options: { is_disabled: true },
    });
    expect(body).not.toHaveProperty("parse_mode");
  });
});

describe("withFloodRetry", () => {
  const flood = (s: number) => new TelegramError("sendMessage", 429, "", s);

  it("waits a retry_after of 3 s or less, then tries once more", async () => {
    const wait = vi.fn(async () => {});
    const call = vi
      .fn()
      .mockRejectedValueOnce(flood(3))
      .mockResolvedValueOnce(1);
    await expect(withFloodRetry(call, wait)).resolves.toBe(1);
    expect(wait).toHaveBeenCalledWith(3000);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("fails at once on a longer wait or any other error", async () => {
    const wait = vi.fn(async () => {});
    await expect(
      withFloodRetry(vi.fn().mockRejectedValue(flood(4)), wait),
    ).rejects.toMatchObject({ code: 429 });
    await expect(
      withFloodRetry(
        vi.fn().mockRejectedValue(new TelegramError("x", 400, "Bad Request")),
        wait,
      ),
    ).rejects.toMatchObject({ code: 400 });
    expect(wait).not.toHaveBeenCalled();
  });
});

describe("isThreadGone", () => {
  it("knows a deleted topic", () => {
    expect(
      isThreadGone(
        new TelegramError(
          "sendMessage",
          400,
          "Bad Request: message thread not found",
        ),
      ),
    ).toBe(true);
    expect(
      isThreadGone(
        new TelegramError("sendMessage", 400, "Bad Request: TOPIC_DELETED"),
      ),
    ).toBe(true);
    expect(
      isThreadGone(
        new TelegramError("sendMessage", 400, "Bad Request: chat not found"),
      ),
    ).toBe(false);
    expect(isThreadGone(new Error("message thread not found"))).toBe(false);
  });
});
