import localFont from "next/font/local";

// Design guide §3: IBM Plex Sans (UI) and IBM Plex Sans Condensed (statement table), weights 400–700 with italics,
// self-hosted from src/fonts/ (scripts/fonts-build.py). Exposed as CSS variables on the report root only, so the site
// keeps its own type.
const plex = localFont({
  src: [
    {
      path: "../../fonts/ibm-plex/IBMPlexSans-Variable.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "../../fonts/ibm-plex/IBMPlexSans-Italic-Variable.woff2",
      weight: "400 700",
      style: "italic",
    },
  ],
  variable: "--font-plex",
  preload: false, // report-only: loads when a report opens, not on every page
});
// next/font needs literal arguments: no helper for the eight files.
const plexCondensed = localFont({
  src: [
    {
      path: "../../fonts/ibm-plex/IBMPlexSansCondensed-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/ibm-plex/IBMPlexSansCondensed-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../fonts/ibm-plex/IBMPlexSansCondensed-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../fonts/ibm-plex/IBMPlexSansCondensed-MediumItalic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../fonts/ibm-plex/IBMPlexSansCondensed-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../fonts/ibm-plex/IBMPlexSansCondensed-SemiBoldItalic.woff2",
      weight: "600",
      style: "italic",
    },
    {
      path: "../../fonts/ibm-plex/IBMPlexSansCondensed-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../fonts/ibm-plex/IBMPlexSansCondensed-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-plex-condensed",
  preload: false, // report-only: loads when a report opens, not on every page
});

export const pnlFontVariables = `${plex.variable} ${plexCondensed.variable}`;
