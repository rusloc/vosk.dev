# Vercel Advanced Patterns

## Edge Middleware

```ts
// middleware.ts — runs on every request at the edge
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Geo-blocking
  const country = request.geo?.country;
  if (country === "XX") return new Response("Unavailable", { status: 451 });

  // A/B testing via cookies
  const variant =
    (request.cookies.get("ab-variant")?.value ?? Math.random() > 0.5)
      ? "a"
      : "b";
  const response = NextResponse.next();
  response.cookies.set("ab-variant", variant);
  return response;
}
```

## Cron Jobs (Vercel Cron)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 9 * * *"
    }
  ]
}
```

```ts
// app/api/cron/daily-digest/route.ts
export async function GET(req: Request) {
  // Verify it's actually from Vercel
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Do cron work...
  return Response.json({ success: true });
}
```

## On-Demand ISR (Revalidation)

```ts
// Revalidate cached pages on data change
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(req: Request) {
  const { path, tag } = await req.json();
  if (path) revalidatePath(path);
  if (tag) revalidateTag(tag);
  return Response.json({ revalidated: true });
}

// In Server Components, tag fetches:
const data = await fetch(url, { next: { tags: ["posts"] } });
```

## Environment Variable Best Practices

```
# .env.local (never commit)
NEXT_PUBLIC_*        → exposed to browser, safe for public keys
Everything else      → server-only, never sent to client

# Vercel dashboard environments:
Production           → live site
Preview              → PR deployments (use staging Supabase project)
Development          → local dev
```

## Edge vs Node.js Runtime

```ts
// Use Edge for: AI streaming, low-latency APIs, auth checks
export const runtime = "edge";

// Use Node.js for: heavy SDKs, file system, crypto, puppeteer
export const runtime = "nodejs"; // default, can omit
```

## Function Timeout Config

```json
// vercel.json
{
  "functions": {
    "app/api/ai/**": { "maxDuration": 60 },
    "app/api/export/**": { "maxDuration": 300 }
  }
}
```

## Vercel KV (Redis) for Rate Limiting

```bash
npm install @vercel/kv
```

```ts
import { kv } from "@vercel/kv";

export async function rateLimit(userId: string, limit = 10, window = 60) {
  const key = `rate:${userId}:${Math.floor(Date.now() / (window * 1000))}`;
  const count = await kv.incr(key);
  if (count === 1) await kv.expire(key, window);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
```

## Deployment Checklist

- [ ] All env vars set in Vercel dashboard (prod + preview)
- [ ] Supabase project URL whitelisted in Supabase auth settings
- [ ] Vercel deployment URL added to Supabase allowed origins
- [ ] `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL` set correctly per environment
- [ ] Service role key set as server-only env var (no `NEXT_PUBLIC_` prefix)
- [ ] Cron secret set and verified in cron routes
- [ ] Error monitoring connected (Sentry, etc.)
