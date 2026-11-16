---
name: candidates
description: Single-sighting observations awaiting a second hit (CAND-NNN), each with an expiry
metadata:
  type: project
---

<!-- next-id: CAND-004 -->

# Candidates (CAND-NNN)

### CAND-001 · Tailwind v4 utility cannot override a CSS-module rule · 2026-10-20

**Symptom:** A `bg-*` / `inset-*` utility placed next to `styles.titleBar` has no effect.
**Cause:** Tailwind v4 emits utilities inside `@layer utilities`; CSS modules are
unlayered. Per CSS Cascade Layers, unlayered author styles beat every layered one
regardless of specificity or source order.
**Fix:** Override with an inline `style` (as `service-card.tsx` does for the feature
gradient) or add a modifier class to the module. Never `!important`.
**Seen:** `src/app/[locale]/services/service-card.tsx` (1755dfd;
`.log/daily/daily-2026-10-05.md` Finding 4).
**Confidence:** high by spec; low as a repo pattern — one site so far.
**Expires:** 2027-01-18
**Related:** AP-001
**Status:** candidate

### CAND-002 · optional build input via pattern import · 2026-11-16

**Symptom:** A showcase must ship before a data file exists (`data/n8n/<flow>.json`); a literal `import("…json")` fails the build.
**Cause:** A literal specifier is resolved at build; a template specifier becomes a bundler context over the files present.
**Fix:** `import(\`../../data/n8n/${flow}.json\`)` in `src/lib/n8n-flows.ts` (`loadN8nFlow` / `hasN8nFlow`): a missing file is a rejected promise at run time, each JSON still its own lazy chunk (checked in the Turbopack output, Next 16.2.10). No `fs` check: an ISR regeneration on Vercel has no untraced files.
**Seen:** `src/lib/n8n-flows.ts`, `src/app/[locale]/work/[slug]/page.tsx` (uncommitted 11-16).
**Confidence:** medium: build-verified locally with the file missing; not yet on a Vercel deploy.
**Expires:** 2027-02-14
**Status:** candidate

### CAND-003 · chat tools that do I/O · 2026-11-16

**Symptom:** A chat with no report (Tidewell data chat) needs async tools and per-request context.
**Cause:** `ChatToolset.run` was sync and its ctx was a report state.
**Fix:** `run` may return a promise (`runChat` awaits calls in order); `chatRoute({ context })` builds ctx from `{ ip, questions }`. Server secrets stay out of `lib/env.ts` (SEC-001): `lib/ceo-digest/config.ts`.
**Seen:** `src/lib/chat/{tools,run-chat,route}.ts`, `src/lib/ceo-digest/` (uncommitted 11-16).
**Confidence:** medium: one consumer.
**Expires:** 2027-02-14
**Related:** SEC-001
**Status:** candidate
