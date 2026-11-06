import { Raleway } from "next/font/google";

// Raleway 900, self-hosted by next/font at build time, for the neon "Ask AI" button only (owner's design, 11-06).
// Exposed as a CSS variable on the button, so the site keeps Geist.
const raleway = Raleway({
  subsets: ["latin", "cyrillic"],
  weight: "900",
  variable: "--font-raleway",
});

export const ralewayFontVariable = raleway.variable;
