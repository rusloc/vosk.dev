import "server-only";
import { createReader } from "@/lib/report-data/reader";
import { resolveArtifact, runArtifact } from "./artifacts";

// The site's one connection to the ACME Marketing data: role `marketing_reader`, which can read schema `marketing_demo`
// and nothing else (data/marketing/sql/001-schema-and-roles.sql). The URL lives only in the server env
// (MARKETING_DATABASE_URL, **Session pooler, port 5432**). Pool, guards and reasons: src/lib/report-data/reader.ts.

/**
 * One artifact: the manifest as stored,
 * a table as columns (lib/marketing/data/loader.ts `columnsSource`).
 */
export const readArtifact = createReader({
  envVar: "MARKETING_DATABASE_URL",
  resolveArtifact,
  runArtifact,
  columns: true,
});
