"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { GaAttrs } from "@/lib/analytics";
import { CloseIcon } from "./close-icon";
import styles from "./cta-button.module.css";
import { useModal } from "./use-modal";

const SIZE_CLASS = {
  full: "h-full max-w-[1600px]",
  panel: "h-[min(760px,100%)] max-w-[560px]",
  // 16:9, as large as fits: 1280px wide at most, or the height of the viewport less the backdrop's padding
  wide: "h-[min(760px,100%)] max-w-[560px] lg:aspect-video lg:h-auto lg:w-[min(1280px,100%,calc((100dvh-2rem)*16/9))] lg:max-w-none",
} as const;

/**
 * A live report behind a button, in a near-full-screen popup. The showcase page is
 * text a crawler can read; the embed — an iframe it can't — mounts only on request.
 *
 * Same idiom as <SendMessageButton>: with a public report URL the trigger is a real
 * link to it (new tab, works without JS) whose plain click is intercepted. A
 * guest-token dashboard has no URL, so it gets a button.
 */
export function ReportDialog({
  label,
  title,
  closeLabel,
  href,
  openOnQuery,
  openOnHash,
  trigger,
  size = "full",
  defaultOpen = false,
  ga,
  children,
}: {
  label: string;
  title: string;
  closeLabel: string;
  href?: string;
  /** Open on arrival when the page URL carries one of these keys: a shared link (F-37) lands inside the report. */
  openOnQuery?: readonly string[];
  /** …or when its hash is one of these (a report whose view travels in the hash, e.g. ACME Marketing's `#campaigns`). */
  openOnHash?: readonly string[];
  /** A trigger of its own (the AI chat button, 11-06): its class and what it shows instead of the label. Default: the CTA. */
  trigger?: { className?: string; content?: ReactNode };
  /** "full": near-full-screen, for a report. "panel": a narrow, tall window, for the chat. "wide": a 16:9 window from
   *  `lg` up (a narrow, tall one below), for a chat beside a stand-in for the client's app (11-16). */
  size?: "full" | "panel" | "wide";
  /** Open as soon as it mounts: the report's chat when the page's Ask AI opened the report (11-06). Client-mounted only. */
  defaultOpen?: boolean;
  /** GA click event on the trigger (`src/lib/analytics.ts`). */
  ga?: GaAttrs;
  /** The popup content; a function gets `close`, for content that closes its own popup (the chat's "Open in report"). */
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hashed = openOnHash?.includes(window.location.hash) ?? false;
    if (!hashed && !openOnQuery?.some((key) => query.has(key))) return;
    // deferred a tick: the page hydrates closed (it is static), then the shared link opens the report
    const t = setTimeout(() => setOpen(true), 0);
    return () => clearTimeout(t);
  }, [openOnQuery, openOnHash]);

  // A pop-up inside the report (a filter flyout, an info pop-up, a slide-over) closes itself first; Escape there must
  // not close the whole report as well.
  useModal(open, () => setOpen(false), dialog);

  return (
    <>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // Modified clicks still open the report in a new tab.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            setOpen(true);
          }}
          className={styles.cta}
          {...ga}
        >
          {label}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={trigger?.className ?? styles.cta}
          {...ga}
        >
          {trigger?.content ?? label}
        </button>
      )}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-2 sm:p-4"
            onClick={() => setOpen(false)}
          >
            <div
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              className={`border-border bg-background flex w-full flex-col overflow-hidden rounded-lg border shadow-xl outline-none ${SIZE_CLASS[size]}`}
            >
              <div className="border-border flex items-center justify-between gap-4 border-b py-1.5 pr-1.5 pl-4">
                <p className="truncate text-sm font-medium">{title}</p>
                <button
                  type="button"
                  aria-label={closeLabel}
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
              {/* Scrolls for a native dashboard taller than the box; an iframe fills it. */}
              <div
                className={`min-h-0 flex-1 ${size === "full" ? "bg-muted overflow-auto" : "overflow-hidden"}`}
              >
                {typeof children === "function"
                  ? children(() => setOpen(false))
                  : children}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
