import "server-only";
import postgres from "postgres";
import type { Sql } from "postgres";
import { resolveArtifact, runArtifact } from "./artifacts";
import { toColumns } from "./data/loader";

// The site's one connection to the ACME Marketing data: role `marketing_reader`, which can read schema
// `marketing_demo` and nothing else (data/marketing/sql/001-schema-and-roles.sql). The URL lives only in the server
// env (MARKETING_DATABASE_URL, **Session pooler, port 5432**: the Transaction pooler stalls concurrent reads, found on
// Mirelo 2026-11-03, src/lib/mirelo/server.ts); this module never leaves the server bundle.

let client: Sql | undefined;

/** The reader connection, or null when MARKETING_DATABASE_URL is unset (the route answers 503 instead of failing the build). */
function db(): Sql | null {
  const url = process.env.MARKETING_DATABASE_URL;
  if (!url) return null;
  if (new URL(url).port === "6543")
    throw new Error(
      "MARKETING_DATABASE_URL must use the Session pooler (port 5432): through the Transaction pooler concurrent reads stall",
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

/** One artifact: the manifest as stored, a table as columns (lib/marketing/data/loader.ts `columnsSource`). */
export async function readArtifact(name: string): Promise<ArtifactResult> {
  const query = resolveArtifact(name);
  if (!query) return { status: 404 };
  const sql = db();
  if (!sql) return { status: 503 };
  const body = await runArtifact(sql, query);
  return {
    status: 200,
    body:
      query.kind === "rows"
        ? toColumns(body as Record<string, unknown>[], query.columns)
        : body,
  };
}
