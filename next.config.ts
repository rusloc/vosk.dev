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
  // The P&L showcase was renamed on 2026-10-31 (`pnl-suite`); its old URL had been shared from
  // profiles and posts, so it is retired with a 308, not a 404. Applied before the locale proxy.
  // Baseline security headers on every response (11-25 audit): no MIME sniffing, no framing of the site by other
  // origins (the contact form and the chats), referrers trimmed to the origin cross-site, no device APIs. No CSP yet:
  // GTM, Power BI, Superset and the n8n preview would each need a source list, tested on a preview deploy first.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/work/unified-management-pnl",
        destination: "/work/pnl-suite",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
