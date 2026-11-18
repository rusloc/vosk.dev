import { NextResponse } from "next/server";
import { clientIp, rateLimiter } from "./rate-limit";
import type { ArtifactResult } from "./reader";

/**
 * The GET handler of a report's data route, /api/<report>/[...path]: serves the report's data from Supabase (schema
 * `<report>_demo`), one artifact per request, under the file names the browser used to fetch from public/data (each
 * report's artifacts.ts). Public by necessity — visitors are anonymous — and narrow by design: only a known artifact
 * name, read through a role that can see nothing but this report's data, at a modest rate.
 *
 * The data is a frozen snapshot, so the CDN keeps each answer a day and serves stale while it refreshes: the database
 * sees a handful of reads per artifact, not one per visitor.
 *
 * Reachable only because proxy.ts excludes /api/* from locale rewriting (CAND-001). Each route file keeps its own
 * segment config (`runtime`, `dynamic`) as literal exports, which Next.js reads statically.
 */

const CACHE_CONTROL =
  "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
const WINDOW_MS = 10 * 60 * 1000;

export function artifactRoute({
  name,
  read,
  maxPerWindow,
}: {
  /** The report, for the log line. */
  name: string;
  /** The report's readArtifact (src/lib/<report>/server.ts). */
  read: (artifact: string) => Promise<ArtifactResult>;
  /** Requests per IP per ten minutes; per instance, so each route keeps its own counters. */
  maxPerWindow: number;
}) {
  const isRateLimited = rateLimiter({ max: maxPerWindow, windowMs: WINDOW_MS });

  return async function GET(
    req: Request,
    ctx: { params: Promise<{ path: string[] }> },
  ) {
    if (isRateLimited(clientIp(req))) {
      return new Response("Too many requests", { status: 429 });
    }

    const { path } = await ctx.params;
    const artifact = path.join("/");
    try {
      const result = await read(artifact);
      if (result.status !== 200)
        return new Response(
          result.status === 404 ? "Not found" : "Report data is not configured",
          { status: result.status },
        );
      return NextResponse.json(result.body, {
        headers: { "Cache-Control": CACHE_CONTROL },
      });
    } catch (error) {
      // The message may name a host or a table, never a credential; the body stays generic.
      console.error(
        `${name} artifact ${artifact}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return new Response("Report data unavailable", { status: 502 });
    }
  };
}
