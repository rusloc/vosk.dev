/**
 * A small Telegram Bot API client (https://core.telegram.org/bots/api, checked 2026-11-26): the calls the live chat
 * and scripts/telegram-setup.ts make. The token is passed in, never read here, so the setup script can share it; the
 * URL that carries it is never logged. Messages go as plain text with no `parse_mode`, so a visitor's `<b>`, `*` or
 * `_` arrives literally.
 */

// Short: a visitor's send holds its conversation's row lock across these calls (store.ts `withConversation`).
const TIMEOUT_MS = 5000;
/** The longest flood-control wait worth sitting out inside a visitor's request. */
const MAX_FLOOD_WAIT_S = 3;

export class TelegramError extends Error {
  constructor(
    readonly method: string,
    readonly code: number,
    readonly description: string,
    readonly retryAfter?: number,
  ) {
    super(`telegram ${method}: ${code}`);
  }
}

type ApiResponse<T> =
  | { ok: true; result: T }
  | {
      ok: false;
      error_code: number;
      description?: string;
      parameters?: { retry_after?: number };
    };

/** One Bot API call; a non-ok answer (or a network failure, code 0) throws TelegramError. */
export async function botApi<T>(
  token: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new TelegramError(method, 0, "network");
  }
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new TelegramError(method, res.status, "not json");
  }
  if (json.ok) return json.result;
  throw new TelegramError(
    method,
    json.error_code,
    json.description ?? "",
    json.parameters?.retry_after,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs `call`; on a 429 whose retry_after is 3 s or less, waits that long and tries once more. */
export async function withFloodRetry<T>(
  call: () => Promise<T>,
  wait: (ms: number) => Promise<unknown> = sleep,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (
      error instanceof TelegramError &&
      error.code === 429 &&
      error.retryAfter !== undefined &&
      error.retryAfter <= MAX_FLOOD_WAIT_S
    ) {
      await wait(error.retryAfter * 1000);
      return call();
    }
    throw error;
  }
}

/** The topic the message was sent to no longer exists (deleted in Telegram): make a new one and send again. */
export const isThreadGone = (error: unknown): boolean =>
  error instanceof TelegramError &&
  error.code === 400 &&
  /thread not found|TOPIC_DELETED|TOPIC_ID_INVALID/i.test(error.description);

/** The bot's calls for one configured group. */
export function telegramBot(token: string, chatId: string) {
  return {
    /** A new forum topic; returns its message_thread_id. */
    async createTopic(name: string): Promise<number> {
      const topic = await withFloodRetry(() =>
        botApi<{ message_thread_id: number }>(token, "createForumTopic", {
          chat_id: chatId,
          name: name.slice(0, 128),
        }),
      );
      return topic.message_thread_id;
    },
    /** A plain-text message in a topic; returns its message_id. */
    async send(threadId: number, text: string): Promise<number> {
      const message = await withFloodRetry(() =>
        botApi<{ message_id: number }>(token, "sendMessage", {
          chat_id: chatId,
          message_thread_id: threadId,
          text: text.slice(0, 4096),
          link_preview_options: { is_disabled: true },
        }),
      );
      return message.message_id;
    },
  };
}

export type TelegramBot = ReturnType<typeof telegramBot>;
