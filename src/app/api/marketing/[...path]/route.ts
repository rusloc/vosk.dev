import { readArtifact } from "@/lib/marketing/server";
import { artifactRoute } from "@/lib/report-data/route";

// The ACME Marketing report's data from Supabase (schema `marketing_demo`); the handler is shared
// (src/lib/report-data/route.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A session reads eight artifacts at most (manifest, three on first paint, four lazy).
export const GET = artifactRoute({
  name: "marketing",
  read: readArtifact,
  maxPerWindow: 200,
});
