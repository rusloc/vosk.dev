"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./cta-button.module.css";

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
  children,
}: {
  label: string;
  title: string;
  closeLabel: string;
  href?: string;
  /** Open on arrival when the page URL carries one of these keys: a shared link (F-37) lands inside the report. */
  openOnQuery?: readonly string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (!openOnQuery?.some((key) => query.has(key))) return;
    // deferred a tick: the page hydrates closed (it is static), then the shared link opens the report
    const t = setTimeout(() => setOpen(true), 0);
    return () => clearTimeout(t);
  }, [openOnQuery]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A pop-up inside the report (a filter flyout, an info pop-up) closes itself first; Escape there must not
      // close the whole report as well.
      const inner = document.activeElement?.closest('[role="dialog"]');
      if (inner && inner !== dialog.current) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

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
        >
          {label}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={styles.cta}
        >
          {label}
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
              onClick={(e) => e.stopPropagation()}
              className="border-border bg-background flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-lg border shadow-xl"
            >
              <div className="border-border flex items-center justify-between gap-4 border-b py-1.5 pr-1.5 pl-4">
                <p className="truncate text-sm font-medium">{title}</p>
                <button
                  type="button"
                  aria-label={closeLabel}
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              {/* Scrolls for a native dashboard taller than the box; an iframe fills it. */}
              <div className="bg-muted min-h-0 flex-1 overflow-auto">
                {children}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
