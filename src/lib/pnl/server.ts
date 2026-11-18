import "server-only";
import { createReader } from "@/lib/report-data/reader";
import { resolveArtifact, runArtifact } from "./artifacts";

// The site's one connection to the P&L data: role `pnl_reader`, which can read schema `pnl_demo`
// and nothing else (data/pnl/sql/001-schema-and-roles.sql). The URL lives only in the server env
// (PNL_DATABASE_URL, **Session pooler, port 5432**). Pool, guards and reasons: src/lib/report-data/reader.ts.

/**
 * One artifact: the manifest as stored,
 * a chunk or ops as columns (lib/pnl/data/columns-loader.ts `columnsSource`).
 */
export const readArtifact = createReader({
  envVar: "PNL_DATABASE_URL",
  resolveArtifact,
  runArtifact,
  columns: true,
});
