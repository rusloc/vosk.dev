import { readArtifact } from "@/lib/pnl/server";
import { artifactRoute } from "@/lib/report-data/route";

// The P&L report's data from Supabase (schema `pnl_demo`); the handler is shared (src/lib/report-data/route.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A session reads the manifest, up to nine chunks per entity and ops.
export const GET = artifactRoute({
  name: "pnl",
  read: readArtifact,
  maxPerWindow: 600,
});
