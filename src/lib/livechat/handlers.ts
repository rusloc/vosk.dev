import "server-only";
import { randomBytes } from "node:crypto";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { isSameOrigin } from "@/lib/same-origin";
import { liveChatConfig, type LiveChatConfig } from "./config";
import {
  contextText,
  countryOf,
  deviceOf,
  pageUrlOf,
  referrerOf,
} from "./context";
import { withDb } from "./db";
import { cleanText, ipHash, LIMITS, takeSend } from "./limits";
import * as store from "./store";
import type { Conversation, Message } from "./store";
import {
  isThreadGone,
  telegramBot,
  TelegramError,
  type TelegramBot,
} from "./telegram";
import { hashToken, newToken, readToken, tokenCookie } from "./token";
import {
  classifyUpdate,
  SECRET_HEADER,
  secretMatches,
  TEXT_ONLY_REPLY,
  UNKNOWN_COMMAND_REPLY,
} from "./webhook";

/**
 * The live chat's route handlers (docs/livechat/README.md "API contract"); the route files only export them. Public
 * and anonymous: every input is checked here, a visitor reaches only the conversation of their own cookie, and the
 * webhook trusts the secret header, the group and the allowlist only. Every visitor write runs under its conversation's
 * row lock (store.ts `withConversation`): the limits, a retry's claim and the topic creation see one request at a time.
 * Logs carry the route, the conversation id, the status and Telegram's error code; never a message, a token, an email
 * or a connection string.
 */

const MAX_BODY = 16_000; // characters of raw JSON

const json = (status: number, body: unknown, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
const notFound = () => json(404, { error: "not_found" });
const invalid = () => json(400, { error: "invalid" });
const forbidden = () => json(403, { error: "forbidden" });
const slowDown = () => json(429, { error: "slow_down" });
const serverError = () => json(500, { error: "server" });

function log(fields: Record<string, unknown>, error?: unknown) {
  const tg =
    error instanceof TelegramError
      ? { tg: error.code, method: error.method }
      : error instanceof Error
        ? { error: error.constructor.name }
        : {};
  const line = JSON.stringify({ livechat: true, ...fields, ...tg });
  if (error) console.error(line);
  else console.log(line);
}

/** The body as `schema` parses it, or null (too long, not JSON, or not the shape). */
async function readBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<T | null> {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The settings and the bot for a request; null while the chat is off (unset or malformed: 404). */
function setup(): { cfg: LiveChatConfig; bot: TelegramBot } | null {
  const cfg = liveChatConfig();
  return cfg ? { cfg, bot: telegramBot(cfg.botToken, cfg.chatId) } : null;
}

type Ctx = { cfg: LiveChatConfig; bot: TelegramBot; device: string };

/** A new topic for the conversation, saved with its group, and the context message at its top. */
async function newTopic(
  tx: TransactionSql,
  ctx: Ctx,
  conv: Conversation,
  recreated: boolean,
): Promise<number> {
  const thread = await ctx.bot.createTopic(conv.label);
  await store.setTopic(tx, conv.id, ctx.cfg.chatId, thread);
  try {
    await ctx.bot.send(
      thread,
      contextText({
        label: conv.label,
        pageUrl: conv.firstPageUrl,
        referrer: conv.referrer,
        country: conv.country,
        device: ctx.device,
        email: conv.email,
        recreated,
      }),
    );
  } catch (error) {
    log({ conv: conv.id, step: "context" }, error); // the visitor's text still goes
  }
  return thread;
}

/**
 * Sends `text` to the conversation's topic; returns Telegram's message id. Called under the conversation's row lock,
 * so a topic is made at most once: when there is none, when it is in another group (TELEGRAM_CHAT_ID changed), or
 * once more when Telegram reports it deleted.
 */
async function deliver(
  tx: TransactionSql,
  ctx: Ctx,
  conv: Conversation,
  text: string,
): Promise<number> {
  const usable =
    conv.threadId !== null && String(conv.chatId) === ctx.cfg.chatId;
  const thread = usable
    ? conv.threadId!
    : await newTopic(tx, ctx, conv, conv.threadId !== null);
  try {
    return await ctx.bot.send(thread, text);
  } catch (error) {
    if (!isThreadGone(error)) throw error;
    const fresh = await newTopic(tx, ctx, conv, true);
    return ctx.bot.send(fresh, text);
  }
}

/** Delivers a stored visitor message and answers the widget: 200 delivered, or 502 with the message as stored. */
async function deliverMessage(
  tx: TransactionSql,
  ctx: Ctx,
  conv: Conversation,
  message: Message,
  headers: HeadersInit,
  retry: boolean,
): Promise<Response> {
  try {
    const tgId = await deliver(tx, ctx, conv, message.body);
    await store.markDelivered(tx, message.id, ctx.cfg.chatId, tgId);
  } catch (error) {
    log({ route: "messages.post", conv: conv.id, status: 502 }, error);
    return json(502, { error: "telegram", message }, headers);
  }
  log({ route: "messages.post", conv: conv.id, status: 200, retry });
  return json(200, { message: { ...message, delivered: true } }, headers);
}

// ---------------------------------------------------------------------------
// GET /api/livechat/messages?after=<id>
// ---------------------------------------------------------------------------
const NO_CONVERSATION = { messages: [], status: null, hasEmail: false };

export async function getMessages(req: Request): Promise<Response> {
  const s = setup();
  if (!s) return notFound();
  const afterParam = new URL(req.url).searchParams.get("after");
  if (afterParam !== null && !/^\d{1,15}$/.test(afterParam)) return invalid();
  const after = Number(afterParam ?? 0);
  const token = readToken(req);
  if (!token) return json(200, NO_CONVERSATION);
  try {
    return await withDb(s.cfg.databaseUrl, async (sql) => {
      const conv = await store.findConversation(sql, hashToken(token));
      if (!conv) return json(200, NO_CONVERSATION);
      const messages = await store.listMessages(sql, conv.id, after);
      return json(200, {
        messages,
        status: conv.status,
        hasEmail: conv.email !== null,
      });
    });
  } catch (error) {
    log({ route: "messages.get", status: 500 }, error);
    return serverError();
  }
}

// ---------------------------------------------------------------------------
// POST /api/livechat/messages
// ---------------------------------------------------------------------------
const postSchema = z
  .object({
    text: z.string().max(MAX_BODY),
    pageUrl: z.string().max(4096),
    /** The honeypot: a person never fills it. */
    website: z.string().max(1000),
    /** An own undelivered message to send again; nothing is inserted. */
    retryOf: z.number().int().positive().optional(),
    /** The page's document.referrer, for the topic's context message (first message only). */
    referrer: z.string().max(4096).optional(),
  })
  .strict();

export async function postMessage(req: Request): Promise<Response> {
  const s = setup();
  if (!s) return notFound();
  if (!isSameOrigin(req)) return forbidden();
  const body = await readBody(req, postSchema);
  if (!body) return invalid();
  if (body.website !== "") return forbidden();
  const retry = body.retryOf;
  // A retry sends the stored text; a new message must have something visible and no control characters.
  const text = retry === undefined ? cleanText(body.text) : "";
  if (text === null) return invalid();

  const ctx: Ctx = {
    cfg: s.cfg,
    bot: s.bot,
    device: deviceOf(req.headers.get("user-agent")),
  };
  const route = "messages.post";
  try {
    return await withDb(s.cfg.databaseUrl, async (sql) => {
      const token = readToken(req);

      // The visitor's conversation, under its row lock: the limits, a retry's claim and the delivery.
      if (token) {
        const refresh = { "Set-Cookie": tokenCookie(token) }; // 90 days from now (on 200 and 502)
        const answer = await store.withConversation(
          sql,
          hashToken(token),
          async (tx, conv) => {
            if (!conv) return null; // unknown or expired token: a new conversation below
            if (conv.status === "blocked") return forbidden();
            const next = takeSend(conv, new Date());
            if (!next) {
              log({ route, conv: conv.id, status: 429, limit: "messages" });
              return slowDown();
            }
            await store.recordSend(tx, conv.id, next, { reopen: true });
            let message: Message;
            if (retry !== undefined) {
              const found = await store.findVisitorMessage(tx, conv.id, retry);
              if (!found) return invalid();
              if (found.delivered)
                return json(200, { message: found }, refresh);
              message = found;
            } else {
              message = await store.insertVisitorMessage(tx, conv.id, text);
            }
            return deliverMessage(
              tx,
              ctx,
              conv,
              message,
              refresh,
              retry !== undefined,
            );
          },
        );
        if (answer) return answer;
      }
      if (retry !== undefined) return invalid();

      // A new conversation and its first message, in one transaction under the open-conversation lock.
      const fresh = newToken();
      const freshHash = hashToken(fresh);
      const now = new Date();
      const opened = await store.openConversation(
        sql,
        {
          tokenHash: freshHash,
          label: `Visitor ${randomBytes(4).toString("hex").toUpperCase()}`,
          firstPageUrl: pageUrlOf(body.pageUrl, req),
          referrer: referrerOf(body.referrer),
          country: countryOf(req),
          ipHash: ipHash(req, s.cfg.ipSalt),
          send: { lastSendAt: now, hourStart: now, hourCount: 1 },
        },
        text,
      );
      if (opened === "limited") {
        log({ route, status: 429, limit: "conversations" });
        return slowDown();
      }
      const cookie = { "Set-Cookie": tokenCookie(fresh) };
      return store.withConversation(sql, freshHash, (tx, conv) =>
        deliverMessage(
          tx,
          ctx,
          conv ?? opened.conversation,
          opened.message,
          cookie,
          false,
        ),
      );
    });
  } catch (error) {
    if (store.isBusy(error)) {
      log({ route, status: 429, limit: "busy" });
      return slowDown();
    }
    log({ route, status: 500 }, error);
    return serverError();
  }
}

// ---------------------------------------------------------------------------
// POST /api/livechat/email
// ---------------------------------------------------------------------------
const emailSchema = z.object({ email: z.email().max(254) }).strict();

export async function postEmail(req: Request): Promise<Response> {
  const s = setup();
  if (!s) return notFound();
  if (!isSameOrigin(req)) return forbidden();
  const body = await readBody(req, emailSchema);
  if (!body) return invalid();
  const token = readToken(req);
  if (!token) return notFound();

  const ctx: Ctx = {
    cfg: s.cfg,
    bot: s.bot,
    device: deviceOf(req.headers.get("user-agent")),
  };
  const route = "email";
  try {
    return await withDb(s.cfg.databaseUrl, (sql) =>
      store.withConversation(sql, hashToken(token), async (tx, conv) => {
        if (!conv) return notFound();
        if (conv.status === "blocked") return forbidden();
        // An email counts as a send: the same 2 s / 30 an hour per conversation.
        const next = takeSend(conv, new Date());
        if (!next) {
          log({ route, conv: conv.id, status: 429 });
          return slowDown();
        }
        await store.recordSend(tx, conv.id, next, { reopen: false });
        if (body.email === conv.email) return json(200, { ok: true });
        const notify = conv.emailChanges < LIMITS.emailNotices;
        await store.setEmail(tx, conv.id, body.email, notify);
        if (notify) {
          try {
            await deliver(
              tx,
              ctx,
              conv,
              `Visitor left an email: ${body.email}`,
            );
          } catch (error) {
            log({ route, conv: conv.id, step: "telegram" }, error); // stored all the same
          }
        }
        log({ route, conv: conv.id, status: 200, notified: notify });
        return json(200, { ok: true });
      }),
    );
  } catch (error) {
    if (store.isBusy(error)) return slowDown();
    log({ route, status: 500 }, error);
    return serverError();
  }
}

// ---------------------------------------------------------------------------
// POST /api/telegram/webhook
// ---------------------------------------------------------------------------
const CLOSED_REPLY =
  "Closed. The visitor sees the chat as closed; their next message opens it again.";
const BLOCKED_REPLY = "Blocked. The visitor can no longer send messages.";

export async function telegramWebhook(req: Request): Promise<Response> {
  const s = setup();
  if (!s) return notFound();
  if (!secretMatches(req.headers.get(SECRET_HEADER), s.cfg.webhookSecret))
    return json(401, {});

  const raw = await req.text();
  let update: unknown;
  try {
    update = JSON.parse(raw);
  } catch {
    return json(200, {});
  }
  const action = classifyUpdate(update, s.cfg);
  if (action.kind === "ignore") return json(200, {});

  const route = "webhook";
  try {
    return await withDb(s.cfg.databaseUrl, async (sql) => {
      const conv = await store.findConversationByThread(
        sql,
        s.cfg.chatId,
        action.threadId,
      );
      if (!conv) return json(200, {});
      const reply = async (text: string) => {
        try {
          await s.bot.send(action.threadId, text);
        } catch (error) {
          log({ route, conv: conv.id, step: "reply" }, error);
        }
      };
      switch (action.kind) {
        case "close":
          await store.setStatus(sql, conv.id, "closed");
          await reply(CLOSED_REPLY);
          break;
        case "block":
          await store.setStatus(sql, conv.id, "blocked");
          await reply(BLOCKED_REPLY);
          break;
        case "non_text":
          await reply(TEXT_ONLY_REPLY);
          break;
        case "unknown_command":
          await reply(UNKNOWN_COMMAND_REPLY);
          break;
        case "relay": {
          const stored = await store.insertOwnerMessage(
            sql,
            conv.id,
            action.text,
            s.cfg.chatId,
            action.messageId,
          );
          log({ route, conv: conv.id, action: "relay", duplicate: !stored });
          return json(200, {});
        }
      }
      log({ route, conv: conv.id, action: action.kind });
      return json(200, {});
    });
  } catch (error) {
    // 500, so Telegram delivers the update again; the unique index keeps a repeat to one row.
    log({ route, status: 500 }, error);
    return json(500, {});
  }
}
