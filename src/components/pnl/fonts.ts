import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from "next/font/google";

// Design guide §3: IBM Plex Sans (UI) and IBM Plex Sans Condensed (statement table), self-hosted by next/font at
// build time. Exposed as CSS variables on the report root only, so the site keeps its own type.
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-plex",
});
const plexCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-plex-condensed",
});

export const pnlFontVariables = `${plex.variable} ${plexCondensed.variable}`;
