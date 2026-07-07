"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ContactForm } from "@/components/contact-form";

/**
 * Nav CTA — opens a small popup with the same contact form as the Contacts
 * page, so visitors can send a message without leaving the page.
 */
export function SendMessageButton({ className }: { className?: string }) {
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
          "border-border bg-background hover:bg-muted inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors",
          className,
        )}
      >
        Message
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Send a message"
            onClick={(e) => e.stopPropagation()}
            className="border-border bg-background relative w-full max-w-md rounded-lg border p-6 shadow-xl"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md"
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
              Send a message
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Straight into my inbox — I&apos;ll get back to you soon.
            </p>

            <div className="mt-5">
              <ContactForm />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
