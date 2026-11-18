import {
  ARTIFACT_NAMES,
  resolveArtifact,
  runArtifact,
} from "@/lib/trucks/artifacts";
import { FILES, manifestSchema } from "@/lib/trucks/data/manifest";
import { checkRows, readRows } from "@/lib/trucks/data/parquet-columns";
import { loadTableReport } from "./lib/load-report";

// Loads data/trucks/parquet (the pack's public/data, 2026-11-09) into Supabase schema `trucks_demo`, then verifies
// every artifact the server route serves against the Parquet it replaces: same rows, same values, same order, and the
// same rows again after the route's columnar round trip. Run from the owner's machine only, as trucks_loader (Session
// pooler):
//
//     node --env-file=.env.local --import tsx scripts/trucks-load.ts            # truncate, load, verify
//     node --env-file=.env.local --import tsx scripts/trucks-load.ts --verify   # verify only
//
// Node reads .env.local; this script never prints a value from it. Nothing here runs in the site. The body is shared
// with the other table reports' loaders (scripts/lib/load-report.ts).

loadTableReport({
  dir: new URL("../data/trucks/parquet/", import.meta.url),
  envVar: "TRUCKS_LOAD_DATABASE_URL",
  files: FILES,
  manifestSchema,
  artifacts: { ARTIFACT_NAMES, resolveArtifact, runArtifact },
  codec: { readRows, checkRows },
});
