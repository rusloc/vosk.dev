"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ContactForm } from "@/components/contact-form";

/**
 * Nav CTA — opens a small popup with the same contact form as the Contacts
 * page, so visitors can send a message without leaving the page.
 */
export function SendMessageButton({
  locale,
  dict,
  className,
  label,
  variant = "solid",
}: {
  locale: Locale;
  dict: Dictionary;
  className?: string;
  /** Button text; defaults to the dialog's "Message" label. */
  label?: string;
  /** "solid" = dark button (nav); "inverse" = light button on a dark surface (CTA). */
  variant?: "solid" | "inverse";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "h-10 cursor-pointer items-center justify-center rounded-md px-5 text-sm font-medium transition-opacity hover:opacity-90",
          variant === "inverse"
            ? "bg-background text-foreground"
            : "bg-foreground text-background",
          className,
        )}
      >
        {label ?? dict.sendDialog.open}
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
              aria-label={dict.sendDialog.ariaLabel}
              onClick={(e) => e.stopPropagation()}
              className="border-border bg-background relative w-full max-w-md rounded-lg border p-6 shadow-xl"
            >
              <button
                type="button"
                aria-label={dict.sendDialog.close}
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground absolute top-3 right-3 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md"
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

              <h2 className="text-lg font-semibold tracking-tight">
                {dict.sendDialog.title}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {dict.sendDialog.subtitle}
              </p>

              <div className="mt-5">
                <ContactForm locale={locale} dict={dict} />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
