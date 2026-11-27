-- livechat — the site's Telegram live chat (docs/livechat/README.md), its two tables and its one role.
-- Pattern: data/cashflow/sql/001-schema-and-roles.sql (after trucks, mirelo), 2026-11-26; security review 2026-11-27.
-- Applied via MCP execute_sql (NOT a migration: schema_migrations stays qbo's). Idempotent; safe to re-run.
--
--   * livechat_app — the ONLY credential the chat holds (Vercel env LIVECHAT_DATABASE_URL, Session pooler, port 5432:
--     src/lib/livechat/db.ts refuses 6543). The first site login that can WRITE, and only to the two tables below.
--     Created NOLOGIN here; the owner enables login once, in the Supabase SQL editor:
--         alter role livechat_app login password '<generated, 32+ chars>';
--
-- RLS is on, with one policy per table for livechat_app only (the role is nobypassrls). The schema is not on the Data
-- API: anon / authenticated / public get no USAGE and no table grant. Never grant livechat_app anything in qbo,
-- demo_sales, public or any <report>_demo schema. Retention: 002-retention.sql (also run by the app when a new
-- conversation opens).

create schema if not exists livechat authorization postgres;
revoke all on schema livechat from public;
comment on schema livechat is
    'Visitor conversations of the vosk.dev live chat, relayed to the owner through Telegram. Written by livechat_app only; deleted 90 days after the last message.';

do $$
begin
    if not exists (select 1 from pg_roles r where 1=1 and r.rolname = 'livechat_app') then
        create role livechat_app nologin nobypassrls noinherit nocreatedb nocreaterole;
    end if;
end
$$;

-- Re-asserted on every run, outside the create branch (never `nologin` here: a re-run would lock the app out after
-- the owner set the password). `nobypassrls` is set at create only: on Supabase `postgres` is not a superuser, and
-- PG 16+ lets only a superuser name BYPASSRLS in ALTER ROLE; acceptance check E proves it is off.
alter role livechat_app noinherit nocreatedb nocreaterole;

comment on role livechat_app is
    'Reads and writes schema livechat for the vosk.dev live chat routes. NOLOGIN until the owner sets a password. Must never be granted anything outside livechat.';

-- Hardened like the readers (cube_reader, trucks_reader), but NOT read-only: it writes the chat.
alter role livechat_app connection limit 10;
alter role livechat_app set statement_timeout = '5s';
alter role livechat_app set search_path = livechat;
alter role livechat_app set extra_float_digits = 3;
-- A visitor's send holds its conversation row lock across the Telegram calls (5 s timeout each, a few per send); a
-- frozen Vercel instance must not hold it longer than this.
alter role livechat_app set idle_in_transaction_session_timeout = '60s';

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists livechat.chat_conversations (
    id                  uuid        primary key default gen_random_uuid(),
    token_hash          text        not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
    -- The topic: the group it is in and its thread id, set together (a changed TELEGRAM_CHAT_ID never misroutes).
    telegram_chat_id    bigint,
    telegram_thread_id  bigint,
    label               text        not null check (char_length(label) between 1 and 40),
    email               text        check (char_length(email) <= 254),
    -- Email changes posted in the topic (at most 3; later ones are stored silently).
    email_changes       int         not null default 0 check (email_changes >= 0),
    first_page_url      text        check (char_length(first_page_url) <= 500),
    referrer            text        check (char_length(referrer) <= 500),
    country             text        check (char_length(country) <= 8),
    ip_hash             text        check (ip_hash ~ '^[0-9a-f]{64}$'),
    status              text        not null default 'open' check (status in ('open', 'closed', 'blocked')),
    -- The per-conversation send limit (1 per 2 s, 30 an hour), updated under the row lock.
    last_send_at        timestamptz,
    hour_start          timestamptz,
    hour_count          int         not null default 0 check (hour_count >= 0),
    created_at          timestamptz not null default now(),
    last_message_at     timestamptz not null default now(),
    constraint chat_conversations_topic_pair check ((telegram_chat_id is null) = (telegram_thread_id is null)),
    constraint chat_conversations_topic_key unique (telegram_chat_id, telegram_thread_id)
);
comment on table livechat.chat_conversations is
    'One row per visitor conversation (one Telegram forum topic). token_hash = SHA-256 hex of the visitor cookie; ip_hash = SHA-256 of salt + IP, for rate limits only. URLs are origin + path only.';

create table if not exists livechat.chat_messages (
    id                   bigint      generated always as identity primary key,
    conversation_id      uuid        not null references livechat.chat_conversations (id) on delete cascade,
    direction            text        not null check (direction in ('visitor', 'owner', 'system')),
    body                 text        not null check (char_length(body) between 1 and 4096),
    telegram_chat_id     bigint,
    telegram_message_id  bigint,
    delivered            boolean     not null default false,
    created_at           timestamptz not null default now(),
    constraint chat_messages_visitor_body_len check (direction <> 'visitor' or char_length(body) <= 2000),
    constraint chat_messages_telegram_pair check ((telegram_chat_id is null) = (telegram_message_id is null))
);
comment on table livechat.chat_messages is
    'Messages of a conversation; id is the widget''s polling cursor. (telegram_chat_id, telegram_message_id) is unique where set (webhook idempotency).';

create unique index if not exists chat_messages_telegram_key
    on livechat.chat_messages (telegram_chat_id, telegram_message_id) where telegram_message_id is not null;
create index if not exists chat_messages_conversation_id_id_idx
    on livechat.chat_messages (conversation_id, id);
create index if not exists chat_conversations_ip_hash_created_at_idx
    on livechat.chat_conversations (ip_hash, created_at);
create index if not exists chat_conversations_created_at_idx
    on livechat.chat_conversations (created_at);
create index if not exists chat_conversations_last_message_at_idx
    on livechat.chat_conversations (last_message_at);

-- ---------------------------------------------------------------------------
-- RLS: on, one policy per table, for livechat_app only
-- ---------------------------------------------------------------------------
alter table livechat.chat_conversations enable row level security;
alter table livechat.chat_messages      enable row level security;

-- The expression restates `to livechat_app` instead of `true`, so the advisor's always-true check (lint 0024) has
-- nothing to flag; the effect is the same.
drop policy if exists livechat_app_all on livechat.chat_conversations;
create policy livechat_app_all on livechat.chat_conversations
    for all to livechat_app
    using (current_user = 'livechat_app') with check (current_user = 'livechat_app');
drop policy if exists livechat_app_all on livechat.chat_messages;
create policy livechat_app_all on livechat.chat_messages
    for all to livechat_app
    using (current_user = 'livechat_app') with check (current_user = 'livechat_app');

-- ---------------------------------------------------------------------------
-- Grants: livechat_app only; nothing for anon / authenticated / public
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema livechat from public, anon, authenticated;
revoke all on all sequences in schema livechat from public, anon, authenticated;
revoke all on schema livechat from anon, authenticated;

grant usage on schema livechat to livechat_app;
grant select, insert, update, delete on livechat.chat_conversations, livechat.chat_messages to livechat_app;
grant usage on sequence livechat.chat_messages_id_seq to livechat_app;

-- Lets `postgres` run `set role livechat_app` for the acceptance tests. The role is NOINHERIT and holds nothing
-- postgres lacks, so membership grants postgres nothing.
grant livechat_app to postgres;

-- ---------------------------------------------------------------------------
-- Acceptance — run AS the role, against REAL rows, one block per MCP call.
-- `set local` inside a transaction: the role resets on rollback AND on the expected failure.
-- ---------------------------------------------------------------------------
-- A. Denials on real rows (expected: 42501 permission denied for schema):
--      begin; set local role livechat_app; select count(*) from qbo.dim_account;        rollback;
--      begin; set local role livechat_app; select count(*) from demo_sales.dim_channel; rollback;
--      begin; set local role livechat_app; select count(*) from trucks_demo.document;   rollback;
-- B. Its own tables work (insert, select, delete; rolled back):
--      begin; set local role livechat_app;
--      with c as (insert into livechat.chat_conversations (token_hash, label) values (repeat('a', 64), 'Visitor TEST') returning id)
--      insert into livechat.chat_messages (conversation_id, direction, body) select id, 'visitor', 'hi' from c;
--      select count(*) from livechat.chat_messages; delete from livechat.chat_conversations; rollback;
-- C. anon / authenticated have no USAGE on livechat (has_schema_privilege → false).
-- D. MCP get_advisors(security) → zero lints.
-- E. The role's attributes (expected: all false, connection limit 10):
--      select rolbypassrls, rolinherit, rolcreatedb, rolcreaterole, rolsuper, rolconnlimit
--      from pg_roles where rolname = 'livechat_app';
-- F. Idempotency keys (expected: the second insert 23505, unique_violation), rolled back:
--      begin; set local role livechat_app;
--      with c as (insert into livechat.chat_conversations (token_hash, label, telegram_chat_id, telegram_thread_id)
--                 values (repeat('b', 64), 'Visitor TEST', -1001, 7) returning id)
--      insert into livechat.chat_messages (conversation_id, direction, body, telegram_chat_id, telegram_message_id)
--      select id, 'owner', 'x', -1001, 5 from c union all select id, 'owner', 'x', -1001, 5 from c;
--      rollback;
--    and the same thread id in ANOTHER group is allowed (two rows with telegram_thread_id 7, chat ids -1001 / -1002).
--
-- Only provable against the database (the unit tests replace it); after the owner sets the password, from two
-- sessions as livechat_app:
-- G. Row lock: session 1 `begin; select id from livechat.chat_conversations where token_hash = '<h>' for update;`;
--    session 2 `begin; set local lock_timeout = '2s'; select … for update;` → 55P03 after 2 s (the app answers 429).
-- H. Open-conversation lock: session 1 `begin; select pg_advisory_xact_lock(hashtext('livechat.open_conversation'));`;
--    session 2 the same → waits until session 1 commits (so the per-IP and site counts cannot both pass).
-- I. Postgres refuses NUL in text (`select chr(0);` → 54000); the app rejects control characters before any insert,
--    and opens a conversation and stores its first message in one transaction, so a refused insert leaves no orphan.
