import { z } from "zod";

/**
 * Validated environment. Fails the build loudly if a required var is malformed.
 *
 * NEXT_PUBLIC_* vars must be referenced statically (not via a dynamic key) so
 * Next.js can inline them into the client bundle at build time.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
