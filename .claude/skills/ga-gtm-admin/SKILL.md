---
name: ga-gtm-admin
description: Administer Google Analytics 4 and Google Tag Manager through their MCP servers and APIs. Use for any GA4 or GTM admin work - auditing or managing GTM containers, workspaces, tags, triggers, variables, versions and publishing; creating or configuring GA4 properties, data streams, custom dimensions and metrics, key events (conversions), retention and links; and tracking, tagging or marking events (form submits, clicks, purchases, dataLayer pushes) end to end from GTM into GA4. Trigger on mentions of GTM, Tag Manager, GA4, Google Analytics property, measurement ID, G-XXXX or GTM-XXXX ids, dataLayer, "track this event", "mark as conversion / key event", "set up analytics", "why is my tag not firing", or connecting the Google Analytics or GTM MCP servers - even when the user never says the word admin.
---

# GA4 + GTM admin

Admin work on Google Analytics 4 (GA4) and Google Tag Manager (GTM) done through
MCP servers, with the Google APIs as a fallback. Three things make this work
different from ordinary coding tasks, and the rest of this skill follows from them:

- **Publishing is live.** A published GTM version changes what runs in every
  visitor's browser within minutes. There is no staging unless the user built one.
- **GA4 data is not retroactive.** A custom dimension, key event or filter only
  affects data collected after it exists. A mistake costs days of data, not a revert.
- **The agent inherits the user's Google permissions.** If they are admin on
  production, so are you.

So: read before writing, show the plan before changing anything, and treat
publish, delete and permission changes as actions that need an explicit yes.

## 1. Find out what you can actually do

MCP servers in this area change often and several unrelated servers share similar
names. Tool names below are what to expect, not a guarantee - look at the tools
actually connected in this session and read their schemas before relying on a name.

### Google Analytics MCP (official, `googleanalytics/google-analytics-mcp`)

Local server, usually registered as `analytics-mcp` (`pipx run analytics-mcp`).
It wraps the Admin API (read side) and the Data API.

| Tool | Use |
|---|---|
| `get_account_summaries` | Accounts and properties the user can see. Start here to resolve a property ID. |
| `get_property_details` | Time zone, currency, industry, create time for one property. |
| `get_custom_dimensions_and_metrics` | What is already registered - check before proposing new ones. |
| `list_google_ads_links` | Ads links on a property. |
| `list_property_annotations` / `create_property_annotation` | Annotations. Create works only if the server was started with `--allow-write` and the credential has `analytics.edit`. |
| `run_report`, `run_realtime_report`, `run_funnel_report` (sometimes `run_conversions_report`) | Data API reports. Realtime is how you verify a new event arrived. |

**It is read-only for configuration.** It cannot create or change properties,
streams, custom definitions or key events. For those, use section 4 (Admin API),
or a third-party GA MCP server if one with write tools is connected. Say this
plainly to the user rather than implying the MCP did the write.

Google also documents a remote Data API MCP endpoint
(`https://analyticsdata.googleapis.com/mcp/v1`). It is reporting only.

### Google Tag Manager MCP (Stape, `stape-io/google-tag-manager-mcp-server`)

There is no official Google GTM MCP server; Stape's is the widely used one.
Remote endpoint `https://gtm-mcp.stape.ai/mcp`, normally bridged with
`npx -y mcp-remote <url>` and Google OAuth in the browser. Full read/write.

One tool per GTM resource, each taking an `action` argument (typically `list`,
`get`, `create`, `update`, `remove`, plus resource-specific ones) and the ids of
the parent resources:

- Structure: `gtm_account`, `gtm_container`, `gtm_workspace`, `gtm_environment`, `gtm_user_permission`
- Tagging: `gtm_tag`, `gtm_trigger`, `gtm_variable`, `gtm_built_in_variable`, `gtm_folder`, `gtm_template`, `gtm_gtag_config`
- Release: `gtm_version`, `gtm_version_header`
- Server-side containers: `gtm_client`, `gtm_transformation`, `gtm_zone`
- Helpers: `gtm_auth_status`, `gtm_guide`, `gtag_destination`

If `gtm_guide` exists, call it once at the start - it describes the server's own
conventions and beats anything written here. If auth looks stale (permission
errors on resources the user can open in the UI), the cached session under
`~/.mcp-auth` is the usual cause; ask the user to clear it and reconnect.

Other GTM servers (`gtm-mcp`, `mcp-for-gtm`, ...) expose flat names such as
`get_containers` / `create_tag`. The concepts below are the same because they
all wrap Tag Manager API v2.

### Neither server connected

Don't guess at IDs or pretend. Tell the user which server is missing and give the
setup line:

```bash
# Google Analytics (needs Admin API + Data API enabled in a Google Cloud project)
claude mcp add analytics-mcp --scope project \
  -e GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json \
  -e GOOGLE_PROJECT_ID=your-gcp-project -- pipx run analytics-mcp

# Google Tag Manager (Stape, OAuth in browser on first use)
claude mcp add gtm-mcp-server --scope project -- npx -y mcp-remote https://gtm-mcp.stape.ai/mcp
```

You can still produce a complete, reviewable change plan without a connection.

## 2. GTM model and container administration

```
Account
└── Container  (GTM-XXXXXXX; web, server, iOS, Android, AMP)
    ├── Workspace (a draft; free containers allow 3)
    │   ├── Tags        what to send
    │   ├── Triggers    when to send it
    │   ├── Variables   values to read (plus built-in variables you enable)
    │   └── Folders, Templates
    ├── Versions      immutable snapshots; one is "live"
    └── Environments  live, latest, and custom ones (e.g. staging)
```

Things the API does that surprise people:

- **Edits land in a workspace, not on the site.** Nothing is live until a version
  is created from the workspace and published. "I created the tag" is not "it is tracking".
- **Creating a version consumes the workspace.** Afterwards the workspace is gone;
  start the next change in a new one.
- **Updates replace the whole object.** `get` the tag/trigger/variable first,
  change the fields you mean to change, send the full object back with its
  `fingerprint`. Sending a partial object silently drops the rest.
- **Workspaces drift.** If another version was published since the workspace was
  created, sync it and resolve conflicts before creating a version.
- **Built-in variables are off by default.** `Click Text`, `Form ID`, `Page Path`
  etc. must be enabled (`gtm_built_in_variable`) before a trigger can use them.

### Change routine

1. **Resolve** account → container → workspace ids. Check memory first; confirm
   the container's public id (`GTM-...`) with the user if more than one could match.
2. **Inventory** existing tags, triggers and variables. Reuse what exists - a
   second Google tag or a duplicate trigger is the most common way containers rot.
3. **Create a dedicated workspace** named for the change (`2026-11 lead form tracking`).
   Don't pile unrelated edits into Default Workspace: it makes the version
   impossible to review and to roll back.
4. **Make the edits**, following the container's existing naming. If it has none, use
   `GA4 - Event - <event_name>`, `CE - <event>` (custom event trigger),
   `Click - <what>`, `DLV - <key>` (data layer variable), `Const - <what>`.
5. **Show the diff**: every object created/changed/removed, in a table.
6. **Preview**: ask the user to open Preview (Tag Assistant) on the workspace and
   perform the action. You cannot click through their site; they can.
7. **Version and publish only on an explicit yes.** Give the version a name and
   notes that say what and why. Record the version id.
8. **Verify** in GA4 realtime (section 3, step 6) and write the outcome to memory.

Rollback is publishing the previous version again - say so when you publish, and
keep the previous live version id in your report.

Prefer pausing a tag to removing it, and never remove a container, a version or a
user permission without the user naming that exact object.

## 3. Marking (tagging) an event, end to end

An event is only useful when all four layers exist: something fires on the site,
GTM hears it, GTM sends it to GA4, and GA4 knows what the parameters mean.

**Step 1 - Name it.** Prefer a GA4 recommended event when one fits (`generate_lead`,
`sign_up`, `login`, `purchase`, `add_to_cart`, `begin_checkout`, `view_item`,
`search`, `select_content`, `share`), because GA4 reports and Ads integrations
understand them. Otherwise invent a `snake_case` name. Rules GA4 enforces: 40
characters max, starts with a letter, only letters/digits/underscores,
case-sensitive, not starting with `ga_`, `google_` or `firebase_`, and not an
automatically collected name (`page_view`, `session_start`, `first_visit`,
`user_engagement`, `scroll`, `click`, `file_download`, `form_start`,
`form_submit`, `view_search_results`, `video_*`). At most 25 parameters per
event; parameter names 40 chars, values 100.

**Step 2 - Choose the signal (trigger).** In order of reliability:

1. A `dataLayer.push({event: 'generate_lead', ...})` from the site's own code →
   Custom Event trigger. Survives redesigns; the developer controls timing. If the
   user owns the codebase, write the push for them.
2. A built-in trigger: `linkClick`, `click`, `formSubmission`, `elementVisibility`,
   `scrollDepth`, `historyChange`, `youTubeVideo`, `pageview` with a URL filter
   (thank-you pages).
3. CSS-selector or text matching on clicks. Fragile - flag it as such.

**Step 3 - Variables** for each parameter: Data Layer Variable (type `v`) for
pushed keys, built-ins for click/form/page context, a constant for fixed values.

**Step 4 - The GA4 event tag** (type `gaawe`), firing on the trigger. It needs a
Google tag (type `googtag`, holding the `G-...` measurement ID) already firing on
all pages; check there is exactly one per measurement ID.

Tag Manager API payload shapes, for servers that take raw objects:

```json
{ "name": "CE - generate_lead", "type": "customEvent",
  "customEventFilter": [{ "type": "equals", "parameter": [
    { "type": "template", "key": "arg0", "value": "{{_event}}" },
    { "type": "template", "key": "arg1", "value": "generate_lead" } ] }] }
```
```json
{ "name": "DLV - form_id", "type": "v", "parameter": [
    { "type": "integer",  "key": "dataLayerVersion", "value": "2" },
    { "type": "template", "key": "name", "value": "form_id" } ] }
```
```json
{ "name": "GA4 - Event - generate_lead", "type": "gaawe",
  "firingTriggerId": ["<trigger id>"],
  "parameter": [
    { "type": "template", "key": "eventName", "value": "generate_lead" },
    { "type": "template", "key": "measurementIdOverride", "value": "G-XXXXXXX" },
    { "type": "list", "key": "eventSettingsTable", "list": [
      { "type": "map", "map": [
        { "type": "template", "key": "parameter", "value": "form_id" },
        { "type": "template", "key": "parameterValue", "value": "{{DLV - form_id}}" } ] } ] } ] }
```

If the container keeps the measurement ID in a constant variable, reference that
instead of hard-coding `G-...`. For ecommerce events set `sendEcommerceData`
`true` with `getEcommerceDataFrom` `dataLayer` rather than mapping `items` by hand.
When unsure of a parameter key, `get` an existing tag of the same type in the
container and copy its shape - that is more reliable than memory.

**Step 5 - Teach GA4 about it** (section 4). Each custom parameter the user wants
in reports needs an event-scoped custom dimension (or a custom metric for
numbers). If the event is a business goal, mark it as a key event. Skip
registration for parameters GA4 already knows (`value`, `currency`,
`transaction_id`, `items`, `page_location`, ...).

**Step 6 - Verify.** After publish and a test action by the user, run a realtime
report with dimension `eventName` and metric `eventCount`, filtered to the event.
Realtime covers the last 30 minutes. Standard reports lag 24-48 hours, and a new
custom dimension shows `(not set)` for anything collected before it existed - tell
the user so they don't conclude it is broken.

Leave consent settings on tags as you found them unless the user asks; you don't
know their legal setup or how their consent banner behaves.

## 4. GA4 property administration

```
Account
└── Property (numeric id, e.g. 123456789)
    ├── Data streams (web → measurement ID G-..., iOS, Android)
    ├── Custom dimensions / custom metrics
    ├── Key events (formerly conversions)
    ├── Data retention, Google Ads links, Measurement Protocol secrets
    └── Access bindings (users and roles)
```

The property id (numeric) and the measurement id (`G-...`) are different things;
APIs want `properties/<numeric id>`. Read with the MCP tools. Write with the
Admin API, since the official MCP cannot:

```bash
BASE=https://analyticsadmin.googleapis.com/v1beta
AUTH=(-H "Authorization: Bearer $(gcloud auth application-default print-access-token)"
      -H "x-goog-user-project: $GOOGLE_PROJECT_ID" -H "Content-Type: application/json")
curl -sS "${AUTH[@]}" "$BASE/properties/123456789/keyEvents"        # read first
```

The credential needs the `https://www.googleapis.com/auth/analytics.edit` scope
(`gcloud auth application-default login --scopes=...analytics.edit,...cloud-platform`)
and the Editor role on the property. If the token is read-only you get 403 -
report that instead of retrying.

| Task | Call |
|---|---|
| Create property | `POST /properties` `{"parent":"accounts/<id>","displayName":"...","timeZone":"Europe/Moscow","currencyCode":"EUR","industryCategory":"TECHNOLOGY"}` |
| Create web stream | `POST /properties/<id>/dataStreams` `{"type":"WEB_DATA_STREAM","displayName":"...","webStreamData":{"defaultUri":"https://example.com"}}` → response has `measurementId` |
| Custom dimension | `POST /properties/<id>/customDimensions` `{"parameterName":"form_id","displayName":"Form ID","scope":"EVENT"}` (scope `USER` for user properties, `ITEM` for ecommerce items) |
| Custom metric | `POST /properties/<id>/customMetrics` `{"parameterName":"...","displayName":"...","measurementUnit":"STANDARD","scope":"EVENT"}` |
| Key event | `POST /properties/<id>/keyEvents` `{"eventName":"generate_lead","countingMethod":"ONCE_PER_EVENT"}` (`ONCE_PER_SESSION` for lead-type goals where repeats inflate counts) |
| Retention | `PATCH /properties/<id>/dataRetentionSettings?updateMask=eventDataRetention` `{"eventDataRetention":"FOURTEEN_MONTHS"}` |
| Rename / change property | `PATCH /properties/<id>?updateMask=displayName` |
| Retire a dimension | `POST /properties/<id>/customDimensions/<cd>:archive` (they can't be deleted, and `parameterName` and `scope` can't be edited) |

Things to tell the user before they bite:

- New properties default to **2 months** of event retention; most people want 14.
- Time zone and currency changes are not retroactive, so get them right at creation.
- Standard properties cap at 50 event-scoped and 25 user-scoped custom dimensions,
  50 custom metrics and 30 key events. Don't register high-cardinality values
  (ids, full URLs, timestamps) as dimensions - they collapse into `(other)`.
- `DELETE /properties/<id>` moves the property to trash for 35 days, then it is gone
  with its data. Needs the user to name the property explicitly.
- User access lives under `accessBindings` (v1alpha, `analytics.manage.users`
  scope). Treat any grant or removal like a publish: explicit yes, exact email and role.
- Limits and enum names shift over time. On a 400, read the error body and check
  the Admin API reference rather than guessing variations.

## 5. Reporting back

Finish with something the user can verify and a teammate can read later:

```
## What changed
| System | Object | Action | ID |
## State
GTM workspace / version / published? (previous live version: N)
GA4 property / what was registered
## Verified
What was checked and what it showed - or what the user still has to check
## Not done / needs you
Anything skipped, blocked by permissions, or awaiting confirmation
```

If you planned but did not execute, title it **Proposed changes** and say exactly
what confirmation you need. Never describe an unpublished workspace as live.
