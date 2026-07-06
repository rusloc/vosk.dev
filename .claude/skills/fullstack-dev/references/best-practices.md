# Best Practices

Opinionated, stack-specific best practices for Next.js (App Router) + Supabase + AI APIs on Vercel. Use this as a reference when designing or reviewing — not a checklist to apply mechanically.

## Table of contents

1. [Server / Client boundary](#1--server--client-boundary)
2. [Data fetching](#2--data-fetching)
3. [Mutations: Server Actions vs Route Handlers](#3--mutations-server-actions-vs-route-handlers)
4. [Caching and revalidation](#4--caching-and-revalidation)
5. [Error and loading UI](#5--error-and-loading-ui)
6. [Forms and validation](#6--forms-and-validation)
7. [Type safety end-to-end](#7--type-safety-end-to-end)
8. [Supabase patterns](#8--supabase-patterns)
9. [AI API integration](#9--ai-api-integration)
10. [Performance](#10--performance)
11. [Observability](#11--observability)
12. [Project hygiene](#12--project-hygiene)

---

## 1 · Server / Client boundary

- **Server Components by default.** Add `'use client'` only when you need state, effects, browser APIs, or event handlers.
- A Client Component can import a Server Component **only via children**, not directly. Pass it as a prop.
- Don't import server-only modules (Supabase server client, secrets, `fs`) into anything reachable from a Client Component. Use `import 'server-only'` at the top of files that must never cross.
- Don't pass non-serializable data (functions, classes, Dates with methods) from Server to Client Components. Serialize at the boundary.
- Keep Client Components small and **at the leaves** of the tree. Push interactivity down, not up.

---

## 2 · Data fetching

- **Fetch in Server Components, not in `useEffect`.** Use `useEffect` only for browser-only side effects (focus, scroll, listeners), never for initial data load.
- **Parallelize independent queries** with `Promise.all`. Sequential `await`s on independent calls is the most common perf bug.
- **Co-locate fetches with the components that use them.** Don't pass huge prop trees from a top-level page if a leaf can fetch its own slice (each fetch is automatically deduped within a request).
- **Don't fetch in Client Components for SSR pages.** If you need fresh data after mutation, use Server Actions + `revalidatePath` / `revalidateTag`.
- For lists, **always paginate** at the database layer (`.range()`), not client-side.

```ts
// Good: parallel, dedup'd, server-side
const [profile, posts] = await Promise.all([
  supabase.from("profiles").select("*").eq("id", user.id).single(),
  supabase.from("posts").select("*").eq("user_id", user.id).range(0, 19),
]);
```

---

## 3 · Mutations: Server Actions vs Route Handlers

| Use Server Action                    | Use Route Handler             |
| ------------------------------------ | ----------------------------- |
| Form submissions                     | Webhooks                      |
| Mutations triggered from your own UI | Streaming responses (AI, SSE) |
| Progressive enhancement matters      | Mobile / external clients     |
| Tied to a specific page              | Public-ish APIs               |

- Server Actions have **built-in CSRF protection** via Next.js. Route Handlers don't — add origin checks if mutating.
- Always `revalidatePath` or `revalidateTag` at the end of a Server Action that changes displayed data.
- Validate input at the top of every Server Action with Zod. Never trust the FormData shape.
- Return typed results (`{ ok: true, data } | { ok: false, error }`) — exceptions cross the wire poorly.

---

## 4 · Caching and revalidation

- **Static by default in App Router.** A page with no dynamic functions (`cookies()`, `headers()`, `searchParams`) is statically rendered.
- **Tag your fetches** with `next: { tags: [...] }` so you can revalidate by tag from a Server Action or webhook.
- **Use `revalidatePath` for page-level invalidation, `revalidateTag` for cross-page data invalidation.** The latter is more surgical.
- Authenticated pages should use `cookies()` (which forces dynamic) — there's no hidden cache hazard from this, but be aware.
- **Don't cache user-specific data with `force-cache`.** It's a footgun. Authenticated reads should be dynamic.

---

## 5 · Error and loading UI

- Add a `loading.tsx` next to every async page. Streaming + Suspense is free.
- Add an `error.tsx` boundary at meaningful tree depths (route group level minimum). Errors that escape become a generic 500.
- Use `notFound()` from `next/navigation` for 404s, not custom redirects.
- For Server Actions, return error states — don't throw. Throwing renders the nearest `error.tsx` for the _whole page_, which is rarely what you want for a form.

---

## 6 · Forms and validation

- **Pair Zod with React Hook Form** for client-side validation, **and** re-validate the same Zod schema in the Server Action. Client validation is UX; server validation is the security boundary.
- Use `useFormState` (React) or `useActionState` (React 19+) to get progressive-enhancement-friendly form errors.
- Co-locate the Zod schema with the action; export it from the action file and import it into the form.

```ts
// Schema once, used twice
export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
});

export async function updateProfile(prev: State, formData: FormData) {
  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten() };
  // ...
}
```

---

## 7 · Type safety end-to-end

- **Generate Supabase types** after every schema change: `supabase gen types typescript --local > types/database.types.ts`. Commit the file.
- **Type your Supabase clients** with the generated `Database` type. You get table/column autocomplete and return-type inference for free.
- **Strict TS settings**: `strict: true`, `noUncheckedIndexedAccess: true`. The latter catches a huge class of `undefined` bugs.
- **Don't use `any`.** Use `unknown` and narrow, or define the type. Search-replace `: any` → `: unknown` periodically.
- For AI structured output, define the Zod schema first, then `z.infer<typeof schema>` for the type. Never hand-write the type and the schema separately.

---

## 8 · Supabase patterns

- **RLS on every table.** No exceptions. `alter table X enable row level security;` is the first line of every table's migration after creation.
- **Auth check in every Route Handler / Server Action**, even when RLS is on. RLS is a defense-in-depth layer, not a replacement for app-layer auth checks.
- **Use `supabase.auth.getUser()`, not `getSession()`** for authentication checks. `getUser()` re-validates the JWT with the auth server; `getSession()` trusts the cookie. The former is the right call for any access decision.
- **Don't pass the service-role client past the boundary** of admin-only code paths. If a function takes a Supabase client, type the parameter so it's clear which client it expects.
- **Database functions for complex queries.** Anything beyond a single-table query with simple filters belongs in a SQL function (`security invoker` by default; `security definer` only when intentionally elevating).
- **Migrations only forward.** Never edit a committed migration. Add a new one.
- **Use the local CLI** (`supabase start`, `supabase db reset`) for development. Don't develop against the production database.
- **Realtime subscriptions** — clean up on unmount, and remember each subscription is a WebSocket. Don't open one per row.

---

## 9 · AI API integration

- **All AI calls server-side.** Never put `ANTHROPIC_API_KEY` or equivalent in a `NEXT_PUBLIC_` var or in a Client Component.
- **Stream when the response is user-facing.** Non-streaming for >500 tokens of generation feels broken to users.
- **Set `runtime = 'edge'` for streaming routes** unless an SDK requires Node. Edge has lower TTFB and longer streaming windows on Vercel.
- **Set explicit `max_tokens`** on every call. Without it, you can blow up cost on a runaway response.
- **Add a per-user rate limit** on AI endpoints with `@vercel/kv` or Upstash. Without one, a single user can drain your AI budget.
- **Track token usage** per user/request. Persist to a `usage_logs` table or send to your observability backend. Cost surprises are easier to investigate with data.
- **Validate AI structured output with Zod.** The model can and will return invalid JSON occasionally. Fail loudly, retry once, then surface the error.
- **System prompts in code, not in the database** — unless you have a real reason. A prompt change is a code change and should go through PR review.
- **Cache embeddings.** Embedding the same string twice is wasted money. Hash the input and look up before calling the API.
- **Use prompt caching where supported** (Anthropic) for long, stable system prompts — it's a cost reduction, not a perf optimization.

---

## 10 · Performance

- **Core Web Vitals matter for SEO and UX.** Run Lighthouse on the production build, not dev.
- **Image optimization is automatic** with `next/image`. Always use it. Set `priority` only on above-the-fold images.
- **Font optimization** with `next/font` — eliminates layout shift and avoids round-trips to Google.
- **Bundle analysis** with `@next/bundle-analyzer` periodically. Anything you add to a Client Component bundle ships to the user.
- **Dynamic imports** for heavy Client Components used below the fold or only on interaction.
- **Database indexes match queries**, not tables. Every `.eq()` / `.in()` / `.order()` on a non-PK column is a candidate. Use `EXPLAIN ANALYZE` to verify.
- **Don't `select('*')`** on wide tables. Project the columns you need.

---

## 11 · Observability

- **Structured logs**, not `console.log`. Pino on Node, plain JSON on Edge. Include `userId`, `requestId`, `route`.
- **Never log secrets, tokens, or full request bodies.** Strip before logging.
- **Sentry (or equivalent)** for errors with source maps. Configure both client and server.
- **Vercel Analytics + Speed Insights** for real-user metrics — they're built-in, just enable them.
- **AI request logs**: model, tokens in/out, latency, cost, user. Even a basic table beats nothing.
- **Webhook logs**: store the raw event ID and a hash, so you can detect replays and debug delivery.

---

## 12 · Project hygiene

- **Conventional commits** if you have any kind of release automation, otherwise just be consistent.
- **Branch protection** on `main`: require PR, require CI green, require type check + lint.
- **Preview deploys** with isolated Supabase projects (or at least isolated schemas). Don't preview against production data.
- **Env vars in three places**: `.env.example` (committed, no values), Vercel dashboard (real values), a password manager (the source of truth for secrets).
- **Dependencies**: keep them current but not bleeding-edge. Pin major versions. Run `npm audit` weekly.
- **`.gitignore` discipline** — `.env*` (except `.env.example`), `.next/`, `node_modules/`, generated types if you're regenerating in CI.
- **One feature per PR.** A 200-line "various improvements" PR is unreviewable.
