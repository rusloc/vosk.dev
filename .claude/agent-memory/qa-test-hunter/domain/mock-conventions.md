<!-- next-id: MOCK-002 -->

# Mock Conventions

### MOCK-001 · Server Action with module-level state: reset the registry, not the state · 2026-08-01

**Symptom:** rate-limit / cache / memo state declared at module scope in a `"use server"` file leaks between tests; a test that passes alone fails in suite order, or "5 allowed, 6th blocked" silently becomes "3rd blocked".
**Cause:** the state (`const hits = new Map()` in `contact/actions.ts`) is module-private with no reset seam. Working around it by giving every test a unique IP couples tests to each other's counts and breaks the moment an address is reused.
**Fix / test:** `vi.resetModules()` in `beforeEach` + a dynamic `await import("./actions")` inside each test → fresh module instance per test, so tests may reuse IPs and assert exact counts. Mocks registered via `vi.mock` survive `resetModules`, but the factory re-runs — so build mock fns with `vi.hoisted()` and have factories return those stable references, otherwise top-level captured spies go stale. Full working shape in `templates/MOCK-001.server-action.ts`.
**Seen:** `src/app/[locale]/contact/actions.test.ts` (rate limit + `next/headers` + `resend` + `@/lib/contact-config`)
**Hits:** 1
**Tags:** server-action, module-state, resetModules, vi.hoisted, rate-limit, next-headers
**Confidence:** low
**Last-verified:** 2026-08-01
**Related:** INFRA-001
**Status:** active

Notes that generalise to any server module in this repo:

- `@/lib/contact-config` imports `server-only`, which throws outside an RSC environment. It MUST be mocked with a factory (a bare `vi.mock(path)` auto-mock still loads the real module graph).
- `@/lib/site` → `@/lib/env` is safe to import in tests: every env var has a Zod default, so no test-time env plumbing is needed.
- Don't mock `@/lib/schema` or the i18n dictionaries. Import `en`/`ru` from `@/lib/i18n/*` and assert against the real strings — this keeps tests honest when copy changes and avoids hard-coded message literals.
