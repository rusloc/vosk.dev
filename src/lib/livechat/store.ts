import "server-only";
import type { Sql, TransactionSql } from "postgres";
import { isConversationLimited, type SendState } from "./limits";

/** The chat's queries over schema `livechat` (data/livechat/sql/001-schema-and-roles.sql), as `livechat_app`. */

export type Status = "open" | "closed" | "blocked";
export type Direction = "visitor" | "owner" | "system";

export type Conversation = SendState & {
  id: string;
  /** The Telegram group the topic is in; a topic in another group (TELEGRAM_CHAT_ID changed) is not used. */
  chatId: number | null;
  threadId: number | null;
  label: string;
  email: string | null;
  /** Email changes posted in the topic so far (at most LIMITS.emailNotices). */
  emailChanges: number;
  firstPageUrl: string | null;
  referrer: string | null;
  country: string | null;
  status: Status;
};

/** The widget's message (docs/livechat/README.md "API contract"). */
export type Message = {
  id: number;
  direction: Direction;
  body: string;
  createdAt: string;
  delivered: boolean;
};

type Db = Sql | TransactionSql;

const CONVERSATION = `id, telegram_chat_id as "chatId", telegram_thread_id as "threadId", label, email,
  email_changes as "emailChanges", first_page_url as "firstPageUrl", referrer, country, status,
  last_send_at as "lastSendAt", hour_start as "hourStart", hour_count as "hourCount"`;
const MESSAGE = `id, direction, body, created_at as "createdAt", delivered`;

const toMessage = (row: Record<string, unknown>): Message => ({
  id: Number(row.id),
  direction: row.direction as Direction,
  body: String(row.body),
  createdAt: new Date(row.createdAt as string | Date).toISOString(),
  delivered: Boolean(row.delivered),
});

/** The lock on a conversation row could not be had within 2 s: another send of this visitor is in flight. */
export const isBusy = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: unknown }).code === "55P03";

/** The visitor's conversation, unlocked (the poll). */
export async function findConversation(
  sql: Db,
  tokenHash: string,
): Promise<Conversation | null> {
  const [row] = await sql.unsafe<Conversation[]>(
    `select ${CONVERSATION} from livechat.chat_conversations where token_hash = $1`,
    [tokenHash],
  );
  return row ?? null;
}

/**
 * Runs `fn` in a transaction holding the visitor's conversation row (`for update`, waiting at most 2 s, then
 * `isBusy`), with the row as it is now, or null when the token matches none. Every visitor write goes through here,
 * so the send limits, a retry's `delivered` check and the topic creation each see one request at a time.
 */
export async function withConversation<T>(
  sql: Sql,
  tokenHash: string,
  fn: (tx: TransactionSql, conv: Conversation | null) => Promise<T>,
): Promise<T> {
  return (await sql.begin(async (tx) => {
    await tx`set local lock_timeout = '2s'`;
    const [row] = await tx.unsafe<Conversation[]>(
      `select ${CONVERSATION} from livechat.chat_conversations where token_hash = $1 for update`,
      [tokenHash],
    );
    return fn(tx, row ?? null);
  })) as T;
}

/**
 * Opens a conversation with its first message, in one transaction, or answers "limited". The counts and the insert
 * run under one site-wide advisory lock, so parallel first messages cannot all pass the per-IP and site caps (a lock
 * per IP hash would leave the site cap racy). Expired conversations (90 days after their last message) go first.
 */
export async function openConversation(
  sql: Sql,
  c: {
    tokenHash: string;
    label: string;
    firstPageUrl: string | null;
    referrer: string | null;
    country: string | null;
    ipHash: string;
    send: SendState;
  },
  body: string,
): Promise<{ conversation: Conversation; message: Message } | "limited"> {
  return (await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('livechat.open_conversation'))`;
    const [counts] = await tx<{ perIp: number; site: number }[]>`
      select
        count(*) filter (where ip_hash = ${c.ipHash})::int as "perIp",
        count(*) filter (where created_at > now() - interval '1 hour')::int as site
      from livechat.chat_conversations
      where created_at > now() - interval '24 hours'`;
    if (isConversationLimited(counts ?? { perIp: 0, site: 0 }))
      return "limited" as const;
    await tx`delete from livechat.chat_conversations where last_message_at < now() - interval '90 days'`;
    const [conversation] = await tx.unsafe<Conversation[]>(
      `insert into livechat.chat_conversations
         (token_hash, label, first_page_url, referrer, country, ip_hash, last_send_at, hour_start, hour_count)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning ${CONVERSATION}`,
      [
        c.tokenHash,
        c.label,
        c.firstPageUrl,
        c.referrer,
        c.country,
        c.ipHash,
        c.send.lastSendAt,
        c.send.hourStart,
        c.send.hourCount,
      ],
    );
    if (!conversation) throw new Error("insert returned no row");
    const message = await insertVisitorMessage(tx, conversation.id, body);
    return { conversation, message };
  })) as { conversation: Conversation; message: Message } | "limited";
}

/** Saves the send counters (`takeSend`); a message or a retry also opens a closed conversation again. */
export async function recordSend(
  sql: Db,
  conversationId: string,
  s: SendState,
  { reopen }: { reopen: boolean },
): Promise<void> {
  await sql`
    update livechat.chat_conversations
    set last_send_at = ${s.lastSendAt}, hour_start = ${s.hourStart}, hour_count = ${s.hourCount},
        status = case when ${reopen} and status = 'closed' then 'open' else status end,
        last_message_at = case when ${reopen} then now() else last_message_at end
    where id = ${conversationId}`;
}

/** Stores a visitor message, not yet delivered. */
export async function insertVisitorMessage(
  sql: Db,
  conversationId: string,
  body: string,
): Promise<Message> {
  const [row] = await sql.unsafe(
    `insert into livechat.chat_messages (conversation_id, direction, body)
     values ($1, 'visitor', $2)
     returning ${MESSAGE}`,
    [conversationId, body],
  );
  if (!row) throw new Error("insert returned no row");
  return toMessage(row);
}

/** The visitor's own message `id` in this conversation, for a retry (read under the row lock). */
export async function findVisitorMessage(
  sql: Db,
  conversationId: string,
  id: number,
): Promise<Message | null> {
  const [row] = await sql.unsafe(
    `select ${MESSAGE} from livechat.chat_messages
     where id = $1 and conversation_id = $2 and direction = 'visitor'`,
    [id, conversationId],
  );
  return row ? toMessage(row) : null;
}

export async function markDelivered(
  sql: Db,
  id: number,
  chatId: string,
  telegramMessageId: number,
): Promise<void> {
  await sql`
    update livechat.chat_messages
    set delivered = true, telegram_chat_id = ${chatId}, telegram_message_id = ${telegramMessageId}
    where id = ${id}`;
}

export async function listMessages(
  sql: Db,
  conversationId: string,
  after: number,
): Promise<Message[]> {
  const rows = await sql.unsafe(
    `select ${MESSAGE} from livechat.chat_messages
     where conversation_id = $1 and id > $2 order by id limit 500`,
    [conversationId, after],
  );
  return rows.map(toMessage);
}

/** The conversation's topic, in this group. */
export async function setTopic(
  sql: Db,
  conversationId: string,
  chatId: string,
  threadId: number,
): Promise<void> {
  await sql`
    update livechat.chat_conversations set telegram_chat_id = ${chatId}, telegram_thread_id = ${threadId}
    where id = ${conversationId}`;
}

/** Saves a changed email; `notified` counts it toward the topic notices. */
export async function setEmail(
  sql: Db,
  conversationId: string,
  email: string,
  notified: boolean,
): Promise<void> {
  await sql`
    update livechat.chat_conversations
    set email = ${email}, email_changes = email_changes + ${notified ? 1 : 0}
    where id = ${conversationId}`;
}

/** The conversation of a topic: the group and the thread both match. */
export async function findConversationByThread(
  sql: Db,
  chatId: string,
  threadId: number,
): Promise<Conversation | null> {
  const [row] = await sql.unsafe<Conversation[]>(
    `select ${CONVERSATION} from livechat.chat_conversations
     where telegram_chat_id = $1 and telegram_thread_id = $2`,
    [chatId, threadId],
  );
  return row ?? null;
}

export async function setStatus(
  sql: Db,
  conversationId: string,
  status: Status,
): Promise<void> {
  await sql`update livechat.chat_conversations set status = ${status} where id = ${conversationId}`;
}

/** Stores the owner's reply; false when Telegram sent this update before (unique on group + message id). */
export async function insertOwnerMessage(
  sql: Db,
  conversationId: string,
  body: string,
  chatId: string,
  telegramMessageId: number,
): Promise<boolean> {
  const rows = await sql`
    with inserted as (
      insert into livechat.chat_messages
        (conversation_id, direction, body, telegram_chat_id, telegram_message_id, delivered)
      values (${conversationId}, 'owner', ${body}, ${chatId}, ${telegramMessageId}, true)
      on conflict (telegram_chat_id, telegram_message_id) where telegram_message_id is not null do nothing
      returning id
    ), touched as (
      update livechat.chat_conversations set last_message_at = now()
      where id = ${conversationId} and exists (select 1 from inserted)
    )
    select id from inserted`;
  return rows.length > 0;
}
