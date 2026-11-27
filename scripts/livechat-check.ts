import postgres from "postgres";
import type { Sql } from "postgres";
import { liveChatConfig } from "@/lib/livechat/config";
import { botApi, TelegramError } from "@/lib/livechat/telegram";

// The live chat's go-live check (docs/livechat/README.md "Owner's setup", 2026-11-27): everything the setup can get
// wrong, proved against the real database and the real bot, in one run from the owner's machine:
//
//     node --conditions=react-server --env-file=.env.local --import tsx scripts/livechat-check.ts
//     node --conditions=react-server --env-file=.env.local --import tsx scripts/livechat-check.ts https://vosk.dev
//
// (`react-server` lets the script import the server-only config.) Checks: the six env vars as the site reads them; the
// database as livechat_app (data/livechat/sql/001 acceptance A, B, F, G, H, I: denials on real rows, its own tables,
// webhook idempotency, the row lock and the open-conversation lock across two sessions, NUL refused); the bot (token,
// forum group with Topics, admin with Manage Topics, each allowed user in the group and not anonymous, the webhook).
// With a base URL, also the deployed site: the chat route answers (the env reached the deploy) and the webhook points
// there. Writes only rows it deletes again (a committed test conversation for G, removed in `finally`). Never prints a
// token, secret, password or connection string; errors are printed as their codes.

type Result = { ok: boolean; name: string; note?: string };
const results: Result[] = [];
const pass = (name: string, note?: string) => {
  results.push({ ok: true, name, note });
  console.log(`PASS  ${name}${note ? `: ${note}` : ""}`);
};
const fail = (name: string, note: string) => {
  results.push({ ok: false, name, note });
  console.log(`FAIL  ${name}: ${note}`);
};

/** Postgres error code (`42501`, `55P03`…) or a short name; never the message, which can echo the input. */
const code = (e: unknown): string =>
  typeof e === "object" && e !== null && "code" in e
    ? String((e as { code: unknown }).code)
    : e instanceof TelegramError
      ? `${e.method} ${e.code} ${e.description}`
      : "error";

/** The one row a query must return. */
function one<T>(rows: readonly T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error("no row");
  return row;
}

const ROLLBACK = Symbol("rollback");
/** Runs `fn` in a transaction that is always rolled back. */
async function rolledBack(sql: Sql, fn: (tx: Sql) => Promise<void>) {
  try {
    await sql.begin(async (tx) => {
      await fn(tx as unknown as Sql);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
}

/** Expects `fn` to fail with Postgres error `expected`. */
async function expectCode(
  name: string,
  expected: string,
  fn: () => Promise<unknown>,
) {
  try {
    await fn();
    fail(name, `succeeded, expected ${expected}`);
  } catch (e) {
    const c = code(e);
    if (c === expected) pass(name, c);
    else fail(name, `got ${c}, expected ${expected}`);
  }
}

const connect = (url: string): Sql =>
  postgres(url, {
    max: 1,
    ssl: "require",
    connect_timeout: 10,
    idle_timeout: 5,
  });

async function checkDatabase(url: string) {
  if (new URL(url).port === "6543") {
    fail(
      "db: Session pooler",
      "port 6543 (Transaction pooler); use the Session pooler, port 5432",
    );
    return;
  }
  const a = connect(url);
  const b = connect(url);
  const testToken = "c".repeat(64);
  try {
    const who = one(
      await a<{ user: string; path: string }[]>`
      select current_user as "user", current_setting('search_path') as path`,
    );
    if (who.user === "livechat_app")
      pass("db: login", `livechat_app, search_path ${who.path}`);
    else
      return fail(
        "db: login",
        `connected as ${who.user}, expected livechat_app`,
      );

    // A. Denials on real rows.
    for (const [schema, table] of [
      ["qbo", "dim_account"],
      ["demo_sales", "dim_channel"],
      ["trucks_demo", "document"],
    ] as const)
      await expectCode(`db A: no access to ${schema}`, "42501", () =>
        a.unsafe(`select count(*) from ${schema}.${table}`),
      );

    // B. Its own tables, rolled back.
    await rolledBack(a, async (tx) => {
      const c = one(
        await tx<{ id: string }[]>`
        insert into chat_conversations (token_hash, label) values (${"a".repeat(64)}, 'Visitor TEST') returning id`,
      );
      await tx`insert into chat_messages (conversation_id, direction, body) values (${c.id}, 'visitor', 'hi')`;
      const n = one(
        await tx<{ n: number }[]>`
        select count(*)::int as n from chat_messages where conversation_id = ${c.id}`,
      );
      if (n.n === 1) pass("db B: insert and read its own tables (rolled back)");
      else
        fail(
          "db B: insert and read its own tables",
          `read ${n.n} rows, expected 1`,
        );
    });

    // F. Webhook idempotency: the same Telegram message twice is refused.
    await expectCode("db F: duplicate Telegram message refused", "23505", () =>
      rolledBack(a, async (tx) => {
        const c = one(
          await tx<{ id: string }[]>`
          insert into chat_conversations (token_hash, label, telegram_chat_id, telegram_thread_id)
          values (${"b".repeat(64)}, 'Visitor TEST', -1001, 7) returning id`,
        );
        await tx`insert into chat_messages (conversation_id, direction, body, telegram_chat_id, telegram_message_id)
                 values (${c.id}, 'owner', 'x', -1001, 5), (${c.id}, 'owner', 'x', -1001, 5)`;
      }),
    );

    // G. Row lock across two sessions (needs a committed row; removed in `finally`).
    await a`delete from chat_conversations where token_hash = ${testToken}`;
    await a`insert into chat_conversations (token_hash, label) values (${testToken}, 'Visitor TEST')`;
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    let locked!: () => void;
    const isLocked = new Promise<void>((r) => (locked = r));
    const holder = a.begin(async (tx) => {
      await tx`select id from chat_conversations where token_hash = ${testToken} for update`;
      locked();
      await held;
    });
    await isLocked;
    await expectCode("db G: a second send waits on the row lock", "55P03", () =>
      b.begin(async (tx) => {
        await tx`set local lock_timeout = '2s'`;
        await tx`select id from chat_conversations where token_hash = ${testToken} for update`;
      }),
    );
    release();
    await holder;

    // H. The open-conversation lock: a second session cannot take it while the first holds it.
    let releaseH!: () => void;
    const heldH = new Promise<void>((r) => (releaseH = r));
    let lockedH!: () => void;
    const isLockedH = new Promise<void>((r) => (lockedH = r));
    const holderH = a.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtext('livechat.open_conversation'))`;
      lockedH();
      await heldH;
    });
    await isLockedH;
    const h = one(
      await b<{ got: boolean }[]>`
      select pg_try_advisory_xact_lock(hashtext('livechat.open_conversation')) as got`,
    );
    if (!h.got) pass("db H: the open-conversation lock is exclusive");
    else fail("db H: the open-conversation lock", "a second session took it");
    releaseH();
    await holderH;

    // I. NUL is refused by Postgres (the app rejects control characters before that).
    await expectCode("db I: NUL refused", "54000", () => a`select chr(0)`);
  } catch (e) {
    fail("db", code(e));
  } finally {
    await a`delete from chat_conversations where token_hash = ${testToken}`.catch(
      () => {},
    );
    await Promise.all([a.end({ timeout: 5 }), b.end({ timeout: 5 })]);
  }
}

type ChatMember = {
  status: string;
  is_anonymous?: boolean;
  can_manage_topics?: boolean;
};

async function checkTelegram(
  token: string,
  chatId: string,
  allowed: ReadonlySet<string>,
  base: string | undefined,
) {
  try {
    const me = await botApi<{ id: number; username?: string }>(token, "getMe");
    pass("telegram: token", `@${me.username ?? "?"}`);

    const chat = await botApi<{ type: string; is_forum?: boolean }>(
      token,
      "getChat",
      { chat_id: chatId },
    );
    if (chat.type === "supergroup" && chat.is_forum)
      pass("telegram: group with Topics on");
    else
      fail(
        "telegram: group",
        `type ${chat.type}, Topics ${chat.is_forum ? "on" : "OFF"}; needs a supergroup with Topics on`,
      );

    const bot = await botApi<ChatMember>(token, "getChatMember", {
      chat_id: chatId,
      user_id: me.id,
    });
    if (bot.status === "administrator" && bot.can_manage_topics)
      pass("telegram: bot is admin with Manage Topics");
    else
      fail(
        "telegram: bot rights",
        `status ${bot.status}, Manage Topics ${bot.can_manage_topics ? "on" : "off"}`,
      );

    for (const id of allowed) {
      try {
        const m = await botApi<ChatMember>(token, "getChatMember", {
          chat_id: chatId,
          user_id: Number(id),
        });
        if (!["creator", "administrator", "member"].includes(m.status))
          fail(
            `telegram: allowed user ${id}`,
            `status ${m.status}; must be in the group`,
          );
        else if (m.is_anonymous)
          fail(
            `telegram: allowed user ${id}`,
            `"Remain anonymous" is on: replies come from GroupAnonymousBot and are ignored`,
          );
        else pass(`telegram: allowed user ${id}`, m.status);
      } catch (e) {
        fail(`telegram: allowed user ${id}`, code(e));
      }
    }

    const info = await botApi<{
      url: string;
      last_error_message?: string;
      allowed_updates?: string[];
    }>(token, "getWebhookInfo");
    if (!base) {
      if (info.url) pass("telegram: webhook set", info.url);
      else
        console.log(
          "SKIP  telegram: webhook (no base URL given; run telegram-setup.ts <url> after the deploy)",
        );
    } else {
      const want = new URL("/api/telegram/webhook", base).href;
      if (info.url === want) pass("telegram: webhook", want);
      else
        fail(
          "telegram: webhook",
          `points to ${info.url || "(none)"}, expected ${want}`,
        );
      if (info.last_error_message)
        fail("telegram: webhook delivery", info.last_error_message);
    }
  } catch (e) {
    fail("telegram", code(e));
  }
}

async function checkSite(base: string) {
  // The routes answer 404 until the deploy has all six vars; with them, a cookieless read is `{ status: null }`.
  try {
    const res = await fetch(new URL("/api/livechat/messages", base), {
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 200)
      pass(
        "site: live chat route answers",
        `${base} (the env reached the deploy)`,
      );
    else
      fail(
        "site: live chat route",
        `${res.status}; 404 = the deploy lacks a var or needs a redeploy`,
      );
  } catch {
    fail("site: live chat route", "network");
  }
}

async function main() {
  const base = process.argv[2];
  const config = liveChatConfig();
  if (!config) {
    const names = [
      "LIVECHAT_DATABASE_URL",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_CHAT_ID",
      "TELEGRAM_WEBHOOK_SECRET",
      "TELEGRAM_ALLOWED_USER_IDS",
      "CHAT_IP_HASH_SALT",
    ];
    for (const n of names)
      console.log(`${process.env[n]?.trim() ? "set  " : "MISSING"}  ${n}`);
    fail(
      "config",
      "a var is missing or malformed (a malformed one is named in the warning above); fix .env.local",
    );
  } else {
    pass("config: all six vars set and well formed");
    await checkDatabase(config.databaseUrl);
    await checkTelegram(
      config.botToken,
      config.chatId,
      config.allowedUserIds,
      base,
    );
  }
  if (base) await checkSite(base);

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  // exitCode, not exit(): exiting with fetch's sockets still open trips a libuv assertion on Windows
  process.exitCode = failed ? 1 : 0;
}

void main();
