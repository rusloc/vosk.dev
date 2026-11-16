import { createChatTools } from "@/lib/ceo-digest/chat-tools";
import { digestWebhook } from "@/lib/ceo-digest/config";
import { digestData } from "@/lib/ceo-digest/server";
import { chatRoute } from "@/lib/chat/route";

/**
 * The Tidewell data chat (docs/ceo-digest/chat-and-email.md, 2026-11-16): a chat with no report beside it. Its closed
 * tools each run one SQL function through `ceo_digest_reader`; `send_email_report` asks the n8n workflow to email a
 * scope and period (server to server, a shared secret in a header). The limits, the kill switch (CHAT_ENABLED), the
 * daily cap, the streaming and the logging are the shared chat route's (src/lib/chat/route.ts); the send limit per
 * visitor is the toolset's.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = chatRoute({
  name: "ceo-digest",
  // no report, so no report state to send
  maxState: 0,
  // fn_meta once per instance: the data's range and its "today" go into the system prompt
  load: async () =>
    createChatTools({
      data: digestData,
      meta: await digestData.meta(),
      webhook: digestWebhook(),
    }),
  context: ({ ip, questions }) => ({ ip, questions }),
});
