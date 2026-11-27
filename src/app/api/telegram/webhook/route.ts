import { telegramWebhook } from "@/lib/livechat/handlers";

/**
 * Telegram's webhook for the live chat (docs/livechat/README.md): the owner's replies, /close and /block from the
 * group's topics. 401 without the secret header; registered by scripts/telegram-setup.ts.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = telegramWebhook;
