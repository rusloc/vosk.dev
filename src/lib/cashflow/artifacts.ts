import { runArtifact, tableArtifacts } from "@/lib/report-data/artifacts";
import { FILES } from "./data/manifest";

// Artifact name → the query that reproduces that file from Supabase schema `cashflow_demo` (2026-11-26, owner: the
// report's data lives in Supabase like the other synthetic reports). The manifest plus whole tables, built from FILES by
// the shared src/lib/report-data/artifacts.ts; the server route (server.ts) and scripts/cashflow-load.ts build on it.

export { runArtifact };
export const { resolveArtifact, ARTIFACT_NAMES } = tableArtifacts(FILES);
