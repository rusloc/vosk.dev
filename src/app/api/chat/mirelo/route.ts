import { chatRoute } from "@/lib/chat/route";
import { createChatTools } from "@/lib/mirelo/chat-tools";
import { createSalesLoader, jsonSource } from "@/lib/mirelo/data";
import { createSalesEngine } from "@/lib/mirelo/index";
import { readArtifact } from "@/lib/mirelo/server";

/**
 * The Mirelo report's AI chat (ADR-0005): its closed tools over an engine built from `mirelo_reader` (the same data
 * as /api/mirelo). The limits, the streaming and the logging are the shared chat route's (src/lib/chat/route.ts).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = chatRoute({
  name: "mirelo",
  maxState: 400,
  load: async () => {
    const loader = createSalesLoader(
      jsonSource(async (name) => {
        const r = await readArtifact(name);
        if (r.status !== 200)
          throw new Error(`mirelo artifact ${name}: ${r.status}`);
        return r.body;
      }),
    );
    return createChatTools(createSalesEngine(await loader.base()));
  },
});
