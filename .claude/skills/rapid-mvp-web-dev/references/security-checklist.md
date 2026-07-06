# Security Checklist for Production MVPs

## Priority 1: Must-Have Before Launch

### Secrets Management

- [ ] ALL API keys, DB credentials, tokens in environment variables
- [ ] `.env.local` in `.gitignore` (verify with `git status`)
- [ ] No secrets in client-side code (check `NEXT_PUBLIC_` prefixes — only non-sensitive values)
- [ ] Production secrets set in deployment platform (Vercel/Railway/Cloudflare dashboard)

### Authentication

- [ ] Use a proven auth provider (Supabase Auth, Clerk, Auth.js) — never roll your own
- [ ] Session tokens are httpOnly, Secure, SameSite=Lax cookies
- [ ] Logout invalidates server-side session
- [ ] Password reset flow uses time-limited tokens
- [ ] OAuth callbacks validate `state` parameter

### Authorization

- [ ] Every API route checks auth before processing
- [ ] Supabase RLS enabled on ALL tables (even "public" ones — restrict write access)
- [ ] Users can only access their own data (test by switching user IDs in requests)
- [ ] Admin routes have explicit role checks

### Input Validation

- [ ] All API inputs validated with Zod schemas (server-side, not just client)
- [ ] File uploads: validate type, size, sanitize filename
- [ ] SQL injection: use parameterized queries (Supabase client does this automatically)
- [ ] XSS: React auto-escapes by default — never use `dangerouslySetInnerHTML` with user content

### API Security

- [ ] Rate limiting on all public endpoints (`@upstash/ratelimit`)
- [ ] CORS configured to allow only your domain(s)
- [ ] API routes return minimal error info (no stack traces in production)
- [ ] Webhook endpoints verify signatures (Stripe: `stripe.webhooks.constructEvent()`)

---

## Priority 2: Add Within First Week

### Headers

```typescript
// next.config.js
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co",
  },
];

module.exports = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

### Monitoring

- [ ] Sentry configured for error tracking
- [ ] Logging for auth events (login, failed login, password reset)
- [ ] Alerts for unusual traffic patterns

### Data

- [ ] Database backups enabled (Supabase Pro: automatic daily)
- [ ] Sensitive data encrypted at rest (Supabase: automatic)
- [ ] PII handling documented (what you collect, why, retention)

---

## Priority 3: Before Scaling

- [ ] Penetration testing or automated security scan (OWASP ZAP)
- [ ] Dependency audit (`npm audit`, enable Dependabot)
- [ ] SOC 2 / GDPR compliance review if handling EU data or enterprise clients
- [ ] DDoS protection (Cloudflare free tier or Vercel's built-in)
- [ ] API key rotation strategy documented
- [ ] Incident response plan written

---

## Quick Security Snippets

### Next.js Middleware Auth Guard

```typescript
// middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const protectedPaths = ["/dashboard", "/api/protected"];
  const isProtected = protectedPaths.some((p) =>
    req.nextUrl.pathname.startsWith(p),
  );

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/protected/:path*"],
};
```

### Zod Validation in API Route

```typescript
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).max(5).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const result = CreatePostSchema.safeParse(body);

  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { title, content, tags } = result.data;
  // Safe to use — validated and typed
}
```

### Stripe Webhook Signature Verification

```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Process verified event
  switch (event.type) {
    case "checkout.session.completed":
      // Handle successful payment
      break;
  }

  return new Response("OK");
}
```
