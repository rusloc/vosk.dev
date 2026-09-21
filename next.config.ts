import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `app/global-not-found.tsx` is still flag-gated in 16.2.x — without this the
  // file convention is dropped at build time and 404s fall back to Next's
  // built-in page. Re-check on every Next minor until it ships stable.
  experimental: { globalNotFound: true },
  // The Cube showcase page waits up to 60 s on a query plus one 60 s retry — a free-tier
  // deployment asleep at build time (lib/cube.ts). The default of 60 would kill the page
  // attempt before that retry could run.
  staticPageGenerationTimeout: 130,
};

export default nextConfig;
