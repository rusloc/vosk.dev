# Setup from absolute zero

Goal: go from "nothing" to a script that can list and edit GTM containers.
Walk the user through the manual steps (they're all in Google UIs you can't drive)
and run the automated ones yourself.

## Step 0 — The GTM account and container (manual, GTM UI)

The API **cannot create accounts**. If the user has none:

1. Go to https://tagmanager.google.com → *Create Account*.
2. Account name = company/site; Container name = domain; Target platform = Web
   (or Server / iOS / Android as appropriate).
3. Accept the ToS. Note the **account ID** (numeric, in the URL:
   `.../accounts/6242509574/...`) and the **container public ID** (`GTM-XXXXXXX`).

Containers *can* be created via API once an account exists (see `create-container`).

## Step 1 — Google Cloud project + enable the API (manual, Cloud Console)

1. https://console.cloud.google.com → create/select a project (any project; it does
   **not** need to be in the same Google account as GTM — quota is per project).
2. *APIs & Services → Library* → search **"Tag Manager API"** → *Enable*.
   Direct link: https://console.cloud.google.com/apis/library/tagmanager.googleapis.com
3. If prompted, configure the *OAuth consent screen* (Internal if Workspace org,
   otherwise External + add the user's email as a test user). Required even for
   service accounts in some projects; harmless to do.

## Step 2 — Credentials: service account (recommended) or OAuth client

### Option A — Service account (headless automation, CI, "AI assistant runs it")

1. *IAM & Admin → Service Accounts → Create*. Name e.g. `gtm-automation`. No GCP
   roles needed (GTM permissions are granted inside GTM, not IAM).
2. Open the SA → *Keys → Add key → JSON*. Save as `gtm-sa.json`. **Treat as a
   password**; add to `.gitignore`.
3. Copy the SA email (`gtm-automation@<project>.iam.gserviceaccount.com`).
4. **In GTM UI**: *Admin → Account → User Management → Add users* → paste the SA
   email → Account permission **Admin** (or *User*) → Container permission
   **Publish** (needed to publish; *Approve* can create versions but not publish;
   *Edit* can only edit workspaces). This step is the one people forget — without
   it every call returns 403 / empty account list.
5. `export GTM_SERVICE_ACCOUNT_FILE=/abs/path/gtm-sa.json`

### Option B — OAuth desktop client (acts as a human user, interactive first run)

1. *APIs & Services → Credentials → Create credentials → OAuth client ID* →
   Application type **Desktop app** → download JSON as `client_secrets.json`.
2. `export GTM_OAUTH_CLIENT_SECRETS=/abs/path/client_secrets.json`
3. First run opens a browser for consent; the token is cached at
   `~/.gtm-manager/token.json` (override with `GTM_TOKEN_FILE`). Use this when the
   user wants changes attributed to *them* in GTM's version history.

### Scopes

Request only what the task needs; `gtm_client.py` requests the full set by default
(override with `GTM_SCOPES` comma-separated):

| Scope (`https://www.googleapis.com/auth/…`) | Lets you |
|---|---|
| `tagmanager.readonly` | list/get everything |
| `tagmanager.edit.containers` | create/update/delete workspace entities, create containers |
| `tagmanager.delete.containers` | delete containers |
| `tagmanager.edit.containerversions` | create versions, update version metadata |
| `tagmanager.publish` | publish a version |
| `tagmanager.manage.users` | user permissions |
| `tagmanager.manage.accounts` | edit account settings |

Service accounts ignore scopes for authorisation (GTM permissions rule) but the
library still needs them declared.

## Step 3 — Install a client library

**Python (used by the bundled script):**
```bash
pip install google-api-python-client google-auth google-auth-oauthlib
```

**Node.js:**
```bash
npm i googleapis
```
```js
import { google } from "googleapis";
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GTM_SERVICE_ACCOUNT_FILE,
  scopes: ["https://www.googleapis.com/auth/tagmanager.edit.containers",
           "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
           "https://www.googleapis.com/auth/tagmanager.publish"],
});
const tagmanager = google.tagmanager({ version: "v2", auth });
const { data } = await tagmanager.accounts.list();
```
Node method names mirror REST: `tagmanager.accounts.containers.workspaces.tags.create({ parent, requestBody })`.

**Raw REST (any language):** base URL `https://tagmanager.googleapis.com/tagmanager/v2/`,
bearer token from the SA/OAuth flow, JSON bodies. Example:
`POST /tagmanager/v2/accounts/123/containers/456/workspaces/7/tags` with the Tag body.

**Apps Script:** *Services → Tag Manager API* (advanced service). Same object model:
`TagManager.Accounts.Containers.Workspaces.Tags.create(tag, parent)`.

## Step 4 — First call (proves everything)

```bash
python scripts/gtm_client.py whoami
```
Expected: a list of accounts with IDs. Empty list ⇒ the SA/user has not been added
in GTM User Management (Step 2A-4) or was added to the wrong account.

Then:
```bash
python scripts/gtm_client.py containers --account accounts/<ID>
python scripts/gtm_client.py snippet --container accounts/<ID>/containers/<CID>
```
The snippet command returns the exact `<script>`/`<noscript>` blocks to paste into
the site `<head>` and `<body>` — give these to the user (or write them into their
Next.js `app/layout.tsx` / GTM component if they're in a codebase).

## Step 5 — Baseline tracking (optional but usually what "set up GTM" means)

Copy `assets/container-spec.example.json`, replace `G-XXXXXXXXXX` with the user's
GA4 measurement ID, adjust event names to their data layer, then:
```bash
python scripts/gtm_client.py apply --workspace <ws path> --spec spec.json --dry-run
python scripts/gtm_client.py apply --workspace <ws path> --spec spec.json
python scripts/gtm_client.py create-version --workspace <ws path> --name "Baseline GA4"
# ask user, then:
python scripts/gtm_client.py publish --version <version path>
```

## Data layer contract (tell the developer)

GTM only sees what the site pushes. Standard shape:
```js
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({ event: "sign_up", method: "email", user_id: "abc" });
```
- `event` is the key that custom-event triggers match on (`{{_event}}`).
- Everything else is read with Data Layer Variables (`type: "v"`, `name: "method"`,
  dot-paths allowed: `ecommerce.items.0.item_id`).
- For SPAs (Next.js/React), push on route change and use a History Change trigger
  or a custom `page_view` event rather than relying on the initial Page View.
- Push `ecommerce: null` before each ecommerce push to avoid stale nested objects.
