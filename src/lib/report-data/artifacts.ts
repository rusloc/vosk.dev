import type { Sql, TransactionSql } from "postgres";

// Artifact name → the query that reproduces that file from a report's Supabase schema, for the reports whose artifacts
// are the manifest plus whole tables (ACME Marketing 2026-11-05, ACME Trucks 2026-11-09, Nordmark 2026-11-15): the
// pack's public/data moved into the database and the file names stayed the contract between the browser and its source,
// so the loader and the engine did not change shape. Pure, framework-free: the server route (reader.ts) and the load
// scripts' verification (scripts/lib/load-report.ts) both build on it. Tables and columns come from the report's FILES,
// never from the request; every artifact is a whole table in file order (`seq`). The Mirelo pattern, without the
// detail files (Mirelo and the P&L keep their own artifacts.ts).

/** A connection or a transaction handle: both run the same tagged templates. */
export type Db = Sql | TransactionSql;

export type ArtifactQuery =
  | { kind: "document"; name: string }
  | { kind: "rows"; table: string; columns: readonly string[] };

/** `campaign-day.parquet` → table `campaign_day`. */
export const tableOf = (file: string) =>
  file.replace(/\.parquet$/, "").replace(/-/g, "_");

/** A report's FILES entry as this module sees it: the file name and its column spec (only the keys matter). */
interface FileSpec {
  file: string;
  columns: Readonly<Record<string, unknown>>;
}

/**
 * Runs one artifact query on a connection whose role has `search_path = <report>_demo` (both roles do, at login).
 * The document comes back as the stored JSON; a table as plain row objects in spec column order.
 */
export async function runArtifact(sql: Db, q: ArtifactQuery): Promise<unknown> {
  if (q.kind === "document") {
    const rows = await sql<
      { doc: unknown }[]
    >`select doc from document where name = ${q.name}`;
    const doc = rows[0]?.doc;
    if (doc === undefined) throw new Error(`${q.name}: not loaded`);
    return doc;
  }
  const rows =
    await sql`select ${sql([...q.columns])} from ${sql(q.table)} order by seq`;
  return [...rows];
}

/** A report's artifacts, from its FILES: what the route resolves, and every name the load script verifies. */
export function tableArtifacts(files: Readonly<Record<string, FileSpec>>): {
  resolveArtifact(name: string): ArtifactQuery | null;
  ARTIFACT_NAMES: readonly string[];
} {
  const tables = new Map<string, { table: string; columns: string[] }>(
    Object.values(files).map((f) => [
      f.file,
      { table: tableOf(f.file), columns: Object.keys(f.columns) },
    ]),
  );
  return {
    /** The query for one artifact name, or null when the report never reads that name (the route answers 404). */
    resolveArtifact(name) {
      if (name === "manifest.json") return { kind: "document", name };
      const t = tables.get(name);
      return t ? { kind: "rows", ...t } : null;
    },
    ARTIFACT_NAMES: [
      "manifest.json",
      ...Object.values(files).map((f) => f.file),
    ],
  };
}
