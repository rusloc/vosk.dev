# Apache Superset — local setup + first report (MVP)

> Goal: get Superset running on **your Windows laptop**, load the repo's demo warehouse, and build
> one working dashboard. No VPS, no domain, no TLS, no embedding.
>
> Time: ~45–60 minutes, most of it waiting for Docker to pull images.
>
> When you later want `bi.vosk.dev` public and embedded in the site, that is
> [`docs/03-vps-deployment.md`](../../docs/03-vps-deployment.md). This guide is the practice run —
> same Superset, same data, same clicks, none of the networking.

---

## 0. Why local first

`deploy/superset/docker-compose.yml` in this repo is the **production** stack: it adds Caddy for
TLS and refuses to start without a real DNS name, because embedding an iframe requires HTTPS
(`SameSite=None` cookies are dropped without `Secure`).

None of that is needed to learn Superset. Locally you skip Caddy, skip DNS, skip the guest-token
plumbing, and run Superset + Postgres only. Everything you learn transfers.

**What you build here:**

```
localhost:8088  →  Superset  →  Postgres
                                 ├── superset    (Superset's own metadata)
                                 └── analytics   (the demo warehouse, from data/)
                                       └── schema demo → v_pl_monthly → your charts
```

---

## 1. What you need

### Software

| Thing | Version | Why | Cost |
|---|---|---|---|
| **Docker Desktop** | latest, WSL2 backend | Runs Superset + Postgres as containers | Free (personal use) |
| **Windows 11** + WSL2 | — | Docker Desktop's engine | Already have it |
| A browser | Chrome/Edge | Superset's UI | — |
| This repo | — | `data/` has the demo warehouse SQL | Already have it |

**You do not need**: Python, Node, `pip`, a Postgres install, or a `psql` client on Windows —
everything runs inside containers.

### Accounts

| Account | Needed now? | Notes |
|---|---|---|
| Docker Hub | **No** | Anonymous image pulls work. Only sign up if you hit the rate limit (~100 pulls/6h). |
| Hetzner / DigitalOcean | No | VPS — only for the public deploy later |
| Domain / DNS (GoDaddy) | No | Only for `bi.vosk.dev` later |
| Superset "account" | No | There is no vendor. You create your own admin user in step 4. |

### Hardware

Docker Desktop needs **4 GB RAM allocated minimum**. Superset + Postgres will boot on 2 GB and then
die mid-query. Check: Docker Desktop → Settings → Resources → Memory.

---

## 2. Install Docker Desktop

1. Download from <https://www.docker.com/products/docker-desktop/>.
2. Run the installer, leave **"Use WSL 2 instead of Hyper-V"** ticked.
3. Reboot when it asks.
4. Launch Docker Desktop and wait for the whale icon to stop animating.

Verify — in PowerShell:

```powershell
docker --version
docker compose version
docker run --rm hello-world
```

All three must succeed. If `hello-world` fails, Docker is not actually running — fix that before
continuing, nothing below will work.

---

## 3. Create the two local files

Both go in `deploy/superset/`, next to the production ones. They are **new files** — they do not
replace anything.

### 3.1 `deploy/superset/superset_config.local.py`

```python
# Local-only Superset config — laptop MVP. No embedding, no TLS, no Redis.
#
# The production superset_config.py sets SESSION_COOKIE_SECURE = True and
# SESSION_COOKIE_SAMESITE = "None" because a cross-site iframe needs them. Over plain
# http://localhost the browser DROPS such cookies, and the symptom is that the login form
# accepts your password and bounces you straight back to the login form, forever, with no
# error message. That is the single most confusing failure in this whole setup.

import os

SECRET_KEY = os.environ["SUPERSET_SECRET_KEY"]
SQLALCHEMY_DATABASE_URI = os.environ["SUPERSET_METADATA_DB_URI"]
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Plain HTTP locally.
TALISMAN_ENABLED = False
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_HTTPONLY = True

WTF_CSRF_ENABLED = True
ROW_LIMIT = 50000
SUPERSET_WEBSERVER_TIMEOUT = 120
```

### 3.2 `deploy/superset/docker-compose.local.yml`

```yaml
# Local MVP stack. Two services, no Caddy, no Redis.
name: vosk-superset-local

services:
  superset:
    image: apache/superset:5.0.0
    restart: unless-stopped
    depends_on:
      db: { condition: service_healthy }
    environment:
      SUPERSET_SECRET_KEY: ${SUPERSET_SECRET_KEY:?set it in .env.local}
      SUPERSET_METADATA_DB_URI: postgresql+psycopg2://superset:${POSTGRES_PASSWORD:?set it in .env.local}@db:5432/superset
      SUPERSET_CONFIG_PATH: /app/pythonpath/superset_config.py
      PYTHONPATH: /app/pythonpath
    volumes:
      - ./superset_config.local.py:/app/pythonpath/superset_config.py:ro
      - superset_home_local:/app/superset_home
    ports: ["8088:8088"]

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: superset
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set it in .env.local}
      POSTGRES_DB: superset
    volumes:
      - db_data_local:/var/lib/postgresql/data
    # Optional: lets a GUI client (DBeaver/pgAdmin) reach the DB from Windows.
    ports: ["127.0.0.1:5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U superset"]
      interval: 10s
      timeout: 5s
      retries: 10

volumes:
  superset_home_local:
  db_data_local:
```

> **Note — no `init-analytics-db.sql` mount here, on purpose.** The production compose mounts it into
> `docker-entrypoint-initdb.d`, which runs **once, on the very first boot of an empty volume**. Doing
> it by hand in step 6 means you can re-run it, and you will see what it actually does.

### 3.3 `deploy/superset/.env.local`

Generate two long random strings and put them here:

```powershell
# Run this twice — use a different output for each of the two values
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

```ini
SUPERSET_SECRET_KEY=<first random string>
POSTGRES_PASSWORD=<second random string>
```

> `SECRET_KEY` encrypts the stored database passwords. **Rotating it later invalidates every saved
> connection.** Set it once, leave it alone.

**Check `.gitignore` covers `.env.local` before you commit anything.** The repo already ignores
`.env*`, but confirm — a leaked local key is a bad habit even when it is worthless.

---

## 4. First boot

All commands run from the repo root in PowerShell.

```powershell
docker compose -f deploy/superset/docker-compose.local.yml --env-file deploy/superset/.env.local up -d
```

That line is long and you will type it 20 times. Make an alias for this session:

```powershell
function sup { docker compose -f deploy/superset/docker-compose.local.yml --env-file deploy/superset/.env.local @args }
```

Now `sup up -d`, `sup logs -f superset`, `sup down` all work.

Watch it come up — first boot pulls ~2 GB of images and takes several minutes:

```powershell
sup logs -f superset
```

Wait until the log stops scrolling. `Ctrl+C` to stop watching (this does not stop the container).

### 4.1 Initialize the metadata database — order matters

```powershell
sup exec superset superset db upgrade
sup exec superset superset fab create-admin
sup exec superset superset init
```

It will prompt for username / first name / last name / email / password. Use `admin` and a password
you will remember — this is your local Superset login, nothing external.

> ⚠️ **Run `db upgrade` FIRST.** `fab create-admin` writes to the `ab_user` table, which does not
> exist until `db upgrade` creates it. On a fresh metadata database, running create-admin first
> fails.
>
> **`docs/03-vps-deployment.md` §1 lists these in the other order** (`create-admin`, then
> `db upgrade`, then `init`). Worth fixing in that runbook before the real VPS deploy — I have not
> edited it as part of this guide.

- `db upgrade` — creates Superset's ~100 internal tables
- `fab create-admin` — your login (FAB = Flask-AppBuilder, Superset's auth layer)
- `init` — creates the built-in roles (Admin/Alpha/Gamma) and wires permissions

### 4.2 Log in

Open <http://localhost:8088> → log in as `admin`.

You should land on an empty dashboard list. **If the login form just reloads with no error, the
cookie config is wrong** — re-check §3.1 and confirm `superset_config.local.py` is actually mounted:

```powershell
sup exec superset cat /app/pythonpath/superset_config.py
```

---

## 5. Understand the two databases

Superset uses Postgres for two completely different jobs, and confusing them is the most common
beginner mistake:

| Database | Holds | You touch it |
|---|---|---|
| `superset` | Dashboards, charts, users, saved connections | Never directly |
| `analytics` | **Your actual data** — the demo warehouse | This is what you query |

They live in the same Postgres container but are separate databases, so a Superset upgrade and a
data reload cannot collide.

---

## 6. Create the analytics database

```powershell
sup exec db psql -U superset -d superset -c "create database analytics;"
sup exec db psql -U superset -d superset -c "create role superset_ro with login password 'localdev';"
sup exec db psql -U superset -d analytics -c "grant connect on database analytics to superset_ro;"
```

`superset_ro` is a **read-only** account. Superset's dashboards only ever `SELECT`, so the
credentials sitting in its connection store have no reason to be able to do anything else. Locally
the password can be `localdev`; on the VPS it must be real.

---

## 7. Load the demo warehouse

The repo ships a synthetic Finance / P&L star schema in `data/`:

```
data/schema/001-create-warehouse.sql   schema `demo`: 4 dimensions + fact_gl + v_pl_monthly
data/seed/001-seed-dimensions.sql      36 months, 14 accounts, 8 cost centres, 3 scenarios
data/seed/002-seed-facts.sql           ~13k signed GL rows, deterministic
data/seed/003-verify.sql               row counts + checksum
```

Every figure is synthetic and deterministic — the same SQL always produces the same numbers.

### 7.1 Copy the SQL into the container, then run it

> **Windows gotcha:** `data/README.md` shows `psql -f /dev/stdin < file.sql`. **PowerShell has no
> `<` input redirection** — that line is a syntax error in PowerShell. Copy the files in instead;
> it also avoids every text-encoding problem.

```powershell
sup cp data db:/tmp/data

sup exec db psql -U superset -d analytics -f /tmp/data/schema/001-create-warehouse.sql
sup exec db psql -U superset -d analytics -f /tmp/data/seed/001-seed-dimensions.sql
sup exec db psql -U superset -d analytics -f /tmp/data/seed/002-seed-facts.sql
sup exec db psql -U superset -d analytics -f /tmp/data/seed/003-verify.sql
```

Run them **in that order** — the seeds reference tables the schema file creates. `002` takes ~10–30
seconds. `003` prints row counts and a fingerprint checksum.

Expected from `003`: `fact_gl` around **13,000 rows**, and annual actual revenue near **$18.4M**.

`001-create-warehouse.sql` drops and recreates the `demo` schema, so the whole sequence is safely
re-runnable from scratch.

### 7.2 Grant the read-only role access — do this AFTER loading

```powershell
sup exec db psql -U superset -d analytics -c "grant usage on schema demo to superset_ro;"
sup exec db psql -U superset -d analytics -c "grant select on all tables in schema demo to superset_ro;"
sup exec db psql -U superset -d analytics -c "alter default privileges in schema demo grant select on tables to superset_ro;"
```

> ⚠️ **Order matters, and this is a real trap.** `ALTER DEFAULT PRIVILEGES IN SCHEMA demo` requires
> the schema `demo` to already exist, and default privileges are dropped along with the schema when
> it is recreated. So it must run *after* the warehouse load, not before.
>
> `deploy/superset/init-analytics-db.sql` runs that statement on Postgres's **first boot**, before
> `demo` exists — worth testing on the VPS. The three explicit grants above are the robust version.
> **Re-run all three after every warehouse reload.**

### 7.3 Verify as the role Superset will actually use

```powershell
sup exec db psql -U superset_ro -d analytics -c "select count(*) from demo.v_pl_monthly;"
```

If this errors, Superset will fail the same way. Fix it here, where the error message is readable.

---

## 8. Connect Superset to the warehouse

In the Superset UI:

1. **Settings → Database Connections → `+ Database`**
2. Pick **PostgreSQL**
3. Switch to the **SQLAlchemy URI** tab and paste:

```
postgresql://superset_ro:localdev@db:5432/analytics
```

4. **Test Connection** → must go green before you save
5. Name it `Analytics (local)` → **Connect**

> **The host is `db`, not `localhost`.** `db` is the compose service name. Inside the Superset
> container, `localhost` means *the Superset container itself*, where nothing is listening on 5432.
> This is the #1 connection failure and the error message ("could not connect to server") does not
> hint at it.

---

## 9. Register the dataset

1. **Datasets → `+ Dataset`**
2. Database `Analytics (local)` · Schema `demo` · Table **`v_pl_monthly`**
3. **Create Dataset and Create Chart**

> **Register the view `v_pl_monthly`, not `fact_gl`.** The view is flat and labelled — every
> dimension already joined and named. Superset's chart builder is far easier against a flat table,
> and it leaves the star schema free to change shape without editing every chart. This is a general
> BI habit, not a Superset quirk.

Columns you now have:

| Column | Use |
|---|---|
| `period_start` | the date axis |
| `fiscal_year`, `quarter_label`, `month_short` | grouping |
| `account_name`, `statement_section`, `account_group` | P&L hierarchy |
| `cost_center_name`, `business_function`, `region` | cost breakdown |
| `scenario_name` | `Actual` / `Budget` / `Forecast` |
| `amount` | **signed** — revenue positive, costs negative |

**Signed amounts are the key design fact.** `SUM(amount)` over everything = net profit, with no
`CASE` statements. Filter to `Revenue` and it is revenue. This is why the chart definitions below
are so short.

---

## 10. Sanity check in SQL Lab

Before charting, prove the data is reachable: **SQL Lab → SQL Editor**, database `Analytics (local)`,
schema `demo`:

```sql
select scenario_name, statement_section, sum(amount) as total
from demo.v_pl_monthly
where fiscal_year = 2025
group by 1, 2
order by 1, 2;
```

**Run**. You should see Revenue positive, COGS/Opex negative, across three scenarios. If this works,
every failure from here is a chart-config problem, not a data or connection problem.

---

## 11. Chart 1 — monthly revenue trend

**Charts → `+ Chart`** → dataset `v_pl_monthly` → chart type **Line Chart** → **Create new chart**.

In the Data panel:

| Field | Value |
|---|---|
| **X-AXIS** | `period_start` |
| **TIME GRAIN** | `Month` |
| **METRICS** | `SUM(amount)` — click the box → *Simple* tab → column `amount`, aggregate `SUM` |
| **DIMENSIONS** | leave empty |
| **FILTERS** | `scenario_name` **equals** `Actual` |
| | `statement_section` **equals** `Revenue` |

Click **Create chart**. You get a rising line across 36 months with a visible dip around **2023-07**
— a deliberate anomaly in the seed data (a slipped product release).

Name it `Revenue — monthly actual` → **Save**.

> If the chart is empty, 90% of the time a filter value is misspelled. The values are
> case-sensitive: `Actual`, not `actual`.

---

## 12. Chart 2 — net profit

**Charts → `+ Chart`** → same dataset → chart type **Big Number**.

| Field | Value |
|---|---|
| **METRIC** | `SUM(amount)` |
| **FILTERS** | `scenario_name` **equals** `Actual` |
| | `fiscal_year` **equals** `2025` |

No section filter — because amounts are signed, summing *everything* is net profit. That is the
whole payoff of the signed-amount design.

Name it `Net profit — FY2025 actual` → **Save**.

---

## 13. Assemble the dashboard

1. **Dashboards → `+ Dashboard`**
2. Title: `Finance P&L — MVP`
3. From the **Charts** panel on the right, drag both charts onto the canvas. Put the Big Number on
   top, the line chart below.
4. **Save**
5. Toggle **Draft → Published** (top left, next to the title)

Optional, and worth doing once to see how it works — add a filter that drives both charts:

1. Left edge → **`+ Add/Edit Filters`**
2. Filter type **Value**, dataset `v_pl_monthly`, column `region`
3. **Save**

Now selecting a region re-queries both charts. That cross-filtering is the thing that makes a
dashboard a dashboard rather than two pictures.

**You are done.** That is the full flow: warehouse → connection → dataset → chart → dashboard.

---

## 14. Daily commands

```powershell
# start / stop (data survives)
sup up -d
sup stop

# logs
sup logs -f superset
sup logs -f db

# a psql shell in the warehouse
sup exec db psql -U superset -d analytics

# reload the warehouse after editing data/*.sql
sup cp data db:/tmp/data
sup exec db psql -U superset -d analytics -f /tmp/data/schema/001-create-warehouse.sql
sup exec db psql -U superset -d analytics -f /tmp/data/seed/001-seed-dimensions.sql
sup exec db psql -U superset -d analytics -f /tmp/data/seed/002-seed-facts.sql
# then re-run the three grants from §7.2 — recreating the schema drops them

# NUCLEAR: delete containers AND all data, including your dashboards
sup down -v
```

> `sup down` keeps your data. **`sup down -v` deletes the volumes** — every dashboard, chart,
> connection and row. Only use it when you want a truly clean slate.

---

## 15. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `docker compose` not found | Docker Desktop not running | Start it, wait for the whale to settle |
| Login form reloads, no error | `SESSION_COOKIE_SECURE=True` over HTTP | §3.1 — confirm the local config is mounted |
| `fab create-admin` → relation `ab_user` does not exist | ran before `db upgrade` | §4.1, correct order |
| Superset container restarts in a loop | bad `.env.local`, or config syntax error | `sup logs superset` — the Python traceback is at the end |
| "could not connect to server" adding the DB | used `localhost` instead of `db` | §8 |
| `password authentication failed for user "superset_ro"` | role created with a different password | re-run the `create role` line, or `alter role superset_ro with password 'localdev';` |
| `permission denied for schema demo` | grants not applied, or applied before the load | §7.2, all three lines, after loading |
| Dataset list empty when adding a dataset | wrong schema selected | schema is `demo`, not `public` |
| Chart renders "No data" | filter value case/spelling | values are case-sensitive: `Actual`, `Revenue` |
| Port 8088 already in use | something else is on it | change to `"8090:8088"` in the compose file |
| `<` is not a valid PowerShell operator | copied a bash redirect from `data/README.md` | §7.1 — use `sup cp` instead |
| Everything crawls / containers die | Docker RAM too low | Settings → Resources → Memory ≥ 4 GB |
| Edited `init-analytics-db.sql`, nothing changed | that file only runs on an empty volume | `sup down -v`, or just run the SQL by hand |

---

## 16. What changes when you go to the VPS

Only the things this guide deliberately skipped:

| Local (this guide) | VPS ([`docs/03`](../../docs/03-vps-deployment.md)) |
|---|---|
| `localhost:8088`, plain HTTP | `bi.vosk.dev` behind Caddy, real certificate |
| `superset_config.local.py` | `superset_config.py` — Secure cookies, CSP, CORS |
| 2 services | 4 — adds Redis (caching) and Caddy (TLS) |
| no roles beyond admin | `EmbeddedGuest` + `embed_token_granter` + `embed-svc` |
| dashboard viewed directly | embedded in `/work` via guest token |
| free | ~$12–24/month |

**Everything you built above transfers unchanged** — the warehouse SQL, the connection string
(`db:5432` is the same service name), the dataset, the charts, the dashboard. You can even export
the dashboard (`⋯ → Export`) and import it on the VPS.

The prerequisite for the VPS step is the one thing you cannot do from a laptop: provision the box
and point `bi.vosk.dev` at it **before** first boot, because Caddy fetches its certificate on
startup and fails loudly if the name does not resolve.

---

## 17. Two repo issues found while writing this

Neither is fixed here — flagging, not changing:

1. **`docs/03-vps-deployment.md` §1 runs `fab create-admin` before `db upgrade`.** On a fresh
   metadata database the user table does not exist yet. Correct order is `db upgrade` →
   `fab create-admin` → `init`.
2. **`deploy/superset/init-analytics-db.sql` runs `ALTER DEFAULT PRIVILEGES IN SCHEMA demo` on
   Postgres's first boot**, when the `demo` schema does not exist yet — and the file's own comment
   claims ordering does not matter. Postgres resolves that schema name at statement time, so it
   should error. Even if it succeeds, recreating the schema in `001-create-warehouse.sql` drops the
   default privileges again. The explicit grants in §7.2 are the reliable form.
