import type { Direction } from "./api";
import { COPY } from "./copy";

/**
 * What the thread shows besides the message text (owner's design, 11-28): the video-call card under a message of
 * Kirill's, the day dividers and the relative time under his last bubble. Pure, so it is tested without a DOM.
 */

export type VideoCall = {
  /** The link as the browser will open it. */
  url: string;
  host: string;
  /** The message without the link: "" when the link was all of it (then only the card shows). */
  rest: string;
};

/** A host that is a video-call service: any "meet." host (Jitsi, Google Meet), Zoom's join links, Teams, Whereby. */
function isCallUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  const under = (domain: string) =>
    host === domain || host.endsWith(`.${domain}`);
  if (host.startsWith("meet.")) return true;
  if (under("zoom.us")) return url.pathname.startsWith("/j/");
  return under("teams.microsoft.com") || under("whereby.com");
}

/**
 * The first video-call link in a message of Kirill's, or null. Never a visitor's or a system line (a visitor must not
 * be able to draw a "Join call" button), https only, and no `user@host` form, which shows one host and opens another.
 */
export function videoCall(
  direction: Direction,
  body: string,
): VideoCall | null {
  if (direction !== "owner") return null;
  // A link starts the message or follows a space or a bracket: never the tail of another scheme.
  for (const [, raw = ""] of body.matchAll(
    /(?:^|[\s(<])(https:\/\/[^\s<>"']+)/gi,
  )) {
    // A full stop or bracket after a link belongs to the sentence.
    const text = raw.replace(/[.,;:!?)\]]+$/, "");
    let url: URL;
    try {
      url = new URL(text);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" || url.username || url.password) continue;
    if (!isCallUrl(url)) continue;
    return {
      url: url.href,
      host: url.hostname.toLowerCase(),
      // The link goes with the full stop that followed it.
      rest: body
        .replace(raw, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim(),
    };
  }
  return null;
}

const dayOf = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** True when two moments fall on different calendar days (the visitor's clock). */
export const differentDay = (a: number, b: number) => dayOf(a) !== dayOf(b);

/** The day divider's words: "Today", "Yesterday", or a short date ("12 Nov", with the year when it is another one). */
export function dayLabel(at: number, now: number): string {
  // Whole days between the two midnights; rounded, since a clock change makes a day 23 or 25 hours.
  const days = Math.round((dayOf(now) - dayOf(at)) / 86_400_000);
  if (days <= 0) return COPY.today;
  if (days === 1) return COPY.yesterday;
  const d = new Date(at);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === new Date(now).getFullYear()
      ? {}
      : { year: "numeric" }),
  });
}

/** "just now" under a minute, "N min ago" under an hour, then the time of day (HH:MM, the visitor's clock). */
export function relativeTime(at: number, now: number): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return COPY.justNow;
  if (minutes < 60) return COPY.minutesAgo(minutes);
  const d = new Date(at);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** What the rows need of a thread item: a message's side and time, or the email prompt. */
type ThreadItem =
  { kind: "msg"; direction: Direction; at: number } | { kind: "email" };

/**
 * The thread's rows: a day divider where the day changes, the small gap between bubbles of one side, and
 * "Kirill · just now" under the last bubble of each run of his. The greeting above them has no time: it heads the first
 * message's day (today in an empty thread) and carries "Kirill" unless a message of his follows it directly.
 */
export function threadRows<T extends ThreadItem>(
  items: readonly T[],
  now: number,
) {
  const first = items.find((it) => it.kind === "msg");
  let prevAt: number | null = null;
  // The greeting is Kirill's.
  let prevSide: Direction | "email" = "owner";
  const rows = items.map((it, i) => {
    if (it.kind !== "msg") {
      prevSide = "email";
      return { it, day: null, tight: false, meta: null };
    }
    const day =
      prevAt !== null && differentDay(prevAt, it.at)
        ? dayLabel(it.at, now)
        : null;
    const tight =
      !day && it.direction !== "system" && it.direction === prevSide;
    prevAt = it.at;
    prevSide = it.direction;
    const next = items[i + 1];
    const runsOn =
      next?.kind === "msg" &&
      next.direction === "owner" &&
      !differentDay(it.at, next.at);
    const meta =
      it.direction === "owner" && !runsOn
        ? `${COPY.owner} · ${relativeTime(it.at, now)}`
        : null;
    return { it, day, tight, meta };
  });
  return {
    firstDay: dayLabel(first?.kind === "msg" ? first.at : now, now),
    greetingMeta:
      items[0]?.kind === "msg" && items[0].direction === "owner"
        ? null
        : COPY.owner,
    rows,
  };
}
