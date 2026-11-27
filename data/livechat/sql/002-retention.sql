-- livechat retention — conversations are deleted 90 days after their last message (their messages go with them,
-- on delete cascade). The app runs the same delete in the statement that opens a new conversation
-- (src/lib/livechat/store.ts `openConversation`), so no scheduler is needed (pg_cron was dropped 2026-10-20).
-- This file is the manual run, via MCP execute_sql or the SQL editor, as postgres or livechat_app.

delete from livechat.chat_conversations
where last_message_at < now() - interval '90 days';
