import { createHash, randomBytes } from "node:crypto";

/**
 * The visitor's identity: a random 32-byte token in an httpOnly cookie; the database keeps only its SHA-256 (hex). The
 * cookie is set on the response to the first message (never on page load) and refreshed on every accepted send, for
 * 90 days, as the data lives. The `__Host-` prefix (11-27 review) makes the browser refuse it unless it is Secure, on
 * `/` and without a Domain, so no subdomain can plant or shadow it.
 */
export const COOKIE = "__Host-vosk_chat";
const MAX_AGE = 90 * 24 * 60 * 60; // seconds
const TOKEN = /^[\w-]{43}$/; // 32 bytes, base64url, unpadded

export const newToken = (): string => randomBytes(32).toString("base64url");

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

/** The Set-Cookie value that sets (or refreshes) the visitor's cookie. */
export const tokenCookie = (token: string): string =>
  `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;

/** The token from the request's cookie, or null when absent or not the shape `newToken` makes. */
export function readToken(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0 || part.slice(0, eq).trim() !== COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    return TOKEN.test(value) ? value : null;
  }
  return null;
}
