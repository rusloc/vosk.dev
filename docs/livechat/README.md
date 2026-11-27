# Live chat (Telegram) — vosk.dev

Status **2026-11-27: pushed (`96561f6`), off in production; SQL not applied (owner, step 1 below); `scripts/livechat-check.ts` added.** Server (`src/lib/livechat/`, 3 routes, setup script,
70 tests) and widget (`src/components/livechat/`, mounted in `src/app/[locale]/layout.tsx`, browser-checked against a
fake API) are done; the SQL in `data/livechat/sql/` is **not applied** (the MCP call was declined); off until its env
vars are set. Spec (owner, 11-26):
`.log/report/vosk.dev Telegram live chat build spec.md`. This file is the contract the server and the widget are built
against, and the list of where this repo differs from the spec's assumptions.

## Adaptations to this repo (spec "Assumptions to verify first")

| Spec assumes | Here | Why |
| --- | --- | --- |
| Supabase service role key + `SUPABASE_URL` | **One Postgres login `livechat_app`**, own schema `livechat`, plain `postgres` driver, `LIVECHAT_DATABASE_URL` (Session pooler, port 5432) | CLAUDE.md: no Supabase API URL or service key in this deployment; the site reaches the database only through per-purpose logins. This is the first login that can **write**, and only to its two tables |
| Migration in the migration folder | `data/livechat/sql/001-schema-and-roles.sql`, applied once via MCP `execute_sql` | the project's migration history is `qbo`'s alone |
| RLS on, no policies, service role bypasses | RLS on, one policy per table **for `livechat_app` only** | the login is `nobypassrls` |
| Routes `/api/chat/messages`, `/api/chat/email` | **`/api/livechat/messages`**, **`/api/livechat/email`**; webhook as spec, `/api/telegram/webhook` | `/api/chat/<report>` and `src/lib/chat/` are the AI report chat |
| `lib/chat/` | **`src/lib/livechat/`** | same |
| `SITE_ORIGIN` env | `isSameOrigin(req)` (`src/lib/same-origin.ts`, shared with the AI chat): Origin host = request host | works on preview deploys too; one rule for every POST route |
| IP salt | `CHAT_IP_HASH_SALT` (existing; **required**, 16+ characters) | one salt for the site; already set in Vercel production for the AI chat |
| Mounted in the root layout | `src/app/[locale]/layout.tsx` (every site page). **Not on `/lp/*`** (own layout, four-colour rule) | ad pages stay as designed; add later if the owner wants |
| Retention job | expired conversations deleted in the same statement that opens a new conversation, plus the SQL in `data/livechat/sql/` for a manual run | `pg_cron` was dropped 10-20; no scheduler needed |
| Feature branch + PR | the agent never runs git (CLAUDE.md); the owner gets a block | |

## Deviations found while building (both sides agree)

- `POST /api/livechat/messages` takes an optional `referrer` (the widget sends `document.referrer` on the first message,
  for the topic's context line).
- Visitor routes may answer `500 { error: "server" }` on a database failure; the widget treats any 5xx as a network
  failure and offers Retry. `400` / `403` show "Not delivered." without Retry.
- The webhook answers `500` on a database failure, so Telegram re-sends; the unique index keeps it to one row.
- `/close` and `/block` get a one-line confirmation in the topic.
- `retryOf` for a message that isn't the visitor's own → `400`; already delivered → `200` with that message.
- The privacy text is a draft section inside `src/app/[locale]/privacy/page.tsx` (`LIVE_CHAT_DRAFT`), shown only when the
  chat is configured. It is not in the dictionary: the dictionary ships to the nav on every page.
- No dark mode: the site has one light theme.

## Env (server-only; the widget and the routes stay off until all six are set)

`LIVECHAT_DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`,
`TELEGRAM_ALLOWED_USER_IDS` (comma-separated; a trailing comma is fine) and `CHAT_IP_HASH_SALT` (16+ characters; it
already exists in Vercel production, add it to `.env.local` and preview if missing). `isLiveChatConfigured()` in
`src/lib/livechat/config.ts` is the one switch: the layout mounts the widget only when it returns true; every route
answers `404` while it is false. A malformed value turns the chat off with one server warning naming the variable; it
never breaks the site. The layout reads the vars at build: **redeploy after setting or changing them.**

## API contract (JSON, Node runtime, `Cache-Control: no-store`)

Message: `{ id: number, direction: "visitor" | "owner" | "system", body: string, createdAt: string (ISO), delivered: boolean }`

| Route | Request | Response |
| --- | --- | --- |
| `GET /api/livechat/messages?after=<id>` | cookie `__Host-vosk_chat` (httpOnly, Secure, SameSite=Lax, `/`, 90 days, refreshed on every accepted send) | `200 { messages: Message[], status: "open" \| "closed" \| "blocked" \| null, hasEmail: boolean }` — `status: null`, `messages: []` with no cookie or an unknown token |
| `POST /api/livechat/messages` | `{ text: string, pageUrl: string, website: string, retryOf?: number }` (`website` = honeypot, must be empty; `retryOf` = id of an own undelivered message: re-send it, insert nothing) | `200 { message }`; `400 { error: "invalid" }`; `403 { error: "forbidden" }` (bad Origin, honeypot, blocked); `429 { error: "slow_down" }`; `502 { error: "telegram", message }` (stored, not delivered) |
| `POST /api/livechat/email` | `{ email: string }` | `200 { ok: true }`; `400`; `403`; `404` with no conversation; `429` (same per-conversation limit as messages) |
| `POST /api/telegram/webhook` | Telegram `Update` | `401` bad / missing secret; `200 {}` otherwise |

A closed conversation reopens (status `open`) on the next visitor message or retry, same topic.

Limits (security review, 11-27): every visitor send (message, retry, email) counts toward 1 per 2 s and 30 an hour per
conversation, checked under the conversation's row lock (a second send while one is in flight gets `429`); new
conversations: 5 a day per IP hash and 50 an hour site-wide (`429`). Text with nothing visible or with control
characters (other than newline and tab) is `400`. The topic hears at most 3 email changes per conversation. Owner
messages starting with `/` other than `/close` and `/block` are not relayed (the topic gets "Unknown command; the
visitor did not receive this."). Page URL and referrer are stored as origin + path, the page only when it is on this
site.

## Copy (widget)

- Greeting (local bubble, never sent): "Hi, I'm Kirill. Ask me anything about Power BI, Fabric or automation."
- Owner label: "Kirill". Email prompt after 60 s without a reply, once per conversation: "I'm away from my desk. Leave
  your email and I'll reply there." Closed: "This chat was closed. Send a message to start again". 429: "Slow down a
  little". Failed: "Not delivered. Retry".

## Owner's setup (after the build) — in this order

Pushed 2026-11-27 (`96561f6`), off in production (routes 404, no widget). The agent's MCP apply of the SQL was blocked
by the permission rules twice (11-26, 11-27), so step 1 is the owner's.

1. **SQL:** Supabase dashboard → SQL editor → paste the whole of `data/livechat/sql/001-schema-and-roles.sql` → Run
   (idempotent). Then tell the agent: it runs checks C, D (advisors 0) and E read-only.
2. **Password:** in the same editor, `alter role livechat_app login password '<generated, 32+ chars>';` Build
   `LIVECHAT_DATABASE_URL` from the Session pooler string (Connect → Session pooler, **port 5432**), user
   `livechat_app.howpxpdnjjzdwqrgxkee`.
3. **Telegram:** @BotFather `/newbot` → token (`TELEGRAM_BOT_TOKEN`); a private group, Topics on; add the bot as admin
   with Manage Topics; in the group, reply **as yourself** ("Remain anonymous" off, or your messages come from
   GroupAnonymousBot and are ignored). Send one message in the group.
4. **IDs:** `node --env-file=.env.local --import tsx scripts/telegram-setup.ts` → prints the group id
   (`TELEGRAM_CHAT_ID`, `-100…`) and your user id (`TELEGRAM_ALLOWED_USER_IDS`). `TELEGRAM_WEBHOOK_SECRET`: any 32–256
   characters of `A-Z a-z 0-9 _ -`.
5. **Local check:** `node --conditions=react-server --env-file=.env.local --import tsx scripts/livechat-check.ts` → all
   PASS: the six vars, the database as `livechat_app` (A, B, F, G, H, I on the real database), the bot, the group, your
   user. It writes one test row and deletes it; it prints no secret.
6. **Vercel:** Settings → Environment Variables (Production): the five new vars (`CHAT_IP_HASH_SALT` is already there)
   → **Redeploy** (the layout reads them at build).
7. **Webhook:** `node --env-file=.env.local --import tsx scripts/telegram-setup.ts https://vosk.dev`
8. **Live check:** `node --conditions=react-server --env-file=.env.local --import tsx scripts/livechat-check.ts https://vosk.dev`
   → adds "site: live chat route answers" and "telegram: webhook". Then one real conversation from a phone: the topic
   opens, a reply reaches the widget within ~3 s, `/close` closes it. Approve or rewrite `LIVE_CHAT_DRAFT` (privacy).
