---
name: conventions
description: How vosk.dev sends events (data-ga attribute contract, gtag-arguments pushes, consent gate), GTM naming, setup-as-code script, and do/don't rules
metadata:
  type: project
---

## How the site sends events
- **Consent gate:** `src/components/analytics.tsx` loads GTM only after the visitor clicks Accept (localStorage
  `vosk.consent`). No Consent Mode. Declined/undecided visitors send nothing. Tags therefore keep
  `consentStatus: notSet` (fine: nothing loads pre-consent).
- **Clicks = markup, not code:** put `{...ga(event, id?, type?)}` (`src/lib/analytics.ts`) on the element. It renders
  `data-ga` / `data-ga-id` / `data-ga-type`. Works in Server Components (plain function, no 'use client').
  GTM's one trigger "Click - data-ga" (All Elements click, `[data-ga], [data-ga] *`) + tag "GA4 event - data-ga click"
  send event name = `data-ga`, `content_id` = `data-ga-id`, `content_type` = `data-ga-type`.
  **A new click event needs code only, no GTM change.**
- **Non-clicks:** `trackEvent(name, params)` pushes a gtag **arguments** command; a plain `{event}` dataLayer push is
  ignored by this container (probed 11-18). `trackLead()` = `trackEvent("generate_lead")`.
- `content_id` / `content_type` land in GA4's built-in dimensions `contentId` / `contentType` (Data API accepts them):
  **do not register custom dimensions for them**.
- Value vocabulary in use: content_type `power_bi | web_report | n8n_workflow | showcase | related_showcase | work | services`.

## Setup as code
- `scripts/ga-setup.mjs` (idempotent; dry run unless `--apply`): Google tag, Click Element, 3 CJS variables, the click
  trigger and tag, drops auto-added `dest_ga` + gtag configs, version + publish, key event generate_lead, retention 14 mo.
  Dry run = the drift audit. It only looks at `workspace[0]` and matches objects by name (does not update changed bodies).

## Naming in the container
- `Google tag - G-…`, `GA4 event - <what>`, `Click - <what>`, `CJS - <what>` (custom JS variable). No folders.

## Rules
- Pace GTM API calls (quota 429 after ~15/min). Never open `.env*` or the key file.
