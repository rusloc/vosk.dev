import "server-only";
import { z } from "zod";
import { siteConfig } from "./site";

/**
 * Server-only contact/email config. Kept OUT of `src/lib/env.ts` (which is
 * client-imported via siteConfig) so Resend secrets never reach the client
 * bundle. All vars are optional: the site builds and runs with none of them set
 * — the form then shows a friendly "email me directly" fallback.
 */

const DEFAULT_FROM = "VOSK Website <onboarding@resend.dev>";

const contactEnvSchema = z.object({
  // Resend API key. When absent or empty, the form no-ops gracefully (an empty value used to throw: 11-25 audit).
  RESEND_API_KEY: z.string().min(1).optional().catch(undefined),
  // Inbox that receives messages. Plain email; malformed → falls back to default.
  CONTACT_TO_EMAIL: z.email().optional().catch(undefined),
  // Verified sender. Accepts "Name <email>" or a bare address, so not email-validated.
  CONTACT_FROM_EMAIL: z.string().min(1).optional().catch(undefined),
});

export type ContactConfig = {
  /** Undefined when unset — callers must treat that as "not configured". */
  apiKey: string | undefined;
  to: string;
  from: string;
};

export function getContactConfig(): ContactConfig {
  const parsed = contactEnvSchema.parse({
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL,
    CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
  });

  return {
    apiKey: parsed.RESEND_API_KEY,
    to: parsed.CONTACT_TO_EMAIL ?? siteConfig.contactEmail,
    from: parsed.CONTACT_FROM_EMAIL ?? DEFAULT_FROM,
  };
}
