import { chatRoute } from "@/lib/chat/route";
import { createChatTools } from "@/lib/pnl/chat-tools";
import { columnsSource } from "@/lib/pnl/data/columns-loader";
import { createDatasetLoader } from "@/lib/pnl/data/dataset";
import { readArtifact } from "@/lib/pnl/server";

/**
 * The P&L report's AI chat (ADR-0005, 2026-11-09): its closed tools and metric catalogue over an engine built from
 * `pnl_reader` (the same chunks as /api/pnl), both companies loaded once per instance. The limits, the streaming and
 * the logging are the shared chat route's (src/lib/chat/route.ts). The report state is the P&L's query string
 * (selection-schema.ts), longer than the other reports'.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = chatRoute({
  name: "pnl",
  maxState: 600,
  load: async () => {
    const loader = createDatasetLoader(
      columnsSource(async (name) => {
        const r = await readArtifact(name);
        if (r.status !== 200)
          throw new Error(`pnl artifact ${name}: ${r.status}`);
        return r.body;
      }),
    );
    return createChatTools(await loader.load(["P", "S"]));
  },
});
