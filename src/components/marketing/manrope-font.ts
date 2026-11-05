import { Manrope } from "next/font/google";

// Manrope (the ACME Marketing report's display numbers), self-hosted by next/font at build time, exposed as a CSS
// variable on the report root only (marketing.css reads --font-manrope), so the site keeps Geist. Inter comes from
// the shared components/inter-font.ts.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-manrope",
});

export const manropeFontVariable = manrope.variable;
