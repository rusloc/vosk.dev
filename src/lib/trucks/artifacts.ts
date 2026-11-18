import { runArtifact, tableArtifacts } from "@/lib/report-data/artifacts";
import { FILES } from "./data/manifest";

// Artifact name → the query that reproduces that file from Supabase schema `trucks_demo` (2026-11-09: the pack's
// public/data moved into the database; the file names stayed the contract). The manifest plus whole tables, built from
// FILES by the shared src/lib/report-data/artifacts.ts; the server route (server.ts) and scripts/trucks-load.ts both
// build on it.

export { runArtifact };
export const { resolveArtifact, ARTIFACT_NAMES } = tableArtifacts(FILES);
