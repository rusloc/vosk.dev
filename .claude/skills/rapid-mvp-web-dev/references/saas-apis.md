# SaaS API Reference — Build Fast, Don't Reinvent

## Table of Contents

1. [Auth](#auth)
2. [Database](#database)
3. [Payments](#payments)
4. [Email](#email)
5. [File Storage](#file-storage)
6. [Search](#search)
7. [Analytics & Monitoring](#analytics--monitoring)
8. [Background Jobs](#background-jobs)
9. [Realtime](#realtime)
10. [Misc Utilities](#misc-utilities)

---

## Auth

### Supabase Auth (Default Choice)

Best for: Already using Supabase for DB. Free tier = unlimited MAU.

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

// Sign up
await supabase.auth.signUp({ email, password });

// Sign in
await supabase.auth.signInWithPassword({ email, password });

// OAuth
await supabase.auth.signInWithOAuth({ provider: "google" });

// Get session
const {
  data: { session },
} = await supabase.auth.getSession();
```

### Clerk (Premium DX)

Best for: Need pre-built UI components, org management, multi-factor. Free tier = 10k MAU.

```bash
npm install @clerk/nextjs
```

```typescript
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';
export default clerkMiddleware();

// In components — pre-built UI
import { SignIn, UserButton } from '@clerk/nextjs';
<SignIn />
<UserButton />
```

### Auth.js (NextAuth v5)

Best for: Need many OAuth providers, self-hosted auth. Free, open source.

```bash
npm install next-auth@beta
```

---

## Database

### Supabase (Postgres — Default Choice)

Best for: Relational data, auth integration, realtime, RLS, pgvector for AI.

```typescript
// Query
const { data, error } = await supabase
  .from("posts")
  .select("*, author:users(name)")
  .eq("published", true)
  .order("created_at", { ascending: false })
  .limit(20);

// Insert
const { data, error } = await supabase
  .from("posts")
  .insert({ title, content, user_id: session.user.id })
  .select()
  .single();

// RLS Policy (SQL editor)
// Users can only read their own data
// create policy "Users read own data" on posts
//   for select using (auth.uid() = user_id);
```

### Turso (SQLite at the Edge)

Best for: Edge-first apps, embedded SQLite, ultra-low latency. Generous free tier.

```bash
npm install @libsql/client
```

### Neon (Serverless Postgres)

Best for: Postgres without Supabase extras, branching for preview envs.

### PlanetScale (Serverless MySQL)

Best for: MySQL preference, schema branching, Vitess-powered scaling.

---

## Payments

### Stripe (Always Stripe for MVPs)

```bash
npm install stripe @stripe/stripe-js
```

#### Checkout Session (Quickest Path to Revenue)

```typescript
// app/api/checkout/route.ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { priceId } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription", // or 'payment' for one-time
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    customer_email: userEmail, // pre-fill if known
  });

  return Response.json({ url: session.url });
}
```

#### Client-Side Redirect

```typescript
const res = await fetch("/api/checkout", {
  method: "POST",
  body: JSON.stringify({ priceId: "price_xxx" }),
});
const { url } = await res.json();
window.location.href = url; // Redirect to Stripe Checkout
```

#### Webhook for Subscription Sync

```typescript
// app/api/webhooks/stripe/route.ts
// See security-checklist.md for signature verification pattern

switch (event.type) {
  case "checkout.session.completed":
    // Create/update subscription in your DB
    break;
  case "customer.subscription.updated":
    // Sync plan changes
    break;
  case "customer.subscription.deleted":
    // Handle cancellation
    break;
  case "invoice.payment_failed":
    // Notify user, maybe downgrade
    break;
}
```

---

## Email

### Resend (Modern Default)

Best for: Transactional email, React Email templates, great DX.

```bash
npm install resend
```

```typescript
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "App <noreply@yourdomain.com>",
  to: userEmail,
  subject: "Welcome!",
  html: "<h1>Welcome to our app!</h1>",
  // OR use React Email components:
  // react: WelcomeEmail({ name: userName }),
});
```

### Postmark

Best for: Highest deliverability, critical transactional emails.

### SendGrid

Best for: High volume, marketing + transactional combined.

---

## File Storage

### Supabase Storage (Default if Using Supabase)

```typescript
// Upload
const { data, error } = await supabase.storage
  .from("avatars")
  .upload(`${userId}/avatar.png`, file, {
    contentType: "image/png",
    upsert: true,
  });

// Get public URL
const {
  data: { publicUrl },
} = supabase.storage.from("avatars").getPublicUrl(`${userId}/avatar.png`);
```

### Cloudflare R2 (S3-compatible, No Egress Fees)

Best for: Large files, high bandwidth, cost-sensitive. Free egress!

### Uploadthing

Best for: Quick file upload widget for Next.js. Minimal setup.

```bash
npm install uploadthing @uploadthing/react
```

---

## Search

### Algolia

Best for: Instant search UI, faceted search, typo-tolerance. Free tier = 10k records.

### Meilisearch Cloud

Best for: Open-source alternative, generous limits, self-hostable.

### Supabase Full-Text Search

Best for: Simple search without another service. Already in Postgres.

```typescript
const { data } = await supabase
  .from("posts")
  .select()
  .textSearch("content", query, { type: "websearch" });
```

---

## Analytics & Monitoring

### Vercel Analytics (Easiest)

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return <html><body>{children}<Analytics /></body></html>;
}
```

### Plausible (Privacy-First)

```html
<script
  defer
  data-domain="yourdomain.com"
  src="https://plausible.io/js/script.js"
></script>
```

### PostHog (Product Analytics + Feature Flags)

Best for: User behavior tracking, session replays, A/B testing, feature flags. Generous free tier.

### Sentry (Error Tracking — Always Include)

```bash
npx @sentry/wizard@latest -i nextjs
```

---

## Background Jobs

### Inngest (Event-Driven)

Best for: Serverless-native, step functions, retries, cron. Free tier generous.

```bash
npm install inngest
```

```typescript
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "my-app" });

export const processUpload = inngest.createFunction(
  { id: "process-upload" },
  { event: "upload/created" },
  async ({ event, step }) => {
    const result = await step.run("analyze", async () => {
      // Long-running AI analysis
      return await analyzeDocument(event.data.fileUrl);
    });

    await step.run("notify", async () => {
      await sendEmail(event.data.userEmail, result);
    });
  },
);
```

### Trigger.dev

Best for: Complex workflows, integrations, similar to Inngest.

### Vercel Cron

Best for: Simple scheduled tasks (max 1/minute on Pro plan).

```typescript
// vercel.json
{ "crons": [{ "path": "/api/cron/daily-report", "schedule": "0 9 * * *" }] }
```

---

## Realtime

### Supabase Realtime

```typescript
const channel = supabase
  .channel("room1")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    (payload) => {
      console.log("New message:", payload.new);
    },
  )
  .subscribe();
```

### Pusher / Ably

Best for: Dedicated realtime without Supabase, higher scale.

### PartyKit / Cloudflare Durable Objects

Best for: Collaborative apps, multiplayer, edge-native realtime.

---

## Misc Utilities

| Need                  | Service                       | One-liner                      |
| --------------------- | ----------------------------- | ------------------------------ |
| URL shortener         | Dub.co                        | API for branded short links    |
| PDF generation        | @react-pdf/renderer           | React components → PDF         |
| Image optimization    | Cloudflare Images or imgproxy | Resize/transform on the fly    |
| Feature flags         | PostHog or LaunchDarkly       | Toggle features without deploy |
| Scheduling / calendar | Cal.com API                   | Embed booking widgets          |
| SMS / WhatsApp        | Twilio                        | Programmable messaging         |
| Maps                  | Mapbox or Google Maps         | Interactive maps               |
| CMS                   | Sanity or Contentful          | Headless CMS for content       |
