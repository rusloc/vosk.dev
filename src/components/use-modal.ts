"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * A modal popup's page-level wiring while `open`: Escape closes it, the page behind does not scroll, and with a `dialog`
 * ref focus moves into the popup. Shared by <ReportDialog>, <SendMessageButton> and <ConditionsButton>.
 *
 * Nested popups close top-first: an Escape something else already handled (`defaultPrevented`) is ignored, and with a
 * `dialog` ref so is one from a pop-up inside it (a filter flyout, an info pop-up), which closes itself. The scroll lock
 * restores what was there, so a popup opened over another (the chat over the web report) leaves that one locked.
 */
export function useModal(
  open: boolean,
  close: () => void,
  dialog?: RefObject<HTMLElement | null>,
) {
  // The latest `close`, so an inline callback does not re-run the effect (and refocus the popup) on every render.
  const onClose = useRef(close);
  useEffect(() => {
    onClose.current = close;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Read the event's target, not `activeElement`: a report's own handler runs first (document before window) and
      // may already have moved focus back to the opener.
      const inner =
        dialog &&
        e.target instanceof Element &&
        e.target.closest('[role="dialog"]');
      if (inner && inner !== dialog.current) return;
      onClose.current();
    };
    window.addEventListener("keydown", onKey);
    // Focus moves into the popup, so Escape closes the top one only (the chat over the report, 11-06).
    dialog?.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, dialog]);
}
