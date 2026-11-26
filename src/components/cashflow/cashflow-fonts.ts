import localFont from "next/font/local";

// The ACME Cash Flow report's two families (handoff js-spec 04 § 2, CF-VIS-07): Space Grotesk for text, JetBrains Mono for
// every figure, 400–700, self-hosted from src/fonts/ (scripts/fonts-build.py), exposed as CSS variables on the report
// root only (cashflow.css reads --font-space-grotesk and --font-jetbrains-mono), so the site keeps Geist.
const spaceGrotesk = localFont({
  src: "../../fonts/space-grotesk/SpaceGrotesk-Variable.woff2",
  weight: "400 700",
  variable: "--font-space-grotesk",
  preload: false, // report-only: loads when the report opens, not on every page
});
const jetbrainsMono = localFont({
  src: "../../fonts/jetbrains-mono/JetBrainsMono-Variable.woff2",
  weight: "400 700",
  variable: "--font-jetbrains-mono",
  preload: false,
});

export const cashflowFontVariables = `${spaceGrotesk.variable} ${jetbrainsMono.variable}`;
