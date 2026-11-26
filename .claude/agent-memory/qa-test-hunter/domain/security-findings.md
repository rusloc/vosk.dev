<!-- next-id: SEC-003 -->

# Security Findings

### SEC-001 · Contact action mails an unverified visitor-supplied address (auto-reply backscatter) · 2026-08-01

**Symptom:** every valid contact submission triggers a second Resend send to whatever address the visitor typed, from the site's verified sender domain. No confirmation, no ownership check.
**Cause:** the best-effort auto-reply in `submitContactForm` uses `to: email` straight from the parsed form. The only brake is the per-IP in-memory limit (5/hour/instance), which resets on cold start and is per serverless instance.
**Fix / test:** not a bug to fix blindly — it's a deliberate UX feature. Re-check on any traffic increase: an abuser can use the form to send mail to third parties from `vosk.dev`, which burns sender reputation. If abuse appears, the mitigations are a shared rate-limit store (Upstash) and/or dropping the auto-reply. Test coverage exists for the send wiring in `src/app/[locale]/contact/actions.test.ts` ("replyTo" and "delivery failures" blocks).
**Seen:** `src/app/[locale]/contact/actions.ts` (auto-reply block, ~L113-127; it also echoes the visitor's 5000-char message to that address), commit adf60ec; `src/lib/ceo-digest/chat-tools.ts` `send_email_report` (~L334-392, commit 1fce91e): mails any address the visitor typed, the "confirm first" step is prompt-only and the client can forge the assistant turns
**Hits:** 2
**Tags:** email, backscatter, rate-limit, contact-form, sender-reputation, resend
**Confidence:** medium
**Last-verified:** 2026-11-25
**Related:** SEC-002
**Status:** active

### SEC-002 · Per-instance in-memory limits are the only brake on every public route, and the chat spend cap undercounts · 2026-11-25

**Symptom:** the chat daily cap (`CHAT_DAILY_CAP_USD`) never trips for an abuser who aborts each request; a non-numeric cap value turns it off silently.
**Cause:** `src/lib/chat/route.ts` adds `usage.costUsd` only after `runChat` returns (abort or provider error loses the spend); `Number("0,5")` is NaN and `x >= NaN` is false; `inFlight` is checked before two awaits and incremented after. All counters (rate, spend, sends) are per instance and per route file.
**Fix / test:** report only. Tests to ask for: an aborted `runChat` still books its usage; `CHAT_DAILY_CAP_USD="abc"` answers 503 "paused"; N parallel POSTs never exceed MAX_IN_FLIGHT. The provider console limit is the real wall: confirm it is set.
**Seen:** `src/lib/chat/route.ts` L89-93, L113-115, L148, L177 (commit 1fce91e); same per-instance shape in `src/lib/report-data/rate-limit.ts`, the guest-token route and the contact action
**Hits:** 2
**Tags:** llm, cost-cap, rate-limit, abort, nan, serverless, chat
**Confidence:** medium
**Last-verified:** 2026-11-25
**Related:** SEC-001
**Status:** active
