"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useConsentPending } from "@/components/analytics";
import { CloseIcon } from "@/components/close-icon";
import cta from "@/components/cta-button.module.css";
import {
  fetchMessages,
  sendEmail,
  sendMessage,
  type Direction,
  type ServerMessage,
  type Snapshot,
  type Status,
} from "./api";
import { COPY } from "./copy";
import { LIVE_CHAT_OPEN_EVENT } from "./open-event";
import { LauncherIcon } from "./launcher-icon";
import { threadRows, videoCall } from "./thread";
import styles from "./live-chat.module.css";

/**
 * The live chat (docs/livechat/README.md): a launcher at the bottom, under the nav's "Message" button, and a floating panel above it (on a
 * phone too, lifted above the keyboard), messages relayed to the owner's Telegram by `/api/livechat/*`. Client-only and loaded after idle by
 * <LiveChatLazy>. No request and no cookie until the first send, except one GET on mount, which answers
 * `status: null` without a conversation (the cookie is httpOnly, so asking is the only way to know).
 */

const OPEN_KEY = "vosk.livechat.open"; // sessionStorage: the panel was open
const SEEN_KEY = "vosk.livechat.seen"; // localStorage: the newest owner message id the visitor has seen
const PROMPT_KEY = "vosk.livechat.emailPrompt"; // localStorage: the conversation (its first message id) already asked
const POLL_OPEN_MS = 3_000;
const POLL_CLOSED_MS = 20_000;
const EMAIL_PROMPT_MS = 60_000;
const SLOW_MS = 5_000;
const MAX_TEXT = 2_000;
// A black rounded square, 20 % smaller than the 67 px two-bubble icon it replaced (owner, 11-27).
const LAUNCHER = 54;
// Open, the same square stays where it is and shows a white ✕ instead of the bubble (owner, 11-27).
const GAP = 12;
// The panel (owner's design, 11-28): 400 px wide, up to 700 px tall, never under the site nav (57 px) plus a gap.
const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 700;
const NAV_CLEAR = 57 + 8;
const CLOCK_MS = 30_000;

type Msg = {
  kind: "msg";
  key: string;
  id: number | null;
  direction: Direction;
  body: string;
  /** When it was sent (ms), for the day dividers and "N min ago". */
  at: number;
  state: "pending" | "sent" | "failed";
  /** A failed message the visitor may send again (not after a 400 / 403). */
  retry: boolean;
};
type Item = Msg | { kind: "email"; key: "email" };

/** Read in event handlers only (the purity lint can't tell `send` from render code). */
const now = () => Date.now();

function storageGet(kind: "local" | "session", key: string): string | null {
  try {
    return (kind === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}
function storageSet(kind: "local" | "session", key: string, value: string) {
  try {
    (kind === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    // private window or blocked storage: the widget works without it
  }
}

function fromServer(m: ServerMessage): Msg {
  const failed = m.direction === "visitor" && !m.delivered;
  return {
    kind: "msg",
    key: `s${m.id}`,
    id: m.id,
    direction: m.direction,
    body: m.body,
    at: Date.parse(m.createdAt) || now(),
    state: failed ? "failed" : "sent",
    retry: failed,
  };
}

/** Adds what the server sent and the list lacks. A visitor message the poll returns before its POST does is matched to
 *  its pending bubble, which keeps its state until the POST answers. */
function merge(prev: Item[], incoming: ServerMessage[]): Item[] {
  let next = prev;
  for (const m of incoming) {
    if (next.some((it) => it.kind === "msg" && it.id === m.id)) continue;
    const pending =
      m.direction === "visitor"
        ? next.findIndex(
            (it) =>
              it.kind === "msg" &&
              it.id === null &&
              it.state === "pending" &&
              it.body === m.body,
          )
        : -1;
    next =
      pending >= 0
        ? next.map((it, i) =>
            i === pending && it.kind === "msg" ? { ...it, id: m.id } : it,
          )
        : [...next, fromServer(m)];
  }
  return next;
}

// Browser state read through useSyncExternalStore: the widget never renders on the server, so the server snapshots
// below are never used for real.
// Under 640 px ("sheet", the old full-screen name): the phone sizing and no autofocus on the textarea.
const SHEET = "(max-width: 639.98px)";
const media = (query: string) => ({
  subscribe: (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  },
  read: () => window.matchMedia(query).matches,
});
const sheetMedia = media(SHEET);

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}
const readVisible = () => document.visibilityState === "visible";

/** The visual viewport and the layout viewport's height, so the phone panel rises above the on-screen keyboard. */
function subscribeViewport(cb: () => void) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener("resize", cb);
  vv.addEventListener("scroll", cb);
  return () => {
    vv.removeEventListener("resize", cb);
    vv.removeEventListener("scroll", cb);
  };
}
const readViewport = () => {
  const vv = window.visualViewport;
  return vv
    ? `${Math.round(vv.offsetTop)}:${Math.round(vv.height)}:${window.innerHeight}`
    : "";
};

/** The consent card's box as "top:left:right": how far its top edge sits above the bottom of the window, and its left
 *  and right edges ("" when it is not there). A string, so the snapshot is stable between changes. */
const CONSENT_CARD = '[role="dialog"][aria-label="Cookie consent"]';
function subscribeCard(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.body, { childList: true });
  window.addEventListener("resize", cb);
  return () => {
    mo.disconnect();
    window.removeEventListener("resize", cb);
  };
}
const readCard = () => {
  const box = document.querySelector(CONSENT_CARD)?.getBoundingClientRect();
  return box
    ? `${Math.ceil(window.innerHeight - box.top)}:${Math.floor(box.left)}:${Math.ceil(box.right)}`
    : "";
};

/**
 * How much of the window's bottom the site footer covers (owner, 11-28): 0 while it is below the fold, its full height
 * when the page is scrolled to the end, and always on a page that fits the screen. The launcher sits above that.
 * Read on scroll and resize, once a frame at most, and when the page's height changes (a new route).
 */
const FOOTER = "body > footer";
function subscribeFooter(cb: () => void) {
  let frame = 0;
  const onMove = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      cb();
    });
  };
  window.addEventListener("scroll", onMove, { passive: true });
  window.addEventListener("resize", onMove);
  const ro = new ResizeObserver(onMove);
  ro.observe(document.body);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", onMove);
    window.removeEventListener("resize", onMove);
    ro.disconnect();
  };
}
const readFooter = () => {
  const box = document.querySelector(FOOTER)?.getBoundingClientRect();
  return box ? Math.max(0, Math.ceil(window.innerHeight - box.top)) : 0;
};

/**
 * The launcher's line (owner, 11-27): the right edge of whatever sits in the nav's top-right slot, the "Message"
 * button from `md` up and the menu button below it; the launcher's right edge goes on it. Measured, since the nav's
 * container rules live in the nav. With no site nav on the page, the old 16 px gutter.
 */
const NAV_GROUP = "header nav > div:last-of-type";
function subscribeColumn(cb: () => void) {
  window.addEventListener("resize", cb);
  // The group's width follows the button's text (a late font) and the breakpoint.
  const group = document.querySelector(NAV_GROUP);
  const ro = group ? new ResizeObserver(cb) : null;
  if (group) ro?.observe(group);
  return () => {
    window.removeEventListener("resize", cb);
    ro?.disconnect();
  };
}
const readColumn = () => {
  const group = document.querySelector(NAV_GROUP);
  const box = [":scope > div > a", ":scope > button"]
    .map((q) => group?.querySelector(q)?.getBoundingClientRect())
    .find((b) => b && b.width > 0);
  return box
    ? Math.round(box.right)
    : document.documentElement.clientWidth - 16;
};

export function LiveChat({ openFirst = false }: { openFirst?: boolean }) {
  // `openFirst`: a "Contact now" click loaded the widget (live-chat-lazy.tsx), so it starts open, with focus.
  const [open, setOpenState] = useState(
    () => openFirst || storageGet("session", OPEN_KEY) === "1",
  );
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [hasEmail, setHasEmail] = useState(false);
  const [active, setActive] = useState(false); // a conversation exists: poll
  const [unread, setUnread] = useState(0);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [announce, setAnnounce] = useState("");
  // The visitor's clock, for "N min ago" and the day dividers; it ticks while the panel is open.
  const [clock, setClock] = useState(now);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<
    "idle" | "busy" | "done" | "invalid" | "failed"
  >("idle");

  const sheet = useSyncExternalStore(
    sheetMedia.subscribe,
    sheetMedia.read,
    () => false,
  );
  const visible = useSyncExternalStore(
    subscribeVisibility,
    readVisible,
    () => true,
  );
  const viewport = useSyncExternalStore(
    subscribeViewport,
    readViewport,
    () => "",
  );
  const consentPending = useConsentPending();
  const card = useSyncExternalStore(subscribeCard, readCard, () => "");
  const edge = useSyncExternalStore(subscribeColumn, readColumn, () => 0);
  const footer = useSyncExternalStore(subscribeFooter, readFooter, () => 0);

  const launcher = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  const hasEmailRef = useRef(false);
  const lastId = useRef(0);
  const maxOwnerId = useRef(0);
  const seen = useRef<number | null>(null);
  const ownerReplied = useRef(false);
  const first = useRef<{ at: number; id: number | null } | null>(null);
  const promptTimer = useRef<number | undefined>(undefined);
  const prompted = useRef(false);
  const slowTimer = useRef<number | undefined>(undefined);
  const stick = useRef(true);
  const seq = useRef(0);
  const polling = useRef(false);
  const focusOnOpen = useRef(openFirst);
  const titleId = useId();
  const inputId = useId();
  const emailId = useId();

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const markSeen = useCallback((id: number) => {
    if (id <= (seen.current ?? 0)) return;
    seen.current = id;
    storageSet("local", SEEN_KEY, String(id));
  }, []);

  /** Starts the 60-second wait for the email prompt, once per conversation, from the visitor's first message. */
  const armPrompt = useCallback(() => {
    const f = first.current;
    if (
      !f ||
      promptTimer.current !== undefined ||
      prompted.current ||
      ownerReplied.current ||
      hasEmailRef.current
    )
      return;
    if (f.id !== null && storageGet("local", PROMPT_KEY) === String(f.id)) {
      prompted.current = true;
      return;
    }
    promptTimer.current = window.setTimeout(
      () => {
        if (ownerReplied.current || hasEmailRef.current || prompted.current)
          return;
        prompted.current = true;
        const id = first.current?.id;
        if (id != null) storageSet("local", PROMPT_KEY, String(id));
        setItems((prev) => [...prev, { kind: "email", key: "email" }]);
      },
      Math.max(0, f.at + EMAIL_PROMPT_MS - Date.now()),
    );
  }, []);

  const receive = useCallback(
    (snap: Snapshot, initial: boolean) => {
      const { messages } = snap;
      for (const m of messages) lastId.current = Math.max(lastId.current, m.id);
      setStatus(snap.status);
      setHasEmail(snap.hasEmail);
      hasEmailRef.current = snap.hasEmail;
      if (snap.status !== null) setActive(true);
      if (messages.length) setItems((prev) => merge(prev, messages));

      const owners = messages.filter((m) => m.direction === "owner");
      if (owners.length) {
        ownerReplied.current = true;
        window.clearTimeout(promptTimer.current);
        const newest = owners[owners.length - 1]!;
        maxOwnerId.current = Math.max(maxOwnerId.current, newest.id);
        if (openRef.current) {
          markSeen(maxOwnerId.current);
        } else if (initial) {
          // a new tab or a reload: count only what arrived since the visitor last looked
          if (seen.current === null) markSeen(maxOwnerId.current);
          else {
            const since = seen.current;
            setUnread(owners.filter((m) => m.id > since).length);
          }
        } else {
          setUnread((n) => n + owners.length);
        }
        if (!initial)
          setAnnounce(
            openRef.current ? `${COPY.owner}: ${newest.body}` : COPY.newMessage,
          );
      }

      const firstVisitor = messages.find((m) => m.direction === "visitor");
      if (firstVisitor) {
        if (!first.current)
          first.current = {
            at: Date.parse(firstVisitor.createdAt) || Date.now(),
            id: firstVisitor.id,
          };
        else if (first.current.id === null) first.current.id = firstVisitor.id;
      }
      armPrompt();
    },
    [armPrompt, markSeen],
  );

  const poll = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    try {
      const snap = await fetchMessages(lastId.current);
      if (snap) receive(snap, false);
    } finally {
      polling.current = false;
    }
  }, [receive]);

  // History on load: one GET; `status: null` means no conversation, and then nothing polls until a first send.
  useEffect(() => {
    seen.current = Number(storageGet("local", SEEN_KEY)) || null;
    let live = true;
    void fetchMessages(0).then((snap) => {
      if (live && snap) receive(snap, true);
    });
    return () => {
      live = false;
    };
  }, [receive]);

  // Polling: every 3 s while open and visible, every 20 s while closed, paused while the tab is hidden.
  useEffect(() => {
    if (!active || !visible) return;
    const every = open ? POLL_OPEN_MS : POLL_CLOSED_MS;
    let stop = false;
    let timer: number | undefined;
    const tick = async () => {
      await poll();
      if (!stop) timer = window.setTimeout(tick, every);
    };
    timer = window.setTimeout(tick, open ? 0 : every);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [active, visible, open, poll]);

  useEffect(
    () => () => {
      window.clearTimeout(promptTimer.current);
      window.clearTimeout(slowTimer.current);
    },
    [],
  );

  // Focus moves into the panel when the visitor opens it (not when it reopens itself on the next page).
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    // On a phone the textarea would pop the keyboard over the history; the panel itself takes focus.
    (sheet ? dialog.current : textarea.current)?.focus();
  }, [open, sheet]);

  // Newest message in view, unless the visitor scrolled up to read.
  useLayoutEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [items, open, status, emailState]);

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value);
    storageSet("session", OPEN_KEY, value ? "1" : "0");
  }, []);

  function openPanel() {
    focusOnOpen.current = true;
    stick.current = true;
    setUnread(0);
    markSeen(maxOwnerId.current);
    setOpen(true);
  }

  // A "Contact now" button elsewhere on the page opens the panel (open-event.ts, owner 11-27).
  const openPanelRef = useRef(openPanel);
  useEffect(() => {
    openPanelRef.current = openPanel;
  });
  useEffect(() => {
    if (openFirst) storageSet("session", OPEN_KEY, "1");
    // Already open: the click moves focus to the message box.
    const onOpen = () =>
      openRef.current ? textarea.current?.focus() : openPanelRef.current();
    window.addEventListener(LIVE_CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(LIVE_CHAT_OPEN_EVENT, onOpen);
  }, [openFirst]);

  function closePanel() {
    setOpen(false);
    // after the panel is gone
    requestAnimationFrame(() => launcher.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => setClock(now()), CLOCK_MS);
    return () => window.clearInterval(t);
  }, [open]);

  function patch(key: string, fields: Partial<Msg>) {
    setItems((prev) =>
      prev.map((it) =>
        it.kind === "msg" && it.key === key ? { ...it, ...fields } : it,
      ),
    );
  }

  async function send(text: string, retryOf?: Msg) {
    const body = retryOf ? retryOf.body : text.trim().slice(0, MAX_TEXT);
    if (!body || busy || slow) return;
    setBusy(true);
    stick.current = true;
    const key = retryOf?.key ?? `l${++seq.current}`;
    if (retryOf) patch(key, { state: "pending" });
    else {
      setItems((prev) => [
        ...prev,
        {
          kind: "msg",
          key,
          id: null,
          direction: "visitor",
          body,
          at: now(),
          state: "pending",
          retry: false,
        },
      ]);
      setInput("");
      if (textarea.current) textarea.current.style.height = "";
    }
    const sentAt = now();
    const res = await sendMessage({
      text: body,
      pageUrl: window.location.href,
      website: honeypot.current?.value ?? "",
      ...(retryOf?.id != null ? { retryOf: retryOf.id } : {}),
      // the server keeps it for the topic's first context message only
      ...(!active && !retryOf && document.referrer
        ? { referrer: document.referrer.slice(0, 4096) }
        : {}),
    });

    if (res.kind === "ok" || res.kind === "undelivered") {
      const { message } = res;
      const state = res.kind === "ok" ? "sent" : "failed";
      setItems((prev) =>
        prev
          .filter(
            (it) =>
              !(it.kind === "msg" && it.id === message.id && it.key !== key),
          )
          .map((it) =>
            it.kind === "msg" && it.key === key
              ? { ...it, id: message.id, state, retry: true }
              : it,
          ),
      );
      setStatus("open");
      setActive(true);
      if (!first.current) first.current = { at: sentAt, id: message.id };
      armPrompt();
    } else if (res.kind === "slow") {
      if (retryOf) patch(key, { state: "failed" });
      else {
        // not stored: the bubble goes and the text returns to the box
        setItems((prev) => prev.filter((it) => it.key !== key));
        setInput((cur) => cur || body);
      }
      setSlow(true);
      window.clearTimeout(slowTimer.current);
      slowTimer.current = window.setTimeout(() => setSlow(false), SLOW_MS);
    } else {
      patch(key, { state: "failed", retry: res.kind === "network" });
    }
    setBusy(false);
  }

  async function submitEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value || emailState === "busy") return;
    setEmailState("busy");
    const res = await sendEmail(value);
    setEmailState(res === "ok" ? "done" : res);
    if (res === "ok") {
      setHasEmail(true);
      hasEmailRef.current = true;
    }
  }

  // Not modal (owner, 11-28): no fade layer, no scroll lock and no Tab cycle; the page stays usable. Tab follows the
  // DOM: the launcher, then the panel's controls, then on. Esc closes while focus is in the panel or on the launcher.
  function onDialogKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    // handled here, so a site popup listening on window (useModal) ignores it
    e.preventDefault();
    closePanel();
  }

  // Geometry: the launcher sits 16 px above the bottom, its right edge on the nav's top-right button's (owner, 11-27),
  // and the panel a gap above it, its right edge on the same line (owner's design, 11-28; on a phone it keeps 16 px
  // gutters). The consent card sits bottom-right: while it shows, whichever of the two would meet it is lifted above it.
  // The footer lifts the launcher too, a gap above its top border while it is on screen; the higher lift wins. The
  // lift follows the scroll directly, with no transition to lag behind it.
  const base = 16;
  const launcherLeft = edge - LAUNCHER;
  const panelLeft = Math.max(16, edge - PANEL_WIDTH);
  const [cardTop = 0, cardLeft = 0, cardRight = 0] =
    consentPending && card ? card.split(":").map(Number) : [];
  const aboveCard = (left: number) =>
    cardTop > 0 && left < cardRight + GAP && edge > cardLeft - GAP
      ? cardTop + GAP
      : 0;
  const launcherBottom = Math.max(
    base,
    aboveCard(launcherLeft),
    footer > 0 ? footer + GAP : 0,
  );
  const panelBottom = Math.max(
    launcherBottom + LAUNCHER + GAP,
    aboveCard(panelLeft),
  );
  const [vvTop = 0, vvHeight = 0, layoutHeight = 0] = viewport
    ? viewport.split(":").map(Number)
    : [];
  const safe = "env(safe-area-inset-bottom, 0px)";
  // How much of the layout viewport the on-screen keyboard covers (0 when it is down, or when the browser shrinks the
  // layout viewport itself). A fixed panel is placed against the layout viewport, so it is lifted by this much.
  const keyboard =
    vvHeight > 0 ? Math.max(0, layoutHeight - (vvTop + vvHeight)) : 0;

  // Up to 700 px tall, shrinking with the window so it stays clear of the site nav above and the launcher below.
  // A phone gets this floating panel too, never a full-screen sheet (owner, 11-27: "it's confusing on the phone");
  // while a keyboard is up it sits just above it.
  const panelBox = {
    left: `max(16px, ${edge - PANEL_WIDTH}px)`,
    width: `min(${PANEL_WIDTH}px, calc(100% - 32px))`,
  };
  const panelStyle: React.CSSProperties =
    keyboard > 40
      ? {
          ...panelBox,
          bottom: keyboard + 8,
          height: Math.max(160, Math.min(PANEL_HEIGHT, vvHeight - 16)),
        }
      : {
          ...panelBox,
          bottom: `calc(${panelBottom}px + ${safe})`,
          height: `min(${PANEL_HEIGHT}px, calc(100dvh - ${panelBottom + NAV_CLEAR}px - ${safe}))`,
        };

  const thread = threadRows(items, clock);

  const canSend = input.trim().length > 0 && !busy && !slow;

  return (
    <>
      <div
        className="fixed z-[55]"
        style={{
          left: launcherLeft,
          bottom: `calc(${launcherBottom}px + ${safe})`,
        }}
      >
        <button
          ref={launcher}
          type="button"
          aria-label={
            open
              ? COPY.close
              : unread
                ? `${COPY.open}, ${COPY.unread(unread)}`
                : COPY.open
          }
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => (open ? closePanel() : openPanel())}
          onKeyDown={(e) => {
            // While open, the ✕ closes on Esc like the panel.
            if (!open || e.key !== "Escape") return;
            e.preventDefault();
            closePanel();
          }}
          className={styles.launcher}
          style={{ width: LAUNCHER, height: LAUNCHER }}
        >
          {/* Both faces stay mounted, so they crossfade (live-chat.module.css). */}
          <span className={styles.face} data-on={!open}>
            <LauncherIcon />
          </span>
          <span className={styles.face} data-on={open} aria-hidden="true">
            <CloseIcon className="h-5 w-5" />
          </span>
        </button>
        {unread > 0 && !open && (
          <span
            aria-hidden="true"
            className="bg-accent text-foreground pointer-events-none absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold shadow"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>

      {open && (
        <div
          ref={dialog}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={onDialogKeyDown}
          className={`text-foreground border-border bg-background fixed z-[55] flex flex-col overflow-hidden rounded-2xl border outline-none ${styles.panel}`}
          style={panelStyle}
        >
          {/* On the page's cream: notes are the muted grey (5.1:1 on it); Kirill's bubbles, the cards and the message
              field are white with the border colour around them, since white alone is 1.06:1 against the cream. */}
          <div className="border-border flex shrink-0 items-center gap-3 border-b py-3 pr-2 pl-4">
            <span className="relative shrink-0" aria-hidden="true">
              <span className="bg-foreground text-background flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold">
                {COPY.initial}
              </span>
              <span className="ring-background absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2" />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="text-base leading-tight font-semibold"
              >
                {COPY.name}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-[13px] leading-snug">
                {COPY.status}
              </p>
            </div>
            {/* Closes the chat from inside the dialog; the launcher's ✕ and Esc do the same. */}
            <button
              type="button"
              aria-label={COPY.minimise}
              onClick={closePanel}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-foreground flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m6 9 6 6 6-6"
                />
              </svg>
            </button>
          </div>

          <div
            ref={list}
            tabIndex={0}
            aria-label={COPY.title}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            }}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 text-[15px] leading-snug outline-none"
          >
            <DayDivider label={thread.firstDay} first />
            <Bubble
              direction="owner"
              body={COPY.greeting}
              tight={false}
              meta={thread.greetingMeta}
            />
            {thread.rows.map(({ it, day, tight, meta }) => {
              if (it.kind === "email")
                return (
                  <div
                    key={it.key}
                    className="border-border mt-3 max-w-[85%] self-start rounded-2xl border bg-white px-3.5 py-2.5"
                  >
                    <p>{COPY.emailPrompt}</p>
                    {hasEmail || emailState === "done" ? (
                      <p className="text-muted-foreground mt-2">
                        {COPY.emailThanks}
                      </p>
                    ) : (
                      <form onSubmit={submitEmail} className="mt-2 flex gap-2">
                        <label htmlFor={emailId} className="sr-only">
                          {COPY.emailLabel}
                        </label>
                        <input
                          id={emailId}
                          type="email"
                          required
                          maxLength={254}
                          autoComplete="email"
                          placeholder={COPY.emailLabel}
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailState !== "busy") setEmailState("idle");
                          }}
                          className="border-border placeholder:text-muted-foreground min-w-0 flex-1 rounded-lg border bg-white px-2 py-1 text-base sm:text-sm"
                        />
                        <button
                          type="submit"
                          disabled={emailState === "busy"}
                          className={`${cta.cta} ${cta.small}`}
                        >
                          {COPY.emailSend}
                        </button>
                      </form>
                    )}
                    {(emailState === "invalid" || emailState === "failed") && (
                      <p role="alert" className="mt-1 text-xs">
                        {emailState === "invalid"
                          ? COPY.emailInvalid
                          : COPY.emailFailed}
                      </p>
                    )}
                  </div>
                );
              return (
                <Fragment key={it.key}>
                  {day && <DayDivider label={day} />}
                  <Bubble
                    direction={it.direction}
                    body={it.body}
                    tight={tight}
                    meta={meta}
                    state={it.direction === "visitor" ? it.state : undefined}
                    onRetry={
                      it.state === "failed" && it.retry
                        ? () => void send(it.body, it)
                        : undefined
                    }
                    retryDisabled={busy || slow}
                  />
                </Fragment>
              );
            })}
            {status === "closed" && (
              <p className="text-muted-foreground mt-3 text-center text-xs">
                {COPY.closed}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="border-border relative shrink-0 border-t p-3"
          >
            {slow && (
              <p
                role="status"
                className="text-muted-foreground px-1 pb-1.5 text-xs"
              >
                {COPY.slowDown}
              </p>
            )}
            {/* One white field: the text, and the send button at its end. The field shows the focus ring. */}
            <div className="border-border focus-within:outline-primary flex items-end gap-1 rounded-xl border bg-white p-1 pl-3.5 focus-within:outline-2">
              <label htmlFor={inputId} className="sr-only">
                {COPY.inputLabel}
              </label>
              <textarea
                ref={textarea}
                id={inputId}
                rows={1}
                maxLength={MAX_TEXT}
                value={input}
                placeholder={COPY.placeholder}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    if (canSend) void send(input);
                  }
                }}
                className="placeholder:text-muted-foreground block max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-base leading-snug outline-none sm:text-[15px]"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label={COPY.send}
                className="bg-accent text-foreground disabled:bg-muted disabled:text-muted-foreground focus-visible:outline-foreground flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.25}
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19V5m-6 6 6-6 6 6"
                  />
                </svg>
              </button>
            </div>
            {/* Honeypot (contract: `website` must be empty): off screen, out of the tab order, unseen by people. */}
            <input
              ref={honeypot}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              defaultValue=""
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />
          </form>
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </>
  );
}

function DayDivider({ label, first }: { label: string; first?: boolean }) {
  return (
    <p
      className={`text-muted-foreground text-center text-xs ${first ? "" : "mt-4"}`}
    >
      {label}
    </p>
  );
}

function Bubble({
  direction,
  body,
  tight,
  meta,
  state,
  onRetry,
  retryDisabled,
}: {
  direction: Direction;
  body: string;
  /** Follows a bubble of the same side: the small gap. */
  tight: boolean;
  /** "Kirill · just now", under the last bubble of a run of his. */
  meta: string | null;
  state?: Msg["state"];
  onRetry?: () => void;
  retryDisabled?: boolean;
}) {
  if (direction === "system")
    return (
      <p className="text-muted-foreground mt-3 px-4 text-center text-xs whitespace-pre-wrap">
        {body}
      </p>
    );
  const owner = direction === "owner";
  // A video-call link of Kirill's becomes a card; the link leaves the text, which the card would only repeat.
  const call = videoCall(direction, body);
  const text = call ? call.rest : body;
  const note = "text-muted-foreground mt-1 px-1 text-xs";
  return (
    <div
      className={`flex max-w-[85%] flex-col ${tight ? "mt-1.5" : "mt-3"} ${owner ? "items-start self-start" : "items-end self-end"}`}
    >
      {/* A text node, never HTML: whatever the visitor or the owner typed shows as typed. */}
      {text && (
        <p
          className={`rounded-2xl px-3.5 py-2.5 break-words whitespace-pre-wrap ${
            owner
              ? "border-border text-foreground border bg-white"
              : "bg-foreground text-background"
          }`}
        >
          <span className="sr-only">{owner ? COPY.owner : COPY.you}: </span>
          {text}
        </p>
      )}
      {call && (
        <div
          className={`border-border flex max-w-full items-center gap-3 rounded-2xl border bg-white p-3 ${text ? "mt-1.5" : ""}`}
        >
          <span className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5 21 7.5v9l-5.25-3M4.5 6.75h9a2.25 2.25 0 0 1 2.25 2.25v6a2.25 2.25 0 0 1-2.25 2.25h-9A2.25 2.25 0 0 1 2.25 15V9A2.25 2.25 0 0 1 4.5 6.75Z"
              />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            {!text && <span className="sr-only">{COPY.owner}: </span>}
            <span className="block text-sm font-semibold">
              {COPY.videoCall}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              {call.host}
            </span>
          </span>
          <a
            href={call.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent text-foreground focus-visible:outline-foreground flex h-11 shrink-0 items-center rounded-lg px-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {COPY.joinCall}
          </a>
        </div>
      )}
      {meta && <span className={note}>{meta}</span>}
      {state === "pending" && <span className={note}>{COPY.sending}</span>}
      {state === "failed" && (
        <span className={note}>
          {COPY.notDelivered}
          {onRetry && (
            <>
              {" "}
              <button
                type="button"
                onClick={onRetry}
                disabled={retryDisabled}
                className="text-foreground cursor-pointer font-medium underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {COPY.retry}
              </button>
            </>
          )}
        </span>
      )}
    </div>
  );
}
