---
name: security-findings
description: VOSK security findings — env-var exposure via client-reachable lib/env.ts, secret placement conventions
metadata:
  type: project
---

<!-- next-id: SEC-002 -->

# Security Findings (SEC-NNN)

### SEC-001 · Server secrets declared in client-reachable `lib/env.ts` leak their NAME, not their value · 2026-09-21

**Symptom:** `src/lib/env.ts` is bundled for the browser (imported by `"use client"`
`superset-embed.tsx` directly and `nav.tsx` via `lib/site.ts`). Anything in its schema appears
in a client chunk: `…CUBE_API_SECRET:ld.string().min(1).optional()}).parse({…`.
**Cause:** Next inlines only `NEXT_PUBLIC_*`. A non-public `process.env.X` stays a runtime
lookup against the browser `process` polyfill → `undefined`. So the VALUE cannot leak this way,
but the schema key (and the fact the site talks to that vendor) does.
**Fix:** House convention — documented in `env.ts` itself and in `contact-config.ts` — is that
server credentials live in the `server-only` module that uses them (`superset.ts`,
`contact-config.ts`), NOT in `env.ts`. `CUBE_API_URL` / `CUBE_API_SECRET` were added to `env.ts`
on 2026-09-21 by explicit instruction (docs/08 §8), against that convention; flagged to the
caller. Moving them is two schema lines into `lib/cube.ts`.
**Seen:** canary build on Next 16.2.10 — `CUBE_API_SECRET=CANARY… pnpm build`, then grep of
`.next/static`: value 0 hits, URL value 0 hits, var name 1 chunk.
**Confidence:** high — reproduced.
**Last-verified:** 2026-09-21
**Related:** —
**Status:** resolved 2026-09-21 — the main session moved both vars into `lib/cube.ts` (local `cubeEnv` schema, same `""`-as-unset handling) the same hour; `lib/env.ts` is byte-identical to `HEAD` again and all 131 tests still pass. The instruction in docs/08 §8 was the error, not the convention. **Lesson stays active:** a server credential never goes in `lib/env.ts`, whoever asks.
