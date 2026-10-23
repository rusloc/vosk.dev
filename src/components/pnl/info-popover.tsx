"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { CloseIcon } from "./icons";
import type { InfoCopy } from "./info-copy";
import styles from "./views.module.css";

// L-15 (ADR-0007): an (i) button in a visual's title row opens what it shows · how to read it · an example · one
// watch-out. Escape, ✕ and an outside click close it; focus moves in on open and back to the button on close (N-08).

/** `**bold**` → <strong>, the only markup the shared copy uses. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text
        .split("**")
        .map((part, i) =>
          i % 2 ? (
            <strong key={i}>{part}</strong>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          ),
        )}
    </>
  );
}

export function InfoPopover({ copy }: { copy: InfoCopy }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const ctrl = new AbortController();
    const close = () => {
      setOpen(false);
      button.current?.focus();
    };
    window.addEventListener("keydown", (e) => e.key === "Escape" && close(), {
      signal: ctrl.signal,
    });
    window.addEventListener(
      "pointerdown",
      (e) => {
        const t = e.target as Node;
        if (!panel.current?.contains(t) && !button.current?.contains(t))
          close();
      },
      { signal: ctrl.signal },
    );
    return () => ctrl.abort();
  }, [open]);

  return (
    <span className={styles.infoAnchor}>
      <button
        ref={button}
        type="button"
        className={styles.infoButton}
        aria-label={`About: ${copy.title}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        i
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          role="dialog"
          aria-label={copy.title}
          tabIndex={-1}
          className={styles.infoPanel}
        >
          <div className={styles.infoHead}>
            <span className={styles.infoTitle}>{copy.title}</span>
            <button
              type="button"
              aria-label="Close"
              className={styles.infoClose}
              onClick={() => {
                setOpen(false);
                button.current?.focus();
              }}
            >
              <CloseIcon />
            </button>
          </div>
          <h3 className={styles.infoHeading}>What it shows</h3>
          <p>
            <Rich text={copy.shows} />
          </p>
          <h3 className={styles.infoHeading}>How to read it</h3>
          <ul>
            {copy.read.map((r) => (
              <li key={r}>
                <Rich text={r} />
              </li>
            ))}
          </ul>
          <h3 className={styles.infoHeading}>For example</h3>
          <p className={styles.infoExample}>“{copy.example}”</p>
          <h3 className={styles.infoHeading}>Watch out</h3>
          <p>
            <Rich text={copy.watch} />
          </p>
        </div>
      )}
    </span>
  );
}
