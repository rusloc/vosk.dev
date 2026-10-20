---
name: anti-patterns
description: Recurring VOSK front-end smells — symptom → cause → fix (AP-NNN); title-bar blur vs clips/gutters
metadata:
  type: project
---

<!-- next-id: AP-002 -->

# Anti-Patterns (AP-NNN)

### AP-001 · Blurred title bar overhangs a clip or a gutter · 2026-10-20

**Symptom:** The orange title highlight (`src/app/[locale]/blog/title-bar.module.css`:
`inset: -0.1em -0.6em` + `filter: blur(7.5px)`) shows hard edges, or the page gains a
few px of horizontal overflow at phone width.
**Cause:** The bar's box is 0.6em wider and 0.1em taller than the title per side, and the
blur paints ~15px (2σ) past that. Any ancestor `overflow: hidden` closer than that (a
carousel slide, a card) clips it; any gutter narrower than that widens `scrollWidth`.
At `lg:text-5xl` the left overhang is 29px + 15px blur — more than a 36px card padding.
**Fix:** Give it room *inside* the clip — padding on the clipping element (`pt-5` on
the slide, moved in from the window's margin so the row keeps its height) and indent the
heading by the overhang (`pl-[0.6em]` on the h3) so the bar starts on the content column.
Don't drop the clip (slides need it against the neighbour's bar) and don't fight the
module from a utility (CAND-001).
**Seen:** `src/app/[locale]/services/service-carousel.tsx` + `service-card.tsx`
(1755dfd, fixed 2026-10-20); blog post pages 2026-10-01 — 2px overflow at 390 (title-bar
inset vs the 16px gutter, per user memory `visual-verification-on-this-machine`).
**Confidence:** medium — one reproduced here; the 10-01 sighting is second-hand.
**Last-verified:** 2026-10-20
**Related:** CAND-001
**Status:** active
