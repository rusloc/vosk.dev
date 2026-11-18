"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/close-icon";
import { useModal } from "@/components/use-modal";
import { cn } from "@/lib/cn";
import { Icon } from "./service-icons";

export type Conditions = {
  aria: string;
  title: string;
  close: string;
  body: string[];
};

/**
 * Terms/conditions button in a service card's top row, beside the arrow. Opens
 * a portal modal listing the plan's conditions. `className` sets its colour,
 * which differs between the maroon card and the light ones. Same modal mechanics as
 * SendMessageButton (useModal) — Escape to close, body scroll lock, backdrop click.
 */
export function ConditionsButton({
  aria,
  title,
  close,
  body,
  className,
}: Conditions & { className?: string }) {
  const [open, setOpen] = useState(false);
  useModal(open, () => setOpen(false));

  // No terms written yet: no button (11-17, the placeholder text had been live on every card).
  if (body.length === 0) return null;

  return (
    <>
      <button
        type="button"
        aria-label={aria}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors",
          className,
        )}
      >
        <Icon name="document" className="h-5 w-5" />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              onClick={(e) => e.stopPropagation()}
              className="border-border bg-background relative w-full max-w-md rounded-lg border p-6 shadow-xl"
            >
              <button
                type="button"
                aria-label={close}
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground absolute top-3 right-3 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md"
              >
                <CloseIcon className="h-4 w-4" />
              </button>

              <h2 className="pr-8 text-lg font-semibold tracking-tight">
                {title}
              </h2>
              <div className="mt-4 space-y-3">
                {body.map((p, i) => (
                  <p
                    key={i}
                    className="text-muted-foreground text-sm leading-relaxed"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
