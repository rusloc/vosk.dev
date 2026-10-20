---
name: candidates
description: Single-sighting observations awaiting a second hit (CAND-NNN), each with an expiry
metadata:
  type: project
---

<!-- next-id: CAND-002 -->

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
