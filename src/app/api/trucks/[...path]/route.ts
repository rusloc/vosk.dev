import { readArtifact } from "@/lib/trucks/server";
import { artifactRoute } from "@/lib/report-data/route";

// The ACME Trucks report's data from Supabase (schema `trucks_demo`); the handler is shared
// (src/lib/report-data/route.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A session reads five artifacts at most (manifest, three on first paint, the week plan on demand).
export const GET = artifactRoute({
  name: "trucks",
  read: readArtifact,
  maxPerWindow: 200,
});
