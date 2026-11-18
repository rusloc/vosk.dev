import {
  ARTIFACT_NAMES,
  resolveArtifact,
  runArtifact,
} from "@/lib/marketing/artifacts";
import { FILES, manifestSchema } from "@/lib/marketing/data/manifest";
import { checkRows, readRows } from "@/lib/marketing/data/parquet-columns";
import { loadTableReport } from "./lib/load-report";

// Loads data/marketing/parquet (the pack's public/data, 2026-11-05) into Supabase schema `marketing_demo`, then
// verifies every artifact the server route serves against the Parquet it replaces: same rows, same values, same order,
// and the same rows again after the route's columnar round trip. Run from the owner's machine only, as marketing_loader
// (Session pooler):
//
//     node --env-file=.env.local --import tsx scripts/marketing-load.ts            # truncate, load, verify
//     node --env-file=.env.local --import tsx scripts/marketing-load.ts --verify   # verify only
//
// Node reads .env.local; this script never prints a value from it. Nothing here runs in the site. The body is shared
// with the other table reports' loaders (scripts/lib/load-report.ts).

loadTableReport({
  dir: new URL("../data/marketing/parquet/", import.meta.url),
  envVar: "MARKETING_LOAD_DATABASE_URL",
  files: FILES,
  manifestSchema,
  artifacts: { ARTIFACT_NAMES, resolveArtifact, runArtifact },
  codec: { readRows, checkRows },
});
