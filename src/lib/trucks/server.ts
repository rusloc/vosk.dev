import "server-only";
import postgres from "postgres";
import type { Sql } from "postgres";
import { resolveArtifact, runArtifact } from "./artifacts";
import { toColumns } from "./data/loader";

// The site's one connection to the ACME Trucks data: role `trucks_reader`, which can read schema
// `trucks_demo` and nothing else (data/trucks/sql/001-schema-and-roles.sql). The URL lives only in the server
// env (TRUCKS_DATABASE_URL, **Session pooler, port 5432**: the Transaction pooler stalls concurrent reads, found on
// Mirelo 2026-11-03, src/lib/mirelo/server.ts); this module never leaves the server bundle.
//
// Released when idle (2026-11-06, as Mirelo's): a Vercel instance is frozen between requests, so `idle_timeout` never
// fires and its connections stay open; enough frozen instances fill the role's connection limit and the next one (the
// chat route's, say) cannot connect. So the pool ends as soon as no read is in flight on this instance.

let client: Sql | undefined;
let reading = 0;

/** The reader connection, or null when TRUCKS_DATABASE_URL is unset (the route answers 503 instead of failing the build). */
function db(): Sql | null {
  const url = process.env.TRUCKS_DATABASE_URL;
  if (!url) return null;
  if (new URL(url).port === "6543")
    throw new Error(
      "TRUCKS_DATABASE_URL must use the Session pooler (port 5432): through the Transaction pooler concurrent reads stall",
    );
  return (client ??= postgres(url, {
    max: 2,
    ssl: "require",
    idle_timeout: 20,
    connect_timeout: 10,
  }));
}

export type ArtifactResult =
  { status: 200; body: unknown } | { status: 404 | 503 };

/** One artifact: the manifest as stored, a table as columns (lib/trucks/data/loader.ts `columnsSource`). */
export async function readArtifact(name: string): Promise<ArtifactResult> {
  const query = resolveArtifact(name);
  if (!query) return { status: 404 };
  const sql = db();
  if (!sql) return { status: 503 };
  reading++;
  try {
    const body = await runArtifact(sql, query);
    return {
      status: 200,
      body:
        query.kind === "rows"
          ? toColumns(body as Record<string, unknown>[], query.columns)
          : body,
    };
  } finally {
    if (--reading === 0) {
      client = undefined; // a read that starts now opens a new pool
      await sql.end({ timeout: 5 });
    }
  }
}
