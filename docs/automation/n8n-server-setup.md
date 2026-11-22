# n8n server setup — step by step (Bluehost VPS, 2026-11-15)

> **⛔ Abandoned 2026-11-15, late evening. Bluehost is not reliable and is not to be used.** Bluehost cancelled the
> owner's payment and the account, after two outages the same day (the first VPS, then its replacement, stopped answering
> on every port). Nothing was built on it. The owner moves to a hosted n8n (provider not chosen yet). This guide stays as
> history; what still applies on the next host: step 11 (Google project, consent screen, OAuth client: change the
> redirect URI to the new host's), the Gmail scope choice, the credential list, and step 9b's token method.

The server for the inbox automation showcase (`README.md` in this folder). Every step says **who** does it, **where**
(your PC in PowerShell, the server over SSH, or a web page) and **how to check** it worked. Do them in order.

## What we know about the server (checked 2026-11-15 from outside)

| | |
|---|---|
| Host | Bluehost "Standard VPS - NVMe 2": 1 core, 2 GB RAM, 50 GB NVMe |
| IP | `129.121.162.175` |
| Open ports | 22 (SSH), 80 (HTTP), 443 (HTTPS). 5678, 5432, 3000, 8080 closed. Good. |
| Already running | **n8n, preinstalled by Bluehost**, behind the **Traefik** proxy. Port 80 serves the n8n editor over plain HTTP; port 443 has only Traefik's self-signed default certificate. |
| n8n state | **No owner account yet** (`showSetupOnFirstLoad: true`): whoever opens the page first becomes the owner. |
| DNS for vosk.dev | GoDaddy (nameservers `ns55`/`ns56.domaincontrol.com`). `n8n.vosk.dev` does not exist yet. |

### Server replaced 2026-11-15, late evening

The first VPS (`129.121.173.84`, host `pwx.imv.mybluehost.me`) stopped answering on every port. n8n now runs on a new
instance: host **`ead.imv.mybluehost.me`**, IP **`129.121.162.175`** (DNS, checked), `/healthz` 200 over HTTPS. Every
address in this guide now points there. Consequences: the old MCP token is dead (401 with it), so the owner makes a new
one (step 9b) and re-saves `N8N_MCP_TOKEN`; Google's redirect URI changes to the new host (step 11, part 6). The bare
IP again serves n8n over plain HTTP.

New token saved and checked the same evening: 272 chars, `initialize` 200 (n8n MCP Server 1.2.0), `tools/list` 200.
Google redirect URI moved to the new host by the owner.

### Status 2026-11-15, evening (checked from outside)

- **Step 0 done:** the owner account is claimed (vosk.dev@gmail.com); the setup page is gone.
- **HTTPS already works on Bluehost's own name:** `https://ead.imv.mybluehost.me` has a valid Let's Encrypt
  certificate and HTTP redirects to HTTPS there. **Decision: use this address and skip `n8n.vosk.dev`** (steps 3 and
  the domain part of step 6): visitors never see the n8n address (they email the inbox and get a sheet link), so a
  vosk.dev name buys nothing. Everywhere below, read `n8n.vosk.dev` as `ead.imv.mybluehost.me`; Google's redirect URI
  (step 11) is `https://ead.imv.mybluehost.me/rest/oauth2-credential/callback`.
- **Still open:** the bare IP `http://129.121.162.175` serves the editor over plain HTTP, and the login cookie is not
  marked secure (`N8N_SECURE_COOKIE=false`). Until step 6 fixes both: **sign in only at the https address**, never the IP.
- **MCP:** n8n's instance MCP server is at `https://ead.imv.mybluehost.me/mcp-server/http`; it refuses calls without
  a token (401, checked). Connecting it is step 9b.

So we don't install n8n from scratch: we claim it, give it a name and HTTPS, lock the server down and back it up.
2 GB RAM is enough for n8n with its default SQLite database and Traefik; step 5 adds swap as a safety margin.

---

## Step 0 — Claim the n8n owner account. Do this first, today (you, browser, 3 min)

1. Open your password manager and generate a password: 24+ characters.
2. Open **http://129.121.162.175** in the browser.
3. You should see **"Set up owner account"**. Enter your email (e.g. vosk.dev@gmail.com), first and last name, the password. Submit.
4. Skip the "customize n8n" questions if offered.

Check: the page now shows the n8n workflow list, and opening the address in a private window asks you to **sign in**
instead of offering the setup.

⚠ The password travelled once without encryption (plain HTTP). You change it in step 8, after HTTPS is on.
⚠ If step 3 shows a **sign-in** page instead of the setup, someone claimed it before you. Stop and tell me: the fix
is to reinstall the VPS from the Bluehost panel and start again.

## Step 1 — Find your SSH login in the Bluehost panel (you, browser, 5 min)

1. Log in at bluehost.com → your VPS (the one with IP 129.121.162.175).
2. Find the server's **SSH / root access** details: the user name (usually `root`) and either a root password or a
   place to add an SSH key. Bluehost names this section differently across panels; look for "SSH", "Root access" or
   "Server credentials".
3. Note the **operating system** shown for the server (e.g. Ubuntu 22.04/24.04, AlmaLinux). Tell me which.

## Step 2 — Make an SSH key and log in with it (you, PowerShell on your PC, 5 min)

Windows has SSH built in. In **PowerShell**:

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\vosk_n8n" -C "vosk n8n server"
```

Press Enter for a passphrase or type one (recommended; you'll be asked for it on each login).

Copy the **public** key to the server (asks for the root password from step 1 once):

```powershell
type "$env:USERPROFILE\.ssh\vosk_n8n.pub" | ssh root@129.121.162.175 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

If the Bluehost panel has an "add SSH key" box, you can paste the contents of `vosk_n8n.pub` there instead.

Make logins short. Create or edit `C:\Users\vosk\.ssh\config` (Notepad is fine) and add:

```
Host n8n
    HostName 129.121.162.175
    User root
    IdentityFile ~/.ssh/vosk_n8n
```

Check: `ssh n8n` logs you in **without the root password**. Type `exit` to leave.

Never send me the file `vosk_n8n` (no `.pub`): that is the private key.

## Step 3 — DNS record at GoDaddy (you, browser, 5 min + up to 1 hour to spread)

1. godaddy.com → sign in → **My Products** → **Domains** → `vosk.dev` → **DNS** (Manage DNS).
2. **Add New Record**:
   - Type: **A**
   - Name: **n8n**
   - Value: **129.121.162.175**
   - TTL: default (1 hour)
3. Save. **Don't change any other record**: the site (`vosk.dev`, `www`) points at Vercel.

Check, in PowerShell (may take a few minutes to an hour):

```powershell
nslookup n8n.vosk.dev
```

It must answer `129.121.162.175`.

## Step 4 — Look at how Bluehost set n8n up (you on the server, or me; 10 min, read-only)

Nothing here changes the server. Log in (`ssh n8n`) and paste these one at a time, then send me **the output**.

```bash
cat /etc/os-release | head -3
free -h; df -h /; swapon --show
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker compose ls
```

The last command lists the Compose project and the folder its file lives in (column CONFIG FILES). Using that path:

```bash
cat /path/from/above/docker-compose.yml
```

And the settings file next to it, **with secrets hidden** (this prints names only for anything secret):

```bash
sed -E 's/^([A-Za-z0-9_]*(KEY|PASS|SECRET|TOKEN)[A-Za-z0-9_]*)=.*/\1=<hidden>/I' /path/from/above/.env
```

⚠ Never paste a raw `.env`, an `N8N_ENCRYPTION_KEY` or a password to me or into the repo.

From this output I write the exact changes for step 6. Two likely cases:
- **(a)** It's n8n's own documented Traefik setup (variables `DOMAIN_NAME`, `SUBDOMAIN`, `SSL_EMAIL` in `.env`). Then
  step 6 is a few lines in `.env`.
- **(b)** Bluehost's own layout. Then I write a replacement Compose file (n8n + Traefik with Let's Encrypt), versioned
  in this repo under `automation/server/`, keeping the existing n8n data volume.

## Step 5 — Harden the server (you, server, 20 min; I give you the commands as one script if you prefer)

Do this **after** step 2 works, and keep one SSH window open while you test a second one, so a mistake can't lock you out.
Commands are for Ubuntu/Debian; if step 1 showed AlmaLinux, tell me and I'll swap them.

**5.1 Updates and automatic security patches**

```bash
apt update && apt -y upgrade
apt -y install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades      # answer Yes
```

**5.2 Time zone**

```bash
timedatectl set-timezone Europe/Istanbul
```

**5.3 Swap, 2 GB** (a cushion so a busy moment doesn't kill n8n)

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf && sysctl -p /etc/sysctl.d/99-swap.conf
```

Check: `swapon --show` lists `/swapfile 2G`.

**5.4 SSH: keys only, no passwords**

```bash
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t && systemctl reload ssh || systemctl reload sshd
```

Check: in a **second** PowerShell window, `ssh n8n` still logs in. Only then close the first.

**5.5 Firewall: only SSH and web**

```bash
apt -y install ufw
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable && ufw status verbose
```

Note: Docker opens the ports it publishes past `ufw`. That's why step 4 checks that only Traefik publishes ports
(80, 443) and n8n's 5678 stays internal; from outside, 5678 is closed today.

## Step 6 — n8n on https://n8n.vosk.dev (me writes it from step 4, you apply; 15 min)

Needs step 3 (DNS answers the right IP) and ports 80/443 open. What changes, whatever the case from step 4:

| Setting | Value | Why |
|---|---|---|
| `N8N_HOST` | `n8n.vosk.dev` | the editor's own address |
| `N8N_PROTOCOL` | `https` | |
| `WEBHOOK_URL` | `https://n8n.vosk.dev/` | Google's sign-in comes back here (step 11) |
| `N8N_PROXY_HOPS` | `1` | n8n sits behind Traefik |
| `GENERIC_TIMEZONE` / `TZ` | `Europe/Istanbul` | schedules run in your time |
| `N8N_SECURE_COOKIE` | `true` (default) | the login cookie only over HTTPS |
| `EXECUTIONS_DATA_PRUNE` / `EXECUTIONS_DATA_MAX_AGE` | `true` / `336` | keep run history 14 days, disk stays small |
| `N8N_DIAGNOSTICS_ENABLED` | `false` | no telemetry |
| `NODE_OPTIONS` | `--max-old-space-size=1024` | n8n can't eat all 2 GB |
| Traefik | Let's Encrypt certificate for `n8n.vosk.dev`, HTTP → HTTPS redirect, **no route on the bare IP** | the plain-HTTP editor on 129.121.162.175 goes away |

Then: `docker compose up -d` in the project folder.

Check (PowerShell): `curl.exe -I https://n8n.vosk.dev/healthz` answers `HTTP/1.1 200` with no certificate warning, and
`http://129.121.162.175` no longer shows the n8n editor.

## Step 7 — Save the encryption key (you, server, 2 min)

n8n encrypts every stored credential (Google, the AI key, Resend) with `N8N_ENCRYPTION_KEY`. Lose it and every
credential has to be entered again. On the server:

```bash
docker exec "$(docker ps --filter ancestor=docker.n8n.io/n8nio/n8n -q | head -1)" sh -c 'printenv N8N_ENCRYPTION_KEY || grep -o "\"encryptionKey\": *\"[^\"]*\"" /home/node/.n8n/config'
```

If the filter finds nothing, use the n8n container name from step 4 in place of the `$(...)` part.
Copy the value **into your password manager only**.

## Step 8 — Secure the n8n account (you, browser, 5 min)

1. Open **https://n8n.vosk.dev** and sign in.
2. Settings (bottom left) → **Personal** → change the password (the one from step 0 went over plain HTTP).
3. Same page → **Two-factor authentication** → enable it with your authenticator app; store the recovery codes in
   the password manager.

## Step 9 — n8n API key for me (not needed: the MCP server builds workflows, checked 2026-11-15)

Kept for reference only; skip it unless the MCP route stops working.


1. n8n → Settings → **n8n API** → **Create an API key**, label "vosk repo", no expiry or 1 year.
2. Open `C:\__VOSK__\.env.local` yourself and add two lines:

   ```
   N8N_BASE_URL=https://n8n.vosk.dev
   N8N_API_KEY=<the key>
   ```

I never open that file; my scripts load it and use the key to push the workflows from `automation/n8n/`.

## Step 9b — Connect n8n's MCP server to the coding agent (you, browser + PowerShell, 5 min)

`.mcp.json` in this repo already lists the server as `n8n`, with the token read from an environment variable
`N8N_MCP_TOKEN` (so the token never lands in git).

1. n8n (https://ead.imv.mybluehost.me) → **Settings** → **Instance-level MCP** (may be called "MCP Access") → turn it
   **on** → copy the **access token**.
2. In n8n, open each workflow the agent may use and switch on **"Available in MCP"** (in the workflow's settings).
   Workflows not switched on stay invisible to it.
3. PowerShell, once (stores the token for your Windows user only):

   ```powershell
   [Environment]::SetEnvironmentVariable("N8N_MCP_TOKEN", "<paste the token>", "User")
   ```

4. **Close and reopen VS Code** (new processes pick up the variable), start a new agent session, run `/mcp` and approve
   the `n8n` server.

**Done 2026-11-15:** token saved (272 characters), MCP handshake 200 with it, n8n MCP Server 1.2.0, 68 tools: it
searches, builds (`create_workflow_from_code`, `update_workflow`, `validate_workflow`), tests with pinned data
(`test_workflow`), runs and publishes workflows, reads executions, and lists credentials (it can't create them: Google,
the AI key and Resend stay yours to enter in n8n). A token saved through `Read-Host -AsSecureString` came out 1
character long (the paste was cut); saving from the clipboard (`Get-Clipboard -Raw`) worked.

Check: `/mcp` lists `n8n` as connected. Tell me, and I list what its tools can do (reading and running workflows for
sure; whether it can also create and edit them depends on the n8n version; if not, the API key from step 9 builds them).

## Step 10 — Backups (me writes the script, you install it; 10 min)

A nightly job on the server at 03:30: n8n's own export of all workflows and (still encrypted) credentials into
`/opt/n8n-backups/<date>/`, the last 14 days kept. Plus the workflows live as JSON in this repo after every change.
Bluehost snapshots, if your plan has them, are a bonus, not the plan.

## Step 11 — The accounts the flows use (you, browser, 30–40 min)

Detailed in `README.md` → "Self-hosted n8n: what it takes", items 3–6. In short:

1. **Demo Gmail**: **`n8n.opc@gmail.com`** (owner, 2026-11-15), 2-step verification on, nothing private in it ever. Every
   Google step below is done signed in as this account, and every n8n Google credential signs in with it.
2. **Google Cloud project and OAuth client** (about 15 min), at console.cloud.google.com, **signed in as the demo
   Gmail only** (use a private window so your own Google account can't slip in). No billing account is needed.
   1. **Project.** Top bar → project picker → **New project** → name `vosk-inbox-demo`, no organisation → **Create**.
      Check the picker now shows it selected; every step below happens inside it.
   2. **APIs.** ☰ → APIs & Services → **Library**. Search and **Enable** each: **Gmail API**, **Google Sheets API**,
      **Google Drive API**.
   3. **Consent screen** (☰ → APIs & Services → **OAuth consent screen**; it opens "Google Auth Platform"). If it says
      "not configured yet", click **Get started**:
      - App information: app name `vosk inbox demo`, user support email = the demo Gmail.
      - Audience: **External**.
      - Contact information: the demo Gmail. Agree to the policy → **Create**.
      - Skip **Data Access** (n8n asks for the scopes itself at sign-in).
      - **Branding** (Google asks for it before publishing): **no logo** (a logo forces Google's verification);
        Application home page `https://vosk.dev`; privacy policy and terms links empty unless Google refuses to save
        (vosk.dev has no /privacy page yet, checked 11-15); Authorized domains: **`mybluehost.me`** (the redirect
        address's domain; not on the public suffix list, so Google accepts it) and **`vosk.dev`** (the home page) → Save.
   4. **Publish.** Google Auth Platform → **Audience** → Publishing status "Testing" → **Publish app** → Confirm. It
      must read **In production**: in Testing, Google expires the sign-in after 7 days and the flows stop silently.
      Google will not ask for verification to publish; the cost is the "unverified app" warning in step 6, seen by you only.
   5. **OAuth client.** Google Auth Platform → **Clients** → **Create client**:
      - Application type **Web application**, name `n8n`.
      - Authorized JavaScript origins: leave empty.
      - Authorized redirect URIs → **Add URI** → `https://ead.imv.mybluehost.me/rest/oauth2-credential/callback`.
        Copy it from n8n (the credential dialog shows it as "OAuth Redirect URL") rather than typing it; if n8n shows the
        bare IP or http, stop and tell me.
      - **Create.** A box shows the **Client ID** and **Client secret**. **The secret is shown only now**: click
        **Download JSON** or copy both into your password manager before closing. Lost it? Add a new secret on the client
        page and delete the old one. Never paste either into chat or the repo.
   6. **n8n.** Credentials → **Add credential** → **Gmail OAuth2 API** → paste Client ID and Client secret → **Sign in
      with Google** → pick the demo Gmail → "Google hasn't verified this app" → **Advanced** → **Go to vosk inbox demo
      (unsafe)** → on the permissions page tick **only two** for Gmail: "View, compose and send email from your Gmail
      account" (`gmail.modify`: read, label, trash) and "See and edit your email labels" (`gmail.labels`). Leave the full
      "read, compose, send and permanently delete all your email" scope, both add-on scopes and the drafts scope off: the
      flows reply through Resend, never through Gmail (owner asked, 11-15) → **Continue**. n8n shows "Account connected"; **Save**, name it
      `Gmail demo`. Repeat with **Google Sheets OAuth2 API** (`Sheets demo`) and **Google Drive OAuth2 API**
      (`Drive demo`), same ID and secret, same sign-in.
   7. **Errors.** `redirect_uri_mismatch`: the URI in step 5 differs from n8n's by a character (http, slash, host); fix
      it on the client page, wait 5 minutes, retry. `access_denied` / "app is in testing": step 4 was not done.
      `Access blocked`: you signed in with a different Google account.
3. **AI API key** for n8n only, with a monthly spending limit set at the provider; add it in n8n as a credential.
4. **Resend key**: resend.com → API Keys → Create → permission **Sending access**, domain **vosk.dev**; add it in n8n
   as a header credential (`Authorization: Bearer <key>`).

## Step 12 — Tell me "server ready" and I check (me, 5 min)

From here I check, without logging in to anything: `https://n8n.vosk.dev/healthz` answers 200 with a valid
certificate; the bare IP no longer serves the editor; ports other than 22/80/443 are closed; the API key works
(`GET /api/v1/workflows` → 200). Then I start Flow 2.

---

## Running it later

- **Updating n8n:** change the image version in the Compose file to the next release (pinned, never `latest`), then
  `docker compose pull && docker compose up -d`. Read the release notes first; take a backup (step 10) before.
- **If n8n is down:** `ssh n8n`, then `docker ps` (is it running?), `docker logs --tail 100 <n8n container>`,
  `free -h` (out of memory?). `docker compose up -d` in the project folder restarts it.
- **Disk:** `df -h /` monthly; run history is pruned at 14 days.
