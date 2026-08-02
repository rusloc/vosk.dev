import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `app/global-not-found.tsx` is still flag-gated in 16.2.x — without this the
  // file convention is dropped at build time and 404s fall back to Next's
  // built-in page. Re-check on every Next minor until it ships stable.
  experimental: { globalNotFound: true },
};

export default nextConfig;
