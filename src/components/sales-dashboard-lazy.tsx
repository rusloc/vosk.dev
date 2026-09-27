"use client";

import dynamic from "next/dynamic";

/**
 * The split point for the Cube dashboard's client chunk (recharts + Radix, ~500 KB raw —
 * the heaviest on the site). It has to live in a client module: `next/dynamic` in the
 * Server Component page does not split anything, because every client component a route
 * can reach ships with that route — so the iframe showcases downloaded it too (measured
 * 09-27). Here the chunk is only fetched where the dashboard actually renders. Still
 * server-rendered: `ssr` stays at its default.
 */
export const SalesDashboardLazy = dynamic(() =>
  import("./sales-dashboard").then((m) => m.SalesDashboard),
);
