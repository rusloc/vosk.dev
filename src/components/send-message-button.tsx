"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ContactForm } from "@/components/contact-form";
import { ga } from "@/lib/analytics";
import { CloseIcon } from "./close-icon";
import styles from "./cta-button.module.css";
import { useModal } from "./use-modal";

/**
 * Nav CTA — opens a small popup with the same contact form as the Contacts
 * page, so visitors can send a message without leaving the page.
 *
 * It's an `<a href="/contact">` whose click is intercepted, not a `<button>`:
 * this and the services banner were the site's two conversion CTAs, and as
 * buttons they left /contact reachable from the nav alone — no link equity, and
 * nothing at all without JS. The dialog is the enhancement; the link is the
 * baseline.
 */
export function SendMessageButton({
  locale,
  dict,
  className,
  label,
}: {
  locale: Locale;
  dict: Dictionary;
  className?: string;
  /** Button text; defaults to the dialog's "Message" label. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  useModal(open, () => setOpen(false));

  return (
    <>
      <a
        href={localizedPath(locale, "/contact")}
        onClick={(e) => {
          // Let modified clicks (new tab, save) and non-primary buttons through
          // to the real /contact page.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          setOpen(true);
        }}
        className={cn(styles.cta, className)}
        {...ga("contact_open")}
      >
        {label ?? dict.sendDialog.open}
      </a>

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
                <CloseIcon className="h-4 w-4" />
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
