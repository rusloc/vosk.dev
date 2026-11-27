import { getMessages, postMessage } from "@/lib/livechat/handlers";

/**
 * The live chat's messages (docs/livechat/README.md, 2026-11-26): GET polls the visitor's own conversation (by the
 * httpOnly cookie), POST sends a message to the owner's Telegram topic. 404 until the chat is configured.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = getMessages;
export const POST = postMessage;
