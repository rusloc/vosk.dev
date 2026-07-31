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
  // Self-hosted Superset origin (e.g. https://bi.vosk.dev) — the iframe host, so it is
  // client-visible by necessity. Optional: when unset, Superset showcases are hidden
  // (lib/work.ts) rather than the build failing before the instance exists.
  // The SUPERSET_SVC_* credentials deliberately do NOT live here — this module is
  // reachable from client components, and anything in this schema risks being bundled.
  NEXT_PUBLIC_SUPERSET_DOMAIN: z.url().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
  NEXT_PUBLIC_SUPERSET_DOMAIN: process.env.NEXT_PUBLIC_SUPERSET_DOMAIN,
});
