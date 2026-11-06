import { chatRoute } from "@/lib/chat/route";
import { createChatTools } from "@/lib/marketing/chat-tools";
import { columnsSource, createLoader } from "@/lib/marketing/data/loader";
import {
  addJourney,
  addTerms,
  createDataset,
} from "@/lib/marketing/engine/data";
import { readArtifact } from "@/lib/marketing/server";

/**
 * The ACME Marketing report's AI chat (ADR-0005, 11-06): its closed tools over the full dataset (first paint, Journey
 * and Campaigns files), read through `marketing_reader` (the same data as /api/marketing). The limits, the streaming
 * and the logging are the shared chat route's (src/lib/chat/route.ts).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = chatRoute({
  name: "marketing",
  // the report state is "<query>#<view>": up to 18 keys, a campaign list among them
  maxState: 1200,
  load: async () => {
    const loader = createLoader(
      columnsSource(async (name) => {
        const r = await readArtifact(name);
        if (r.status !== 200)
          throw new Error(`marketing artifact ${name}: ${r.status}`);
        return r.body;
      }),
    );
    const ds = createDataset(await loader.core());
    addJourney(ds, await loader.journey());
    addTerms(ds, await loader.campaigns());
    return createChatTools(ds);
  },
});
