# Inbox automation — the AI automation showcase (draft, 2026-11-15)

Status: **draft, nothing built.** Owner's ask 2026-11-15: a public, try-it-yourself AI automation as its own showcase
item, two flows in one solution, n8n (or a better tool) under the hood, on a Gmail inbox the owner provides.

Why it exists: the profiles now sell "n8n workflows and automation agents" (Workable summary, Upwork skills), and the
CV has no delivered n8n work. This showcase is the proof a client can click.

## The two flows

### Flow 1 — attachments to a sheet ("Email us an invoice")

A visitor emails a PDF or image invoice to the demo inbox. About a minute later they get an email back with a link to
a Google Sheet holding the parsed invoice.

```
Gmail trigger (poll 1 min; query: has:attachment -label:vd-done)
  → filter: PDF / PNG / JPG, ≤ 5 MB, ≤ 3 attachments per mail, sender under the daily cap
  → LLM extraction, fixed JSON schema (the PDF goes to the model as a document):
      vendor, invoice_no, invoice_date, due_date, currency, subtotal, tax, total, lines[]
  → checks: dates parse, subtotal + tax ≈ total, currency is ISO; else status = "needs review"
  → Google Sheets: append to tab Invoices (one row per invoice) and tab Lines (one row per line item)
  → Resend: reply to the sender only, with the sheet link (anchored to their rows) and the status
  → Gmail: label vd-done (and vd-error on failure, with an error row in tab Log)
```

Invoices rather than "any attachment": it matches the accounting and invoicing client on the marketing showcase and is
the most common real request (AP automation). Owner decides (D2).

### Flow 2 — letters to a request tracker ("What do people want from us?")

The inbox gets letters; the flow keeps only the ones inside a topic scope and logs them as tasks.

```
Gmail trigger (poll 1 min; query: -label:vd-done -has:attachment, or a dedicated alias)
  → LLM classification against the topic scope: relevant yes/no + reason
  → if relevant, LLM extraction, fixed schema:
      from (name, masked address), received (from the mail header, not the LLM),
      what's required (one sentence), deadline (ISO date resolved against the received date, or empty), priority
  → Google Sheets: upsert into tab Requests keyed by Gmail message id (no duplicates on re-runs)
  → Gmail: label vd-done / vd-off-topic
```

Proposed topic scope (D3): **requests to a finance team**: payment requests, invoice approvals, document requests,
deadlines from auditors or the tax office. Same client story as Flow 1.

## Tool: n8n, on n8n Cloud (recommended)

| Option | Cost | For | Against |
|---|---|---|---|
| **n8n Cloud** (recommended) | Starter ≈ €20/month, 2,500 executions (checked 2026-08-28; recheck at signup) | the skill clients search for; Gmail, Sheets, HTTP and AI nodes built in; no server to run | monthly fee; execution cap |
| n8n self-hosted on a small VPS (e.g. a 4 GB Hetzner box, Docker + Caddy) | ≈ €5/month | cheapest n8n; full control | a server to patch and watch; n8n wants ~2 GB RAM |
| Google Apps Script | free | native Gmail + Sheets, time triggers | proves nothing about n8n, the skill being sold |
| Code on Vercel (Route Handler + cron) | free | lives in this repo | Hobby cron runs once a day, too slow for "try it"; not n8n |

Recommendation: **n8n Cloud** for the showcase. Export both workflows as JSON into this repo
(`automation/n8n/flow-1-invoices.json`, `flow-2-requests.json`) after every change, so they are versioned and can move
to a VPS later without a rebuild. Execution budget: a poll that finds nothing should not count as an execution (verify on
the trial); real use is a few runs per visitor.

## Accounts and keys (owner sets up; the agent never sees a secret)

1. **A dedicated Gmail**, e.g. `vosk.inbox.demo@gmail.com`: nothing private in it, ever. Owner provides it (D1).
2. **Google credential in n8n** for Gmail + Sheets + Drive, signed in as that Gmail. If n8n asks for your own Google
   Cloud OAuth app: set the consent screen to *In production*, because a *Testing* app's tokens expire after 7 days and
   the flows stop silently. The unverified-app warning appears only to you at sign-in.
3. **One Google Sheet**, "Inbox automation demo", tabs Invoices, Lines, Requests, Log; shared *anyone with the link can view*.
4. **An LLM API key for n8n only**, separate from the site's `CHAT_LLM_API_KEY`, with a monthly spend limit at the provider.
5. **A Resend API key with sending access only, restricted to the vosk.dev domain** (already verified for the contact
   form). From address e.g. `automation@vosk.dev`. Free tier: 100 emails a day.

## Guardrails (public inbox, untrusted input)

- **Prompt injection:** the model only fills a fixed schema. It has no tools, and nothing it writes decides who gets an
  email. Flow 1 replies to the message's sender header, never to an address found in the body or the attachment.
- **Abuse caps:** 3 processed mails per sender a day, 50 a day overall; over the cap, label and skip (no reply).
- **Sheet formula injection:** any cell value starting with `=`, `+`, `-` or `@` gets a leading `'`.
- **Privacy:** senders show masked (`j***@gmail.com`); the page says "send the sample invoices, not real ones" and
  offers three sample PDFs to download. Rows and mails older than 14 days are deleted (by hand at first; a third,
  housekeeping flow later if needed).
- **Spoofed senders:** a forged From could make Flow 1 send a sheet link to a stranger. Harm is low (a link to a public
  demo sheet); the per-address cap bounds it.
- **"Succeeded" is not health** (CLAUDE.md): check the rows that should exist. Tab Log gets one row per run with counts;
  n8n's error workflow emails the owner on any failure.

## The showcase item

A new entry in `src/lib/work.ts`. Like the reports, it's a text page, but its buttons are "Try it" (the inbox address and
the sample PDFs), "Open the sheet" and a screenshot of the two n8n workflows. That needs a new platform kind in the
union (`automation`), so it's an ADR-0002 amendment (D4). Client line: "Finance team of a small company" or
whatever D3 lands on. Copy is written with the text-writer skill when the flows work.

## Decisions for the owner

- **D1.** The Gmail address for the demo inbox (a new, empty one).
- **D2.** Flow 1 parses invoices (recommended) or any attachment into a generic table.
- **D3.** Flow 2's topic scope: requests to a finance team (recommended) or something else.
- **D4.** The tool: n8n Cloud (recommended), n8n on a VPS, or Apps Script.
- **D5.** A new `automation` platform kind on `/work` with the "Try it" page (recommended), or a plain page with links.

## Self-hosted n8n: what it takes (assessed 2026-11-15)

**D4 answered 2026-11-15: self-hosted, on a Bluehost VPS** (1 core, 2 GB RAM, 50 GB NVMe, IP 129.121.173.84) that came
with n8n preinstalled behind Traefik. The step-by-step guide is **`n8n-server-setup.md`**; it supersedes the generic
plan below where they differ (no Postgres or Caddy: Bluehost's n8n + Traefik stay, with HTTPS added).

If D4 = self-hosted. n8n is a long-running Node server, so it needs an always-on machine. This PC has no Docker and
doesn't need it: everything runs on the server.

**The server** (one small VPS):
- Ubuntu 24.04 LTS, 2 vCPU, **4 GB RAM** (n8n wants ~2 GB on its own; Postgres and Caddy take the rest), 40 GB disk.
- A Hetzner CX-class box or similar, about €4–6 a month (check the price at order). Oracle's Always Free ARM tier
  costs nothing but its sign-up and capacity are unreliable; a paid box is the safer start.
- Stack, all in one `docker compose` file I write and version in `automation/server/`:
  n8n (image pinned to an exact version) + **Postgres 16** (n8n's own database; SQLite is the default but harder to
  back up) + **Caddy** (automatic HTTPS from Let's Encrypt).
- Hardening: SSH by key only, root login off, `ufw` open on 22/80/443 only, unattended security upgrades, n8n's
  execution data pruned after 14 days, a nightly `pg_dump` kept 7 days, and the workflows exported as JSON to the repo.
- n8n settings: `N8N_HOST`/`WEBHOOK_URL` = `https://n8n.vosk.dev`, `GENERIC_TIMEZONE` = Europe/Istanbul,
  an `N8N_ENCRYPTION_KEY` generated on the server (it encrypts the stored Google, LLM and Resend credentials; lose it
  and every credential must be re-entered, so it goes in your password manager).
- Licence: n8n's Sustainable Use License allows running it for your own business, which a showcase is.

**What you deliver so I can start** (secrets go into the server or n8n's UI by you, never into chat or the repo):
1. **The VPS**, created with your SSH public key, and its IP address. Then either a non-root sudo user whose key is
   on this machine (I run the setup over SSH and never read the key file), or you run the script I hand you.
2. **A DNS record** `n8n.vosk.dev` → the VPS IP (A record), set wherever vosk.dev's DNS is managed.
3. **The demo Gmail** (D1), with 2-step verification on.
4. **A Google Cloud project** on that Gmail: Gmail, Sheets and Drive APIs enabled; an OAuth client of type *Web
   application* with redirect URI `https://n8n.vosk.dev/rest/oauth2-credential/callback`; consent screen *External*,
   status **In production** (Testing tokens expire in 7 days). You paste the client ID and secret into n8n yourself.
5. **An LLM API key** for n8n only, with a monthly limit, pasted into n8n by you.
6. **A Resend API key**, sending access, restricted to vosk.dev, pasted into n8n by you.
7. **Answers to D2, D3 and D5**, plus the n8n owner login email (you set its password at first start).
8. **An n8n API key** (Settings → n8n API, created by you after first start), put in this repo's `.env.local` as
   `N8N_API_KEY` by you. Scripts load it; I never read the file.

From then on I build both flows as workflow JSON in `automation/n8n/` and push them through n8n's API. One limit to know:
I can't click through a browser here, so the Google sign-in inside n8n (step 4) is yours, once.

## Build order once D1–D5 are answered

1. Owner: Gmail, n8n Cloud trial, Google credential, Resend key, LLM key with a limit.
2. Flow 2 first (no attachments, no outbound email: the smallest risk), then Flow 1.
3. Ten test mails per flow, including an injection attempt, a scanned invoice, a mail with no deadline and a
   forged-looking sender; the expected sheet rows are written down before the run (an answer key, as for the chats).
4. Export the workflows to `automation/n8n/`, build the showcase page, push.
