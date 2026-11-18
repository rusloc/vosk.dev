/**
 * A per-key sliding-window limit for the public routes (the report data routes, the AI chat): best effort, per
 * instance, reset on a cold start; enough to blunt casual abuse on a low-traffic site. Returns `isRateLimited(key)`,
 * true once a key has made more than `max` calls in the last `windowMs`.
 *
 * Keys whose window has emptied are swept at most once per window, so the map holds recent visitors only (an IP that
 * never comes back no longer stays in it for the life of the instance).
 */
export function rateLimiter({
  max,
  windowMs,
  hits = new Map<string, number[]>(),
}: {
  max: number;
  windowMs: number;
  /** Each key's call times in the window; passed in by the tests only. */
  hits?: Map<string, number[]>;
}): (key: string, now?: number) => boolean {
  let swept = 0;

  return function isRateLimited(key, now = Date.now()) {
    if (now - swept >= windowMs) {
      for (const [k, times] of hits)
        if (!times.some((t) => now - t < windowMs)) hits.delete(k);
      swept = now;
    }
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    return recent.length > max;
  };
}

/** The visitor's IP as the platform forwards it (the first `x-forwarded-for` hop), or "unknown". */
export const clientIp = (req: Request): string =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
