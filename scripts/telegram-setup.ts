import { botApi, TelegramError } from "@/lib/livechat/telegram";

// The live chat's Telegram setup (docs/livechat/README.md "Owner's setup", 2026-11-26). Run from the owner's machine:
//
//     node --env-file=.env.local --import tsx scripts/telegram-setup.ts                  # find the IDs
//     node --env-file=.env.local --import tsx scripts/telegram-setup.ts https://vosk.dev # register the webhook
//
// No argument: getMe and getUpdates, then the forum groups the bot has seen (TELEGRAM_CHAT_ID) and who wrote in them
// (TELEGRAM_ALLOWED_USER_IDS). Send a message in the group first. getUpdates works only while no webhook is set.
// With a base URL: setWebhook(<base>/api/telegram/webhook, secret_token, allowed_updates ["message"]), then
// getWebhookInfo. Node reads .env.local; this script never prints the token or the secret, only their lengths.

type Update = {
  update_id: number;
  message?: {
    chat: { id: number; type: string; title?: string; is_forum?: boolean };
    from?: {
      id: number;
      is_bot: boolean;
      first_name?: string;
      username?: string;
    };
  };
};

type WebhookInfo = {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  allowed_updates?: string[];
};

function need(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${name} is not set (in .env.local).`);
    process.exit(1);
  }
  console.log(`${name}: set, ${value.length} characters`);
  return value;
}

async function printWebhookInfo(token: string): Promise<WebhookInfo> {
  const info = await botApi<WebhookInfo>(token, "getWebhookInfo");
  console.log("\ngetWebhookInfo:");
  console.log(`  url:                  ${info.url || "(none)"}`);
  console.log(`  pending_update_count: ${info.pending_update_count}`);
  console.log(
    `  allowed_updates:      ${info.allowed_updates?.join(", ") ?? "(all)"}`,
  );
  if (info.last_error_message)
    console.log(
      `  last_error:           ${new Date((info.last_error_date ?? 0) * 1000).toISOString()} ${info.last_error_message}`,
    );
  return info;
}

async function findIds(token: string) {
  const me = await botApi<{ id: number; username?: string }>(token, "getMe");
  console.log(`\nBot: @${me.username ?? "?"} (id ${me.id})`);
  const info = await printWebhookInfo(token);
  if (info.url) {
    console.log(
      "\nA webhook is set, so getUpdates is unavailable. The IDs are already in use; nothing more to read.",
    );
    return;
  }
  const updates = await botApi<Update[]>(token, "getUpdates", {
    allowed_updates: ["message"],
    limit: 100,
  });
  const chats = new Map<number, string>();
  const users = new Map<number, string>();
  for (const u of updates) {
    const m = u.message;
    if (!m) continue;
    if (m.chat.type === "supergroup")
      chats.set(
        m.chat.id,
        `${m.chat.title ?? ""}${m.chat.is_forum ? " (forum: Topics on)" : " (Topics OFF: turn them on)"}`,
      );
    if (m.from && !m.from.is_bot)
      users.set(
        m.from.id,
        [m.from.first_name, m.from.username && `@${m.from.username}`]
          .filter(Boolean)
          .join(" "),
      );
  }
  console.log(`\n${updates.length} recent updates.`);
  if (chats.size === 0)
    console.log(
      "No supergroup seen. Add the bot to the group as an admin (Manage Topics), send a message there, run again.",
    );
  for (const [id, title] of chats)
    console.log(`TELEGRAM_CHAT_ID candidate: ${id}  ${title}`);
  for (const [id, name] of users)
    console.log(`TELEGRAM_ALLOWED_USER_IDS candidate: ${id}  ${name}`);
}

async function setWebhook(token: string, base: string) {
  const secret = need("TELEGRAM_WEBHOOK_SECRET");
  if (!/^[\w-]{32,256}$/.test(secret)) {
    console.error(
      "TELEGRAM_WEBHOOK_SECRET must be 32 to 256 characters of A-Z, a-z, 0-9, _ and -.",
    );
    process.exit(1);
  }
  let url: URL;
  try {
    url = new URL("/api/telegram/webhook", base);
  } catch {
    console.error(`Not a URL: ${base}`);
    process.exit(1);
  }
  if (url.protocol !== "https:") {
    console.error("Telegram needs an https URL.");
    process.exit(1);
  }
  await botApi<boolean>(token, "setWebhook", {
    url: url.href,
    secret_token: secret,
    allowed_updates: ["message"],
  });
  console.log(`\nsetWebhook: ${url.href}`);
  await printWebhookInfo(token);
}

async function main() {
  const token = need("TELEGRAM_BOT_TOKEN");
  const base = process.argv[2];
  if (base) await setWebhook(token, base);
  else await findIds(token);
}

main().catch((error: unknown) => {
  // A TelegramError carries the method, the code and Telegram's description, never the token.
  console.error(
    error instanceof TelegramError
      ? `${error.method} failed: ${error.code} ${error.description}`
      : error instanceof Error
        ? error.message
        : "failed",
  );
  process.exit(1);
});
