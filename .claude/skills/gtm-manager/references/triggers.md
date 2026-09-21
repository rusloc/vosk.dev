# Triggers

A trigger = an **event type** + zero or more **conditions**. A tag fires when *any*
of its `firingTriggerId` triggers is true and *none* of its `blockingTriggerId`
triggers is true. Within one trigger, *all* conditions must be true (AND). For
OR logic, create several triggers or use a regex condition.

## Which filter array to use

| Field | When it applies | Typical `arg0` |
|---|---|---|
| `customEventFilter` | only on `CUSTOM_EVENT` — matches the pushed `event` name | `{{_event}}` |
| `filter` | "This trigger fires on: Some …" — evaluated on the event | any variable: `{{Page Path}}`, `{{Click Element}}`, `{{DLV - x}}` |
| `autoEventFilter` | Click / Link Click / Form / Scroll / Visibility / Timer / History when "Some …" is chosen — evaluated when the listener attaches | usually `{{Page URL}}` (which pages get the listener) |

The UI writes URL restrictions on auto-event triggers into `autoEventFilter` and
element conditions into `filter`. Putting a `{{Click Element}}` condition into
`autoEventFilter` is accepted but never matches (the element doesn't exist yet).

## Condition object
```json
{ "type": "MATCH_REGEX", "parameter": [
  { "type": "TEMPLATE", "key": "arg0", "value": "{{Page Path}}" },
  { "type": "TEMPLATE", "key": "arg1", "value": "^/(pricing|checkout)" },
  { "type": "BOOLEAN",  "key": "negate", "value": "false" },
  { "type": "BOOLEAN",  "key": "ignore_case", "value": "true" } ] }
```
Types: `EQUALS`, `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `MATCH_REGEX`,
`GREATER`, `GREATER_OR_EQUALS`, `LESS`, `LESS_OR_EQUALS`, `CSS_SELECTOR`
(arg0 = `{{Click Element}}`, arg1 = selector), `URL_MATCHES` (arg1 = URL pattern).
`negate: "true"` turns any of them into "does not …". `ignore_case` only matters
for string comparisons and regex.

## Every trigger type (UPPER_SNAKE as returned; camelCase also accepted)

### Page lifecycle
```json
{ "name": "All Pages", "type": "PAGEVIEW" }
{ "name": "DOM Ready", "type": "DOM_READY" }
{ "name": "Window Loaded", "type": "WINDOW_LOADED" }
{ "name": "Initialization", "type": "INIT" }                // fires before PAGEVIEW; Google tag goes here
{ "name": "Consent Init", "type": "CONSENT_INIT" }         // earliest; only for consent default tags
```
Add `filter` for "Some Page Views": e.g. `{{Page Path}}` STARTS_WITH `/blog`.
The built-in *All Pages* (`2147479553`), *Initialization - All Pages*
(`2147479573`) and *Consent Initialization - All Pages* (`2147479572`) already
exist in every container — reference those IDs instead of creating duplicates.

### Custom event (the workhorse for data layer pushes)
```json
{ "name": "CE - purchase", "type": "CUSTOM_EVENT",
  "customEventFilter": [ { "type": "EQUALS", "parameter": [
    { "type": "TEMPLATE", "key": "arg0", "value": "{{_event}}" },
    { "type": "TEMPLATE", "key": "arg1", "value": "purchase" } ] } ],
  "filter": [ { "type": "GREATER", "parameter": [
    { "type": "TEMPLATE", "key": "arg0", "value": "{{DLV - ecommerce.value}}" },
    { "type": "TEMPLATE", "key": "arg1", "value": "0" } ] } ] }
```
Regex for many events (one trigger → one GA4 tag with `eventName={{Event}}`):
`"type": "MATCH_REGEX"`, `arg1: "^(view_item|add_to_cart|begin_checkout|purchase)$"`.
Only `customEventFilter` matches the event name; `filter` adds extra conditions.

### Click — all elements
```json
{ "name": "Click - CTA buttons", "type": "CLICK",
  "filter": [ { "type": "CSS_SELECTOR", "parameter": [
    { "type": "TEMPLATE", "key": "arg0", "value": "{{Click Element}}" },
    { "type": "TEMPLATE", "key": "arg1", "value": "a.cta, button[data-track='cta'], button[data-track='cta'] *" } ] } ],
  "autoEventFilter": [ { "type": "MATCH_REGEX", "parameter": [
    { "type": "TEMPLATE", "key": "arg0", "value": "{{Page URL}}" },
    { "type": "TEMPLATE", "key": "arg1", "value": ".*" } ] } ] }
```
Requires built-ins `clickElement` (+ whatever you reference). Add `, selector *`
variants to match clicks on children (icons/spans inside the button).

### Click — just links
```json
{ "name": "Link Click - outbound", "type": "LINK_CLICK",
  "parameter": [
    { "type": "BOOLEAN", "key": "waitForTags", "value": "true" },
    { "type": "TEMPLATE", "key": "waitForTagsTimeout", "value": "2000" },
    { "type": "BOOLEAN", "key": "checkValidation", "value": "true" } ],
  "autoEventFilter": [ { "type": "MATCH_REGEX", "parameter": [
    { "type": "TEMPLATE", "key": "arg0", "value": "{{Page URL}}" },
    { "type": "TEMPLATE", "key": "arg1", "value": ".*" } ] } ],
  "filter": [ { "type": "CONTAINS", "parameter": [
    { "type": "TEMPLATE", "key": "arg0", "value": "{{Click URL}}" },
    { "type": "TEMPLATE", "key": "arg1", "value": "{{Page Hostname}}" },
    { "type": "BOOLEAN",  "key": "negate", "value": "true" } ] } ] }
```
`waitForTags` delays navigation up to the timeout so tags can finish — only enable
if the site is fine with the delay. `checkValidation` = don't fire if another
handler called `preventDefault()`. When `waitForTags` is set the API requires
`autoEventFilter` to be non-empty (use the `.*` regex on `{{Page URL}}` for "all pages").

### Form submission
```json
{ "name": "Form - newsletter", "type": "FORM_SUBMISSION",
  "parameter": [
    { "type": "BOOLEAN", "key": "waitForTags", "value": "false" },
    { "type": "BOOLEAN", "key": "checkValidation", "value": "true" } ],
  "filter": [ { "type": "EQUALS", "parameter": [
    { "type": "TEMPLATE", "key": "arg0", "value": "{{Form ID}}" },
    { "type": "TEMPLATE", "key": "arg1", "value": "newsletter" } ] } ] }
```
Only catches native `submit` events. React forms that `preventDefault` and fetch
won't fire it — push a custom event instead.

### History change (SPAs)
```json
{ "name": "History Change", "type": "HISTORY_CHANGE",
  "filter": [ { "type": "EQUALS", "parameter": [
    { "type": "TEMPLATE", "key": "arg0", "value": "{{History Source}}" },
    { "type": "TEMPLATE", "key": "arg1", "value": "pushState" } ] } ] }
```
Fires on pushState/replaceState/popstate/hashchange. Filter on `{{History Source}}`
to avoid double-firing on hash changes. Enable the `historySource`, `newHistory*` built-ins.

### JavaScript error
```json
{ "name": "JS Error", "type": "JS_ERROR" }
```
Built-ins: `errorMessage`, `errorUrl`, `errorLine`. Only catches `window.onerror`.

### Timer
```json
{ "name": "Timer - 15s engaged", "type": "TIMER",
  "parameter": [
    { "type": "TEMPLATE", "key": "eventName", "value": "gtm.timer" },
    { "type": "TEMPLATE", "key": "interval", "value": "15000" },
    { "type": "TEMPLATE", "key": "limit", "value": "1" } ],
  "autoEventFilter": [ { "type": "MATCH_REGEX", "parameter": [
    { "type": "TEMPLATE", "key": "arg0", "value": "{{Page URL}}" },
    { "type": "TEMPLATE", "key": "arg1", "value": ".*" } ] } ] }
```
`interval` in ms, `limit` = max fires (omit for unlimited). `autoEventFilter` is
required (which pages start the timer).

### Scroll depth
```json
{ "name": "Scroll - 25/50/75/90", "type": "SCROLL_DEPTH",
  "parameter": [
    { "type": "BOOLEAN",  "key": "verticalThresholdOn", "value": "true" },
    { "type": "TEMPLATE", "key": "verticalThresholdUnits", "value": "PERCENT" },
    { "type": "TEMPLATE", "key": "verticalThresholdsPercent", "value": "25,50,75,90" },
    { "type": "BOOLEAN",  "key": "horizontalThresholdOn", "value": "false" },
    { "type": "TEMPLATE", "key": "triggerStartOption", "value": "WINDOW_LOAD" } ] }
```
Units `PERCENT` (key `verticalThresholdsPercent`) or `PIXELS` (`verticalThresholdsPixels`).
`triggerStartOption`: `WINDOW_LOAD` | `DOM_READY` | `CONTAINER_LOAD`. Built-ins:
`scrollDepthThreshold`, `scrollDepthUnits`, `scrollDirection`. Add `autoEventFilter`
on `{{Page URL}}` to restrict pages.

### Element visibility
```json
{ "name": "Visible - pricing table", "type": "ELEMENT_VISIBILITY",
  "parameter": [
    { "type": "TEMPLATE", "key": "selectorType", "value": "CSS" },
    { "type": "TEMPLATE", "key": "elementSelector", "value": "#pricing-table" },
    { "type": "TEMPLATE", "key": "firingFrequency", "value": "ONCE" },
    { "type": "TEMPLATE", "key": "onScreenRatio", "value": "50" },
    { "type": "BOOLEAN",  "key": "useOnScreenDuration", "value": "true" },
    { "type": "TEMPLATE", "key": "onScreenDuration", "value": "1000" },
    { "type": "BOOLEAN",  "key": "useDomChangeListener", "value": "true" } ] }
```
`selectorType: "ID"` → key `elementId`. `firingFrequency`: `ONCE`, `ONCE_PER_ELEMENT`,
`MANY_PER_ELEMENT`. `useDomChangeListener` catches elements rendered later (SPA).

### YouTube video
```json
{ "name": "YouTube - progress", "type": "YOU_TUBE_VIDEO",
  "parameter": [
    { "type": "BOOLEAN",  "key": "captureStart", "value": "true" },
    { "type": "BOOLEAN",  "key": "captureComplete", "value": "true" },
    { "type": "BOOLEAN",  "key": "capturePause", "value": "false" },
    { "type": "BOOLEAN",  "key": "captureProgress", "value": "true" },
    { "type": "TEMPLATE", "key": "progressThresholdsPercent", "value": "25,50,75" },
    { "type": "BOOLEAN",  "key": "fixMissingApi", "value": "true" },
    { "type": "TEMPLATE", "key": "triggerStartOption", "value": "DOM_READY" } ] }
```
Built-ins: `videoStatus`, `videoPercent`, `videoTitle`, `videoUrl`, …

### Trigger group (fire when ALL listed triggers have fired at least once)
```json
{ "name": "Group - scrolled 50 + 15s", "type": "TRIGGER_GROUP",
  "parameter": [ { "type": "LIST", "key": "triggerIds", "list": [
    { "type": "TRIGGER_REFERENCE", "value": "<id of Scroll trigger>" },
    { "type": "TRIGGER_REFERENCE", "value": "<id of Timer trigger>" } ] } ] }
```
Add `filter` conditions to evaluate on the group's event (`gtm.triggerGroup`).
Create the member triggers first (need their IDs).

### Server container
`SERVER_PAGEVIEW` (server-side "All Pages"), `ALWAYS`; custom events work the same.
Mobile (Firebase SDK containers): `FIREBASE_*` types listed in the API enum.

## Blocking triggers (exceptions)
Any trigger can be used as an exception via `blockingTriggerId`. Common pattern:
```json
{ "name": "Exception - internal traffic", "type": "PAGEVIEW",
  "filter": [ { "type": "EQUALS", "parameter": [
    { "type": "TEMPLATE", "key": "arg0", "value": "{{Cookie - internal}}" },
    { "type": "TEMPLATE", "key": "arg1", "value": "1" } ] } ] }
```
Attach as `blockingTriggerId` on every tag. A blocking trigger's *type* must match
the event the tag fires on (a PAGEVIEW exception won't block a CUSTOM_EVENT tag);
use `CUSTOM_EVENT` with `customEventFilter` regex `.*` for a universal exception.

## Reuse before you create
List triggers first and reuse identical ones. Two tags can share a trigger; a trigger
with no tags is harmless but clutters. `gtm_client.py apply` matches by name.
