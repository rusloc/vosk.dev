import localFont from "next/font/local";

// Inter (weights 400–800), self-hosted from src/fonts/ (scripts/fonts-build.py), for the report designs that use it.
// Exposed as a CSS variable on each report's root only, so the site keeps Geist.
const inter = localFont({
  src: "../fonts/inter/Inter-Variable.woff2",
  weight: "400 800",
  variable: "--font-inter",
  preload: false, // report-only: loads when a report opens, not on every page
});

export const interFontVariable = inter.variable;
