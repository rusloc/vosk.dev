import { postEmail } from "@/lib/livechat/handlers";

/** The live chat's email fallback (docs/livechat/README.md): stores the visitor's email and posts it in the topic. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = postEmail;
