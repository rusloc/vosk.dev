# Advanced patterns

## 1. Custom templates via API

A custom template is a `.tpl` text file with sections. Create it, then use its
generated type id on tags/variables.

```python
tpl_text = open("vendor-pixel.tpl").read()   # exported from GTM UI or hand-written
t = gtm.call(gtm.svc.accounts().containers().workspaces().templates().create(
        parent=ws_path, body={"name": "Vendor Pixel", "templateData": tpl_text}))
tag_type = f"cvt_{t['containerId']}_{t['templateId']}"
```

Minimal tag template skeleton (`templateData`):
```
___INFO___
{ "type": "TAG", "id": "cvt_temp_public_id", "version": 1, "securityGroups": [],
  "displayName": "Vendor Pixel", "brand": {"id":"brand_dummy","displayName":""},
  "description": "", "containerContexts": ["WEB"] }

___TEMPLATE_PARAMETERS___
[ { "type": "TEXT", "name": "pixelId", "displayName": "Pixel ID", "simpleValueType": true,
    "valueValidators": [{"type":"NON_EMPTY"}] } ]

___SANDBOXED_JS_FOR_WEB_TEMPLATE___
const sendPixel = require('sendPixel');
const encodeUriComponent = require('encodeUriComponent');
sendPixel('https://vendor.example/p?id=' + encodeUriComponent(data.pixelId),
          data.gtmOnSuccess, data.gtmOnFailure);

___WEB_PERMISSIONS___
[ { "instance": { "key": { "publicId": "send_pixel", "versionId": "1" },
    "param": [ { "key": "allowedUrls", "value": { "type": 1, "string": "specific" } },
               { "key": "urls", "value": { "type": 2, "listItem": [ { "type": 1, "string": "https://vendor.example/" } ] } } ] },
    "isRequired": true } ]

___TESTS___
scenarios: []
```
Permissions must be declared exactly or the compiler rejects the template. When
in doubt, build the template once in the UI (Templates → New), export the
container, copy `templateData` verbatim.

**Gallery import:**
```python
gtm.call(templates().import_from_gallery(parent=ws_path,
    galleryOwner="gtm-templates-simo-ahava", galleryRepository="facebook-pixel",
    galleryTemplate="<sha or omit for latest>", acknowledgePermissions=True))
```
Owner/repo come from the gallery URL `tagmanager.google.com/gallery/#/owners/<owner>/templates/<repo>`.

## 2. Consent mode

Two parts:
1. A **consent default** tag (a template such as a CMP's, or Custom HTML calling
   `gtag('consent','default',{...})`) firing on `CONSENT_INIT` (built-in trigger
   `2147479572`), plus an update tag on the CMP's event.
2. `consentSettings` on every marketing tag:
```json
"consentSettings": { "consentStatus": "NEEDED",
  "consentType": { "type": "LIST", "list": [
    { "type": "STRING", "value": "ad_storage" },
    { "type": "STRING", "value": "ad_user_data" },
    { "type": "STRING", "value": "ad_personalization" } ] } }
```
Google tags (`googtag`, `gaawe`, `awct`, `sp`) have *built-in* consent checks and
don't need `consentSettings`; Custom HTML/Image and third-party templates do.
Audit: list tags, flag any `html`/`img`/`cvt_*` with `consentStatus` ≠ `NEEDED`.

## 3. Tag sequencing (setup / teardown) vs priority

- `priority` only orders *dispatch*; async tags overlap. Use it for "load the
  base library slightly earlier".
- **Setup tag**: fire another tag first and optionally abort if it fails:
  `"setupTag": [{ "tagName": "GT - Google tag", "stopOnSetupFailure": true }]`
  (referenced by *name*; the setup tag needs no trigger of its own — GTM
  fires it as part of the sequence, though it may also have one).
- **Teardown tag**: `"teardownTag": [{ "tagName": "…", "stopTeardownOnFailure": false }]`.
- One setup + one teardown per tag max. Chains are allowed (A sets up B sets up C).

## 4. Environments (staging vs production)

```python
env = environments().create(parent=container_path, body={"name": "Staging", "url": "https://staging.example.com", "enableDebug": True})
# env["authorizationCode"], env["environmentId"] → the snippet gets &gtm_auth=…&gtm_preview=env-N&gtm_cookies_win=x
```
Publish to an environment: `environments().update(path=env_path, body={... "containerVersionId": "42"})`.
`{{Environment Name}}` built-in + a lookup table gives per-environment measurement IDs
without duplicating tags.

## 5. Server-side containers

Create with `usageContext: ["server"]`. Different entity set: **clients**
(`gaaw_client` GA4, `mp_client` Measurement Protocol, `gtm_web_client`), server
**tags** (`sgtmgaaw` GA4, `sgtmadsct`, `sgtm_http` …), **transformations**, and
`SERVER_PAGEVIEW`/custom-event triggers matching `{{Event Name}}` (server built-in).
Get the exact type ids by building one in the UI and exporting — they change more
often than web types. Provisioning the tagging server itself (Cloud Run/App Engine)
is outside the API; `containers().snippet` returns `containerConfig` for manual
deploys. The web container then needs `server_container_url` in the Google tag's
`configSettingsTable`.

## 6. Zones and permissions

- **User permissions** (`accounts.user_permissions`) — grant a colleague or another SA:
```python
user_permissions().create(parent="accounts/123", body={
  "emailAddress": "dev@example.com",
  "accountAccess": {"permission": "user"},
  "containerAccess": [{"containerId": "456", "permission": "publish"}]})
```
- **Zones** (`workspaces.zones`) restrict which tag types / child containers may run —
  body has `childContainer:[{publicId, nickname}]`, `boundary:{condition:[…], customEvaluationTriggerId:[…]}`,
  `typeRestriction:{enable, whitelistedTypeId:[…]}`.

## 7. Bulk operations & audits (quota-aware)

Read everything with three `list` calls, then compute in memory:
```python
ents = gtm.entities(ws_path)           # {"tags":[…],"triggers":[…],"variables":[…],"builtins":[…],"folders":[…]}
```
Useful audits (all local, zero extra calls):
- Tags with no `firingTriggerId` (dead) · triggers referenced by no tag (orphans) ·
  variables referenced nowhere (`{{Name}}` not in any JSON dump) · `html` tags
  without consent · duplicate names · `paused` tags · tags missing `notes`.
- Rename/prefix in bulk: mutate locally, then `upsert_*` only the changed ones
  (each is one update call — mind 25/100 s; the client paces automatically).
- `workspaces().bulk_update` exists but is limited — the loop is more predictable.

## 8. Export, import, migration between containers

- **Export** = `versions().live(parent=container_path)` (or `versions().get(path)`)
  → dict with `container`, `tag[]`, `trigger[]`, `variable[]`, `builtInVariable[]`,
  `folder[]`, `customTemplate[]`, `zone[]`… Wrap as
  `{"exportFormatVersion": 2, "exportTime": "...", "containerVersion": {...}}` and it
  is importable in the UI (Admin → Import Container). `gtm_client.py export` does this.
- **Import via API into another container**: entity IDs differ, so:
  1. builtins → create by `type` list;
  2. variables → strip ids/paths/fingerprint, create, build name map;
  3. triggers → strip ids, create, build `oldId→newId` map (skip built-in ids `21474795xx`, map them to themselves);
  4. tags → strip ids, remap `firingTriggerId`/`blockingTriggerId`, `parentFolderId`; `setupTag`/`teardownTag` are by name so they survive;
  5. templates → create *before* tags that use `cvt_` types, and rewrite the type id (`cvt_<oldCid>_<oldTid>` → new).
  `gtm_client.py apply` accepts a spec with names, which is the easier migration path:
  convert the export to a spec (`gtm_client.py export --as-spec`) and apply it to the target workspace.
- **Combine containers**: `containers().combine(path=target, containerId=source, allowUserPermissionFeatureUpdate=…, settingSource=…)` — merges a whole container; rarely what people want, prefer spec apply.

## 9. Programmatic preview / QA without publishing

- `workspaces().quick_preview(path)` → compiled `containerVersion` + `compilerError`.
  Use it as a "lint" step in CI before `create_version`.
- Real browser preview links need the UI's Preview button (`gtm_debug`), not the API.
  For automated e2e, publish to a **Staging environment** and load the site with the
  environment snippet, then assert on `window.dataLayer` / network requests with Playwright.
- Tag Assistant / GA4 DebugView: add `debug_mode: true` to `eventSettingsTable` on a
  non-production Google tag (via lookup on `{{Environment Name}}`).

## 10. Typical "complex custom action" recipes (compose from triggers.md + entity-recipes.md)

| Ask | Build |
|---|---|
| "Track clicks on any element with `data-track`" | built-ins `clickElement`; `AEV - data-track` (`aev`/ATTRIBUTE); CLICK trigger with CSS_SELECTOR `[data-track], [data-track] *`; GA4 event `ui_click` with param `label={{AEV - data-track}}` |
| "Send `generate_lead` only when the form succeeded" | dev pushes `{event:'lead_success', lead_type}` after the API 200; CE trigger; GA4 event with `lead_type` param; **no** FORM_SUBMISSION trigger |
| "Fire vendor pixel only on checkout after consent" | CE trigger `purchase`; `img`/template tag with `consentSettings` NEEDED `ad_storage`; blocking trigger for internal traffic |
| "Engaged session = 50 % scroll AND 15 s" | SCROLL_DEPTH + TIMER + TRIGGER_GROUP; GA4 event `engaged_view` on the group |
| "Different GA4 property per domain" | `LT - GA4 ID by hostname` (smm) → used in `tagId`/`measurementIdOverride` |
| "Route SPA page views" | Google tag `send_page_view=false`; HISTORY_CHANGE (pushState only) + PAGEVIEW; GA4 `page_view` event with `page_location={{Page URL}}`, `page_title={{DLV - page_title}}` |
| "Ecommerce items" | one CE regex trigger for all GA4 ecommerce events; one `gaawe` with `eventName={{Event}}`, `sendEcommerceData=true`, `getEcommerceDataFrom=dataLayer` |
| "Kill switch" | Constant `C - tracking enabled` + universal CUSTOM_EVENT `.*` blocking trigger with `filter` `{{C - tracking enabled}}` EQUALS `false`, attached to all tags |
