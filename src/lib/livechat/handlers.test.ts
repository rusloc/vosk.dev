import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TelegramError } from "./telegram";

// The live chat's routes with the database and Telegram replaced: an in-memory store with the same contract as
// store.ts (a per-conversation lock that serialises callers, one row per Telegram group + message id, the open-
// conversation counts) and a bot whose calls are recorded. Only Date is faked, so the 2-second limit can be stepped
// over. What only Postgres can prove (the real row lock, the advisory lock) is in 001-schema-and-roles.sql, G and H.

type Conv = {
  id: string;
  tokenHash: string;
  chatId: number | null;
  threadId: number | null;
  label: string;
  email: string | null;
  emailChanges: number;
  firstPageUrl: string | null;
  referrer: string | null;
  country: string | null;
  ipHash: string;
  status: "open" | "closed" | "blocked";
  lastSendAt: Date | null;
  hourStart: Date | null;
  hourCount: number;
};
type Msg = {
  id: number;
  conversationId: string;
  direction: string;
  body: string;
  createdAt: string;
  delivered: boolean;
  chatId: string | null;
  telegramMessageId: number | null;
};
type SendState = Pick<Conv, "lastSendAt" | "hourStart" | "hourCount">;

const h = vi.hoisted(() => ({
  convs: [] as Conv[],
  msgs: [] as Msg[],
  siteExtra: 0,
  busy: false,
  locks: new Map<string, Promise<unknown>>(),
  bot: {
    createTopic: undefined as unknown as import("vitest").Mock,
    send: undefined as unknown as import("vitest").Mock,
  },
}));

const view = (m: Msg) => ({
  id: m.id,
  direction: m.direction,
  body: m.body,
  createdAt: m.createdAt,
  delivered: m.delivered,
});
const conv = (id: string) => h.convs.find((c) => c.id === id)!;
const visitorInsert = (id: string, body: string) => {
  const m: Msg = {
    id: h.msgs.length + 1,
    conversationId: id,
    direction: "visitor",
    body,
    createdAt: new Date(0).toISOString(),
    delivered: false,
    chatId: null,
    telegramMessageId: null,
  };
  h.msgs.push(m);
  return view(m);
};

vi.mock("./db", () => ({
  withDb: async (_url: string, fn: (sql: unknown) => unknown) => fn({}),
}));

vi.mock("./telegram", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./telegram")>()),
  telegramBot: () => h.bot,
}));

vi.mock("./store", () => ({
  isBusy: (e: unknown) => (e as { code?: string })?.code === "55P03",
  findConversation: async (_: unknown, hash: string) => {
    const c = h.convs.find((x) => x.tokenHash === hash);
    return c ? { ...c } : null;
  },
  withConversation: async (
    _: unknown,
    hash: string,
    fn: (tx: unknown, c: Conv | null) => Promise<unknown>,
  ) => {
    if (h.busy)
      throw Object.assign(new Error("lock timeout"), { code: "55P03" });
    const prev = h.locks.get(hash) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((r) => (release = r));
    h.locks.set(
      hash,
      prev.then(() => mine),
    );
    await prev;
    try {
      const c = h.convs.find((x) => x.tokenHash === hash);
      return await fn({}, c ? { ...c } : null);
    } finally {
      release();
    }
  },
  openConversation: async (
    _: unknown,
    c: Omit<
      Conv,
      | "id"
      | "chatId"
      | "threadId"
      | "email"
      | "emailChanges"
      | "status"
      | keyof SendState
    > & {
      send: SendState;
    },
    body: string,
  ) => {
    const perIp = h.convs.filter((x) => x.ipHash === c.ipHash).length;
    const site = h.convs.length + h.siteExtra;
    if (perIp >= 5 || site >= 50) return "limited";
    const { send, ...rest } = c;
    const row: Conv = {
      id: `c${h.convs.length + 1}`,
      chatId: null,
      threadId: null,
      email: null,
      emailChanges: 0,
      status: "open",
      ...rest,
      ...send,
    };
    h.convs.push(row);
    return { conversation: { ...row }, message: visitorInsert(row.id, body) };
  },
  recordSend: async (
    _: unknown,
    id: string,
    s: SendState,
    { reopen }: { reopen: boolean },
  ) => {
    const c = conv(id);
    Object.assign(c, s);
    if (reopen && c.status === "closed") c.status = "open";
  },
  insertVisitorMessage: vi.fn(async (_: unknown, id: string, body: string) =>
    visitorInsert(id, body),
  ),
  findVisitorMessage: async (_: unknown, convId: string, id: number) => {
    const m = h.msgs.find(
      (x) =>
        x.id === id && x.conversationId === convId && x.direction === "visitor",
    );
    return m ? view(m) : null;
  },
  markDelivered: async (_: unknown, id: number, chatId: string, tg: number) => {
    Object.assign(
      h.msgs.find((x) => x.id === id)!,
      {
        delivered: true,
        chatId,
        telegramMessageId: tg,
      },
    );
  },
  listMessages: async (_: unknown, convId: string, after: number) =>
    h.msgs.filter((m) => m.conversationId === convId && m.id > after).map(view),
  setTopic: async (_: unknown, id: string, chatId: string, t: number) => {
    Object.assign(conv(id), { chatId: Number(chatId), threadId: t });
  },
  setEmail: async (
    _: unknown,
    id: string,
    email: string,
    notified: boolean,
  ) => {
    const c = conv(id);
    c.email = email;
    if (notified) c.emailChanges++;
  },
  findConversationByThread: async (_: unknown, chatId: string, t: number) => {
    const c = h.convs.find(
      (x) => String(x.chatId) === chatId && x.threadId === t,
    );
    return c ? { ...c } : null;
  },
  setStatus: async (_: unknown, id: string, s: Conv["status"]) => {
    conv(id).status = s;
  },
  insertOwnerMessage: async (
    _: unknown,
    id: string,
    body: string,
    chatId: string,
    tg: number,
  ) => {
    if (h.msgs.some((m) => m.chatId === chatId && m.telegramMessageId === tg))
      return false; // on conflict do nothing
    h.msgs.push({
      id: h.msgs.length + 1,
      conversationId: id,
      direction: "owner",
      body,
      createdAt: new Date(0).toISOString(),
      delivered: true,
      chatId,
      telegramMessageId: tg,
    });
    return true;
  },
}));

const { getMessages, postEmail, postMessage, telegramWebhook } =
  await import("./handlers");
const store = await import("./store");

const SECRET = "w".repeat(40);
const CHAT = "-1001234567890";
const SITE = "https://vosk.dev";
const COOKIE = "__Host-vosk_chat";
const logs: string[] = [];
/** Steps the clock past the 2-second gap. */
const later = (ms = 2500) => vi.setSystemTime(Date.now() + ms);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-27T10:00:00Z"));
  h.convs.length = 0;
  h.msgs.length = 0;
  h.siteExtra = 0;
  h.busy = false;
  h.locks.clear();
  let thread = 100;
  let tgId = 1000;
  h.bot.createTopic = vi.fn(async () => ++thread);
  h.bot.send = vi.fn(async () => ++tgId);
  vi.mocked(store.insertVisitorMessage).mockClear();
  vi.stubEnv(
    "LIVECHAT_DATABASE_URL",
    "postgres://u:p@db.example:5432/postgres",
  );
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  vi.stubEnv("TELEGRAM_CHAT_ID", CHAT);
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("TELEGRAM_ALLOWED_USER_IDS", "42, 7,");
  vi.stubEnv("CHAT_IP_HASH_SALT", "a-salt-of-16-chars");
  logs.length = 0;
  const capture = (...args: unknown[]) => void logs.push(args.join(" "));
  vi.spyOn(console, "log").mockImplementation(capture);
  vi.spyOn(console, "error").mockImplementation(capture);
  vi.spyOn(console, "warn").mockImplementation(capture);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const send = (
  body: Record<string, unknown>,
  {
    cookie,
    origin = SITE,
    ip = "203.0.113.7",
  }: { cookie?: string; origin?: string | null; ip?: string } = {},
) =>
  postMessage(
    new Request(`${SITE}/api/livechat/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-vercel-ip-country": "DE",
        "x-forwarded-for": ip,
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile",
        ...(origin ? { origin } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
const msg = (text: string, extra: Record<string, unknown> = {}) => ({
  text,
  pageUrl: `${SITE}/services?utm_source=ad#top`,
  website: "",
  ...extra,
});
const cookieOf = (res: Response) =>
  res.headers.get("set-cookie")!.split(";")[0]!;

/** A first message; returns the visitor's cookie. */
async function start(text = "Hello", ip?: string) {
  const res = await send(msg(text), { ip });
  expect(res.status).toBe(200);
  later();
  return cookieOf(res);
}

const poll = (cookie?: string, after?: string) =>
  getMessages(
    new Request(
      `${SITE}/api/livechat/messages${after === undefined ? "" : `?after=${after}`}`,
      { headers: cookie ? { cookie } : {} },
    ),
  );

const email = (body: unknown, cookie?: string, origin: string | null = SITE) =>
  postEmail(
    new Request(`${SITE}/api/livechat/email`, {
      method: "POST",
      headers: {
        ...(origin ? { origin } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );

const hook = (update: unknown, secret: string | null = SECRET) =>
  telegramWebhook(
    new Request(`${SITE}/api/telegram/webhook`, {
      method: "POST",
      headers:
        secret === null ? {} : { "x-telegram-bot-api-secret-token": secret },
      body: JSON.stringify(update),
    }),
  );
const ownerUpdate = (
  thread: number,
  messageId: number,
  extra: Record<string, unknown> = {},
) => ({
  update_id: messageId,
  message: {
    message_id: messageId,
    message_thread_id: thread,
    chat: { id: Number(CHAT), type: "supergroup", is_forum: true },
    from: { id: 42, is_bot: false },
    text: "Thanks, I'll look",
    ...extra,
  },
});
const owner = () => h.msgs.filter((m) => m.direction === "owner");

describe("off until configured", () => {
  it("answers 404 on every route while a variable is missing", async () => {
    vi.stubEnv("TELEGRAM_ALLOWED_USER_IDS", "");
    expect((await send(msg("hi"))).status).toBe(404);
    expect((await poll()).status).toBe(404);
    expect((await hook({})).status).toBe(404);
    expect(h.convs).toHaveLength(0);
  });

  it("answers 404 (and does not throw) while a variable is malformed or the salt is short", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", "not-a-number");
    expect((await send(msg("hi"))).status).toBe(404);
    vi.stubEnv("TELEGRAM_CHAT_ID", CHAT);
    vi.stubEnv("CHAT_IP_HASH_SALT", "short");
    expect((await email({ email: "a@b.co" })).status).toBe(404);
    expect(logs.join("\n")).not.toContain("not-a-number");
  });
});

describe("POST /api/livechat/messages", () => {
  it("first message: one conversation, the __Host- cookie, one topic with the context, then the text", async () => {
    const res = await send(msg("  Hello <b>*_ \n"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const set = res.headers.get("set-cookie")!;
    expect(set).toMatch(
      /^__Host-vosk_chat=[\w-]{43}; Path=\/; Max-Age=7776000; HttpOnly; Secure; SameSite=Lax$/,
    );
    const { message } = await res.json();
    expect(message).toMatchObject({
      direction: "visitor",
      body: "Hello <b>*_",
      delivered: true,
    });

    expect(h.convs).toHaveLength(1);
    expect(h.convs[0]).toMatchObject({
      country: "DE",
      firstPageUrl: `${SITE}/services`, // origin + path only
      chatId: Number(CHAT),
      threadId: 101,
      label: expect.stringMatching(/^Visitor [0-9A-F]{8}$/),
      hourCount: 1,
    });
    expect(h.convs[0]!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(h.bot.createTopic).toHaveBeenCalledTimes(1);
    expect(h.bot.createTopic).toHaveBeenCalledWith(h.convs[0]!.label);
    const sends = h.bot.send.mock.calls;
    expect(sends).toHaveLength(2);
    expect(sends[0]![1]).toContain(`Page: ${SITE}/services`);
    expect(sends[0]![1]).toContain("Country: DE");
    expect(sends[0]![1]).toContain("Device: Mobile, iOS");
    expect(sends[1]).toEqual([101, "Hello <b>*_"]);
    expect(h.msgs[0]).toMatchObject({ chatId: CHAT, telegramMessageId: 1002 });
  });

  it("keeps the page only when it is on this host; the referrer as origin + path", async () => {
    await send(
      msg("hi", {
        pageUrl: "https://evil.example/x",
        referrer: "https://www.google.com/search?q=x",
      }),
    );
    expect(h.convs[0]).toMatchObject({
      firstPageUrl: null,
      referrer: "https://www.google.com/search",
    });
  });

  it("second message: same topic, the cookie refreshed with the same token", async () => {
    const cookie = await start();
    const res = await send(msg("Again"), { cookie });
    expect(res.status).toBe(200);
    expect(cookieOf(res)).toBe(cookie);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=7776000");
    expect(h.convs).toHaveLength(1);
    expect(h.bot.createTopic).toHaveBeenCalledTimes(1);
    expect(h.bot.send).toHaveBeenLastCalledWith(101, "Again");
  });

  it("two browsers: two conversations, two topics", async () => {
    await start("A");
    await start("B");
    expect(h.convs.map((c) => c.threadId)).toEqual([101, 102]);
  });

  it("an unknown cookie starts a new conversation with a new cookie", async () => {
    const res = await send(msg("hi"), {
      cookie: `${COOKIE}=${"a".repeat(43)}`,
    });
    expect(res.status).toBe(200);
    expect(cookieOf(res)).not.toBe(`${COOKIE}=${"a".repeat(43)}`);
  });

  it.each([
    ["no Origin", null],
    ["another site", "https://evil.example"],
  ])("403 with %s, before any write", async (_, origin) => {
    const res = await send(msg("hi"), { origin });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
    expect(h.convs).toHaveLength(0);
  });

  it("403 when the honeypot is filled", async () => {
    expect((await send(msg("hi", { website: "spam.example" }))).status).toBe(
      403,
    );
    expect(h.convs).toHaveLength(0);
  });

  it.each([
    ["2001 characters", msg("x".repeat(2001))],
    ["empty text", msg("   ")],
    ["zero-width text only", msg("\u200B\u200D\uFEFF")],
    ["a NUL", msg("hi\u0000")],
    ["a control character", msg("a\u001Bb")],
    ["an unknown field", msg("hi", { conversationId: "c1" })],
  ])("400 on %s, and no conversation is opened", async (_, body) => {
    const res = await send(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid" });
    expect(h.convs).toHaveLength(0);
  });

  it("400 on a body that is not JSON; 2000 characters are fine", async () => {
    const bad = await postMessage(
      new Request(`${SITE}/api/livechat/messages`, {
        method: "POST",
        headers: { origin: SITE },
        body: "{not json",
      }),
    );
    expect(bad.status).toBe(400);
    expect((await send(msg(`  ${"x".repeat(2000)}  `))).status).toBe(200);
  });

  it("429 on a second send within 2 seconds, nothing stored", async () => {
    const res1 = await send(msg("one"));
    const cookie = cookieOf(res1);
    const res = await send(msg("two"), { cookie });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "slow_down" });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(h.msgs).toHaveLength(1);
  });

  it("429 on the 31st send in an hour", async () => {
    const cookie = await start();
    for (let i = 2; i <= 30; i++) {
      expect((await send(msg(`m${i}`), { cookie })).status).toBe(200);
      later();
    }
    expect((await send(msg("m31"), { cookie })).status).toBe(429);
    later(60 * 60 * 1000);
    expect((await send(msg("next hour"), { cookie })).status).toBe(200);
  });

  it("parallel sends of one visitor go one at a time: the second gets 429", async () => {
    const cookie = await start();
    const [a, b] = await Promise.all([
      send(msg("x"), { cookie }),
      send(msg("y"), { cookie }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 429]);
    expect(h.msgs).toHaveLength(2);
  });

  it("429 when another send holds the conversation (lock timeout)", async () => {
    const cookie = await start();
    h.busy = true;
    expect((await send(msg("x"), { cookie })).status).toBe(429);
  });

  it("429 on a 6th new conversation from one IP in a day, and no cookie", async () => {
    for (let i = 0; i < 5; i++) await start(`c${i}`);
    const res = await send(msg("hi"));
    expect(res.status).toBe(429);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(h.convs).toHaveLength(5);
    expect((await send(msg("hi"), { ip: "198.51.100.1" })).status).toBe(200);
  });

  it("429 once the site has 50 new conversations in the hour, from any IP", async () => {
    h.siteExtra = 50;
    expect((await send(msg("hi"), { ip: "198.51.100.2" })).status).toBe(429);
    expect(h.convs).toHaveLength(0);
  });

  it("403 for a blocked conversation", async () => {
    const cookie = await start();
    h.convs[0]!.status = "blocked";
    expect((await send(msg("hi"), { cookie })).status).toBe(403);
    expect(h.msgs).toHaveLength(1);
  });

  it("a closed conversation opens again on the next message, same topic", async () => {
    const cookie = await start();
    h.convs[0]!.status = "closed";
    expect((await send(msg("back"), { cookie })).status).toBe(200);
    expect(h.convs[0]!.status).toBe("open");
    expect(h.bot.createTopic).toHaveBeenCalledTimes(1);
  });

  it("502 with the stored message when Telegram fails; the cookie is still set", async () => {
    h.bot.send.mockRejectedValue(
      new TelegramError("sendMessage", 500, "Internal"),
    );
    const res = await send(msg("Hello"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toMatchObject({
      error: "telegram",
      message: { body: "Hello", delivered: false },
    });
    expect(res.headers.get("set-cookie")).toMatch(/^__Host-vosk_chat=/);
    expect(h.msgs).toHaveLength(1);
    expect(h.msgs[0]!.delivered).toBe(false);
  });

  /** A first message whose delivery failed; returns the cookie and the stored message id. */
  async function undelivered() {
    h.bot.send.mockRejectedValueOnce(
      new TelegramError("sendMessage", 500, "x"),
    ); // the context message
    h.bot.send.mockRejectedValueOnce(
      new TelegramError("sendMessage", 500, "x"),
    ); // the text
    const first = await send(msg("Hello"));
    expect(first.status).toBe(502);
    later();
    return { cookie: cookieOf(first), id: (await first.json()).message.id };
  }

  it("retryOf re-sends the own undelivered message without a new row", async () => {
    const { cookie, id } = await undelivered();
    const res = await send(msg("Hello", { retryOf: id }), { cookie });
    expect(res.status).toBe(200);
    expect((await res.json()).message).toMatchObject({ id, delivered: true });
    expect(store.insertVisitorMessage).not.toHaveBeenCalled(); // the first went in with the conversation
    expect(h.msgs).toHaveLength(1);
    expect(h.bot.createTopic).toHaveBeenCalledTimes(1);
  });

  it("retries count toward the limit, and parallel retries deliver once", async () => {
    const { cookie, id } = await undelivered();
    const texts = () =>
      h.bot.send.mock.calls.filter((c) => c[1] === "Hello").length;
    const before = texts();
    const [a, b] = await Promise.all([
      send(msg("Hello", { retryOf: id }), { cookie }),
      send(msg("Hello", { retryOf: id }), { cookie }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 429]);
    expect(texts() - before).toBe(1);
    later();
    // already delivered (re-read under the lock): 200, nothing sent
    const again = await send(msg("Hello", { retryOf: id }), { cookie });
    expect(again.status).toBe(200);
    expect(texts() - before).toBe(1);
  });

  it("a retry on a closed conversation opens it again", async () => {
    const { cookie, id } = await undelivered();
    h.convs[0]!.status = "closed";
    expect((await send(msg("Hello", { retryOf: id }), { cookie })).status).toBe(
      200,
    );
    expect(h.convs[0]!.status).toBe("open");
  });

  it("retryOf of another conversation's message, or without a conversation, is 400", async () => {
    const a = await start("mine", "198.51.100.3");
    await start("theirs", "198.51.100.4");
    expect((await send(msg("x", { retryOf: 2 }), { cookie: a })).status).toBe(
      400,
    );
    expect((await send(msg("x", { retryOf: 1 }))).status).toBe(400);
  });

  it("a deleted topic: a new topic is made, saved, and the message delivered (once)", async () => {
    const cookie = await start();
    h.bot.send.mockRejectedValueOnce(
      new TelegramError(
        "sendMessage",
        400,
        "Bad Request: message thread not found",
      ),
    );
    const res = await send(msg("Still there?"), { cookie });
    expect(res.status).toBe(200);
    expect(h.bot.createTopic).toHaveBeenCalledTimes(2);
    expect(h.convs[0]!.threadId).toBe(102);
    expect(h.bot.send).toHaveBeenLastCalledWith(102, "Still there?");
  });

  it("a changed TELEGRAM_CHAT_ID: a new topic in the new group, and old-group replies no longer match", async () => {
    const cookie = await start();
    vi.stubEnv("TELEGRAM_CHAT_ID", "-1009999999999");
    expect((await send(msg("moved"), { cookie })).status).toBe(200);
    expect(h.convs[0]).toMatchObject({ chatId: -1009999999999, threadId: 102 });
    expect(h.bot.createTopic).toHaveBeenCalledTimes(2);
    // a reply in thread 101 of the new group belongs to no conversation
    await hook({
      ...ownerUpdate(101, 5),
      message: {
        ...ownerUpdate(101, 5).message,
        chat: { id: -1009999999999, type: "supergroup" },
      },
    });
    expect(owner()).toHaveLength(0);
  });

  it("logs no message text and no token", async () => {
    const res = await send(msg("my secret plan"));
    const token = cookieOf(res).split("=")[1]!;
    expect(logs.join("\n")).not.toContain("secret plan");
    expect(logs.join("\n")).not.toContain(token);
    expect(logs.join("\n")).toContain(h.convs[0]!.id);
  });
});

describe("GET /api/livechat/messages", () => {
  it("no cookie: no conversation", async () => {
    const res = await poll();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      messages: [],
      status: null,
      hasEmail: false,
    });
  });

  it("the old cookie name is not read", async () => {
    await start();
    const token = "x".repeat(43);
    expect(await (await poll(`vosk_chat=${token}`)).json()).toMatchObject({
      status: null,
    });
  });

  it("returns the visitor's own messages after the cursor, the status and hasEmail", async () => {
    const a = await start("mine", "198.51.100.5");
    await start("theirs", "198.51.100.6");
    await send(msg("second"), { cookie: a });
    const all = await (await poll(a)).json();
    expect(all.status).toBe("open");
    expect(all.hasEmail).toBe(false);
    expect(all.messages.map((m: { body: string }) => m.body)).toEqual([
      "mine",
      "second",
    ]);
    const after = await (await poll(a, String(all.messages[0].id))).json();
    expect(after.messages.map((m: { body: string }) => m.body)).toEqual([
      "second",
    ]);
  });

  it("400 on a bad cursor", async () => {
    expect((await poll(undefined, "-1")).status).toBe(400);
    expect((await poll(undefined, "1e3")).status).toBe(400);
  });
});

describe("POST /api/livechat/email", () => {
  it("stores it, posts it in the topic once, and the poll reports hasEmail", async () => {
    const cookie = await start();
    const res = await email({ email: "ann@example.com" }, cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(h.bot.send).toHaveBeenLastCalledWith(
      101,
      "Visitor left an email: ann@example.com",
    );
    const calls = h.bot.send.mock.calls.length;
    later();
    await email({ email: "ann@example.com" }, cookie); // unchanged: not posted again
    expect(h.bot.send.mock.calls.length).toBe(calls);
    expect((await (await poll(cookie)).json()).hasEmail).toBe(true);
    expect(logs.join("\n")).not.toContain("ann@example.com");
  });

  it("is under the per-conversation limit: a second email within 2 s is 429", async () => {
    const cookie = await start();
    expect((await email({ email: "a@example.com" }, cookie)).status).toBe(200);
    expect((await email({ email: "b@example.com" }, cookie)).status).toBe(429);
    expect(h.convs[0]!.email).toBe("a@example.com");
  });

  it("posts at most 3 changes in the topic; later ones are stored silently", async () => {
    const cookie = await start();
    for (const e of ["a@x.co", "b@x.co", "c@x.co", "d@x.co", "e@x.co"]) {
      expect((await email({ email: e }, cookie)).status).toBe(200);
      later();
    }
    const posted = h.bot.send.mock.calls.filter((c) =>
      String(c[1]).startsWith("Visitor left an email"),
    );
    expect(posted).toHaveLength(3);
    expect(h.convs[0]).toMatchObject({ email: "e@x.co", emailChanges: 3 });
  });

  it("404 without a conversation, 400 on a bad email or field, 403 on a bad Origin or a block", async () => {
    expect((await email({ email: "ann@example.com" })).status).toBe(404);
    const cookie = await start();
    expect((await email({ email: "not-an-email" }, cookie)).status).toBe(400);
    expect((await email({ email: "a@b.co", x: 1 }, cookie)).status).toBe(400);
    expect((await email({ email: "a@b.co" }, cookie, null)).status).toBe(403);
    h.convs[0]!.status = "blocked";
    expect((await email({ email: "a@b.co" }, cookie)).status).toBe(403);
  });
});

describe("POST /api/telegram/webhook", () => {
  it("401 on a wrong or missing secret, and stores nothing", async () => {
    await start();
    for (const secret of [null, "x".repeat(40), `${SECRET}x`]) {
      const res = await hook(ownerUpdate(101, 5), secret);
      expect(res.status).toBe(401);
    }
    expect(owner()).toHaveLength(0);
  });

  it("relays the owner's text to the visitor's poll", async () => {
    const cookie = await start();
    const res = await hook(ownerUpdate(101, 5));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
    const { messages } = await (await poll(cookie)).json();
    expect(messages.at(-1)).toMatchObject({
      direction: "owner",
      body: "Thanks, I'll look",
      delivered: true,
    });
  });

  it("the same update twice stores one message", async () => {
    await start();
    expect((await hook(ownerUpdate(101, 5))).status).toBe(200);
    expect((await hook(ownerUpdate(101, 5))).status).toBe(200);
    expect(owner()).toHaveLength(1);
  });

  it("ignores, with 200, a user outside the allowlist, another chat and an unknown topic", async () => {
    await start();
    for (const u of [
      ownerUpdate(101, 6, { from: { id: 99, is_bot: false } }),
      ownerUpdate(101, 7, { chat: { id: -100999, type: "supergroup" } }),
      ownerUpdate(555, 8),
    ])
      expect((await hook(u)).status).toBe(200);
    expect(owner()).toHaveLength(0);
  });

  it("/close closes and /block blocks, neither is relayed", async () => {
    const cookie = await start();
    await hook(ownerUpdate(101, 10, { text: "/close" }));
    expect(h.convs[0]!.status).toBe("closed");
    expect((await (await poll(cookie)).json()).status).toBe("closed");
    await hook(ownerUpdate(101, 11, { text: "/block" }));
    expect(h.convs[0]!.status).toBe("blocked");
    expect(owner()).toHaveLength(0);
    expect((await send(msg("hi"), { cookie })).status).toBe(403);
  });

  it("another command is not relayed; the owner is told in the topic", async () => {
    await start();
    await hook(ownerUpdate(101, 13, { text: "/clsoe" }));
    expect(owner()).toHaveLength(0);
    expect(h.bot.send).toHaveBeenLastCalledWith(
      101,
      "Unknown command; the visitor did not receive this.",
    );
  });

  it("a photo gets the text-only reply in the topic and is not relayed", async () => {
    await start();
    await hook(ownerUpdate(101, 12, { text: undefined, photo: [{}] }));
    expect(h.bot.send).toHaveBeenLastCalledWith(
      101,
      "Text only for now; the visitor did not receive this.",
    );
    expect(owner()).toHaveLength(0);
  });

  it("200 on a body that is not JSON (after the secret)", async () => {
    const res = await telegramWebhook(
      new Request(`${SITE}/api/telegram/webhook`, {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": SECRET },
        body: "nope",
      }),
    );
    expect(res.status).toBe(200);
  });
});
