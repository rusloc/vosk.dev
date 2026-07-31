import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { mintGuestToken } from "@/lib/superset";
import { getShowcase } from "@/lib/work";

/**
 * Mints a guest token for one showcase dashboard. Public by necessity — visitors are
 * anonymous — so it is deliberately narrow: it accepts only a known Superset slug, only
 * from our own origin, only at a modest rate, and returns a token scoped to exactly one
 * dashboard of synthetic data.
 *
 * Reachable only because middleware.ts excludes /api/* from locale rewriting (CAND-001).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ slug: z.string().min(1).max(100) }).strict();

// The SDK refreshes roughly every 5 minutes, so a legitimate viewer needs very few of
// these. Same best-effort in-memory shape as the contact form: per-instance, resets on
// cold start. Enough to blunt casual abuse on a low-traffic site.
const MAX_PER_WINDOW = 20;
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function isRateLimited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

/**
 * Browser-origin guard, not access control: a request with no Origin header is allowed
 * through because same-origin fetches may omit it, so non-browser callers bypass this.
 * Acceptable here — the token is scoped to one synthetic dashboard, and Superset's CSP
 * `frame-ancestors` independently controls who may frame the dashboard.
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  return [env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"].includes(origin);
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req.headers.get("origin"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip, Date.now())) {
    return new Response("Too many requests", { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const showcase = getShowcase(parsed.data.slug);
  if (!showcase || showcase.platform !== "superset") {
    return new Response("Unknown dashboard", { status: 404 });
  }

  try {
    return NextResponse.json({ token: await mintGuestToken(showcase.embedId) });
  } catch (error) {
    console.error("guest-token", error);
    return new Response("Upstream failure", { status: 502 });
  }
}
