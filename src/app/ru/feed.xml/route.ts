import { buildFeed } from "@/lib/feed";

// Russian feed. See src/app/feed.xml/route.ts for why this is a literal route.
export const dynamic = "force-static";

export function GET(): Response {
  return buildFeed("ru");
}
