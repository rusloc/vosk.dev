import {
  ARTIFACT_NAMES,
  resolveArtifact,
  runArtifact,
} from "@/lib/cashflow/artifacts";
import { FILES, manifestSchema } from "@/lib/cashflow/data/manifest";
import { checkRows, readRows } from "@/lib/cashflow/data/parquet-columns";
import { loadTableReport } from "./lib/load-report";

// Loads data/cashflow/parquet (scripts/cashflow-build.ts, 2026-11-26) into Supabase schema `cashflow_demo`, then
// verifies every artifact the server route serves against the Parquet it replaces: same rows, same values, same order,
// and the same rows again after the route's columnar round trip. Run from the owner's machine only, as cashflow_loader
// (Session pooler):
//
//     node --env-file=.env.local --import tsx scripts/cashflow-load.ts            # truncate, load, verify
//     node --env-file=.env.local --import tsx scripts/cashflow-load.ts --verify   # verify only
//
// Node reads .env.local; this script never prints a value from it. Nothing here runs in the site. The body is shared
// with the other table reports' loaders (scripts/lib/load-report.ts).

loadTableReport({
  dir: new URL("../data/cashflow/parquet/", import.meta.url),
  envVar: "CASHFLOW_LOAD_DATABASE_URL",
  files: FILES,
  manifestSchema,
  artifacts: { ARTIFACT_NAMES, resolveArtifact, runArtifact },
  codec: { readRows, checkRows },
});
