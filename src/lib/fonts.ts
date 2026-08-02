import { Geist, Geist_Mono } from "next/font/google";

/**
 * Shared font instances. Declared once so the `[locale]` layout and
 * `global-not-found.tsx` — which compiles into its own entry and bypasses that
 * layout — emit the same CSS variables from a single preload.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const fontVariables = `${geistSans.variable} ${geistMono.variable}`;
