/**
 * The n8n workflows shown on /work (`platform: "automation"` showcases). Each is a public copy of a live workflow in
 * `data/n8n/<flow>.json`, exported with `scripts/n8n-export.ts` (no credentials, no ids, no private host). The page
 * draws it with n8n's <n8n-demo> component (components/n8n-workflow.tsx). Client-safe: no server module, no secret.
 */
export type N8nFlow =
  | "inbox-to-sheet"
  | "invoice-pdf-to-sheet"
  // The Tidewell "email me this" workflow (11-16). Its export may land after the code: until
  // data/n8n/ceo-digest-email.json exists, `hasN8nFlow` is false and the page leaves the canvas button out.
  | "ceo-digest-email";

/**
 * One workflow's JSON, as a chunk of its own, fetched only when asked for (the popup opening). The path is a pattern,
 * not a literal, so the bundler takes whatever `data/n8n/*.json` holds at build: a flow whose export is not there yet
 * is a rejected promise at run time, not a failed build.
 */
export function loadN8nFlow(flow: N8nFlow): Promise<{ default: unknown }> {
  return import(`../../data/n8n/${flow}.json`);
}

/** Whether a flow's public copy is in the build: the page shows its canvas button only then. */
export const hasN8nFlow = (flow: N8nFlow): Promise<boolean> =>
  loadN8nFlow(flow).then(
    () => true,
    () => false,
  );
