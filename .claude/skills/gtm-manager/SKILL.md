---
name: gtm-manager
description: Programmatically set up and manage Google Tag Manager (GTM) through the Tag Manager API v2 — from absolute zero (Google Cloud project, API enablement, credentials, granting the service account access, first API call) through creating containers, workspaces, variables, triggers, tags, folders, built-in variables, custom templates, consent settings, versions and publishing. Use this skill whenever the user mentions GTM, Tag Manager, tagmanager.googleapis.com, containers, workspaces, GA4 tags/Google tag, custom event triggers, data layer variables, publishing a container version, or wants tracking/analytics tags automated, scripted, bulk-edited, migrated, exported or audited — even if they don't say "API". Also trigger for "add a click trigger", "fire a tag when…", "set up GA4 via GTM", "create a lookup table variable", "publish the container", or any request to script Google Tag Manager changes.
---

# GTM Manager

Automate Google Tag Manager with the Tag Manager API v2. This skill gives you a
working mental model of the API, exact JSON shapes for every common entity, a
rate-limited Python client (`scripts/gtm_client.py`), and a declarative spec
format so a whole tracking setup can be applied in one command.

## Read this first: how GTM is organised

```
Account (created manually in the GTM UI — cannot be created via API)
└── Container  (GTM-XXXXXXX; usageContext: web | server | android | ios | amp)
    ├── Workspace(s)  ← ALL edits happen here (tags, triggers, variables, folders,
    │                   built-in variables, templates, clients, zones)
    ├── Versions       ← immutable snapshots created FROM a workspace
    │     └── one of them is "live" (published)
    ├── Environments   (Live, Latest, + custom)
    └── Destinations   (linked Google tag IDs)
```

Every resource has a `path` like
`accounts/123/containers/456/workspaces/7/tags/89`. Use `path` for get/update/
delete and `parent` (the path one level up) for list/create. Tags reference
triggers by **ID** (`firingTriggerId: ["89"]`) and reference variables by
**name** inside parameter values (`"value": "{{DLV - user_id}}"`). This asymmetry
causes most bugs — always resolve names → IDs for triggers, and make sure any
`{{Name}}` you reference actually exists (or is an enabled built-in variable).

## Workflow — pick the entry point that matches the user's situation

| Situation | Do this |
|---|---|
| No GCP project / no credentials / "start from nothing" | Follow `references/setup-from-zero.md` end-to-end, then run `python scripts/gtm_client.py whoami` to prove auth works. |
| Credentials exist, need to build/extend tracking | Export a backup → work in a fresh workspace → apply changes (spec or ad-hoc) → create version → get explicit OK → publish. See "Standard change procedure" below. |
| "Add one tag/trigger/variable" | Same procedure, but you can write the entity JSON by hand from `references/entity-recipes.md` / `references/triggers.md`. |
| Complex behaviour (custom templates, consent mode, trigger groups, setup/teardown chains, server-side, bulk rename/migrate) | `references/advanced-patterns.md`. |
| Something errored | `references/troubleshooting.md`. |

## Standard change procedure (follow in order)

1. **Confirm target** — account ID, container (name or `GTM-` public ID). If unknown, list them:
   `python scripts/gtm_client.py accounts` then `... containers --account <id>`.
2. **Back up** — `python scripts/gtm_client.py export --container <path> --out backup.json`
   (exports the live version in the same JSON format the GTM UI imports). There is
   no undo in the API; a backup is the undo.
3. **Create a dedicated workspace** for the change (`get-or-create-workspace --name "feat: GA4 events"`).
   Never pile unrelated edits into Default Workspace — it makes version notes
   meaningless and merges painful. Containers are limited to 3 workspaces on the
   free tier, so delete finished ones.
4. **Read before you write** — list existing entities and build name→id maps.
   Upsert by *name*, never blindly create (duplicates with the same name are allowed
   by the API and are a mess to clean up).
5. **Create in dependency order**: enable built-in variables → user variables →
   triggers → tags → folders/move. Tags can't reference a trigger that doesn't exist yet.
6. **Validate** — `create_version` compiles the container; check the response's
   `compilerError`. Optionally `quick_preview` first (returns the compiled
   container without creating a version).
7. **Publish only with explicit user confirmation.** Publishing changes what
   runs on the live site instantly. Say what will go live and wait for a "yes".
8. **Report** — version number, what changed, and the `tagManagerUrl` so the user can eyeball it.

## Using the bundled client

`scripts/gtm_client.py` handles auth (service account or OAuth), the 0.25 QPS
quota (it sleeps between calls and retries 403/429/5xx with backoff), and the
get-then-update-with-fingerprint dance. Install deps once:

```bash
pip install google-api-python-client google-auth google-auth-oauthlib
export GTM_SERVICE_ACCOUNT_FILE=/path/to/sa-key.json   # or GTM_OAUTH_CLIENT_SECRETS=...
```

Common commands (`--help` on any subcommand):

```bash
python scripts/gtm_client.py whoami                                   # proves auth + lists accounts
python scripts/gtm_client.py containers --account accounts/123
python scripts/gtm_client.py create-container --account accounts/123 --name "mysite.com" --context web
python scripts/gtm_client.py snippet --container accounts/123/containers/456   # install <script> tags
python scripts/gtm_client.py get-or-create-workspace --container ... --name "feat: ga4"
python scripts/gtm_client.py entities --workspace ...                 # tags/triggers/variables with ids
python scripts/gtm_client.py apply --workspace ... --spec spec.json [--dry-run]
python scripts/gtm_client.py create-version --workspace ... --name "v12 GA4 events"
python scripts/gtm_client.py publish --version accounts/.../versions/12
```

Import it for ad-hoc work:

```python
from gtm_client import GTM
gtm = GTM()                                   # reads env vars
ws  = gtm.get_or_create_workspace(container_path, "feat: scroll tracking")
gtm.enable_builtins(ws, ["scrollDepthThreshold", "scrollDepthUnits", "scrollDirection"])
trig = gtm.upsert_trigger(ws, {...})          # returns the created/updated trigger
tag  = gtm.upsert_tag(ws, {..., "firingTriggerId": [trig["triggerId"]]})
```

## The declarative spec (preferred for anything more than 2–3 entities)

`assets/container-spec.example.json` is a complete GA4 baseline (constant for the
measurement ID, Google tag, page_view suppression, custom-event triggers, GA4
event tags with parameters, a lookup table, folders). The `apply` command:

- enables listed `builtInVariables`
- upserts `variables`, `triggers`, `tags` **by name** in that order
- resolves `firingTriggers` / `blockingTriggers` (names) → IDs
- resolves `setupTag`/`teardownTag` names and `folder` names
- verifies every `{{Reference}}` in parameter values exists
- `--dry-run` validates the spec offline and prints the plan without calling the API

Write specs by copying shapes from the example and `references/entity-recipes.md`.
Keep the spec in the user's repo — it becomes the source of truth and a diffable
change history for tracking.

## Non-negotiable safety rules

- **No publish without a clear, explicit "yes" from the user in this conversation.**
- **Never delete** tags/triggers/variables/containers unless asked by name; export first.
- Respect the quota: 25 requests / 100 s per GCP project, 10 000 / day. Batch
  reads (one `list` per entity type, not one `get` per entity), and never poll in a loop.
- Don't put secrets (API keys, measurement IDs of other clients) in Custom HTML
  tags or notes; use Constant variables so they're visible and replaceable.
- Custom HTML / Custom JavaScript execute on the user's live site. Review any code
  you write into them as you would production frontend code (no `document.write`
  unless `supportDocumentWrite` is intentional, no unhandled exceptions, no PII leaks).
- The API accepts enum values in both `camelCase` (docs) and `UPPER_SNAKE`
  (exports). Responses come back `UPPER_SNAKE`. Normalise before comparing.

## Naming conventions (use unless the container already has its own)

Prefix by type so lists stay readable:
`GA4 - Event - add_to_cart`, `GT - Google tag`, `CE - purchase` (custom event
trigger), `Click - CTA buttons`, `DLV - ecommerce.value`, `C - GA4 Measurement ID`,
`LT - content_group` (lookup table), `CJS - clean path` (custom JS),
`ES - default event settings`. Put notes on every entity explaining *why* it exists.

## Reference files

- `references/setup-from-zero.md` — GCP project, enable API, service account vs OAuth, GTM permission grant, client libs (Python/Node), first call. Read when there are no working credentials.
- `references/api-cheatsheet.md` — every resource + method, required scopes, path/parent conventions, fingerprints, pagination, quota, error codes.
- `references/entity-recipes.md` — copy-paste JSON for tags (Google tag, GA4 event, Custom HTML, Custom Image, Google Ads, custom template) and variables (data layer, constant, custom JS, URL, cookie, lookup/regex table, DOM, auto-event, event settings), plus built-in variable names and `formatValue`.
- `references/triggers.md` — every trigger type with JSON, condition operators, `filter` vs `customEventFilter` vs `autoEventFilter`, blocking triggers, trigger groups, timer/scroll/visibility/YouTube/history parameters.
- `references/advanced-patterns.md` — custom templates via API, gallery import, consent mode, setup/teardown tag chains, tag sequencing & priority, zones, environments, server-side containers & clients, bulk operations, container export/import/migration, user permissions.
- `references/troubleshooting.md` — decoding 400/403/404/409, compiler errors, "variable not found", missing built-ins, workspace conflicts and `sync`/`resolve_conflict`, why a tag doesn't fire even though the API accepted it.
