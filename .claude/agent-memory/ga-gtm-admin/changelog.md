---
name: changelog
description: Newest-first log of GA4/GTM changes and audits on vosk.dev with version ids, published or not, previous live version
metadata:
  type: project
---

- **2026-11-18 Ads link attempt: FAILED, nothing created.** Authorised to create one googleAdsLinks object
  (customer 2219903697, adsPersonalizationEnabled false). Pre-read: no links. `POST /v1beta/properties/565065076/googleAdsLinks`
  with an analytics.edit SA token → 403 PERMISSION_DENIED "The caller does not have permission"; GET after → 200 `{}`.
  Handed to the owner to link by hand in GA Admin → Product links → Google Ads links.
- **2026-11-18 audit (read-only, this agent's first run).** No writes. GTM live = latest = v3, Default Workspace
  clean, no stray workspaces, no `dest_ga`. GA4: no data yet in standard reports or realtime. Proposed: email_click
  and booking_click via data-ga, key events, UTM convention, Ads link, landing-UTM loss before consent. Nothing executed.
- **2026-11-18 v3 "ga-setup click tracking"** published (via `scripts/ga-setup.mjs`, before this agent existed):
  click trigger + GA4 event tag + 3 CJS variables + Click Element. Previous live: v2. Site code live 13:03 (`39a2699`).
- **2026-11-18 v2 "ga-setup 2026-11-18"** published ~12:29: Google tag G-2FXCM9DL8S on Initialization - All Pages.
  Same run: key event generate_lead, retention 14 months. Previous live: v1 "Empty Container".
