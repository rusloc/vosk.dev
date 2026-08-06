<!-- next-id: SEC-002 -->

# Security Findings

### SEC-001 · Contact action mails an unverified visitor-supplied address (auto-reply backscatter) · 2026-08-01

**Symptom:** every valid contact submission triggers a second Resend send to whatever address the visitor typed, from the site's verified sender domain. No confirmation, no ownership check.
**Cause:** the best-effort auto-reply in `submitContactForm` uses `to: email` straight from the parsed form. The only brake is the per-IP in-memory limit (5/hour/instance), which resets on cold start and is per serverless instance.
**Fix / test:** not a bug to fix blindly — it's a deliberate UX feature. Re-check on any traffic increase: an abuser can use the form to send mail to third parties from `vosk.dev`, which burns sender reputation. If abuse appears, the mitigations are a shared rate-limit store (Upstash) and/or dropping the auto-reply. Test coverage exists for the send wiring in `src/app/[locale]/contact/actions.test.ts` ("replyTo" and "delivery failures" blocks).
**Seen:** `src/app/[locale]/contact/actions.ts` (auto-reply block, ~L99-111), commit adf60ec
**Hits:** 1
**Tags:** email, backscatter, rate-limit, contact-form, sender-reputation, resend
**Confidence:** low
**Last-verified:** 2026-08-01
**Status:** active
