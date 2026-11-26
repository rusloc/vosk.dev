import "server-only";
import { createReader } from "@/lib/report-data/reader";
import { resolveArtifact, runArtifact } from "./artifacts";

// The site's one connection to the ACME Cash Flow data: role `cashflow_reader`, which can read schema `cashflow_demo`
// and nothing else (data/cashflow/sql/001-schema-and-roles.sql). The URL lives only in the server env
// (CASHFLOW_DATABASE_URL, **Session pooler, port 5432**). Pool, guards and reasons: src/lib/report-data/reader.ts.

/** One artifact: the manifest as stored, a table as columns (lib/cashflow/data/loader.ts `columnsSource`). */
export const readArtifact = createReader({
  envVar: "CASHFLOW_DATABASE_URL",
  resolveArtifact,
  runArtifact,
  columns: true,
});
