# Apache Superset on a VPS — public setup + first report

> Goal: Superset live at **`https://bi.vosk.dev`** with a real certificate, the demo warehouse
> loaded, and one working dashboard. Embedding into vosk.dev is **not** done here — but every
> prerequisite for it is set up in §14, so turning it on later is a config paste, not a rebuild.
>
> Time: ~90 minutes. Cost: ~€4.50/month.
>
> This is the noobie-detailed version of [`docs/03-vps-deployment.md`](../../docs/03-vps-deployment.md).
> That runbook is correct but assumes you have done this before; this one assumes you have not.

---

## 0. What you are building

```
Internet
   │
   ▼  :443 (HTTPS)
┌──────────────────────────── VPS (Ubuntu, 2 vCPU / 4 GB) ────────────┐
│  Caddy ──── reverse proxy ────► Superset :8088 (loopback only)      │
│    │                              │                                 │
│    └── Let's Encrypt cert         ├──► Redis   (query cache)        │
│        auto-renewed               └──► Postgres                     │
│                                        ├── superset   (metadata)    │
│                                        └── analytics  (your data)   │
└─────────────────────────────────────────────────────────────────────┘
```

Four containers, defined in `deploy/superset/docker-compose.yml`, already in this repo. Only Caddy
is reachable from the internet — Superset binds to `127.0.0.1`, and Postgres and Redis publish no
ports at all.

**Order is not negotiable:** DNS must resolve *before* first boot. Caddy requests the certificate on
startup, and if `bi.vosk.dev` does not point at the box yet, it fails and you are debugging TLS
instead of building dashboards.

---

## 1. What you need

### Accounts — three, all needed today

| Account | For | Cost |
|---|---|---|
| **Hetzner Cloud** (or DigitalOcean/Vultr) | the VPS | €4.50/mo (CX22) |
| **GoDaddy** — you already have it | the `bi.vosk.dev` DNS record | included with the domain |
| Docker Hub | image pulls | not needed — anonymous pulls are fine |

### The box

**2 vCPU / 4 GB RAM / 40 GB disk / amd64 / Ubuntu 24.04 LTS**, with a dedicated IPv4.

4 GB is the floor, not a recommendation — you are running Superset's web worker, Postgres and Redis
on one box. A 2 GB instance boots fine and then gets OOM-killed mid-query, which looks like a random
crash rather than a memory problem.

Hetzner **CX22** is exactly this spec. DigitalOcean's equivalent is the $24 "Basic 2 vCPU / 4 GB".

### On your Windows machine

Nothing to install — Windows 11 ships OpenSSH. Verify in PowerShell:

```powershell
ssh -V
scp
```

Both should respond. If not: Settings → System → Optional features → Add → **OpenSSH Client**.

---

## 2. Create an SSH key

Do this before provisioning, so you can paste the public key into Hetzner's form.

```powershell
ssh-keygen -t ed25519 -C "vosk-superset"
```

Press Enter for the default path. **Set a passphrase** — this key is your only way into a public
server.

Copy the **public** key to your clipboard:

```powershell
Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard
```

> `.pub` is the public half and is safe to paste anywhere. The file without `.pub` is the private
> key — it never leaves your machine, never goes in the repo, never gets pasted into a form.

---

## 3. Provision the VPS

1. Hetzner Cloud Console → **New Project** → name it `vosk`
2. **Add Server**
   - Location: closest to your users (Nuremberg/Helsinki for EU)
   - Image: **Ubuntu 24.04**
   - Type: **CX22** (shared vCPU, 2 / 4 GB / 40 GB)
   - Networking: **IPv4 ticked** — you need a dedicated IPv4 for the DNS A record
   - SSH keys: **Add SSH key** → paste from §2
   - Name: `bi-vosk-dev`
3. **Create & Buy now**

Write down the **IPv4 address**. Everything below calls it `<VPS_IP>`.

### Optional but recommended — Hetzner's cloud firewall

Firewalls → Create → inbound allow **22, 80, 443 (TCP)** only, apply to the server. This sits in
front of the box, so a `ufw` misconfiguration later cannot expose Postgres by accident.

---

## 4. DNS — do this now, before anything else

Caddy requests the certificate on first boot. If the name does not resolve yet, that boot fails.

**GoDaddy → My Products → `vosk.dev` → DNS → Add New Record:**

| Field | Value |
|---|---|
| Type | **A** |
| Name | **bi** |
| Value | `<VPS_IP>` |
| TTL | 600 seconds (10 min) |

`Name: bi` produces `bi.vosk.dev` — do **not** type the full name, GoDaddy appends the domain.

### Wait for it, and verify

```powershell
Resolve-DnsName bi.vosk.dev -Type A
```

Must return `<VPS_IP>`. Usually 5–15 minutes. **Do not proceed until this returns the right
address** — everything downstream depends on it, and the failure it causes is confusing.

---

## 5. First SSH + hardening

This box will be publicly reachable with an admin login on it. Hardening is not optional.

```powershell
ssh root@<VPS_IP>
```

Accept the fingerprint. You should land at a root prompt. Now, **on the VPS**:

### 5.1 Update, and create a non-root user

```bash
apt update && apt upgrade -y

adduser vosk                    # set a password when prompted
usermod -aG sudo vosk

# give the new user your SSH key
rsync --archive --chown=vosk:vosk ~/.ssh /home/vosk/
```

### 5.2 Test the new user before locking root out

Open a **second** PowerShell window — do not close your root session yet:

```powershell
ssh vosk@<VPS_IP>
```

If that works, continue. If it does not, fix it now while you still have the root session.

### 5.3 Disable password logins

Back in the root session:

```bash
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Ubuntu 24.04 may also carry an override that re-enables passwords — kill it if present:

```bash
grep -rn "PasswordAuthentication" /etc/ssh/sshd_config.d/ 2>/dev/null
```

If anything there says `yes`, set it to `no` and restart `ssh` again.

### 5.4 Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

**Nothing else gets opened.** Postgres and Redis are only reachable over the Docker network — they
publish no host ports at all, which is why there is no rule for 5432 here and must never be one.

### 5.5 Automatic security patches

```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades   # choose Yes
```

This patches Ubuntu. It does **not** patch Superset — that is manual, see §16.

---

## 6. Install Docker

As `vosk` (`ssh vosk@<VPS_IP>`):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
docker run --rm hello-world
```

All three must succeed. `newgrp docker` applies the group without logging out; if `hello-world`
fails with a permissions error, log out and back in.

---

## 7. Copy the deployment files up

**From your Windows machine**, at the repo root:

```powershell
scp -r deploy/superset vosk@<VPS_IP>:~/superset-files
```

Then on the VPS:

```bash
sudo mkdir -p /opt/superset
sudo cp -r ~/superset-files/. /opt/superset/
sudo chown -R vosk:vosk /opt/superset
cd /opt/superset
ls -la
```

You should see `docker-compose.yml`, `superset_config.py`, `Caddyfile`, `init-analytics-db.sql`,
`.env.example`.

---

## 8. Fill in the environment file

```bash
cd /opt/superset
cp .env.example .env
```

Generate three secrets — run this **three times**, once per secret:

```bash
openssl rand -base64 42
```

```bash
nano .env
```

Five variables, all required:

```ini
# Encrypts stored DB-connection passwords. Rotating it invalidates every saved
# connection and every session. Set once, back it up, never change it.
SUPERSET_SECRET_KEY=<first secret>

# Signs the guest tokens used for embedding. Independent of SECRET_KEY.
# Needed even though you are not embedding yet — the container will not start without it.
SUPERSET_GUEST_TOKEN_JWT_SECRET=<second secret>

# Postgres superuser password (metadata + warehouse instance).
POSTGRES_PASSWORD=<third secret>

# Caddy uses this as the certificate name. Must match the DNS record exactly.
SUPERSET_HOSTNAME=bi.vosk.dev

# Who may put this instance in an iframe. Space-separated, exact origins with protocol.
# Set it now so embedding later needs no restart. Never use '*'.
SUPERSET_FRAME_ANCESTORS=https://vosk.dev http://localhost:3000
```

`Ctrl+O`, Enter, `Ctrl+X` to save and exit nano.

**Back up `SUPERSET_SECRET_KEY` somewhere off the box** — a password manager. Losing it means every
saved database connection has to be re-entered by hand.

> I could not read `.env.example` while writing this — the project's own deny rule blocks reading
> `.env*` files, which is the rule working correctly. The five variables above are derived from
> `docker-compose.yml`, `superset_config.py` and the `Caddyfile`. If `.env.example` lists anything
> else, fill that in too.

---

## 9. Start it

```bash
cd /opt/superset
docker compose up -d
```

First run pulls ~2 GB. Then watch the certificate get issued — **this is the step that fails if DNS
is wrong**:

```bash
docker compose logs -f caddy
```

Look for `certificate obtained successfully`. `Ctrl+C` to stop watching (containers keep running).

If you instead see challenge failures, DNS is not resolving to this box yet. Re-check §4, wait, then
`docker compose restart caddy`.

Check all four are up:

```bash
docker compose ps
```

Superset takes ~90 seconds to become healthy on first boot. `starting` is normal; `restarting` in a
loop is not — see §17.

---

## 10. Initialize Superset

```bash
docker compose exec superset superset db upgrade
docker compose exec superset superset fab create-admin
docker compose exec superset superset init
```

`fab create-admin` prompts for username, name, email and password.

**Use a long random password.** This login is on the public internet.

> ⚠️ **Run `db upgrade` FIRST.** `fab create-admin` writes to the `ab_user` table, which does not
> exist until `db upgrade` creates it.
>
> **`docs/03-vps-deployment.md` §1 lists these in the wrong order** (create-admin before db upgrade),
> and the header comment in `docker-compose.yml` suggests a `superset-init` command that does not
> appear to exist in the image. Use the three commands above. Flagged in §18.

What each does: `db upgrade` creates ~100 internal tables · `fab create-admin` creates your login ·
`init` creates the built-in roles and wires permissions.

---

## 11. Log in

Open **<https://bi.vosk.dev>**. You should get a padlock and a login page.

Log in with the admin account from §10. **Your Superset is live on the internet.**

If the padlock is missing or the browser warns, stop and fix the certificate — the rest of this
guide, and all of embedding later, depends on real HTTPS.

---

## 12. Create the warehouse database

Superset uses Postgres for two unrelated jobs, and confusing them is the classic beginner mistake:

| Database | Holds | You touch it |
|---|---|---|
| `superset` | dashboards, charts, users, saved connections | never directly |
| `analytics` | **your actual data** | this is what you query |

`analytics` and the read-only role are created automatically on Postgres's **first boot** by
`init-analytics-db.sql`. Check whether that worked:

```bash
docker compose exec db psql -U superset -d superset -c "\l" | grep analytics
```

**If `analytics` is listed**, set a real password on the role and move on:

```bash
docker compose exec db psql -U superset -d analytics \
  -c "alter role superset_ro with password '<pick a strong password>';"
```

**If it is not listed** (see the §18 note on why it may have failed), create it by hand:

```bash
docker compose exec db psql -U superset -d superset -c "create database analytics;"
docker compose exec db psql -U superset -d superset -c "create role superset_ro with login password '<strong password>';"
docker compose exec db psql -U superset -d analytics -c "grant connect on database analytics to superset_ro;"
```

Generate that password the same way as the others — `openssl rand -base64 42` — and **write it down**,
§15 needs it. That is the fourth and last secret: three in `.env`, plus this one.

> **`superset_ro` is read-only on purpose.** Dashboards only ever `SELECT`, so the credentials
> sitting in Superset's connection store have no reason to be able to do anything else. If the
> instance is ever compromised, those credentials cannot drop a table.

---

## 13. Load the demo warehouse

The repo ships a synthetic Finance / P&L star schema:

```
data/schema/001-create-warehouse.sql   schema `demo`: 4 dimensions + fact_gl + v_pl_monthly
data/seed/001-seed-dimensions.sql      36 months, 14 accounts, 8 cost centres, 3 scenarios
data/seed/002-seed-facts.sql           ~13k signed GL rows, deterministic
data/seed/003-verify.sql               row counts + fingerprint checksum
```

Every figure is synthetic and deterministic — the same SQL always produces the same numbers, which
is what makes it safe to screenshot and talk about on a call.

### 13.1 Copy the SQL up

**From Windows**, at the repo root:

```powershell
scp -r data vosk@<VPS_IP>:/opt/superset/data
```

### 13.2 Load it, in order

On the VPS:

```bash
cd /opt/superset

docker compose cp data db:/tmp/data

docker compose exec db psql -U superset -d analytics -f /tmp/data/schema/001-create-warehouse.sql
docker compose exec db psql -U superset -d analytics -f /tmp/data/seed/001-seed-dimensions.sql
docker compose exec db psql -U superset -d analytics -f /tmp/data/seed/002-seed-facts.sql
docker compose exec db psql -U superset -d analytics -f /tmp/data/seed/003-verify.sql
```

**That order** — the seeds reference tables the schema file creates. `002` takes 10–30 seconds.
`003` prints row counts and a checksum.

Expected: `fact_gl` around **13,000 rows**, annual actual revenue near **$18.4M**.

> `data/README.md` shows `psql -f /dev/stdin < file.sql`. That works in bash on the VPS, but the
> `docker compose cp` form above works from any shell and avoids every encoding problem. Note it is
> **not** valid in PowerShell — PowerShell has no `<` redirection — so never run the README form
> from your Windows machine.

### 13.3 Grant the read-only role — AFTER the load

```bash
docker compose exec db psql -U superset -d analytics -c "grant usage on schema demo to superset_ro;"
docker compose exec db psql -U superset -d analytics -c "grant select on all tables in schema demo to superset_ro;"
docker compose exec db psql -U superset -d analytics -c "alter default privileges in schema demo grant select on tables to superset_ro;"
```

> ⚠️ **Order matters and this is a real trap.** `ALTER DEFAULT PRIVILEGES IN SCHEMA demo` needs the
> schema to already exist, and those defaults are dropped along with the schema whenever it is
> recreated. Since `001-create-warehouse.sql` drops and recreates `demo`, **re-run all three grants
> after every warehouse reload.**

### 13.4 Verify as the role Superset will actually use

```bash
docker compose exec db psql -U superset_ro -d analytics -c "select count(*) from demo.v_pl_monthly;"
```

If this errors, Superset will fail identically — fix it here, where the message is readable.

---

## 14. Set up embedding — now, so later is a flip

**You are not embedding anything yet.** But these three objects take five minutes now, and skipping
them means coming back and re-learning Superset's permission model later. The feature flag is
already on in `superset_config.py`.

### 14.1 The guest role

**Settings → List Roles → `+`**

- Name: **`EmbeddedGuest`** — must match `GUEST_ROLE_NAME` in `superset_config.py` **exactly**
- Permissions:
  - `can read on Dashboard`
  - `can read on Chart`
  - `can read on Dataset`
  - `datasource access on [analytics].[demo.v_pl_monthly]` — add this after §15 registers the dataset

> If `EmbeddedGuest` lacks the datasource permission the embed still loads and **every chart inside
> it renders an error**. That looks like a broken dashboard, not a permissions problem, which is why
> it is worth getting right before you go looking anywhere else.

### 14.2 The granter role

**Settings → List Roles → `+`**

- Name: **`embed_token_granter`**
- Exactly one permission: **`can grant guest token on Security`**

### 14.3 The service account

**Settings → List Users → `+`**

- Username: **`embed-svc`**
- A long random password — store it in your password manager
- Roles: **`Gamma`** + **`embed_token_granter`**

These two values become `SUPERSET_SVC_USERNAME` / `SUPERSET_SVC_PASSWORD` in Vercel when you wire
the site.

### 14.4 When you actually want to embed

Everything above is done. The remaining steps, for later:

1. Dashboard `⋯` → **Embed dashboard** → copy the **UUID** (not the numeric id in the URL — the
   numeric id fails silently inside the iframe)
2. Set `SUPERSET_DOMAIN`, `SUPERSET_SVC_USERNAME`, `SUPERSET_SVC_PASSWORD`,
   `NEXT_PUBLIC_SUPERSET_DOMAIN` in Vercel
3. Prove the handshake before touching site code: `node scripts/superset-handshake.mjs <uuid>`
4. Paste the UUID into `src/lib/work.ts` replacing `UNSET_EMBED_ID`, deploy

Full detail: [`docs/03-vps-deployment.md`](../../docs/03-vps-deployment.md) §4–§5.

---

## 15. Connect Superset to the warehouse

In the Superset UI:

1. **Settings → Database Connections → `+ Database`** → **PostgreSQL**
2. **SQLAlchemy URI** tab:

```
postgresql://superset_ro:<the password from §12>@db:5432/analytics
```

3. **Test Connection** — must go green before you save
4. Name it `Analytics` → **Connect**

> **The host is `db`, not `localhost` and not the VPS IP.** `db` is the compose service name. Inside
> the Superset container, `localhost` is *that container*, where nothing listens on 5432. This is the
> single most common connection failure and the error text ("could not connect to server") gives no
> hint.

---

## 16. Register the dataset and build the report

### 16.1 Dataset

**Datasets → `+ Dataset`** → database `Analytics` · schema `demo` · table **`v_pl_monthly`** →
**Create Dataset and Create Chart**

> **Register the view, not `fact_gl`.** The view is flat and pre-labelled — every dimension already
> joined and named. Superset's chart builder is far easier against a flat table, and it leaves the
> star schema free to change shape without editing every chart.

Now go back to §14.1 and add `datasource access on [analytics].[demo.v_pl_monthly]` to
`EmbeddedGuest`.

Columns available:

| Column | Use |
|---|---|
| `period_start` | date axis |
| `fiscal_year`, `quarter_label`, `month_short` | grouping |
| `account_name`, `statement_section`, `account_group` | P&L hierarchy |
| `cost_center_name`, `business_function`, `region` | cost breakdown |
| `scenario_name` | `Actual` / `Budget` / `Forecast` |
| `amount` | **signed** — revenue positive, costs negative |

**Signed amounts are the key design fact.** `SUM(amount)` over everything is net profit, with no
`CASE` statements. Filter to `Revenue` and it is revenue. That is why the chart configs below are so
short.

### 16.2 Sanity check first

**SQL Lab → SQL Editor**, database `Analytics`, schema `demo`:

```sql
select scenario_name, statement_section, sum(amount) as total
from demo.v_pl_monthly
where fiscal_year = 2025
group by 1, 2
order by 1, 2;
```

Revenue positive, COGS/Opex negative, three scenarios. If this works, every later failure is a chart
config problem — not data, not connection, not permissions.

### 16.3 Chart 1 — revenue trend

**Charts → `+ Chart`** → dataset `v_pl_monthly` → **Line Chart** → **Create new chart**

| Field | Value |
|---|---|
| **X-AXIS** | `period_start` |
| **TIME GRAIN** | `Month` |
| **METRICS** | `SUM(amount)` — click the box → *Simple* tab → column `amount`, aggregate `SUM` |
| **DIMENSIONS** | leave empty |
| **FILTERS** | `scenario_name` **equals** `Actual` |
| | `statement_section` **equals** `Revenue` |

**Create chart.** You get a rising line across 36 months with a visible dip at **2023-07** — a
deliberate anomaly in the seed (a slipped product release). Name it `Revenue — monthly actual` →
**Save**.

> Empty chart? Nine times in ten it is a filter value. They are case-sensitive: `Actual`, not
> `actual`.

### 16.4 Chart 2 — net profit

**Charts → `+ Chart`** → same dataset → **Big Number**

| Field | Value |
|---|---|
| **METRIC** | `SUM(amount)` |
| **FILTERS** | `scenario_name` **equals** `Actual` |
| | `fiscal_year` **equals** `2025` |

No section filter — because amounts are signed, summing everything *is* net profit. Name it
`Net profit — FY2025 actual` → **Save**.

### 16.5 Dashboard

1. **Dashboards → `+ Dashboard`**, title `Finance P&L — MVP`
2. Drag both charts from the right-hand panel — Big Number on top, line chart below
3. **Save**
4. Toggle **Draft → Published**

**Published matters** — embedding later requires it, and an unpublished dashboard is invisible to
the guest role.

Optional, worth doing once: left edge → **`+ Add/Edit Filters`** → type **Value**, dataset
`v_pl_monthly`, column `region` → **Save**. Now selecting a region re-queries both charts. That
cross-filtering is what makes a dashboard a dashboard rather than two pictures.

**Done — it is live on the internet at `https://bi.vosk.dev`.**

---

## 17. Operating a public box

This is the recurring cost of self-hosting, and it is real.

### Patching Superset — manual, and it matters

Superset ships CVEs, and yours is publicly reachable.

- Watch <https://github.com/apache/superset/security/advisories>
- Bump the tag in `docker-compose.yml` **deliberately**. It is pinned to `apache/superset:5.0.0`.
  **Never change it to `:latest`** — that turns an unattended restart into an unplanned major
  upgrade.

```bash
# after editing the image tag
docker compose up -d
docker compose exec superset superset db upgrade
docker compose exec superset superset init
```

Snapshot the VPS first (Hetzner → Server → Snapshots). Every upgrade, no exceptions.

### Backups

```bash
docker compose exec db pg_dump -U superset superset > ~/superset-backup-$(date +%F).sql
```

That covers dashboards, charts, users and connections. The **warehouse needs no backup** — it
rebuilds from `data/` in three commands.

Pull one down to your machine occasionally:

```powershell
scp vosk@<VPS_IP>:~/superset-backup-*.sql .
```

### Everyday commands

```bash
cd /opt/superset

docker compose ps                    # what is running
docker compose logs -f superset      # app logs
docker compose logs -f caddy         # TLS / proxy
docker compose restart superset      # after a config change
docker compose up -d                 # apply compose changes
docker compose down                  # stop (data survives)
docker compose down -v               # DELETE EVERYTHING including dashboards

docker compose exec db psql -U superset -d analytics    # SQL shell
df -h                                # disk — 40 GB fills up with Docker images
docker system prune -a               # reclaim space from old images
```

> `down -v` deletes the volumes: every dashboard, chart, connection and row. There is no undo.

### Reload the warehouse after editing `data/*.sql`

```bash
docker compose cp data db:/tmp/data
docker compose exec db psql -U superset -d analytics -f /tmp/data/schema/001-create-warehouse.sql
docker compose exec db psql -U superset -d analytics -f /tmp/data/seed/001-seed-dimensions.sql
docker compose exec db psql -U superset -d analytics -f /tmp/data/seed/002-seed-facts.sql
# then re-run the three grants from §13.3 — recreating the schema drops them
```

### Security posture, in one list

- ✅ SSH keys only, no password login (§5.3)
- ✅ `ufw` allows 22/80/443 only (§5.4)
- ✅ Postgres and Redis publish no host ports
- ✅ Superset binds to `127.0.0.1` — only Caddy reaches it
- ✅ `PUBLIC_ROLE_LIKE = None` in `superset_config.py` — anonymous visitors get nothing
- ✅ Warehouse connection is read-only
- ✅ Ubuntu auto-patches; **Superset does not** — that is on you
- ⚠️ Your admin login is on the public internet. Long random password, stored in a manager.

---

## 18. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Caddy won't start / no certificate | DNS not resolving to the VPS | §4, wait, `docker compose restart caddy` |
| `Resolve-DnsName` returns the old/no IP | propagation | wait, TTL 600 = up to 10 min |
| `fab create-admin` → relation `ab_user` does not exist | ran before `db upgrade` | §10, correct order |
| Superset container restarts in a loop | a required `.env` var is missing | `docker compose logs superset` — the traceback names it |
| Browser warns about the certificate | Caddy served a self-signed fallback | check `docker compose logs caddy` for the ACME failure |
| Login page loads, login does nothing | reached over `http://` not `https://` | cookies are `Secure` in production — always use HTTPS |
| "could not connect to server" adding the DB | used `localhost` or the VPS IP | host is `db` — §15 |
| `password authentication failed for superset_ro` | role password never set | §12, `alter role superset_ro with password '…';` |
| `permission denied for schema demo` | grants missing, or run before the load | §13.3 — all three, after loading |
| Dataset list empty | wrong schema | it is `demo`, not `public` |
| Chart shows "No data" | filter value case/spelling | `Actual`, `Revenue` — case-sensitive |
| Charts time out around 30s | Caddy upstream timeout | already set to 300s in the `Caddyfile`; if you replaced it, restore `read_timeout` |
| Containers OOM / random restarts | box too small | 4 GB floor — check `free -h` |
| Disk full | Docker images pile up | `docker system prune -a` |
| Later: embed frame is blank white | `frame-ancestors` missing the site origin | `SUPERSET_FRAME_ANCESTORS` in `.env`, exact origin, then restart |
| Later: embed loads, every chart errors | `EmbeddedGuest` lacks datasource access | §14.1 |
| Later: blank iframe, no console error | used the numeric dashboard id, not the UUID | §14.4 |

---

## 19. Repo issues found while writing this

Flagged, not fixed:

1. **`docs/03-vps-deployment.md` §1 runs `superset fab create-admin` before `superset db upgrade`.**
   The user table does not exist yet on a fresh metadata database. Correct order is `db upgrade` →
   `fab create-admin` → `init`.
2. **`docker-compose.yml`'s header comment suggests `docker compose exec superset superset-init`.**
   That command does not appear to exist in the `apache/superset` image — the three explicit
   commands in §10 do. Worth confirming on first boot.
3. **`init-analytics-db.sql` runs `alter default privileges in schema demo` on Postgres's first
   boot**, before the `demo` schema exists, and the file's own comment claims ordering does not
   matter. Postgres resolves the schema name at statement time, so that statement should error —
   which would abort the init script and leave `analytics` uncreated. §12 checks for exactly this
   and gives the manual path; §13.3 has the reliable grant form.
4. **`data/README.md`'s `psql -f /dev/stdin < file.sql`** is bash-only. Fine on the VPS, invalid in
   PowerShell — worth a note in that file, since it is the natural thing to copy from Windows.
