# Troubleshooting

Work top-down: auth → permissions → quota → body shape → references → compile → runtime.

## `accounts.list` returns `{}` / empty, or 403 on everything
The credential works but has no GTM access. The service-account email (or the
OAuth user) must be added in **GTM UI → Admin → User Management** with at least
*User* on the account and *Edit/Approve/Publish* on the container. Wait ~1 min after adding.

## 403 "insufficient quota" / "rateLimitExceeded" / 429
25 requests per 100 s per GCP project. Back off ≥ 100 s. Check you're not creating
a new discovery `build()` inside a loop (some clients do a discovery fetch each time).
`gtm_client.py` paces at 1 req / 4.2 s; if two processes share the project they
collide — run one at a time.

## 400 `INVALID_ARGUMENT` on create/update
Most common causes, in order:
1. **Unknown variable reference** — `{{Name}}` doesn't exist in this workspace
   (typo, wrong case, built-in not enabled, or the variable exists only in another
   unmerged workspace). Run `entities` and grep.
2. **Missing required parameter for the type** — e.g. `gaawe` without
   `measurementIdOverride`/`eventName`, `v` without `name`, `smm` without `input`.
3. **Wrong parameter `type`** — booleans must be `{"type":"BOOLEAN","value":"true"}`
   (string), integers `"INTEGER"`; nested tables must be `LIST` of `MAP`.
4. **Bad enum** — trigger `type`, `tagFiringOption`, condition `type`, `usageContext`.
5. **Invalid regex** in `MATCH_REGEX` / `remm` (JS regex syntax; escape `/` and `\`).
6. **Trigger id doesn't exist** in `firingTriggerId` (deleted, or from another container).
7. Custom JS variable body isn't a single `function(){…}` expression.
The error `message` usually names the field; read it before guessing.

## 404 on a path that "should exist"
- Workspace was consumed by `create_version` (it's deleted on success) — create/list workspaces again.
- Entity was deleted or reverted in this workspace.
- Copy-paste of a path from a *different* container/account.

## 412 precondition failed
Fingerprint mismatch: someone edited the entity between your `get` and `update`.
`get` again, re-apply your delta, `update` with the fresh fingerprint.

## 409 on `create_version` / "workspace has conflicts"
Another version was published after this workspace was created. Run
`workspaces().sync(path)`, inspect `mergeConflict[]`; for each, decide and call
`resolve_conflict(path, fingerprint=…, body=<entity in its resolved form>)`, then
`create_version` again. Or simpler: create a fresh workspace and re-apply the spec.

## `create_version` returns `compilerError: true`
Nothing was versioned. Use `quick_preview` — the response's `containerVersion`
plus the error surface in the UI's workspace page (`tagManagerUrl`). Usual causes:
unresolvable variable references, invalid template permissions, a Custom JS
variable with ES6 syntax, circular variable references.

## Free-tier limit: "Too many workspaces"
Max 3. `workspaces().list`, delete stale ones (`delete(path)`) — deleting a
workspace discards its unversioned changes; export/inspect first if unsure.

## Tag created fine but never fires on the site
API acceptance ≠ runtime correctness. Check, in order:
1. Is the version **published** (`versions().live`) and is the site loading *that*
   container (`GTM-XXXX` matches; no stale CDN)?
2. Does the data layer push actually happen with that exact `event` name (case!)?
   In the browser: `dataLayer.filter(e => e.event)`.
3. Trigger conditions: `filter` references a variable that is `undefined` at that
   moment (e.g. DLV read on `pageview` before the push). Custom-event triggers only
   see values pushed in the same or earlier pushes.
4. Blocking trigger or `paused: true` or `scheduleStart/EndMs`.
5. Consent: `consentStatus: NEEDED` and consent not granted → tag silently skipped.
6. For click triggers: `clickElement` built-in enabled? Selector matches the *clicked*
   element (child spans!) → add `, selector *`.
7. `tagFiringOption: ONCE_PER_LOAD` on a SPA — fires once, then never.
8. Adblockers block `googletagmanager.com` — test in a clean profile.

## GA4 receives the event but parameters are empty
- Parameter values referencing DLVs that aren't in the *current* push. Push the
  params in the same `dataLayer.push` as the event.
- `ecommerce` object nested wrongly (`items` must be an array under `ecommerce`).
  Push `{ecommerce: null}` first to clear previous state.
- Custom dimensions must also be registered in GA4 Admin → Custom definitions
  (GTM has no API for that; Admin API of GA4 does).

## OAuth loop / `invalid_grant`
Delete the cached token (`~/.gtm-manager/token.json`) and re-run. For external
consent screens in *Testing* status, refresh tokens expire after 7 days — publish
the consent screen or use a service account.

## Service account: `invalid_grant: Invalid JWT`
System clock skew, or the key was deleted/rotated in Cloud Console. Re-download.

## Enum comparison bugs in your own code
API returns `PAGEVIEW`, `CUSTOM_EVENT`, `TEMPLATE`, `ONCE_PER_EVENT`; docs show
`pageview`, `customEvent`, `template`, `oncePerEvent`. Normalise with
`.upper().replace("-", "_")` and treat `CUSTOMEVENT`/`CUSTOM_EVENT` as equal when
diffing (the client's `norm_enum` does this).
