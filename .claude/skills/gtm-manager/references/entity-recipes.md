# Entity recipes — tags and variables

All bodies below are `create`/`update` bodies for `…/workspaces/{id}/tags` or
`…/variables`. Parameter `type` values: `TEMPLATE` (string, may contain `{{Var}}`),
`INTEGER`, `BOOLEAN` (value is the string `"true"`/`"false"`), `LIST`, `MAP`.

Fastest way to discover the exact parameters for *any* tag/variable type not
listed here: build it once in the GTM UI, then `export` the container (or
`tags().list`) and copy the JSON. The UI is the authoritative schema.

## Table of contents
- Tags: Google tag (`googtag`) · GA4 event (`gaawe`) · Custom HTML (`html`) · Custom Image (`img`) · Google Ads conversion (`awct`) · Google Ads remarketing (`sp`) · Conversion linker (`gclidw`) · Custom template tag (`cvt_*`) · Common tag fields
- Variables: Data layer (`v`) · Constant (`c`) · Custom JavaScript (`jsm`) · JavaScript variable (`j`) · URL (`u`) · 1st-party cookie (`k`) · DOM element (`d`) · Auto-event (`aev`) · Lookup table (`smm`) · RegEx table (`remm`) · Google tag event settings (`gtes`) · Google tag config settings (`gtcs`) · User-provided data (`awec`) · Referrer (`f`) · Random (`r`) · Container/Debug (`ctv`, `dbg`) · Custom template variable (`cvt_*`) · `formatValue`
- Built-in variable names

---

## Tags

### Google tag (GA4 config) — `googtag`
One per container per measurement ID. Fire on *Initialization - All Pages*
(built-in trigger id `2147479573`) or *All Pages* (`2147479553`).
```json
{
  "name": "GT - Google tag",
  "type": "googtag",
  "parameter": [
    { "type": "TEMPLATE", "key": "tagId", "value": "{{C - GA4 Measurement ID}}" },
    { "type": "LIST", "key": "configSettingsTable", "list": [
      { "type": "MAP", "map": [
        { "type": "TEMPLATE", "key": "parameter", "value": "send_page_view" },
        { "type": "TEMPLATE", "key": "parameterValue", "value": "false" } ] },
      { "type": "MAP", "map": [
        { "type": "TEMPLATE", "key": "parameter", "value": "cookie_domain" },
        { "type": "TEMPLATE", "key": "parameterValue", "value": "auto" } ] }
    ] },
    { "type": "LIST", "key": "eventSettingsTable", "list": [
      { "type": "MAP", "map": [
        { "type": "TEMPLATE", "key": "parameter", "value": "environment" },
        { "type": "TEMPLATE", "key": "parameterValue", "value": "{{C - Environment}}" } ] }
    ] },
    { "type": "TEMPLATE", "key": "configSettingsVariable", "value": "{{GTCS - defaults}}" },
    { "type": "TEMPLATE", "key": "eventSettingsVariable",  "value": "{{ES - default}}" }
  ],
  "firingTriggerId": ["2147479573"],
  "tagFiringOption": "ONCE_PER_EVENT"
}
```
Only `tagId` is required. `configSettingsTable` keys are gtag config params
(`send_page_view`, `cookie_domain`, `cookie_expires`, `server_container_url`,
`allow_google_signals`, `user_id`, …). Set `send_page_view=false` for SPAs and
send `page_view` yourself.

### GA4 event — `gaawe`
```json
{
  "name": "GA4 - Event - add_to_cart",
  "type": "gaawe",
  "parameter": [
    { "type": "TEMPLATE", "key": "measurementIdOverride", "value": "{{C - GA4 Measurement ID}}" },
    { "type": "TEMPLATE", "key": "eventName", "value": "add_to_cart" },
    { "type": "BOOLEAN",  "key": "sendEcommerceData", "value": "true" },
    { "type": "TEMPLATE", "key": "getEcommerceDataFrom", "value": "dataLayer" },
    { "type": "LIST", "key": "eventSettingsTable", "list": [
      { "type": "MAP", "map": [
        { "type": "TEMPLATE", "key": "parameter", "value": "value" },
        { "type": "TEMPLATE", "key": "parameterValue", "value": "{{DLV - ecommerce.value}}" } ] },
      { "type": "MAP", "map": [
        { "type": "TEMPLATE", "key": "parameter", "value": "currency" },
        { "type": "TEMPLATE", "key": "parameterValue", "value": "{{DLV - ecommerce.currency}}" } ] }
    ] },
    { "type": "LIST", "key": "userProperties", "list": [
      { "type": "MAP", "map": [
        { "type": "TEMPLATE", "key": "name", "value": "plan_tier" },
        { "type": "TEMPLATE", "key": "value", "value": "{{DLV - user.plan}}" } ] }
    ] },
    { "type": "TEMPLATE", "key": "eventSettingsVariable", "value": "{{ES - default}}" }
  ],
  "firingTriggerId": ["<CE - add_to_cart id>"],
  "tagFiringOption": "ONCE_PER_EVENT"
}
```
- `eventName` may be a variable: `"{{Event}}"` (built-in `event`) → one tag for many events.
- `measurementIdOverride` is required for GA4 events (the Google tag ID).
- `getEcommerceDataFrom`: `dataLayer` or `customObject` (+ `ecommerceMacroData` param `{{Var}}`).
- Parameter values are strings; GA4 coerces numerics. Send `value` as a number-like string.

### Custom HTML — `html`
```json
{
  "name": "cHTML - Hotjar",
  "type": "html",
  "parameter": [
    { "type": "TEMPLATE", "key": "html", "value": "<script>\n(function(){ /* code, may use {{Variables}} */ })();\n</script>" },
    { "type": "BOOLEAN", "key": "supportDocumentWrite", "value": "false" }
  ],
  "firingTriggerId": ["2147479553"],
  "consentSettings": { "consentStatus": "NEEDED",
    "consentType": { "type": "LIST", "list": [ { "type": "STRING", "value": "analytics_storage" } ] } }
}
```
Blocked if the container has a Zone/policy restricting custom HTML. `{{Var}}` in
the HTML is substituted as a JS literal (strings are quoted). To inject a value
into a string safely use `'{{Var}}'` only for simple values, or `{{Var}}` as a
standalone expression.

### Custom Image (pixel) — `img`
```json
{ "name": "Pixel - Vendor", "type": "img", "parameter": [
  { "type": "TEMPLATE", "key": "url", "value": "https://vendor.example/pixel?id=123&e={{Event}}" },
  { "type": "BOOLEAN",  "key": "useCacheBuster", "value": "true" },
  { "type": "TEMPLATE", "key": "cacheBusterQueryParam", "value": "gtmcb" } ],
  "firingTriggerId": ["…"] }
```

### Google Ads conversion — `awct`
```json
{ "name": "Ads - Conversion - purchase", "type": "awct", "parameter": [
  { "type": "TEMPLATE", "key": "conversionId", "value": "123456789" },
  { "type": "TEMPLATE", "key": "conversionLabel", "value": "AbCdEfGh" },
  { "type": "TEMPLATE", "key": "conversionValue", "value": "{{DLV - ecommerce.value}}" },
  { "type": "TEMPLATE", "key": "currencyCode", "value": "{{DLV - ecommerce.currency}}" },
  { "type": "TEMPLATE", "key": "orderId", "value": "{{DLV - ecommerce.transaction_id}}" },
  { "type": "BOOLEAN",  "key": "enableConversionLinker", "value": "true" },
  { "type": "BOOLEAN",  "key": "enableNewCustomerReporting", "value": "false" },
  { "type": "BOOLEAN",  "key": "enableEnhancedConversion", "value": "false" } ],
  "firingTriggerId": ["…"] }
```
Add `{ "type":"TEMPLATE","key":"userDataVariable","value":"{{UPD - user data}}" }` with
`enableEnhancedConversion=true` for enhanced conversions.

### Google Ads remarketing — `sp`
```json
{ "name": "Ads - Remarketing", "type": "sp", "parameter": [
  { "type": "TEMPLATE", "key": "conversionId", "value": "123456789" },
  { "type": "BOOLEAN",  "key": "enableConversionLinker", "value": "true" },
  { "type": "BOOLEAN",  "key": "enableDynamicRemarketing", "value": "false" } ],
  "firingTriggerId": ["2147479553"] }
```

### Conversion linker — `gclidw`
```json
{ "name": "Ads - Conversion Linker", "type": "gclidw", "parameter": [
  { "type": "BOOLEAN", "key": "enableCrossDomain", "value": "false" },
  { "type": "BOOLEAN", "key": "enableUrlPassthrough", "value": "false" },
  { "type": "BOOLEAN", "key": "enableCookieOverrides", "value": "false" } ],
  "firingTriggerId": ["2147479553"] }
```

### Tag from a custom template — `cvt_<containerId>_<templateId>`
The type is derived from the template's path. Parameters = the template's
`___TEMPLATE_PARAMETERS___` names. Example for a template with fields `apiKey` and `events` (simple table):
```json
{ "name": "Vendor - via template", "type": "cvt_456_12", "parameter": [
  { "type": "TEMPLATE", "key": "apiKey", "value": "{{C - Vendor key}}" },
  { "type": "LIST", "key": "events", "list": [
    { "type": "MAP", "map": [ { "type":"TEMPLATE","key":"name","value":"purchase" },
                              { "type":"TEMPLATE","key":"value","value":"{{DLV - value}}" } ] } ] } ],
  "firingTriggerId": ["…"] }
```
Get the id from `templates().list` → `templateId`; container id from the path.

### Common tag fields
- `firingTriggerId` / `blockingTriggerId`: arrays of trigger IDs. Built-in trigger IDs:
  `2147479553` All Pages (Page View), `2147479573` Initialization - All Pages,
  `2147479572` Consent Initialization - All Pages. Verify with `triggers().list` if in doubt — they don't appear in list results, but tags referencing them do.
- `tagFiringOption`: `UNLIMITED` (default), `ONCE_PER_EVENT` (GA4 default), `ONCE_PER_LOAD`.
- `priority`: `{ "type": "INTEGER", "value": "10" }` — higher fires first (async, no guarantee of completion order; use setup/teardown for real sequencing).
- `paused: true` = created but inert (great for staging a change before enabling).
- `scheduleStartMs`/`scheduleEndMs`: epoch ms strings for time-boxed campaigns.
- `notes`: use it.
- `monitoringMetadata`: `{ "type": "MAP", "map": [ {TEMPLATE key/value}… ] }` for tag-monitoring pipelines.
- `consentSettings.consentStatus`: `NOT_SET` | `NOT_NEEDED` | `NEEDED`; `consentType` list of
  `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`, `functionality_storage`, `personalization_storage`, `security_storage`.

---

## Variables

Reference any variable as `{{Its Name}}` (exact, case-sensitive, spaces kept).

### Data layer variable — `v`
```json
{ "name": "DLV - ecommerce.value", "type": "v", "parameter": [
  { "type": "TEMPLATE", "key": "name", "value": "ecommerce.value" },
  { "type": "INTEGER",  "key": "dataLayerVersion", "value": "2" },
  { "type": "BOOLEAN",  "key": "setDefaultValue", "value": "true" },
  { "type": "TEMPLATE", "key": "defaultValue", "value": "0" } ] }
```
Version 2 = merged/nested (always use 2). Dot-paths and array indexes work
(`items.0.item_id`). Omit `setDefaultValue`/`defaultValue` for `undefined` fallback.

### Constant — `c`
```json
{ "name": "C - GA4 Measurement ID", "type": "c", "parameter": [
  { "type": "TEMPLATE", "key": "value", "value": "G-XXXXXXXXXX" } ] }
```

### Custom JavaScript — `jsm`
Must be an anonymous function expression returning a value. Runs on every evaluation.
```json
{ "name": "CJS - clean path", "type": "jsm", "parameter": [
  { "type": "TEMPLATE", "key": "javascript",
    "value": "function () {\n  try {\n    return location.pathname.replace(/\\/+$/, '') || '/';\n  } catch (e) { return undefined; }\n}" } ] }
```
Keep it ES5 (the GTM UI linter rejects ES6 in `jsm` and so does the compiler in some
containers): `var`, no arrow functions, no template literals, no `const`/`let`.

### JavaScript variable (global) — `j`
```json
{ "name": "JS - window.appConfig.userId", "type": "j", "parameter": [
  { "type": "TEMPLATE", "key": "name", "value": "appConfig.userId" } ] }
```

### URL — `u`
```json
{ "name": "URL - query utm_source", "type": "u", "parameter": [
  { "type": "TEMPLATE", "key": "component", "value": "QUERY" },
  { "type": "TEMPLATE", "key": "queryKey", "value": "utm_source" },
  { "type": "BOOLEAN",  "key": "stripWww", "value": "true" } ] }
```
`component`: `URL`, `PROTOCOL`, `HOST`, `PORT`, `PATH`, `EXTENSION`, `QUERY`, `FRAGMENT`.
Optional `customUrlSource` `{{Var}}` to parse a different URL (e.g. `{{Click URL}}`).

### 1st-party cookie — `k`
```json
{ "name": "Cookie - _ga", "type": "k", "parameter": [
  { "type": "TEMPLATE", "key": "name", "value": "_ga" },
  { "type": "BOOLEAN",  "key": "decodeCookie", "value": "true" } ] }
```

### DOM element — `d`
```json
{ "name": "DOM - meta description", "type": "d", "parameter": [
  { "type": "TEMPLATE", "key": "selectorType", "value": "CSS" },
  { "type": "TEMPLATE", "key": "elementSelector", "value": "meta[name='description']" },
  { "type": "TEMPLATE", "key": "attributeName", "value": "content" } ] }
```
`selectorType: "ID"` uses key `elementId` instead. Omit `attributeName` for text content.

### Auto-event variable — `aev`
Reads the element of the current click/form/visibility event.
```json
{ "name": "AEV - data-track attribute", "type": "aev", "parameter": [
  { "type": "TEMPLATE", "key": "varType", "value": "ATTRIBUTE" },
  { "type": "TEMPLATE", "key": "attribute", "value": "data-track" },
  { "type": "BOOLEAN",  "key": "setDefaultValue", "value": "true" },
  { "type": "TEMPLATE", "key": "defaultValue", "value": "(none)" } ] }
```
`varType`: `ELEMENT`, `TAG_NAME`, `CLASSES`, `ID`, `TARGET`, `TEXT`, `URL`, `ATTRIBUTE`,
`HISTORY_NEW_URL_FRAGMENT`, `HISTORY_OLD_URL_FRAGMENT`, `HISTORY_NEW_STATE`, `HISTORY_OLD_STATE`, `HISTORY_CHANGE_SOURCE`.

### Lookup table — `smm`
```json
{ "name": "LT - GA4 ID by hostname", "type": "smm", "parameter": [
  { "type": "TEMPLATE", "key": "input", "value": "{{Page Hostname}}" },
  { "type": "LIST", "key": "map", "list": [
    { "type": "MAP", "map": [ { "type":"TEMPLATE","key":"key","value":"www.example.com" },
                              { "type":"TEMPLATE","key":"value","value":"G-PROD000000" } ] },
    { "type": "MAP", "map": [ { "type":"TEMPLATE","key":"key","value":"staging.example.com" },
                              { "type":"TEMPLATE","key":"value","value":"G-STAGE00000" } ] } ] },
  { "type": "BOOLEAN",  "key": "setDefaultValue", "value": "true" },
  { "type": "TEMPLATE", "key": "defaultValue", "value": "G-DEV0000000" } ] }
```

### RegEx table — `remm`
Same as lookup plus: `fullMatch` (BOOLEAN), `ignoreCase` (BOOLEAN),
`replaceAfterMatch` (BOOLEAN — enables `$1` capture-group substitution in `value`).
`key` values are regex strings (escape backslashes in JSON: `"\\/products\\/"`).

### Google tag: event settings — `gtes` / config settings — `gtcs`
Share parameter sets across tags; reference via `eventSettingsVariable` / `configSettingsVariable`.
```json
{ "name": "ES - default", "type": "gtes", "parameter": [
  { "type": "LIST", "key": "eventSettingsTable", "list": [
    { "type": "MAP", "map": [ { "type":"TEMPLATE","key":"parameter","value":"page_location" },
                              { "type":"TEMPLATE","key":"parameterValue","value":"{{DLV - page_location}}" } ] } ] },
  { "type": "LIST", "key": "userProperties", "list": [] } ] }
```
`gtcs` uses key `configSettingsTable` with the same MAP shape.

### User-provided data (enhanced conversions) — `awec`
```json
{ "name": "UPD - user data", "type": "awec", "parameter": [
  { "type": "TEMPLATE", "key": "mode", "value": "MANUAL" },
  { "type": "TEMPLATE", "key": "email", "value": "{{DLV - user.email}}" },
  { "type": "TEMPLATE", "key": "phone_number", "value": "{{DLV - user.phone}}" } ] }
```
`mode`: `MANUAL` | `AUTO` | `CODE` (CODE uses `dataSource` `{{Var}}` holding an object).

### Simple ones
- Referrer `f`: `component` (`URL`|`HOST`|`PATH`|`QUERY`…), optional `queryKey`.
- Random number `r`: no params. Container version `ctv`, Debug mode `dbg`: no params.
- Custom event name `e`: no params (same as built-in `event`).

### Custom template variable — `cvt_<containerId>_<templateId>`
Same as custom template tag: params = template fields.

### `formatValue` (any variable)
```json
"formatValue": {
  "caseConversionType": "LOWERCASE",
  "convertNullToValue":      { "type": "TEMPLATE", "value": "" },
  "convertUndefinedToValue": { "type": "TEMPLATE", "value": "" },
  "convertTrueToValue":      { "type": "TEMPLATE", "value": "1" },
  "convertFalseToValue":     { "type": "TEMPLATE", "value": "0" } }
```

---

## Built-in variables

Enable with `built_in_variables().create(parent=ws_path, type=[...])`. The
display name (what you reference as `{{…}}`) is on the right.

| type | referenced as |
|---|---|
| `pageUrl`, `pageHostname`, `pagePath`, `referrer` | `{{Page URL}}`, `{{Page Hostname}}`, `{{Page Path}}`, `{{Referrer}}` |
| `event` | `{{Event}}` |
| `clickElement`, `clickClasses`, `clickId`, `clickTarget`, `clickUrl`, `clickText` | `{{Click Element}}`, `{{Click Classes}}`, `{{Click ID}}`, `{{Click Target}}`, `{{Click URL}}`, `{{Click Text}}` |
| `formElement`, `formClasses`, `formId`, `formTarget`, `formUrl`, `formText` | `{{Form …}}` |
| `errorMessage`, `errorUrl`, `errorLine` | `{{Error …}}` |
| `newHistoryFragment`, `oldHistoryFragment`, `newHistoryState`, `oldHistoryState`, `historySource` | `{{New History Fragment}}` … `{{History Source}}` |
| `containerId`, `containerVersion`, `debugMode`, `randomNumber`, `environmentName`, `htmlId` | `{{Container ID}}`, `{{Container Version}}`, `{{Debug Mode}}`, `{{Random Number}}`, `{{Environment Name}}`, `{{HTML ID}}` |
| `scrollDepthThreshold`, `scrollDepthUnits`, `scrollDirection` | `{{Scroll Depth Threshold}}`, `{{Scroll Depth Units}}`, `{{Scroll Direction}}` |
| `elementVisibilityRatio`, `elementVisibilityTime`, `elementVisibilityFirstTime`, `elementVisibilityRecentTime` | `{{Percent Visible}}`, `{{On-Screen Duration}}`, … |
| `videoProvider`, `videoUrl`, `videoTitle`, `videoDuration`, `videoPercent`, `videoVisible`, `videoStatus`, `videoCurrentTime` | `{{Video …}}` |
| server: `clientName`, `queryString`, `requestPath`, `requestMethod`, … | `{{Client Name}}` … |

Referencing a built-in that isn't enabled → 400 on create, or a compiler error at
version time. `gtm_client.py apply` enables what the spec lists first.
