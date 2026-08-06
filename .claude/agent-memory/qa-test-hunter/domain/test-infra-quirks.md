<!-- next-id: INFRA-002 -->

# Test Infra Quirks

### INFRA-001 · Vitest 4 mock used with `new` must be a `function`, not an arrow · 2026-08-01

**Symptom:** 16/29 tests fail with the code-under-test landing in its `catch` branch (e.g. contact action returned `errorSendFailed` instead of `success`). Only clue is a stderr line: `[vitest] The vi.fn() mock did not use 'function' or 'class' in its implementation`. No stack trace points at the mock.
**Cause:** Vitest 4 wraps `vi.fn(impl)`; when `impl` is an arrow function the mock is not constructible, so `new MockedClass()` throws a TypeError inside the SUT's own try/catch — the failure is swallowed and surfaces as a plausible-looking "wrong branch" result.
**Fix / test:** any mocked class constructor must use a `function` expression: `vi.fn(function () { return { emails: { send } }; })`. Same for `mockImplementationOnce` when the SUT calls it with `new`. See `templates/MOCK-001.server-action.ts`.
**Seen:** `src/app/[locale]/contact/actions.test.ts` mocking `resend`'s `Resend` class (vitest 4.1.10, first suite in the repo)
**Hits:** 1
**Tags:** vitest4, vi.fn, constructor, mock, resend, swallowed-error
**Confidence:** low
**Last-verified:** 2026-08-01
**Related:** MOCK-001
**Status:** active
