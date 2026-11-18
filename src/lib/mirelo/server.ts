import "server-only";
import { createReader } from "@/lib/report-data/reader";
import { resolveArtifact, runArtifact } from "./artifacts";

// The site's one connection to the Mirelo data: role `mirelo_reader`, which can read schema `mirelo_demo`
// and nothing else (data/mirelo/sql/001-schema-and-roles.sql). The URL lives only in the server env
// (MIRELO_DATABASE_URL, **Session pooler, port 5432**). Pool, guards and reasons: src/lib/report-data/reader.ts.

/**
 * One artifact: the manifest as stored,
 * a table as rows (lib/mirelo/data.ts `jsonSource`).
 */
export const readArtifact = createReader({
  envVar: "MIRELO_DATABASE_URL",
  resolveArtifact,
  runArtifact,
  columns: false,
});
