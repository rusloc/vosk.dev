import { createHash } from "node:crypto";
import { clientIp } from "@/lib/report-data/rate-limit";

/**
 * The chat's abuse limits and input rules, pure. The state lives in Postgres (store.ts) and is read and written under
 * a lock, so every instance sees the same numbers and two requests cannot both pass a count:
 *  - per conversation, every visitor send (a message, a retry, an email): one per 2 seconds, 30 an hour, kept on the
 *    conversation row (`last_send_at`, `hour_start`, `hour_count`) and updated under its row lock;
 *  - new conversations: 5 a day per IP hash and 50 an hour for the whole site, counted under one advisory lock.
 */
export const LIMITS = {
  minGapMs: 2000,
  perHour: 30,
  conversationsPerDayPerIp: 5,
  conversationsPerHourSite: 50,
  /** Email changes that are posted in the topic; later ones are stored silently. */
  emailNotices: 3,
  maxText: 2000,
  maxUrl: 500,
} as const;

const HOUR_MS = 60 * 60 * 1000;

/** A conversation's send counters, as stored. */
export type SendState = {
  lastSendAt: Date | null;
  hourStart: Date | null;
  hourCount: number;
};

/** The counters after one more send at `now`, or null when that send is over a limit. */
export function takeSend(s: SendState, now: Date): SendState | null {
  const t = now.getTime();
  if (s.lastSendAt && t - s.lastSendAt.getTime() < LIMITS.minGapMs) return null;
  const fresh = !s.hourStart || t - s.hourStart.getTime() >= HOUR_MS;
  const count = fresh ? 0 : s.hourCount;
  if (count >= LIMITS.perHour) return null;
  return {
    lastSendAt: now,
    hourStart: fresh ? now : s.hourStart,
    hourCount: count + 1,
  };
}

/** Conversations opened in the last 24 hours from this IP hash, and in the last hour on the whole site. */
export type OpenCounts = { perIp: number; site: number };

export const isConversationLimited = ({ perIp, site }: OpenCounts) =>
  perIp >= LIMITS.conversationsPerDayPerIp ||
  site >= LIMITS.conversationsPerHourSite;

/** SHA-256 hex of the site's salt and the visitor's IP (the raw IP is never stored). */
export const ipHash = (req: Request, salt: string): string =>
  createHash("sha256")
    .update(`${salt}${clientIp(req)}`)
    .digest("hex");

// Control characters other than tab and newline (Postgres refuses \u0000 outright).
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/;
// Characters that draw nothing: whitespace, zero-width and format characters, and the "blank" letters.
const INVISIBLE =
  /[\s\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u2800\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF9-\uFFFB]/g;

/** A visitor's text, trimmed, or null: empty, nothing visible, a control character, or over 2000 characters. */
export function cleanText(raw: string): string | null {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  if (!text || text.length > LIMITS.maxText || CONTROL.test(text)) return null;
  if (text.replace(INVISIBLE, "") === "") return null;
  return text;
}
