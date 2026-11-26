import { readArtifact } from "@/lib/cashflow/server";
import { artifactRoute } from "@/lib/report-data/route";

// The ACME Cash Flow report's data from Supabase (schema `cashflow_demo`); the handler is shared
// (src/lib/report-data/route.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A session reads five artifacts, all at first paint (manifest, month, statement-month, ledger, control).
export const GET = artifactRoute({
  name: "cashflow",
  read: readArtifact,
  maxPerWindow: 200,
});
