/**
 * What the owner reads at the top of a new topic: where the visitor came from, coarsely. Plain text; every value is
 * untrusted and sent with no parse_mode, so it shows literally.
 */

import { isRequestHost } from "@/lib/same-origin";
import { LIMITS } from "./limits";

/**
 * An http(s) URL cut to its origin and path (no query, no hash: they can carry tokens or campaign ids), at most 500
 * characters, or null (a non-URL, `javascript:` and the like are dropped).
 */
function originAndPath(value: string | null | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}
const short = (url: URL) =>
  `${url.origin}${url.pathname}`.slice(0, LIMITS.maxUrl);

/** The visitor's page, kept only when it is on the host the request came to. */
export function pageUrlOf(
  value: string | null | undefined,
  req: Request,
): string | null {
  const url = originAndPath(value);
  return url && isRequestHost(req, url) ? short(url) : null;
}

/** The page's referrer (any site), origin and path only. */
export function referrerOf(value: string | null | undefined): string | null {
  const url = originAndPath(value);
  return url ? short(url) : null;
}

/** The platform's two-letter country code (Vercel's geo header), or null. */
export function countryOf(req: Request): string | null {
  const c = req.headers.get("x-vercel-ip-country");
  return c && /^[A-Z]{2}$/.test(c) ? c : null;
}

/** "Mobile, iOS"-style, from the user agent; nothing finer is kept. */
export function deviceOf(ua: string | null): string {
  if (!ua) return "unknown";
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /CrOS/.test(ua)
          ? "ChromeOS"
          : /Mac OS X|Macintosh/.test(ua)
            ? "macOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "other";
  const type =
    /iPad|Tablet/i.test(ua) || (os === "Android" && !/Mobi/.test(ua))
      ? "Tablet"
      : /Mobi|iPhone|iPod/.test(ua)
        ? "Mobile"
        : "Desktop";
  return `${type}, ${os}`;
}

export function contextText(c: {
  label: string;
  pageUrl: string | null;
  referrer: string | null;
  country: string | null;
  device: string;
  email: string | null;
  recreated: boolean;
}): string {
  return [
    c.recreated
      ? `${c.label}: new topic (the previous one was deleted)`
      : `New chat: ${c.label}`,
    `Page: ${c.pageUrl ?? "unknown"}`,
    `Referrer: ${c.referrer ?? "none"}`,
    `Country: ${c.country ?? "unknown"}`,
    `Device: ${c.device}`,
    ...(c.email ? [`Email: ${c.email}`] : []),
  ].join("\n");
}
