import "server-only";

/**
 * The live chat's server settings (docs/livechat/README.md, 2026-11-26). All six are server-only: until every one is set
 * and well formed the widget is not mounted and every route answers 404 (`isLiveChatConfigured`), so the code ships
 * before the setup. A malformed value never breaks the site (11-27 review): it reads as "off", with one warning naming
 * the variable, never its value.
 *
 * Read on each call, not at import: the routes' tests set the env per test, and a value changed in Vercel lands with the
 * next deploy anyway (the layout reads it at build).
 */
export type LiveChatConfig = {
  databaseUrl: string;
  botToken: string;
  /** The forum supergroup, as Telegram sends `chat.id` ("-100…"). */
  chatId: string;
  webhookSecret: string;
  /** Telegram user ids allowed to answer visitors. */
  allowedUserIds: ReadonlySet<string>;
  /** The site's salt for IP hashes (CHAT_IP_HASH_SALT, shared with the AI chat); required, so no hash is unsalted. */
  ipSalt: string;
};

// `||`, not `??`: an env var left blank in a dashboard is "", and must read as unset.
const env = (name: string): string | undefined =>
  process.env[name]?.trim() || undefined;

const warned = new Set<string>();
function malformed(name: string): null {
  if (!warned.has(name)) {
    warned.add(name);
    console.warn(`livechat: ${name} is malformed; the live chat stays off`);
  }
  return null;
}

/** The settings, or null while any of the six is unset or malformed. Never throws. */
export function liveChatConfig(): LiveChatConfig | null {
  const databaseUrl = env("LIVECHAT_DATABASE_URL");
  const botToken = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHAT_ID");
  const webhookSecret = env("TELEGRAM_WEBHOOK_SECRET");
  const allowed = env("TELEGRAM_ALLOWED_USER_IDS");
  const ipSalt = env("CHAT_IP_HASH_SALT");
  if (
    !databaseUrl ||
    !botToken ||
    !chatId ||
    !webhookSecret ||
    !allowed ||
    !ipSalt
  )
    return null;

  try {
    new URL(databaseUrl);
  } catch {
    return malformed("LIVECHAT_DATABASE_URL");
  }
  if (!/^\d+:[\w-]{20,}$/.test(botToken))
    return malformed("TELEGRAM_BOT_TOKEN");
  if (!/^-[1-9]\d{0,15}$/.test(chatId)) return malformed("TELEGRAM_CHAT_ID");
  // Telegram's own rule for secret_token (A-Z, a-z, 0-9, _ and -), and the spec's 32+ characters.
  if (!/^[\w-]{32,256}$/.test(webhookSecret))
    return malformed("TELEGRAM_WEBHOOK_SECRET");
  // "123,456," and "123, 456" are fine; an empty list or a non-number is not.
  const ids = allowed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0 || ids.some((id) => !/^[1-9]\d{0,19}$/.test(id)))
    return malformed("TELEGRAM_ALLOWED_USER_IDS");
  if (ipSalt.length < 16) return malformed("CHAT_IP_HASH_SALT");

  return {
    databaseUrl,
    botToken,
    chatId,
    webhookSecret,
    allowedUserIds: new Set(ids),
    ipSalt,
  };
}

/** The one switch: the layout mounts the widget, and the routes answer, only when this is true. Never throws. */
export function isLiveChatConfigured(): boolean {
  try {
    return liveChatConfig() !== null;
  } catch {
    return false;
  }
}
