/**
 * Where an enquiry came from (ads readiness spec R-07, 11-19). On the first page of a tab the site keeps the landing
 * path and the landing URL's campaign tags in `sessionStorage` (no cookie, gone when the tab closes); the contact
 * form sends them with the message, the server validates them (`leadSourceSchema`, `schema.ts`), and only the owner's
 * notification email shows them. Nothing here goes to GA4, GTM or any third party, and it does not depend on the
 * consent choice. No zod here: this module ships on every page.
 */

/** Campaign parameters kept from the landing URL; every other parameter is ignored. */
export const SOURCE_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
] as const;

/** The form fields that carry the source: the landing path, then the parameters. */
export const SOURCE_FIELDS = ["landing_path", ...SOURCE_PARAMS] as const;
export type LeadSource = Partial<
  Record<(typeof SOURCE_FIELDS)[number], string>
>;

export const SOURCE_MAX = 200;
const STORAGE_KEY = "vosk.source";

/** The source of a landing URL: its path and the known parameters (trimmed, capped), never the full query string. */
export function sourceFromUrl(url: URL): LeadSource {
  const source: LeadSource = {};
  const put = (key: keyof LeadSource, value: string | null) => {
    const v = value?.trim().slice(0, SOURCE_MAX);
    if (v) source[key] = v;
  };
  put("landing_path", url.pathname);
  for (const p of SOURCE_PARAMS) put(p, url.searchParams.get(p));
  return source;
}

/** Browser: keep the first page's source for this tab. Later pages and reloads leave it as it is. */
export function rememberLandingSource(): void {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) !== null) return;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sourceFromUrl(new URL(window.location.href))),
    );
  } catch {
    // Storage blocked (private mode, site data off): the email says the source was not recorded.
  }
}

/** Browser: this tab's stored source as form fields; `[]` when there is none or storage is blocked. */
export function readLandingSource(): [string, string][] {
  try {
    const stored: unknown = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    if (!stored || typeof stored !== "object") return [];
    return SOURCE_FIELDS.flatMap((f) => {
      const v = (stored as Record<string, unknown>)[f];
      return typeof v === "string" ? [[f, v] as [string, string]] : [];
    });
  } catch {
    return [];
  }
}
