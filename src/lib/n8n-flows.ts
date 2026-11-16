/**
 * The n8n workflows shown on /work (`platform: "automation"` showcases). Each is a public copy of a live workflow in
 * `data/n8n/<flow>.json`, exported with `scripts/n8n-export.ts` (no credentials, no ids, no private host). The page
 * draws it with n8n's <n8n-demo> component (components/n8n-workflow.tsx). Client-safe: types only.
 */
export type N8nFlow = "inbox-to-sheet" | "invoice-pdf-to-sheet";
