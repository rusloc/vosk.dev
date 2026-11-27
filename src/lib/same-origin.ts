/**
 * The hosts a request came to: its URL's, the platform's forwarded host and the Host header (preview deploys too).
 */
function requestHosts(req: Request): string[] {
  return [
    new URL(req.url).host,
    req.headers.get("x-forwarded-host"),
    req.headers.get("host"),
  ].filter((h): h is string => !!h);
}

/** Whether `url` (absolute) points at the host this request came to. */
export function isRequestHost(req: Request, url: URL): boolean {
  return requestHosts(req).includes(url.host);
}

/**
 * A browser always sends `Origin` on a fetch POST; a page of this site sends its own host. A script without the header,
 * or another site's page, gets 403 before any work is done (11-25: bots spending the LLM budget or the email tool).
 * Compared with the host the request came to, so preview deploys work too. Shared by the AI chat routes
 * (src/lib/chat/route.ts) and the live chat (src/lib/livechat/handlers.ts); kept apart so neither pulls the other's
 * dependencies.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return isRequestHost(req, new URL(origin));
  } catch {
    return false;
  }
}
