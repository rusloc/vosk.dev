import { chatRoute } from "@/lib/chat/route";
import { createChatTools } from "@/lib/trucks/chat-tools";
import { columnsSource, createLoader } from "@/lib/trucks/data/loader";
import { addPlanWeek, createDataset } from "@/lib/trucks/engine/data";
import { readArtifact } from "@/lib/trucks/server";

/**
 * The ACME Trucks report's AI chat (ADR-0005, 2026-11-09): its closed tools over the full dataset (first paint and the
 * week plan), read through `trucks_reader` (the same data as /api/trucks). The limits, the streaming and the logging
 * are the shared chat route's (src/lib/chat/route.ts).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = chatRoute({
  name: "trucks",
  // the report state is its query string; `l` can list every loader
  maxState: 1600,
  load: async () => {
    const loader = createLoader(
      columnsSource(async (name) => {
        const r = await readArtifact(name);
        if (r.status !== 200)
          throw new Error(`trucks artifact ${name}: ${r.status}`);
        return r.body;
      }),
    );
    const ds = createDataset(await loader.core());
    addPlanWeek(ds, await loader.planWeek());
    return createChatTools(ds);
  },
});
