---
name: events
description: vosk.dev event catalogue - event name, where it fires in code, GTM trigger/tag, params, GA4 dimension, key event or not
metadata:
  type: project
---

As of 2026-11-18 (GTM live v3). Params land in built-in dims Content ID / Content type; no custom dimensions exist.

| Event | Fires from | GTM path | Params | Key event |
|---|---|---|---|---|
| page_view, session_start, first_visit, user_engagement | Google tag (auto) + enhanced measurement (history changes on) | `Google tag - G-2FXCM9DL8S` on Initialization - All Pages | - | no |
| scroll, click (outbound), form_start/form_submit, file_download, view_search_results, video_* | enhanced measurement, all on | Google tag | auto | no |
| generate_lead | `contact-form.tsx` on success → `trackLead()` (gtag args) | Google tag reads the command | - | **yes**, ONCE_PER_EVENT |
| chat_question | `chat/chat-panel.tsx` on send, `trackEvent` | Google tag | content_id = chat endpoint report key | no |
| contact_open | `send-message-button.tsx` | Click - data-ga → GA4 event - data-ga click | - | no |
| cta_click | home `page.tsx` | same | content_type = work / services | no |
| select_content | `work/showcase-card.tsx`, related list in `work/[slug]/page.tsx` | same | content_id = slug, content_type = showcase / related_showcase | no |
| report_open | `work/[slug]/page.tsx` ReportDialog buttons | same | content_id = slug, content_type = power_bi / web_report / n8n_workflow | no |
| chat_open | Ask AI buttons in `work/[slug]/page.tsx` | same | content_id = slug | no |

Gaps seen 11-18: report opened by deep link (`openOnQuery` / `openOnHash`) sends no report_open (no click).
The `mailto:` on `/contact` has no data-ga (enhanced-measurement outbound click does not cover mailto). No booking link yet.
Auto-made key events from the lead-gen objective: `qualify_lead`, `close_convert_lead` (deletable, never sent), `purchase` (default, not deletable).
