import type { Metadata } from "next";
import { env } from "@/lib/env";

/**
 * Exists only to give the ROOT segment a `metadataBase`.
 *
 * `opengraph-image.tsx`, `icon.tsx`, `apple-icon.tsx` and `global-not-found.tsx`
 * sit at the root, above `[locale]/layout.tsx`, and Next resolves metadata
 * top-down — so the base set inside the locale layout came too late and every
 * prerendered route resolved the root OG image against `http://localhost:3000`.
 *
 * It is never the rendering root: `[locale]/layout.tsx` owns `<html>`/`<body>`
 * for pages and `global-not-found.tsx` owns it for 404s. That is also why this
 * passthrough is safe — without `global-not-found.tsx`, Next stops synthesising
 * the shell for `/_not-found` and emits malformed HTML.
 */
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
