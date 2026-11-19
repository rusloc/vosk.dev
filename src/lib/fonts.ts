import localFont from "next/font/local";

/**
 * Shared font instances. Declared once so the `[locale]` layout and
 * `global-not-found.tsx` — which compiles into its own entry and bypasses that
 * layout — emit the same CSS variables from a single preload.
 *
 * Self-hosted from `src/fonts/` (built by `scripts/fonts-build.py` from Google Fonts' sources, Latin + Latin Extended;
 * Cyrillic waits for real ru copy), so `next build` downloads nothing: the Google Fonts fetch failed 3 of 5 production
 * builds on 2026-11-18.
 */
const geistSans = localFont({
  src: "../fonts/geist/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "../fonts/geist/GeistMono-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
});

export const fontVariables = `${geistSans.variable} ${geistMono.variable}`;
