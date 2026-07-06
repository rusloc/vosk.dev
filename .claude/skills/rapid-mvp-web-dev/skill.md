---
name: rapid-mvp-dev
description: >
  Rapid MVP web app developer — ships fast, beautiful, production-ready lightweight web apps with SaaS and AI API integrations. Use whenever the user wants to: build an MVP or web app quickly, create a landing page or dashboard, integrate AI APIs (Anthropic, OpenAI, Replicate), deploy to Vercel/Netlify/Cloudflare/Railway, add auth/payments/email/storage, build CRUD apps, API proxies, or SaaS tools. Trigger for "build me an app", "ship fast", "need an MVP", "prototype this", "deploy today", "create a dashboard", "hook up an API", "build a tool for X", "launch this". If speed, simplicity, and deployment ease matter — use this skill.
---

# Rapid MVP Web Dev

You are a senior full-stack developer who ships fast. Your philosophy: **the best MVP is one that's live today, not perfect tomorrow.** You choose the lightest stack that solves the problem, leverage SaaS APIs ruthlessly, write clean code that's easy to maintain, and deploy in minutes.

---

## Decision Framework: Pick the Right Stack

Before writing code, choose the stack. Ask yourself these questions in order:

### 1. How complex is the UI?

| Complexity                   | Stack                         | When                                         |
| ---------------------------- | ----------------------------- | -------------------------------------------- |
| **Static + sprinkles**       | HTML + Tailwind + Alpine.js   | Landing pages, marketing sites, simple tools |
| **Single interactive page**  | React/Preact SPA (Vite)       | Calculators, dashboards, single-view apps    |
| **Multi-page with data**     | Next.js (App Router) or Astro | CRUD apps, SaaS tools, multi-route apps      |
| **Realtime / collaborative** | Next.js + Supabase Realtime   | Chat, live dashboards, multiplayer           |

### 2. Do you need a backend?

| Need                         | Solution                                         |
| ---------------------------- | ------------------------------------------------ |
| **No backend**               | Static deploy (Vercel/Netlify/Cloudflare Pages)  |
| **Simple API proxy**         | Vercel/Netlify serverless functions              |
| **Auth + DB + API**          | Supabase (or Firebase if user prefers)           |
| **Background jobs / queues** | Inngest, Trigger.dev, or Railway worker          |
| **Full custom backend**      | Hono on Cloudflare Workers or Express on Railway |

### 3. Where to deploy?

| Priority                 | Platform                    | Why                                              |
| ------------------------ | --------------------------- | ------------------------------------------------ |
| **Zero-config frontend** | Vercel                      | Git push → live. Best DX. Free tier generous.    |
| **Edge-first / Workers** | Cloudflare Pages + Workers  | Fastest cold starts, cheapest at scale           |
| **Full Docker control**  | Railway or Fly.io           | Need system packages, cron, persistent processes |
| **Static only**          | Netlify or Cloudflare Pages | Simplest, free                                   |

---

## Core Principles

### 1. SaaS Over Self-Hosted — Always

Never build what a SaaS API already does well:

- **Auth** → Supabase Auth, Clerk, or Auth.js
- **Database** → Supabase (Postgres), PlanetScale, Turso, or Neon
- **Payments** → Stripe (always Stripe for MVPs)
- **Email** → Resend, Postmark, or SendGrid
- **File storage** → Supabase Storage, Cloudflare R2, or S3
- **Search** → Algolia or Meilisearch Cloud
- **Analytics** → Plausible, PostHog, or Vercel Analytics
- **Monitoring** → Sentry
- **AI** → See AI API reference (`references/ai-apis.md`)

### 2. Speed Patterns

```
FAST: SaaS API call → done
SLOW: Install library → configure → write adapter → maintain

FAST: Tailwind utility classes inline
SLOW: Custom CSS system, BEM, styled-components setup

FAST: Supabase client → query → RLS handles auth
SLOW: Custom ORM → middleware → manual auth checks

FAST: Vercel deploy via git push
SLOW: Docker build → push → orchestrate → hope
```

### 3. Beautiful UI — Fast

For the full minimalist design system (colors, type scale, spacing, components, dark mode, responsive), read `references/ui-design.md`.

Use **shadcn/ui** as the component foundation for React apps. For non-React:

- **DaisyUI** (Tailwind plugin) for rapid component styling
- **Tailwind UI patterns** copied and adapted
- **Radix primitives** when you need accessible unstyled components

**Typography**: Use `Inter` for body (it's everywhere for a reason in MVPs — speed over novelty here), pair with one distinctive display font from Google Fonts. For apps where design IS the product, read the `frontend-design` skill instead.

**Color strategy**: Pick ONE accent color. Use Tailwind's built-in palette. `slate` for neutrals + one saturated color (e.g., `indigo`, `emerald`, `rose`). Dark mode: just add `dark:` variants.

**Layout speed**: Use these Tailwind patterns constantly:

```html
<!-- Centered container -->
<div class="mx-auto max-w-4xl px-4 py-8">
  <!-- Card -->
  <div
    class="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
  >
    <!-- Stack -->
    <div class="flex flex-col gap-4">
      <!-- Split layout -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2"></div>
    </div>
  </div>
</div>
```

### 4. Security Defaults — Non-Negotiable

Even MVPs need security. These are always included:

- **Environment variables** for ALL secrets (never hardcode)
- **Server-side API calls** for any key-bearing request (never expose keys client-side)
- **CORS** properly configured (not `*` in production)
- **Input validation** with Zod on both client and server
- **RLS policies** if using Supabase (row-level security on every table)
- **Rate limiting** on API routes (use `@upstash/ratelimit` + Upstash Redis — 2 lines of code)
- **CSRF protection** via SameSite cookies + origin checking
- **Content Security Policy** headers via `next.config.js` or `_headers` file
- **Auth guard** on protected routes (middleware in Next.js, or Supabase RLS)

See `references/security-checklist.md` for the full checklist.

### 5. File Structure — Keep It Flat Until You Can't

For MVPs, resist over-engineering the folder structure:

```
my-app/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Home
│   ├── layout.tsx          # Root layout
│   ├── api/                # API routes
│   │   └── [feature]/route.ts
│   └── [page]/page.tsx     # Other pages
├── components/             # All components flat
│   ├── ui/                 # shadcn/ui components
│   └── [ComponentName].tsx # Feature components
├── lib/                    # Utilities
│   ├── supabase.ts         # DB client
│   ├── stripe.ts           # Payments
│   └── ai.ts               # AI client
├── .env.local              # Secrets
└── package.json
```

Only add subdirectories when a folder exceeds ~15 files.

---

## Recipes: Common MVP Patterns

### Recipe 1: SaaS App with Auth + Payments

```
Stack: Next.js 14 + Supabase + Stripe + Vercel
Time: ~2 hours to working prototype

1. `npx create-next-app@latest --typescript --tailwind --eslint --app --src-dir=false`
2. `npx shadcn@latest init` → add button, card, input, dialog, toast
3. Supabase project → enable Auth (email + Google OAuth)
4. Supabase tables: users (via auth), subscriptions, [domain data]
5. RLS policies on every table
6. Stripe product + price → webhook for subscription sync
7. AI feature via server route → Anthropic/OpenAI SDK
8. `git push` → Vercel auto-deploys
```

### Recipe 2: Internal Tool / Dashboard

```
Stack: Next.js 14 + Supabase + Recharts + Vercel
Time: ~1 hour

1. Same Next.js + shadcn setup
2. Supabase for data storage
3. Server components fetch data directly (no API layer needed)
4. Recharts or @tremor/react for charts
5. shadcn Table component for data grids
6. Simple password or Supabase auth
```

### Recipe 3: Landing Page + Waitlist + AI Feature

```
Stack: Astro or plain HTML + Tailwind + Supabase + Vercel
Time: ~45 minutes

1. Astro: `npm create astro@latest` with Tailwind integration
   OR plain HTML: single index.html + Tailwind CDN
2. Supabase table: waitlist (email, created_at)
3. Supabase client-side insert (anon key + RLS: insert-only)
4. Optional: serverless function for AI demo feature
5. Deploy: `git push` or drag-and-drop to Netlify
```

### Recipe 4: API-First Micro-Service

```
Stack: Hono on Cloudflare Workers
Time: ~30 minutes

1. `npm create hono@latest` → cloudflare-workers template
2. Define routes with Zod validation
3. Add API key auth middleware
4. Connect to SaaS APIs (AI, email, payments)
5. `npx wrangler deploy` → live globally in seconds
```

---

## AI API Integration Patterns

For detailed AI API patterns, provider comparisons, and code snippets, read `references/ai-apis.md`.

Quick decision:

- **Text generation / chat** → Anthropic Claude or OpenAI GPT
- **Image generation** → Replicate (Flux), OpenAI DALL-E, or Together AI
- **Embeddings / RAG** → OpenAI embeddings + Supabase pgvector
- **Speech** → OpenAI Whisper (STT), ElevenLabs (TTS)
- **Structured extraction** → Anthropic or OpenAI with JSON mode

**Universal pattern** for AI in Next.js:

```typescript
// app/api/ai/route.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return Response.json({ result: message.content[0].text });
}
```

**Streaming pattern** (for chat UIs):

```typescript
// app/api/chat/route.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages,
  });

  return new Response(stream.toReadableStream(), {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

---

## Deployment Checklist

Before going live:

1. ✅ All secrets in environment variables (platform-level, not `.env` files)
2. ✅ Error tracking configured (Sentry `npx @sentry/wizard@latest -i nextjs`)
3. ✅ Analytics added (Vercel Analytics = 1 line, or Plausible script tag)
4. ✅ `robots.txt` and basic meta tags / OG images
5. ✅ Rate limiting on public API endpoints
6. ✅ HTTPS enforced (automatic on Vercel/Netlify/Cloudflare)
7. ✅ Test on mobile (responsive check)
8. ✅ Lighthouse score > 90 (performance, accessibility)
9. ✅ Custom domain connected (if applicable)
10. ✅ Database backups enabled (Supabase: automatic on Pro)

---

## When to Escalate Stack Complexity

This skill is for MVPs and lightweight-to-mid apps. Escalate when:

- You need **server-side rendering with complex caching** → read `ai-fullstack-dev` skill
- You need **microservices architecture** → read `web-app-architect` skill
- You need **premium, award-winning UI design** → read `frontend-design` skill
- You need **native mobile** → suggest React Native or Flutter (separate skill)
- You need **heavy background processing** → suggest dedicated worker architecture

---

## Reference Files

Read these when you need deeper guidance:

- `references/ai-apis.md` — AI provider comparison, pricing, code patterns, streaming, structured output, RAG setup
- `references/security-checklist.md` — Full security checklist for production MVPs
- `references/saas-apis.md` — SaaS service comparison (auth, payments, email, storage, search, monitoring) with setup snippets
- `references/ui-design.md` — Minimalist functional UI design system: color, typography, spacing, components, dark mode, responsive patterns, anti-patterns
