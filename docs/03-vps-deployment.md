# Superset on a VPS — deployment runbook

> Self-hosted Apache Superset for `bi.vosk.dev` (`ADR-0003`). Files live in
> [`deploy/superset/`](../deploy/superset/). This replaces the Preset.io workspace setup —
> there is no vendor UI, no plan gate, and no per-viewer licence.

## What you need

- A VPS with Docker + Compose. **2 vCPU / 4 GB RAM** is the realistic floor — Superset runs
  a web worker, Postgres and Redis. 1 GB will boot and then OOM mid-query.
- A DNS **A record** for `bi.vosk.dev` pointing at the VPS, resolving *before* first boot —
  Caddy fetches the certificate on startup and fails loudly if the name doesn't resolve.
- Ports 80 and 443 open. Nothing else needs to be public.

Budget: roughly $12–24/month depending on provider, versus $500/month for Preset's
embedded viewer licences (`ADR-0003`).

## 1. Bring it up

```bash
scp -r deploy/superset/ root@<vps>:/opt/superset
ssh root@<vps>
cd /opt/superset
cp .env.example .env
# fill every blank: openssl rand -base64 42
nano .env
docker compose up -d
docker compose logs -f caddy      # watch the certificate get issued
```

First run only — create the admin user and the metadata schema:

```bash
docker compose exec superset superset fab create-admin
docker compose exec superset superset db upgrade
docker compose exec superset superset init
```

**Verify:** `https://bi.vosk.dev` shows a login page over a valid certificate.

## 2. Load the demo warehouse

The warehouse is a separate `analytics` database in the same Postgres (see
[`init-analytics-db.sql`](../deploy/superset/init-analytics-db.sql) for why). Unlike a
managed vendor, nothing here has to be publicly addressable — Superset reaches it over the
compose network.

```bash
# from the repo, on your machine
scp -r data/ root@<vps>:/opt/superset/data

# on the VPS
docker compose exec -T db psql -U superset -d analytics \
  -f /dev/stdin < data/schema/001-create-warehouse.sql
# repeat for data/seed/001, 002, 003
```

Set a real password for the read-only role, then add the connection in Superset under
**Settings → Database Connections**:

```
postgresql://superset_ro:<password>@db:5432/analytics
```

`db` is the compose service name — from inside the Superset container that is the correct
host. `localhost` will not resolve to Postgres there.

**Verify:** `select count(*) from demo.fact_gl;` in SQL Lab returns rows.

## 3. The guest role and service account

This is the part with no Preset equivalent, and the part most likely to bite. Superset
needs a role that guest tokens map to, and a user allowed to mint those tokens.

1. **Settings → List Roles → `+`** — create **`EmbeddedGuest`**. The name must match
   `GUEST_ROLE_NAME` in [`superset_config.py`](../deploy/superset/superset_config.py).
   Grant it read on the demo datasets: `can read on Dashboard`, `can read on Chart`,
   `can read on Dataset`, and `datasource access on [analytics].[demo.v_pl_monthly]`.
2. **Create the granter role** — `embed_token_granter`, with the single permission
   **`can grant guest token on Security`**.
3. **Settings → List Users → `+`** — create the service account (e.g. `embed-svc`) with a
   long random password, roles **`Gamma`** + **`embed_token_granter`**. These two values go
   into the site's `SUPERSET_SVC_USERNAME` / `SUPERSET_SVC_PASSWORD`.

> If `EmbeddedGuest` lacks datasource access the embed still loads — and every chart inside
> it renders an error. That failure looks like a broken dashboard, not a permissions
> problem, which is why it's worth getting right before you go looking elsewhere.

## 4. Per dashboard

1. Build the dashboard, set it **Published**.
2. `⋯` → **Embed dashboard** → copy the **UUID**. Not the numeric id in the URL — the
   numeric id fails silently inside the iframe.
3. There is no per-dashboard allowed-domains field here. Who may frame the instance is
   `SUPERSET_FRAME_ANCESTORS` in `.env` (CSP `frame-ancestors`), applied instance-wide.

## 5. Wire the site

```bash
# Vercel project settings
SUPERSET_DOMAIN=https://bi.vosk.dev
SUPERSET_SVC_USERNAME=embed-svc
SUPERSET_SVC_PASSWORD=<the password>
NEXT_PUBLIC_SUPERSET_DOMAIN=https://bi.vosk.dev
```

Prove the handshake before involving the site at all:

```bash
node scripts/superset-handshake.mjs <embed-uuid>
```

That isolates "credentials and permissions" from "site code". If it prints a guest token,
anything still broken is CSP or frontend.

Then paste the UUID into [`src/lib/work.ts`](../src/lib/work.ts) replacing
`UNSET_EMBED_ID`, and deploy.

## 6. Operating it

The recurring cost of self-hosting is here, and it's real:

- **Patching.** Superset ships CVEs. Watch the [security advisories](https://github.com/apache/superset/security/advisories) and bump the image tag in
  `docker-compose.yml` deliberately — never `:latest`, which turns an unattended restart
  into an unplanned major upgrade.
- **Backups.** `docker compose exec db pg_dump -U superset superset` covers dashboards and
  connections. The warehouse rebuilds from `data/`, so it needs no backup.
- **Upgrades.** Bump the tag → `docker compose up -d` → `superset db upgrade` → `superset init`.
  Snapshot the VPS first.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Caddy won't start / no certificate | DNS not resolving to the VPS yet | wait for propagation, then `docker compose restart caddy` |
| Login page loads, embed frame is blank white | `frame-ancestors` missing the site origin | `SUPERSET_FRAME_ANCESTORS` in `.env`, exact origin with protocol |
| Browser console: "refused to frame" | same as above | same |
| `401` from `/api/v1/security/login` | wrong service-account credentials, or `provider` not `db` | §3 |
| `403` from `/guest_token/` | service account lacks `embed_token_granter` | §3.2 |
| `400` "CSRF token missing" | CSRF token sent without its session cookie | both are carried in `src/lib/superset.ts`; check a proxy isn't stripping `Cookie` |
| Embed loads, every chart errors | `EmbeddedGuest` lacks datasource access | §3.1 |
| Blank iframe, no console error | used the numeric dashboard id, not the embed UUID | §4.2 |
| Works ~5 min then dies | guest-token refresh failing, or `GUEST_TOKEN_JWT_SECRET` differs between processes | §5, and `superset_config.py` |
| Site's `/api/…` returns 404 | locale middleware swallowing `/api/*` | already fixed — `CAND-001` |
| Charts time out at 30s | Caddy upstream timeout | `read_timeout` in the `Caddyfile` |
| OOM / container restarts under load | VPS too small | 4 GB floor |
