import "server-only";
import { z } from "zod";

/**
 * The Tidewell data chat's server settings (docs/ceo-digest/chat-and-email.md, 2026-11-16): the reader connection and
 * the n8n webhook that emails a report. Validated here, not in lib/env.ts: that module is reachable from client
 * components, and a server secret's name has no business in a client chunk (as with CUBE_* in lib/cube.ts).
 * All three optional: until every one is set the showcase is hidden (`isCeoDigestConfigured`, lib/work.ts) and the
 * build passes, so the code ships before the setup. A set but malformed webhook URL fails the build.
 */
const digestEnv = z
  .object({
    CEO_DIGEST_DATABASE_URL: z.string().min(1).optional(),
    // https only: the secret travels in a header
    N8N_DIGEST_WEBHOOK_URL: z.url({ protocol: /^https$/ }).optional(),
    N8N_DIGEST_WEBHOOK_SECRET: z.string().min(1).optional(),
  })
  .parse({
    // `||`, not `??`: an env var left blank in a dashboard is "", and must read as unset.
    CEO_DIGEST_DATABASE_URL: process.env.CEO_DIGEST_DATABASE_URL || undefined,
    N8N_DIGEST_WEBHOOK_URL: process.env.N8N_DIGEST_WEBHOOK_URL || undefined,
    N8N_DIGEST_WEBHOOK_SECRET:
      process.env.N8N_DIGEST_WEBHOOK_SECRET || undefined,
  });

/** Whether the chat can answer and the email can be sent: the reader URL, the webhook URL and its secret are all set. */
export function isCeoDigestConfigured(): boolean {
  return (
    !!digestEnv.CEO_DIGEST_DATABASE_URL &&
    !!digestEnv.N8N_DIGEST_WEBHOOK_URL &&
    !!digestEnv.N8N_DIGEST_WEBHOOK_SECRET
  );
}

/** The n8n webhook, or null while it is not set up (the send tool then answers "unavailable"). */
export function digestWebhook(): { url: string; secret: string } | null {
  const { N8N_DIGEST_WEBHOOK_URL: url, N8N_DIGEST_WEBHOOK_SECRET: secret } =
    digestEnv;
  return url && secret ? { url, secret } : null;
}
