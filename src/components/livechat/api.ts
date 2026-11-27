/**
 * The widget's side of the live chat API (docs/livechat/README.md, "API contract"). The conversation lives behind
 * the httpOnly `__Host-vosk_chat` cookie, so the widget never holds or sends an id of its own.
 */

export type Direction = "visitor" | "owner" | "system";
export type Status = "open" | "closed" | "blocked" | null;
export type ServerMessage = {
  id: number;
  direction: Direction;
  body: string;
  createdAt: string;
  delivered: boolean;
};
export type Snapshot = {
  messages: ServerMessage[];
  status: Status;
  hasEmail: boolean;
};

const BASE = "/api/livechat";

function isMessage(m: unknown): m is ServerMessage {
  const v = m as ServerMessage;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.id === "number" &&
    typeof v.body === "string" &&
    (v.direction === "visitor" ||
      v.direction === "owner" ||
      v.direction === "system")
  );
}

/** Messages after `after` (0 = the whole history), or null when the call failed: the next poll tries again. */
export async function fetchMessages(after: number): Promise<Snapshot | null> {
  try {
    const res = await fetch(`${BASE}/messages?after=${after}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<Snapshot>;
    const status = data.status ?? null;
    return {
      messages: Array.isArray(data.messages)
        ? data.messages.filter(isMessage)
        : [],
      status:
        status === "open" || status === "closed" || status === "blocked"
          ? status
          : null,
      hasEmail: data.hasEmail === true,
    };
  } catch {
    return null;
  }
}

export type SendResult =
  /** Stored and relayed to Telegram. */
  | { kind: "ok"; message: ServerMessage }
  /** Stored, not relayed (502): a retry re-sends it with `retryOf`. */
  | { kind: "undelivered"; message: ServerMessage }
  /** 429: wait a little. */
  | { kind: "slow" }
  /** 400 / 403 / 404: retrying the same message would get the same answer. */
  | { kind: "refused" }
  /** No answer, a 5xx (500 = a database failure) or a body the widget can't read: a retry sends it again. */
  | { kind: "network" };

export async function sendMessage(body: {
  text: string;
  pageUrl: string;
  website: string;
  retryOf?: number;
  /** document.referrer, with the first message only: the topic's context line. */
  referrer?: string;
}): Promise<SendResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: "network" };
  }
  if (res.status === 429) return { kind: "slow" };
  if (res.status !== 200 && res.status !== 502) {
    return res.status >= 400 && res.status < 500
      ? { kind: "refused" }
      : { kind: "network" };
  }
  try {
    const data = (await res.json()) as { message?: unknown };
    if (!isMessage(data.message)) return { kind: "network" };
    return {
      kind: res.status === 200 ? "ok" : "undelivered",
      message: data.message,
    };
  } catch {
    return { kind: "network" };
  }
}

export async function sendEmail(
  email: string,
): Promise<"ok" | "invalid" | "failed"> {
  try {
    const res = await fetch(`${BASE}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) return "ok";
    return res.status === 400 ? "invalid" : "failed";
  } catch {
    return "failed";
  }
}
