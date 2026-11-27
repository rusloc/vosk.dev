# vosk.dev Telegram live chat: build spec

Nov 26, 2026 · @KIRILL

## Goal and scope

Build a chat widget on vosk.dev where a visitor types a message, it lands in the owner's Telegram within about 2 seconds, and the owner's reply typed in Telegram appears in the visitor's open chat within about 3 seconds.

This document is the full brief for the implementing agent. Follow it in order. Where the repo differs from an assumption below, adapt and say so in your final report rather than stopping.

In scope for v1:

- A floating chat widget on every public page, text messages only.
- One Telegram forum topic per visitor conversation, inside one private group.
- Replies from Telegram delivered back to the right visitor, with history restored on page reload.
- Rate limiting, input validation and webhook verification.
- An email fallback when the owner does not answer within 60 seconds.

Done means every item in the Acceptance tests section passes on the production URL.

## Assumptions to verify first

The stack below is inferred from the public site, not confirmed. Before writing code, inspect the repo and confirm each row. Report any mismatch and the adaptation you chose.

| Item | Assumed | If different |
| --- | --- | --- |
| Framework | Next.js, App Router, TypeScript | Pages Router: use `pages/api/*` handlers with the same contracts |
| Hosting | Vercel, serverless functions | Any host with a public HTTPS URL works; the webhook needs one |
| Database | Supabase Postgres, accessed server-side with the service role key | Any Postgres works; keep the same tables. No database at all: stop and ask the owner |
| Styling | Tailwind plus the site's existing design tokens | Use whatever the repo uses; do not add a UI library |
| Existing chat | None; a Message button links to `/contact` | Leave `/contact` untouched |
| Cookie banner | Present, with Accept and Decline | The widget must not overlap it |

Open questions for the owner (use the default if unanswered):

- Greeting text. Default: "Hi, I'm Kirill. Ask me anything about Power BI, Fabric or automation."
- Message retention. Default: delete conversations 90 days after the last message.
- Who may reply from Telegram. Default: only the owner's Telegram user ID.

## Setup sheet (owner does these by hand)

These six steps take about 10 minutes and cannot be done by the agent, because they need the owner's Telegram account.

1. In Telegram, open @BotFather, send `/newbot`, pick a name and username, and copy the bot token.
2. Create a new private group, for example "vosk.dev chats". In group settings, turn on Topics. This converts it to a forum supergroup.
3. Add the bot to the group and promote it to admin with the Manage Topics permission. Admin bots receive every message in the group, which the reply flow depends on.
4. Send any message in the group, then run the agent's setup script (`scripts/telegram-setup`). It prints the group chat ID (a negative number starting with `-100`) and your own Telegram user ID.
5. Add the environment variables below to the host and to `.env.local`.
6. After the first production deploy, run the setup script again with the production URL so it registers the webhook.

| Variable | Value | Notes |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | From BotFather | Server only. Never prefix with `NEXT_PUBLIC_` |
| `TELEGRAM_CHAT_ID` | Group ID from step 4 | Starts with `-100` |
| `TELEGRAM_WEBHOOK_SECRET` | Random 32+ characters, letters, digits, `_` and `-` only | Sent back by Telegram in a header on every webhook call |
| `TELEGRAM_ALLOWED_USER_IDS` | Owner's user ID from step 4, comma-separated if several | Only these users' messages are relayed to visitors |
| `SUPABASE_URL` | Project URL | Likely already set |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Server only |
| `SITE_ORIGIN` | `https://vosk.dev` | Used for the Origin check and webhook URL |

Keep the bot token out of chat logs, commits and screenshots. If it leaks, revoke it in BotFather with `/revoke`.

## Architecture and message flow

The Next.js app is the only moving part: it stores every message in Postgres, calls the Telegram Bot API outbound, and receives the owner's replies through a Telegram webhook. The widget gets new messages by polling its own API, which works on any host and needs no realtime service.

Visitor to Telegram:

1. The widget sends `POST /api/chat/messages` with the text and current page URL.
2. The server reads the visitor token from an httpOnly cookie. With no cookie, it creates a conversation, generates a 32-byte random token, stores only its SHA-256 hash, and sets the cookie.
3. If the conversation has no topic yet, the server calls `createForumTopic` and saves the returned `message_thread_id`. It then posts one context message in the topic: page URL, referrer, country and device.
4. The server inserts the message row, then calls `sendMessage` with `chat_id` and `message_thread_id`, as plain text with no `parse_mode`.
5. The server returns the stored message. The widget shows it as sent.

Telegram to visitor:

1. The owner types in the visitor's topic. Telegram posts the update to `POST /api/telegram/webhook`.
2. The server verifies the secret header, the chat ID and the sender's user ID, then finds the conversation by `message_thread_id`.
3. The server inserts the message with direction `owner`. A unique index on the Telegram message ID makes retries harmless.
4. The server returns 200 immediately in every handled case, so Telegram does not retry.
5. The widget's next poll of `GET /api/chat/messages?after=<lastId>` returns the reply, and the widget renders it.

Polling cadence: every 3 seconds while the panel is open and the tab is visible; every 20 seconds while the panel is closed but a conversation exists, to drive the unread badge; paused while the tab is hidden.

Check method names and parameters against the current Bot API reference at core.telegram.org/bots/api before coding; this brief names them from memory.

## Data model

Two tables, written as one SQL migration in the repo's existing migration folder. Enable row-level security on both and add no policies: only server code using the service role key touches them, and the browser never queries the database directly.

`chat_conversations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid`, primary key | Default `gen_random_uuid()` |
| `token_hash` | `text`, unique, not null | SHA-256 of the cookie token, hex |
| `telegram_thread_id` | `bigint`, unique, nullable | Set after `createForumTopic` |
| `label` | `text`, not null | Short handle shown in the topic name, for example `Visitor 4F2A` |
| `email` | `text`, nullable | From the email fallback |
| `first_page_url` | `text` |  |
| `referrer` | `text` |  |
| `country` | `text` | From the host's geo header if present |
| `ip_hash` | `text` | SHA-256 of IP plus a server-side salt, for rate limiting only |
| `status` | `text`, not null, default `open` | Check constraint: `open`, `closed`, `blocked` |
| `created_at` | `timestamptz`, not null, default `now()` |  |
| `last_message_at` | `timestamptz`, not null, default `now()` | Drives retention cleanup |

`chat_messages`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint`, identity, primary key | Monotonic; the widget's polling cursor |
| `conversation_id` | `uuid`, not null | Foreign key, `on delete cascade` |
| `direction` | `text`, not null | Check constraint: `visitor`, `owner`, `system` |
| `body` | `text`, not null | 1 to 2000 characters for visitor messages |
| `telegram_message_id` | `bigint`, nullable | Partial unique index where not null, for webhook idempotency |
| `delivered` | `boolean`, not null, default `false` | True once Telegram accepted a visitor message |
| `created_at` | `timestamptz`, not null, default `now()` |  |

Indexes: `chat_messages (conversation_id, id)` for polling, and `chat_conversations (ip_hash, created_at)` for rate limits.

## API routes

Four route handlers, all on the Node.js runtime, all returning JSON. Put shared logic in `lib/chat/` (database access, Telegram client, token and rate-limit helpers) so the handlers stay thin.

| Route | Purpose | Request | Response |
| --- | --- | --- | --- |
| `POST /api/chat/messages` | Visitor sends a message | `{ text, pageUrl, website }` where `website` is a honeypot that must be empty | `200 { message }`; `400` invalid; `403` blocked or bad Origin; `429` rate limited; `502` stored but Telegram failed |
| `GET /api/chat/messages?after=<id>` | Widget polls for new messages | Cookie only; `after` defaults to 0 | `200 { messages, status }`; an empty list when there is no cookie |
| `POST /api/chat/email` | Visitor leaves an email | `{ email }` | `200 { ok: true }`; also posts the email into the topic |
| `POST /api/telegram/webhook` | Telegram delivers the owner's messages | Telegram `Update` object | `200` always once the secret is verified; `401` on a bad secret |

Message shape returned to the widget: `{ id, direction, body, createdAt, delivered }`.

Rules for `POST /api/chat/messages`:

- Trim the text; reject empty or over 2000 characters.
- Reject when the `Origin` header is not `SITE_ORIGIN`.
- Create the forum topic at most once per conversation. Guard against two concurrent first messages with a conditional update or a transaction lock on the conversation row.
- Insert the row first, then call Telegram. On success set `delivered` to true. On failure return `502` with the stored message so the widget can offer a retry that re-sends without duplicating the row.
- If Telegram answers that the thread no longer exists, create a new topic, save the new ID and retry once.
- If Telegram answers `429`, wait for its `retry_after` value when that is 3 seconds or less; otherwise return `502`.

Rules for `POST /api/telegram/webhook`:

- Compare the `X-Telegram-Bot-Api-Secret-Token` header to `TELEGRAM_WEBHOOK_SECRET` in constant time.
- Ignore the update, with a 200, unless all of these hold: it has a `message` with `text`; `chat.id` equals `TELEGRAM_CHAT_ID`; it has a `message_thread_id`; the sender is not a bot; the sender's ID is in `TELEGRAM_ALLOWED_USER_IDS`.
- A message starting with `/close` marks the conversation closed and is not relayed. `/block` sets status `blocked` and is not relayed.
- A non-text message (photo, file, sticker) is not relayed. Reply in the topic: "Text only for now; the visitor did not receive this."
- Any other text is inserted as an `owner` message. On a unique-index conflict, do nothing.

Setup script `scripts/telegram-setup`: with no webhook registered it calls `getMe` and `getUpdates` and prints the chat ID and sender user ID from recent messages. Given a base URL, it calls `setWebhook` with `secret_token` and `allowed_updates: ["message"]`, then prints `getWebhookInfo`.

## Widget UI

One client component, loaded lazily from the root layout with a dynamic import and no server rendering, so it adds nothing to first paint. Style it with the site's existing tokens, fonts and dark or light mode; it should look native to vosk.dev, not like a third-party embed.

Layout:

- A round launcher button fixed bottom-right, 56 px, with an unread count badge.
- Desktop: a panel about 360 by 520 px anchored above the launcher.
- Mobile (under 640 px): a full-screen sheet that respects the safe-area insets and stays above the on-screen keyboard.
- While the cookie banner is visible, shift the launcher up so the two never overlap.

Behaviour:

- The panel opens with the greeting as a local bubble. Nothing is sent to the server and no cookie is set until the visitor sends a first message.
- Enter sends; Shift+Enter adds a line. The send button is disabled while the text is empty or a send is in flight.
- A sent message appears at once in a pending state, then is confirmed, or shows "Not delivered. Retry".
- Owner replies appear on the left with the label "Kirill"; visitor messages on the right. The list scrolls to the newest message unless the visitor has scrolled up.
- On page load, if the cookie exists, fetch history so the conversation survives reloads and navigation.
- Open or closed state persists across page navigation in `sessionStorage`, wrapped in try/catch.
- Email fallback: 60 seconds after the visitor's first message with no owner reply, show a system bubble: "I'm away from my desk. Leave your email and I'll reply there." with one email field. Show it once per conversation.
- When status is `closed`, show "This chat was closed. Send a message to start again", and a new message reopens it in the same topic.
- On a `429`, show "Slow down a little" and re-enable sending after 5 seconds.

Accessibility: the launcher has an `aria-label`; the panel is a labelled dialog that traps focus and closes on Esc, returning focus to the launcher; incoming messages are announced through an `aria-live="polite"` region; all text meets WCAG AA contrast; animations respect `prefers-reduced-motion`.

Render message bodies as plain text nodes with preserved line breaks. Never inject them as HTML.

## Security, abuse limits and privacy

Every visitor message is untrusted input that ends up on the owner's phone, and the webhook is a public URL, so both ends are locked down.

Secrets and identity:

- The bot token, service role key and webhook secret exist only in server environment variables. Confirm none appear in the client bundle.
- The visitor cookie is `httpOnly`, `Secure`, `SameSite=Lax`, path `/`, 90-day lifetime. It holds the raw token; the database holds only the hash.
- A visitor can read and write only the conversation matching their own cookie. No route accepts a conversation ID from the client.
- The webhook trusts nothing but the secret header, the configured chat ID and the user-ID allowlist.

Limits, enforced with Postgres counts so no extra service is needed:

| Limit | Value | Response |
| --- | --- | --- |
| Message length | 2000 characters | `400` |
| Messages per conversation | 1 per 2 seconds, 30 per hour | `429` |
| New conversations per IP hash | 5 per 24 hours | `429` |
| Polling | No hard limit; the handler runs one indexed query |  |
| Blocked conversation | All sends refused | `403` |

Content handling:

- Send to Telegram as plain text with no `parse_mode`, so visitor text cannot break formatting or inject markup.
- Do not log message bodies or tokens. Log conversation ID, route, status code and Telegram error codes only.

Privacy:

- The chat cookie is set only when a visitor sends a message, never on page load, so it is tied to a feature the visitor asked for.
- Add a short paragraph to the existing privacy page: chat messages and an optional email are stored, relayed through Telegram to the site owner, and deleted 90 days after the last message. Draft it and leave the final wording for the owner to approve.
- Add a retention job (a scheduled function or a documented SQL statement) that deletes conversations whose `last_message_at` is older than 90 days.
- Store a salted hash of the IP, never the raw IP.

## Build order

Work in seven phases on a feature branch named `feature/telegram-chat`, one commit per phase, and open a pull request at the end. Do not push to the main branch or deploy to production without the owner's go-ahead.

1. Recon. Read the repo, confirm the assumptions table, and list the files you will add or change. Stop and ask only if there is no database.
2. Database. Write and apply the migration for both tables, constraints, indexes and row-level security.
3. Telegram plumbing. Build the Telegram client in `lib/chat/`, the setup script and the webhook route. Prove it by logging a verified incoming update from the real group.
4. Chat API. Build the three `/api/chat/*` routes with validation, cookie handling, topic creation and the rate limits.
5. Widget. Build the component, mount it in the root layout, and wire sending, polling, history, unread badge and error states.
6. Fallbacks and privacy. Add the email fallback, `/close` and `/block`, the retention job and the privacy page draft.
7. Verify and hand over. Run the acceptance tests on a preview deployment, then write the handover note.

Testing during the build: Telegram cannot reach `localhost`, so test the webhook on a preview deployment or through a tunnel, and point the webhook back at production afterwards. Add unit tests for the token helper, the webhook filter rules and the rate limiter.

Handover note, in the pull request description: files added and changed, deviations from this brief and why, the exact commands the owner runs (migration, setup script), and any acceptance test that did not pass.

## Acceptance tests

All fourteen checks must pass on a deployed URL with the real Telegram group before the work counts as done.

- [ ] A first message from a fresh browser creates one new topic in the group, with a context message and the visitor's text, within 2 seconds.
- [ ] A second message from the same browser lands in the same topic; no second topic appears.
- [ ] A reply typed in that topic appears in the visitor's open widget within 3 seconds.
- [ ] Two browsers chatting at once get two topics, and each sees only its own replies.
- [ ] Reloading the page, or moving to another page, restores the full history.
- [ ] With the panel closed, an owner reply raises the unread badge within 20 seconds.
- [ ] A webhook call with a wrong or missing secret returns `401` and stores nothing.
- [ ] A message typed in the topic by a user outside the allowlist is not relayed.
- [ ] Sending the same Telegram update twice stores one message.
- [ ] A 2001-character message is refused; rapid-fire sends hit the `429` path and the widget recovers.
- [ ] A message containing `<b>`, `*`, `_` and a script tag shows literally in both Telegram and the widget.
- [ ] With no owner reply for 60 seconds, the email prompt appears once, and a submitted email shows up in the topic.
- [ ] Deleting the topic in Telegram, then sending a new visitor message, creates a fresh topic and delivers the message.
- [ ] Lighthouse performance on the home page is no more than 2 points lower than before, and no secret string appears in the client bundle.

## Out of scope and later options

Leave these out of v1; each can be added later without changing the tables above.

- Photos, files and voice messages in either direction.
- Push delivery through Supabase Realtime or server-sent events in place of polling.
- An AI auto-reply for when the owner is offline, answering from the site's service pages and handing over to the owner in the same topic.
- Typing indicators and read receipts.
- Several operators with assignment.
- Opening the chat from the existing Message button; `/contact` stays as it is.
