import { readArtifact } from "@/lib/mirelo/server";
import { artifactRoute } from "@/lib/report-data/route";

// The Mirelo sales report's data from Supabase (schema `mirelo_demo`); the handler is shared
// (src/lib/report-data/route.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A session reads ten base files and a few detail files per drill.
export const GET = artifactRoute({
  name: "mirelo",
  read: readArtifact,
  maxPerWindow: 600,
});
