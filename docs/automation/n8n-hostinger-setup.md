# n8n on Hostinger — setup and running it (2026-11-16)

The host for the inbox automation showcase (`README.md` in this folder), after Bluehost cancelled the account on
2026-11-15 (`n8n-server-setup.md`, kept as history). Sources: Hostinger's support articles on the n8n VPS template,
updating n8n and the VPS firewall, and n8n's docs on instance-level MCP (links at the end), read 2026-11-16.

What Hostinger gives: a VPS with the template **"Ubuntu 24.04 with n8n"**. n8n runs in Docker behind Traefik (HTTPS),
the Compose project sits in `/docker/n8n`. It is still a server you own: updates, firewall and snapshots are yours,
but each is a few clicks in hPanel. Use the plain template, not "(queue mode)": queue mode adds Redis and three
workers, which a demo doesn't need.

Rules that carry over: the agent never sees a secret (tokens, keys, the `.env` on the server); you paste secrets into
n8n or the server yourself. The agent does not SSH in; any server command below is yours, in hPanel's browser terminal.

## Status 2026-11-16 (checked from outside)

- Server `srv2164740.hstgr.cloud`, IP `72.60.180.153`. n8n was deployed through **Docker Manager** (not the template):
  it answers on **`http://72.60.180.153:32768`** (plain HTTP, `/healthz` 200) and its own name is
  **`n8n-edmz.srv2164740.hstgr.cloud`** (DNS → the same IP). MCP URL: `https://n8n-edmz.srv2164740.hstgr.cloud/mcp-server/http`
  (in `.mcp.json`); MCP refuses calls without a token (401, on the port-32768 address).
- **Open:** HTTPS on that name fails: the server resets the TLS handshake on 443 (from this PC and from an outside
  fetcher). Until it works, Google sign-in (needs https) and MCP (token must not travel over http) wait, and nobody
  signs in on the `:32768` address. Once HTTPS works, the firewall (step 2) closes 32768.

**Fixed 2026-11-16: n8n lives at `https://n8n.vosk.dev`.** The server was never broken: the owner's ISP blocks the
`*.hstgr.cloud` names (HTTP → 307 to a block page at `88.255.216.16/landpage`, HTTPS reset on the name only; HTTPS to
the IP with the name in the Host header answered 200). Visitors on such networks would hit the same block, so the
public address is our own domain. Done: GoDaddy `A` record `n8n` → `72.60.180.153`; in Docker Manager the `n8n-edmz`
compose got `Host(\`n8n.vosk.dev\`)`, `N8N_HOST=n8n.vosk.dev`, `N8N_PROTOCOL=https`, `N8N_PROXY_HOPS=1`,
`WEBHOOK_URL=https://n8n.vosk.dev/`, execution pruning (14 days) and `TZ=Europe/Istanbul`. Checked from here:
`/healthz` 200 with a valid certificate, MCP `initialize` 200 with the saved token (n8n MCP Server 1.2.0), `.mcp.json`
points to `https://n8n.vosk.dev/mcp-server/http`. Read `n8n.vosk.dev` wherever this guide says `n8n.srvNNNNNN.hstgr.cloud`;
for Google (step 5) the authorized domain is `vosk.dev`. Then (owner, same day): `N8N_SECURE_COOKIE=true`,
firewall group `n8n` (accept 22/80/443) active, snapshot taken. Checked from here: 22, 80, 443 open; 5678, 8080 and
`32768` closed; `/healthz` 200. Steps 1–4 and 7 are done; next is step 5 (Google).

## Step 1 — Find the address and claim n8n (you, 5 min)

1. hPanel → **VPS** → your server → **Overview**. Note the hostname, `srvNNNNNN.hstgr.cloud`.
2. Click **Manage App**, or open **`https://n8n.srvNNNNNN.hstgr.cloud`**.
3. First visit asks for the owner account: email `vosk.dev@gmail.com`, your name, a strong password (password manager).
4. Avatar → **Settings** → **Personal** → **Enable 2FA**.
5. Find the version: **Help** (?) → **About n8n**. Write it down; send it to me with the address.

Check: the address opens with a padlock, no certificate warning.

## Step 2 — Firewall (you, 5 min)

hPanel → VPS → **Security** → **Firewall** → **Create firewall group** (`n8n`) → add three **accept** rules:
TCP **22** (SSH), TCP **80** (HTTP, needed for the certificate), TCP **443** (HTTPS) → **Activate** it on the server.

Careful: Hostinger's firewall drops everything that has no accept rule, and a group with no rules blocks all traffic.
Add the three rules before activating. n8n's own port 5678 stays closed: Traefik reaches it inside Docker.

Check: `https://n8n.srvNNNNNN.hstgr.cloud` still opens. I check from outside that only 22, 80, 443 answer.

## Step 3 — Snapshot before anything risky (you, 2 min)

hPanel → VPS → **Snapshot & backups** → **Create snapshot**. Take one now (clean install), then before every n8n update
and after the flows work. A snapshot holds the whole server: workflows, credentials and n8n's encryption key.
Whether the plan includes automatic weekly backups is shown on that page; note it here when you see it.

## Step 4 — MCP for the agent (you, 5 min)

1. n8n → **Settings** → **Instance-level MCP** → **Enable MCP access** (owner only).
   Missing from Settings? The n8n is too old: update it (step 6), then come back.
2. **Connect** (under Connection details) → tab **API key**: n8n shows a personal access token. Copy it.
3. On your PC, PowerShell, with the token on the clipboard:
   ```powershell
   [Environment]::SetEnvironmentVariable("N8N_MCP_TOKEN", (Get-Clipboard -Raw).Trim(), "User"); Set-Clipboard -Value " "
   ([Environment]::GetEnvironmentVariable("N8N_MCP_TOKEN", "User")).Length
   ```
   The second line prints only the length (a few hundred, not 1).
4. The server URL is shown on the same page and ends in `/mcp-server/http`
   (`https://n8n.srvNNNNNN.hstgr.cloud/mcp-server/http`). I add it to `.mcp.json`, test it without printing the token,
   then you restart VS Code and approve `n8n` in `/mcp`.

MCP only builds and runs what you allow: workflows are exposed to MCP one by one, inside each workflow's settings.

## Step 5 — Google and the credentials (you, 20 min)

The Google project `vosk-inbox-demo` and its OAuth client stay (`n8n-server-setup.md` step 11). Changes:

1. Google Auth Platform → **Clients** → **n8n** → Authorized redirect URIs: add
   `https://n8n.srvNNNNNN.hstgr.cloud/rest/oauth2-credential/callback` (copy it from n8n's Gmail credential dialog,
   "OAuth Redirect URL"). Remove the Bluehost URI. If not done yet: add a new client secret, delete the old one.
2. **Branding** → Authorized domains: add **`srvNNNNNN.hstgr.cloud`** (the full name: `hstgr.cloud` is on the public
   suffix list, so Google treats each `srv…` name as its own domain). Remove `mybluehost.me`.
3. n8n → Credentials → create, each signed in as **n8n.opc@gmail.com**:
   - **Gmail OAuth2 API**: tick only "View, compose and send email from your Gmail account" and "See and edit your
     email labels".
   - **Google Sheets OAuth2 API**: all three boxes.
   - **Google Drive OAuth2 API**: only "See, edit, create and delete all of your Google Drive files".
4. **Anthropic** credential with the LLM key from a separate workspace that has a monthly spend limit.

## Step 6 — Updating n8n (you, 10 min, monthly or when I ask)

1. Snapshot (step 3).
2. hPanel → VPS → **Docker Manager** → the project that holds the n8n container (its name may be `root`, not `n8n`) →
   **⋮** → **Update**. Wait a few minutes; don't click Update again while it runs.
   Or, in the browser terminal: `cd /docker/n8n && docker compose pull && docker compose down && docker compose up -d`.
3. Check the version in **Help** → **About n8n**.

**n8n 3.0 is a breaking release.** Before moving from 2.x to 3.x: snapshot, then n8n → **Settings** →
**Migration Report** (if missing, update to the latest 2.x first) and fix what it lists. The database upgrade is
one-way; the snapshot is the only way back. Hostinger support does not fix workflows.

## Step 7 — Settings in the Compose file (you, browser terminal, 10 min, once)

Hostinger: n8n's settings are the `environment` block of the `n8n` service in `/docker/n8n/docker-compose.yml`;
secrets go in `/docker/n8n/.env` and are referenced as `${NAME}`; apply with `docker compose up -d` in that folder.
Snapshot first. Add, if not already there:

```yaml
      - GENERIC_TIMEZONE=Europe/Istanbul
      - TZ=Europe/Istanbul
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=336        # hours: keep run history 14 days, the demo's retention
```

Then `cd /docker/n8n && docker compose up -d`, and check n8n opens. Don't paste the file or `.env` into chat: tell me
what you added.

## Step 8 — Tell me "Hostinger ready"

Send: the n8n address, the version, and "token saved". I check from outside without logging in: `/healthz` 200 with a
valid certificate, only 22/80/443 open, MCP `initialize` 200 with the token. Then the credentials list (names only),
then the build (README → "Build order").

## Sources

- Hostinger: [How to use the n8n VPS template](https://www.hostinger.com/support/10473267-how-to-use-the-n8n-vps-template)
- Hostinger: [How to update n8n at Hostinger](https://www.hostinger.com/support/?p=287)
- Hostinger: [How to prepare your Hostinger VPS for n8n 3.0](https://www.hostinger.com/support/?p=21745)
- Hostinger: [How to use a managed VPS firewall](https://www.hostinger.com/support/8172641-how-to-use-a-managed-vps-firewall-at-hostinger/)
- n8n: [Accessing the n8n MCP server](https://docs.n8n.io/advanced-ai/accessing-n8n-mcp-server/)
