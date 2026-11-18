---
name: ids
description: GA4 and GTM ids for vosk.dev (account, property, stream, measurement id, GTM account/container numeric + public ids, workspace, service account), which is production
metadata:
  type: reference
---

All observed from the tools on 2026-11-18.

## GA4 (production, the only property)
- Account `416892705` "vosk.dev"
- Property `565065076` "vosk.dev" (created 2026-11-18 08:53 UTC), time zone `Europe/Istanbul`, currency `USD`,
  industry OTHER, standard (not 360)
- Web stream `properties/565065076/dataStreams/16365561197` "vosk", default URI `https://vosk.dev`,
  measurement id **`G-2FXCM9DL8S`**

## Google Ads
- Customer id `221-990-3697` (API `customerId` `2219903697`), for the paid test campaign (owner, 2026-11-18).
  Not linked to GA yet as of 2026-11-18: the API link attempt got a 403 (see changelog).

## GTM
- Account `6406063037`
- **Live container `GTM-W5TDFQQJ`** = container `287484976` "vosk.dev", web, classic (supportGtagConfigs false).
  Site env `NEXT_PUBLIC_GTM_ID=GTM-W5TDFQQJ` (Vercel Production + Preview).
- Only workspace: `4` "Default Workspace".
- `GTM-PX3R5J8F`: Google-tag-style container auto-made by GA, not on the site, no API. Ignore it.

## Credentials (pointers only, never read or print)
- Service account `claude@vosk-515109.iam.gserviceaccount.com` (GTM account Admin + container Publish, GA property Admin).
- Key file path comes from env `GA_SA_KEY_FILE`. MCP `ga` also needs `GA_GCP_PROJECT`.
