"use client";

import { useSyncExternalStore } from "react";
import { GoogleTagManager } from "@next/third-parties/google";
import { defaultLocale, localizedPath } from "@/lib/i18n/config";

const STORAGE_KEY = "vosk.consent";
type Consent = "granted" | "denied";

// Tiny external store over localStorage so consent survives reloads and stays
// in sync across tabs — read via useSyncExternalStore (no effect, no hydration
// mismatch: server/first paint use getServerSnapshot below).
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readConsent(): Consent | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "granted" || v === "denied" ? v : null;
}
function writeConsent(choice: Consent | null) {
  if (choice) localStorage.setItem(STORAGE_KEY, choice);
  else localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((l) => l());
}

/**
 * The /privacy page's "Change cookie choice" (R-06): forgets the choice, so the consent card shows again. Analytics
 * already loaded in this tab stays until the next page load.
 */
export function ChangeConsentButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => writeConsent(null)}
      className="border-border hover:bg-muted cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors"
    >
      {label}
    </button>
  );
}

/**
 * Send `generate_lead` to GA4 (contact-form success). The container is a Google
 * tag: it reads gtag-style commands (an `arguments` object) from `dataLayer` and
 * ignores plain `{ event }` objects (probed 2026-11-18). Safe no-op when GTM never
 * loaded (unset id or declined consent): the push sits in `dataLayer`, unsent.
 */
export function trackLead() {
  trackEvent("generate_lead");
}

/** A GA4 event that is not a click (clicks go through `data-ga`, `src/lib/analytics.ts`). */
export function trackEvent(name: string, params?: Record<string, string>) {
  gtag("event", name, params);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: unknown[]) {
  const w = window as unknown as { dataLayer?: unknown[] };
  // eslint-disable-next-line prefer-rest-params
  (w.dataLayer ??= []).push(arguments);
}

/**
 * Consent-gated analytics. Renders nothing until the visitor accepts:
 * - no `gtmId` → no banner, no script (build-safe no-op before GA go-live);
 * - undecided → tiny bottom-right accept/decline card;
 * - accepted → inject GTM; declined → stay dark.
 */
export function Analytics({ gtmId }: { gtmId?: string }) {
  const consent = useSyncExternalStore(subscribe, readConsent, () => null);

  if (!gtmId) return null;
  if (consent === "granted") return <GoogleTagManager gtmId={gtmId} />;
  if (consent === "denied") return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="border-border bg-background fixed right-4 bottom-16 z-[70] w-64 rounded-lg border p-3 text-xs shadow-lg md:bottom-4"
    >
      <p className="text-muted-foreground">
        I use analytics cookies to see what&apos;s useful and improve the site.{" "}
        <a
          href={localizedPath(defaultLocale, "/privacy")}
          className="hover:text-foreground underline"
        >
          Privacy
        </a>
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => writeConsent("denied")}
          className="text-muted-foreground hover:text-foreground cursor-pointer rounded-md px-2 py-1"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => writeConsent("granted")}
          className="bg-primary text-primary-foreground cursor-pointer rounded-md px-3 py-1 font-medium transition-opacity hover:opacity-90"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
