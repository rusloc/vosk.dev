# Coding Rules

These rules are **non-negotiable**. They take precedence over stylistic preferences, "best practice" instincts, and the urge to be helpful by doing extra. Read them every time before writing or editing code in this stack.

## Table of contents

1. [Think Before Coding](#1-think-before-coding)
2. [Simplicity First](#2-simplicity-first)
3. [Surgical Changes](#3-surgical-changes) ← most-violated, read carefully
4. [Goal-Driven Execution](#4-goal-driven-execution)
5. [Stack-specific applications](#stack-specific-applications)

---

## 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Stack-specific application

- **RSC vs Client Component** — before writing `'use client'`, ask whether interactivity is actually needed. State the reason in a one-line comment if non-obvious.
- **Edge vs Node runtime** — don't pick silently. If a route uses an SDK that doesn't run on Edge (e.g., `pg`, `puppeteer`, anything reading the filesystem), say so up front.
- **Route Handler vs Server Action** — both work for mutations. Pick one explicitly:
  - Server Action: form submissions, progressive enhancement, tied to a page.
  - Route Handler: external callers, webhooks, streaming, non-form clients.
- **Supabase client choice** — `createClient` from `@supabase/ssr` (server) vs browser client vs service-role admin client are _not_ interchangeable. If you're tempted to use the service-role client, stop and justify why RLS won't work.
- **AI model + cost** — name the model, name the expected token cost order of magnitude. Don't silently pick an expensive model.

---

## 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Stack-specific application

- **No premature `lib/` extraction.** A function used in one route handler stays in that route handler. Extract on the _second_ call site, not the first.
- **No wrapper SDKs.** `new Anthropic()` directly in the route. Don't write `lib/ai/anthropic-client.ts` that just re-exports `new Anthropic()`.
- **No abstract `BaseRepository<T>`.** Supabase queries are already a fluent API. Wrapping them in a "repository pattern" adds layers and removes the type inference.
- **No retry/backoff/circuit-breaker** unless asked. The Anthropic and OpenAI SDKs already retry. `@vercel/kv` already has timeout handling.
- **No "config" files for two values.** Inline `const MAX_TOKENS = 1024` beats a `config/ai.ts` with one export.
- **No Zod schemas for internal-only types.** Use Zod at trust boundaries (request body, env vars, AI structured output, webhook payloads). Don't validate data your own code just produced.
- **One job per Server Action.** Don't write `updateUserAndSendEmailAndLogEvent`. Compose at the call site if needed.
- **No try/catch around code that can't throw,** and no rethrowing the same error with a wrapper class.

---

## 3. Surgical Changes

**This is the rule that gets violated most. Read it twice.**

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that **YOUR** changes made unused.
- Don't remove pre-existing dead code unless asked.

**The test: every changed line should trace directly to the user's request.**

### Default editing protocol

1. **Read first, edit second.** Read the surrounding code (the whole file, often the whole module) before making any change.
2. **Use `str_replace`, not file rewrites.** Whole-file rewrites are the #1 source of unintended diff. Only rewrite a file if the user explicitly says so or if more than ~70% of the file changes.
3. **Diff-as-conversation.** When showing edits in chat, show only the changed hunks with a few lines of context — not the whole file. The user reads the diff to verify scope.
4. **Preserve formatting verbatim.** Indentation, quote style (`'` vs `"`), trailing commas, semicolons or not, import ordering, blank-line conventions — match the file. If the file mixes styles, match the _function_ you're editing.
5. **No "while I'm here" fixes.** Typo in a comment three lines above? Leave it. Inconsistent naming in a sibling function? Leave it. Mention it in chat if it matters.

### Stack-specific surgical hazards

- **Migrations are append-only.** Never edit a previously committed migration file. Add a new migration that adjusts.
- **RLS policies — narrow scope.** When asked to fix one policy on one table, don't audit and "improve" policies on other tables. Touch the named policy only.
- **`package.json` order.** Adding a dep? Add it where the existing deps live (alphabetical, by category, however the file does it). Don't reorder existing entries. Don't bump unrelated versions.
- **Generated files** (`types/database.types.ts`, `.next/`, anything from `supabase gen types`) — never edit by hand. Regenerate or instruct the user to.
- **Don't "modernize" Pages Router code** in a project that uses both. Match the prevailing pattern in the directory you're editing.
- **Comments in user code stay.** Don't delete a `// TODO` or `// FIXME` from someone else's code unless asked.
- **Auth code is high-risk.** When editing `middleware.ts` or auth callbacks, change _only_ the named flow. The rest of the matcher list, the rest of the cookie handling, the rest of the redirects — leave them.
- **Don't "fix" inconsistent imports.** If half the file uses `@/lib/...` and half uses relative paths, match the function you're editing. Mention the inconsistency once if it matters.

### When refactoring _is_ the request

If the user explicitly asks for a refactor or reformat:

- Confirm the scope before starting (which files, which functions).
- Make the refactor _only_ the change. Don't bundle in feature work.
- Keep behavior identical unless the user said otherwise. Pre/post tests should pass without modification.

---

## 4. Goal-Driven Execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

### Stack-specific application

- **Auth changes** → goal: "User without session is redirected from `/dashboard`; user with session reaches it." Verify by reading `middleware.ts` matcher + the redirect logic, not by guessing.
- **RLS changes** → goal: "Anon role gets PERMISSION DENIED on `select`; authenticated role gets only own rows." Verify with `set role authenticated; set request.jwt.claims = ...; select ...` in psql, or with a test using `supabase.auth.signInWithPassword`.
- **AI integration** → goal: "Endpoint returns streamed text for an authenticated user, 401 for anon." Verify with a real `curl` or fetch, not by inspection alone.
- **Webhook handler** → goal: "Valid signature processes; invalid signature returns 401; replay of same event is idempotent." Three explicit checks.
- **Migration** → goal: "`supabase db reset` then `supabase db push` succeeds locally; types regenerated; no other table affected."
- **Type generation** → after any schema change, the verify step is `supabase gen types typescript --local > types/database.types.ts` and a `tsc --noEmit` run.

---

## Stack-specific applications

A condensed checklist to scan before submitting any change in this stack.

**Before writing:**

- [ ] Read the file(s) I'm about to edit, not just the function
- [ ] State assumptions about runtime (Edge/Node), client/server boundary, RLS context
- [ ] Confirm I'm using the right Supabase client (server / browser / admin)
- [ ] Confirm secrets aren't headed to a `NEXT_PUBLIC_` var or a Client Component

**While editing:**

- [ ] Every changed line traces to the user's request
- [ ] Style matches the surrounding file
- [ ] No "while I'm here" cleanups
- [ ] No new abstractions for one call site
- [ ] No new dependencies unless asked

**Before declaring done:**

- [ ] State the verification step (how the user can confirm it works)
- [ ] If types changed, ran `tsc --noEmit` mentally or actually
- [ ] If schema changed, mentioned `supabase gen types`
- [ ] Diff is the smallest possible change that meets the goal
