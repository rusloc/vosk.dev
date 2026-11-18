import "server-only";
import postgres from "postgres";
import type { Sql } from "postgres";
import { toColumns } from "./columns";

// A report's one connection to its data: role `<report>_reader`, which can read schema `<report>_demo` and nothing
// else (data/<report>/sql/001-schema-and-roles.sql). The URL lives only in the server env (`<REPORT>_DATABASE_URL`,
// **Session pooler, port 5432**); this module never leaves the server bundle.
//
// Why the Session pooler (Mirelo, 2026-11-03): through the Transaction pooler (6543) this driver's concurrent reads
// stall, even on one connection, and a reply can land on another request (the browser asks for seven files at once and
// got the wrong columns for one). Session mode answered the same ten concurrent reads in ~1.2 s with no mismatch. A
// small pool with a short idle timeout keeps the backend count low; the role's connection limit is the ceiling.
//
// Released when idle (2026-11-06): a Vercel instance is frozen between requests, so `idle_timeout` never fires and its
// connections stay open. One Mirelo visit (seven files at once, spread over several instances) held all 10 of the
// role's slots for minutes, and the chat route could not connect ("too many connections for role"). So the pool ends
// as soon as no read is in flight on this instance; the next burst opens a fresh one.

export type ArtifactResult =
  { status: 200; body: unknown } | { status: 404 | 503 };

/** A report's query: a stored document, or rows (with the columns they are sent as, for a columnar report). */
type Query =
  | { kind: "document"; name: string }
  | { kind: string; columns: readonly string[] };

/**
 * The `readArtifact` of one report: resolves a name to a query (404 when the report never reads it), runs it on the
 * reader connection (503 when `envVar` is unset, instead of failing the build) and answers with the manifest as stored,
 * and a table as rows or, when `columns`, as columns (src/lib/report-data/columns.ts `columnsSource`).
 */
export function createReader<Q extends Query>({
  envVar,
  resolveArtifact,
  runArtifact,
  columns,
}: {
  envVar: string;
  resolveArtifact: (name: string) => Q | null;
  runArtifact: (sql: Sql, query: Q) => Promise<unknown>;
  columns: boolean;
}): (name: string) => Promise<ArtifactResult> {
  let client: Sql | undefined;
  let reading = 0;

  /** The reader connection, or null when the URL is unset. */
  function db(): Sql | null {
    const url = process.env[envVar];
    if (!url) return null;
    if (new URL(url).port === "6543")
      throw new Error(
        `${envVar} must use the Session pooler (port 5432): through the Transaction pooler concurrent reads stall`,
      );
    return (client ??= postgres(url, {
      max: 2,
      ssl: "require",
      idle_timeout: 20,
      connect_timeout: 10,
    }));
  }

  return async function readArtifact(name) {
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
          columns && "columns" in query
            ? toColumns(body as Record<string, unknown>[], query.columns)
            : body,
      };
    } finally {
      if (--reading === 0) {
        client = undefined; // a read that starts now opens a new pool
        await sql.end({ timeout: 5 });
      }
    }
  };
}
