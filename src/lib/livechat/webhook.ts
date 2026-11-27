import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The webhook's trust rules, pure (spec "Rules for POST /api/telegram/webhook"): the secret header, then the
 * configured group, a topic, a human sender on the allowlist. Everything else is ignored with a 200 so Telegram does
 * not retry it.
 */

export const SECRET_HEADER = "x-telegram-bot-api-secret-token";
export const TEXT_ONLY_REPLY =
  "Text only for now; the visitor did not receive this.";
export const UNKNOWN_COMMAND_REPLY =
  "Unknown command; the visitor did not receive this.";

/** Constant-time comparison of the header with the secret (hashed first, so lengths never leak or throw). */
export function secretMatches(header: string | null, secret: string): boolean {
  if (!header) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(header), digest(secret));
}

export type WebhookAction =
  | { kind: "ignore" }
  | { kind: "close"; threadId: number }
  | { kind: "block"; threadId: number }
  | { kind: "non_text"; threadId: number }
  | { kind: "unknown_command"; threadId: number }
  | { kind: "relay"; threadId: number; messageId: number; text: string };

type Message = {
  message_id?: unknown;
  message_thread_id?: unknown;
  chat?: { id?: unknown };
  from?: { id?: unknown; is_bot?: unknown };
  text?: unknown;
  [key: string]: unknown;
};

// What makes a message content the visitor cannot get (a service message, such as a renamed topic, has none of these
// and is ignored).
const MEDIA = [
  "photo",
  "document",
  "sticker",
  "video",
  "voice",
  "audio",
  "animation",
  "video_note",
  "contact",
  "location",
  "venue",
  "poll",
  "dice",
  "story",
  "paid_media",
  "checklist",
] as const;

const command = (text: string, name: string) =>
  new RegExp(`^/${name}(@\\w+)?(\\s|$)`, "i").test(text);

/** What to do with an update whose secret matched. */
export function classifyUpdate(
  update: unknown,
  {
    chatId,
    allowedUserIds,
  }: { chatId: string; allowedUserIds: ReadonlySet<string> },
): WebhookAction {
  const ignore = { kind: "ignore" } as const;
  if (typeof update !== "object" || update === null) return ignore;
  const message = (update as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) return ignore;
  const m = message as Message;

  if (
    typeof m.chat?.id !== "number" ||
    String(m.chat.id) !== chatId ||
    typeof m.message_thread_id !== "number" ||
    typeof m.message_id !== "number" ||
    typeof m.from?.id !== "number" ||
    m.from.is_bot !== false ||
    !allowedUserIds.has(String(m.from.id))
  )
    return ignore;

  const threadId = m.message_thread_id;
  if (typeof m.text !== "string")
    return MEDIA.some((key) => key in m)
      ? { kind: "non_text", threadId }
      : ignore;
  if (command(m.text, "close")) return { kind: "close", threadId };
  if (command(m.text, "block")) return { kind: "block", threadId };
  // Anything else that looks like a command (a typo of /close, a bot command) is not for the visitor.
  if (m.text.startsWith("/")) return { kind: "unknown_command", threadId };
  // Postgres refuses NUL in text; Telegram should never send one, but an update must not fail on it.
  const text = m.text.split("\u0000").join("").trim();
  if (!text) return ignore;
  return { kind: "relay", threadId, messageId: m.message_id, text };
}
