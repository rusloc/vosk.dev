import { buildFeed } from "@/lib/feed";

// English feed at the canonical unprefixed URL. Russian lives at /ru/feed.xml —
// two literal routes rather than one under [locale], which would also mint an
// /en/feed.xml duplicate that the proxy can't redirect away (the matcher skips
// anything with a dot).
export const dynamic = "force-static";

export function GET(): Response {
  return buildFeed("en");
}
