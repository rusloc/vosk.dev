# Tag Manager API v2 cheatsheet

Base: `https://tagmanager.googleapis.com/tagmanager/v2/`
Python discovery service: `build("tagmanager", "v2", credentials=creds)`;
call chain mirrors the REST path, e.g.
`service.accounts().containers().workspaces().tags().create(parent=..., body=...).execute()`.

## Conventions that apply everywhere

- **`path`** = full relative resource path (`accounts/1/containers/2/workspaces/3/tags/4`).
  Used by `get`, `update`, `delete`, `revert`. **`parent`** = path of the containing
  resource. Used by `list`, `create`.
- **Updates are full replacements.** `update` takes the whole body; omitted fields
  are cleared. Always `get` first, mutate, then `update`. Include the `fingerprint`
  you read (send it as the `fingerprint` query param in the client:
  `.update(path=..., fingerprint=obj["fingerprint"], body=obj)`); a mismatch → 412,
  meaning someone else changed it. `gtm_client.py` does this for you.
- IDs are strings. `accountId`, `containerId`, `workspaceId`, `tagId`… are
  read-only in bodies (safe to leave in when round-tripping).
- Lists are paginated: response has `nextPageToken`; pass `pageToken=` to continue.
  The Python client exposes `list_next(prev_request, prev_response)`.
- Response enums are `UPPER_SNAKE` (`"type": "CUSTOM_EVENT"`, `"type": "TEMPLATE"`);
  request bodies accept either that or the `camelCase` in the docs.

## Quota (per GCP project)

- 10 000 requests/day (resets midnight PST); **0.25 QPS = 25 requests per 100 s**.
- Exceeding → `403` with "insufficient quota"/"rateLimitExceeded" (sometimes `429`).
- Budget accordingly: a 40-entity apply ≈ 3 list calls + 40 upserts ≈ 3 minutes.
  Use `list` once per entity type instead of `get` per entity. Never poll.
- Higher quota: Cloud Console → Tag Manager API → Quotas → Edit → request.

## Resource map

| Resource (parent → children) | Methods | Notes |
|---|---|---|
| `accounts` | list, get, update | No create/delete via API. |
| `accounts.user_permissions` | list, get, create, update, delete | Body: `{emailAddress, accountAccess:{permission}, containerAccess:[{containerId, permission}]}`. Account perms: `admin`, `user`, `noAccess`. Container perms: `noAccess`, `read`, `edit`, `approve`, `publish`. |
| `accounts.containers` | list, get, create, update, delete, lookup (by `destinationId`/`tagId` e.g. `GTM-XXXX`), snippet, combine, move_tag_id | Create body: `{name, usageContext:["web"], domainName?:[], notes?}`. usageContext: `web`, `server`, `android`, `ios`, `amp`, `androidSdk5`, `iosSdk5`. `snippet` returns install code. |
| `accounts.containers.destinations` | list, get, link | Link a Google tag ID (`G-`, `AW-`, `DC-`) to the container. |
| `accounts.containers.environments` | list, get, create, update, delete, reauthorize | Custom envs for staging/QA. `update` can set `enableDebug`, `url`. |
| `accounts.containers.version_headers` | list, latest | Cheap metadata list of versions (no entities). |
| `accounts.containers.versions` | get, live, update, delete, undelete, publish, set_latest | `live` = currently published version (full entity dump = your export). `publish` needs the `publish` scope + GTM Publish permission. |
| `accounts.containers.workspaces` | list, get, create, update, delete, getStatus, sync, resolve_conflict, quick_preview, create_version, bulk_update | See workflow below. |
| `…workspaces.built_in_variables` | list, create, delete, revert | `create(parent, type=[...names])`, one call for many. |
| `…workspaces.variables` | list, get, create, update, delete, revert | |
| `…workspaces.triggers` | list, get, create, update, delete, revert | |
| `…workspaces.tags` | list, get, create, update, delete, revert | |
| `…workspaces.folders` | list, get, create, update, delete, entities, move_entities_to_folder, revert | `move_entities_to_folder(path=folderPath, tagId=[...], triggerId=[...], variableId=[...])`. |
| `…workspaces.templates` | list, get, create, update, delete, revert, import_from_gallery | Custom tag/variable templates (`templateData` = .tpl file text). |
| `…workspaces.clients` | list, get, create, update, delete, revert | Server containers only (`gaaw_client`, `mp_client`, …). |
| `…workspaces.transformations` | list, get, create, update, delete, revert | Server containers only. |
| `…workspaces.zones` | list, get, create, update, delete, revert | Zones (child containers + type restrictions). |
| `…workspaces.gtag_config` | list, get, create, update, delete | Google tag config objects (containers with `supportGtagConfigs`). |

`revert` on any workspace entity discards that entity's workspace changes (back to
the latest version's state). Useful "undo one thing" without deleting the workspace.

## Workspace → version → publish lifecycle

```python
ws = workspaces().create(parent=container_path, body={"name": "feat: x", "description": "…"})
# … edit entities in ws["path"] …
status = workspaces().getStatus(path=ws["path"])       # {"workspaceChange":[…], "mergeConflict":[…]}
if status.get("mergeConflict"):
    workspaces().sync(path=ws["path"])                 # pulls latest version into ws
    # inspect result["mergeConflict"]; for each: resolve_conflict(path, fingerprint, body=entity)
preview = workspaces().quick_preview(path=ws["path"])  # {"containerVersion":…, "compilerError": bool, "syncStatus":…}
resp = workspaces().create_version(path=ws["path"], body={"name": "v-name", "notes": "why"})
# resp: {"containerVersion": {...}, "compilerError": bool, "newWorkspacePath": str, "syncStatus": {...}}
if resp.get("compilerError"): raise …                   # nothing was versioned
version_path = resp["containerVersion"]["path"]
versions().publish(path=version_path, fingerprint=resp["containerVersion"]["fingerprint"])
```

- `create_version` **deletes the workspace** on success (it's consumed); the
  response's `newWorkspacePath` is a fresh empty workspace you may ignore/delete.
- Version numbering is sequential per container; the response contains `containerVersionId`.
- Rollback = `publish` an older version path (no need to recreate anything).
- Free-tier containers: max 3 workspaces. List and delete stale ones before creating.

## Entity body skeletons (details in entity-recipes.md / triggers.md)

```jsonc
// Tag
{ "name": "…", "type": "gaawe", "parameter": [ {Parameter}… ],
  "firingTriggerId": ["12"], "blockingTriggerId": [], "notes": "…",
  "tagFiringOption": "ONCE_PER_EVENT" | "UNLIMITED" | "ONCE_PER_LOAD",
  "paused": false, "priority": {"type":"INTEGER","value":"0"},
  "parentFolderId": "3", "setupTag":[{"tagName":"…","stopOnSetupFailure":true}],
  "teardownTag":[{"tagName":"…","stopTeardownOnFailure":false}],
  "consentSettings": {"consentStatus": "NEEDED", "consentType": {"type":"LIST","list":[{"type":"STRING","value":"analytics_storage"}]}},
  "scheduleStartMs": "…", "scheduleEndMs": "…", "liveOnly": false }

// Trigger
{ "name": "…", "type": "CUSTOM_EVENT", "customEventFilter": [ {Condition}… ],
  "filter": [ {Condition}… ], "autoEventFilter": [ {Condition}… ],
  "parameter": [ {Parameter}… ], "notes": "…", "parentFolderId": "3" }

// Variable
{ "name": "…", "type": "v", "parameter": [ {Parameter}… ],
  "formatValue": { "caseConversionType": "LOWERCASE", "convertNullToValue": {Parameter}, "convertUndefinedToValue": {Parameter}, "convertTrueToValue": {Parameter}, "convertFalseToValue": {Parameter} },
  "notes": "…", "parentFolderId": "3",
  "enablingTriggerId": [], "disablingTriggerId": [], "scheduleStartMs": "…" }

// Parameter (recursive)
{ "type": "TEMPLATE" | "INTEGER" | "BOOLEAN" | "LIST" | "MAP" | "TRIGGER_REFERENCE" | "TAG_REFERENCE",
  "key": "…", "value": "…", "list": [ {Parameter}… ], "map": [ {Parameter}… ] }

// Condition
{ "type": "EQUALS" | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "MATCH_REGEX" | "GREATER" | "GREATER_OR_EQUALS" | "LESS" | "LESS_OR_EQUALS" | "CSS_SELECTOR" | "URL_MATCHES",
  "parameter": [ {"type":"TEMPLATE","key":"arg0","value":"{{Var}}"},
                 {"type":"TEMPLATE","key":"arg1","value":"literal or {{Var}}"},
                 {"type":"BOOLEAN","key":"negate","value":"true"},        // optional → "does not …"
                 {"type":"BOOLEAN","key":"ignore_case","value":"true"} ] } // optional
```

`TEMPLATE` values may embed variable references `{{Name}}` anywhere in the string;
`{{_event}}` is the current event name; `{{_url}}`, `{{_triggers}}` exist internally.

## HTTP error quick map

| Code | Usual meaning | Fix |
|---|---|---|
| 400 `INVALID_ARGUMENT` | bad enum, missing required param for the tag/variable type, unknown `{{Variable}}`, invalid regex | compare body with recipes; check variable names exactly (case, spaces) |
| 401 | bad/expired token | re-auth; for SA check key file + clock |
| 403 | no GTM permission for this account/container, or quota | add SA in GTM User Management; slow down |
| 404 | wrong `path`/`parent` (typo, wrong workspace id, entity deleted) | re-list to get fresh paths |
| 409 | conflict, e.g. workspace name exists / entity name already exists on create_version | rename or upsert |
| 412 | fingerprint mismatch (stale) | `get` again, re-apply changes |
| 429 / 403 rate | quota | back off ≥ 100 s, reduce calls |
| 500/503 | transient | retry with backoff (client does) |
