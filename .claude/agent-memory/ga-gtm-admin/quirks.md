---
name: quirks
description: GA/GTM MCP and API behaviours on vosk.dev - dest_ga auto tag, GTM quota, realtime incompatibilities, settings the MCP cannot read
metadata:
  type: reference
---

- **GTM `dest_ga`:** creating a GA4 event tag makes GTM auto-add a hidden `dest_ga` tag + gtag configs;
  `create_version` then returns a bare `compilerError` while quick preview passes. Delete them first (ga-setup does).
- **GTM API quota:** 429 after ~15 calls/min. The ga-setup dry run alone uses ~12. Space MCP calls after it.
- **GTM MCP (stape 6.0.1, local):** `gtm_version` action `live` with `resourceType` pages tags/triggers/variables;
  `gtm_workspace` `getStatus` returns `{}` when the workspace has no changes.
- **GA MCP (`analytics-mcp` 1.1.0) is read-only** and cannot see streams, enhanced measurement, retention,
  signals, attribution or user-provided data. Use a scratchpad Node script with an `analytics.readonly` JWT from
  `GA_SA_KEY_FILE` (GET only, never print key/token). v1alpha endpoints work: `enhancedMeasurementSettings`,
  `dataRedactionSettings`, `userProvidedDataSettings`, `googleSignalsSettings`, `attributionSettings`.
- **Google Ads link via API needs the caller to have access to the Ads account too.** The SA is GA property Admin
  but not a user in Ads 2219903697, so `POST googleAdsLinks` → 403 PERMISSION_DENIED (11-18). Have the owner link
  it in the GA UI instead; do not add the SA to Ads unless asked.
- `userProvidedDataSettings` returning only `name` = both flags false (proto3 drops false booleans): collection is OFF.
- **Realtime API:** `eventName` + `activeUsers` → 400 "cannot be queried together". Use `eventCount` with eventName.
- Standard reports on a property created that day return 0 rows (24-48 h lag); realtime covers 30 min only.
- GA batches non-navigating events ~5-10 s: wait that long in browser probes.
