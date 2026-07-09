"use client";

import { useSyncExternalStore } from "react";
import { GoogleTagManager, sendGTMEvent } from "@next/third-parties/google";

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
function writeConsent(choice: Consent) {
  localStorage.setItem(STORAGE_KEY, choice);
  listeners.forEach((l) => l());
}

/**
 * Fire a `generate_lead` GTM event (e.g. on contact-form success). Safe no-op
 * when GTM never loaded (unset id or declined consent) — the push just sits in
 * `dataLayer` and is never transmitted.
 */
export function trackLead() {
  sendGTMEvent({ event: "generate_lead" });
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
        I use analytics cookies to see what&apos;s useful and improve the site.
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
