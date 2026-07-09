import { z } from "zod";

/**
 * Validated environment. Fails the build loudly if a required var is malformed.
 *
 * NEXT_PUBLIC_* vars must be referenced statically (not via a dynamic key) so
 * Next.js can inline them into the client bundle at build time.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  // Optional: when unset, analytics is a no-op (no consent banner, no GTM).
  NEXT_PUBLIC_GTM_ID: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
});
