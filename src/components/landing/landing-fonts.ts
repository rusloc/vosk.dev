import localFont from "next/font/local";

// The ad landing pages' faces (/lp/*, 11-20), self-hosted from src/fonts/ (scripts/fonts-build.py) and exposed as CSS
// variables on the landing layout's <html> only, so the site keeps Geist. Geist Mono is declared again here rather
// than imported from lib/fonts, which would preload the site's Geist Sans on a page that never uses it.
const hostGrotesk = localFont({
  src: [
    {
      path: "../../fonts/host-grotesk/HostGrotesk-Variable.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "../../fonts/host-grotesk/HostGrotesk-Italic-Variable.woff2",
      weight: "400 700",
      style: "italic",
    },
  ],
  variable: "--font-lp-sans",
});

const geistMono = localFont({
  src: "../../fonts/geist/GeistMono-Variable.woff2",
  weight: "100 900",
  variable: "--font-lp-mono",
});

export const landingFontVariables = `${hostGrotesk.variable} ${geistMono.variable}`;
