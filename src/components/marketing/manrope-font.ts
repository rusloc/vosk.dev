import localFont from "next/font/local";

// Manrope 600–700 (the ACME Marketing report's display numbers), self-hosted from src/fonts/ (scripts/fonts-build.py),
// exposed as a CSS variable on the report root only (marketing.css reads --font-manrope), so the site keeps Geist.
// Inter comes from the shared components/inter-font.ts.
const manrope = localFont({
  src: "../../fonts/manrope/Manrope-Variable.woff2",
  weight: "600 700",
  variable: "--font-manrope",
  preload: false, // report-only: loads when a report opens, not on every page
});

export const manropeFontVariable = manrope.variable;
