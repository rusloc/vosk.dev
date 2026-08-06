<!-- next-id: CAND-004 -->

# Candidates

Single-occurrence observations awaiting a second sighting.

### CAND-001 · Vite/Vitest config must be `.mts` in this repo · first seen 2026-08-01

**Where:** `vitest.config.mts` (was `vitest.config.ts`)
**Why interesting:** `package.json` has no `"type": "module"`, so Vite's native config loader warns on every run: _"ESM syntax in a file loaded as CommonJS"_ and threatens to break in a future major. Renaming to `.mts` silences it; `tsconfig.json` already includes `**/*.mts`, and eslint lints it fine.
**Watch for:** the same warning if anyone adds `postcss.config.ts`, `playwright.config.ts`, etc.
**Tags:** vite, vitest, esm, cjs, config
**Promote-to:** test-infra-quirks.md on second sighting
**Expires:** 2026-10-30

### CAND-002 · Zod defaults leak untranslated English into localized forms · first seen 2026-08-01

**Where:** `src/lib/schema.ts` `makeContactSchema` — `.max(200)` on email, `.max(150)` on subject, and the type check on a missing `message` carry no custom message.
**Why interesting:** `makeContactSchema(t)` looks fully localized because the three "interesting" rules take `t.*` strings, so the gap is invisible on inspection. A `ru` visitor omitting the message gets `"Invalid input: expected string, received null"`.
**Watch for:** any other `makeXSchema(t)` factory where only some rules take a message argument.
**Tags:** zod, i18n, validation, localization
**Promote-to:** defect-patterns.md on second sighting
**Expires:** 2026-10-30

### CAND-003 · Env parsing outside the action's try/catch turns misconfig into a 500 · first seen 2026-08-01

**Where:** `src/app/[locale]/contact/actions.ts` calls `getContactConfig()` (which does `contactEnvSchema.parse`) before the `try` block.
**Why interesting:** the config module is written defensively (everything optional, graceful "not configured" fallback) but `z.string().min(1).optional()` still THROWS on `""` — and an empty-string env var is the single most likely operator mistake in a Vercel dashboard. The friendly fallback is unreachable in exactly the case it was written for.
**Watch for:** other `*.parse()` calls in request-path code sitting outside error handling.
**Tags:** zod, env, server-action, error-handling, vercel
**Promote-to:** defect-patterns.md on second sighting
**Expires:** 2026-10-30
