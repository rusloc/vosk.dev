import type { Sql, TransactionSql } from "postgres";
import { FILES } from "./data/manifest";

// Artifact name → the query that reproduces that file from Supabase schema `marketing_demo` (2026-11-05: the pack's
// public/data moved into the database; the file names stayed the contract between the browser and its source, so the
// loader and the engine did not change shape). Pure, framework-free: the server route (server.ts) and the load
// script's verification (scripts/marketing-load.ts) both build on it. Tables and columns come from FILES, never from
// the request; every artifact is a whole table in file order (`seq`). The Mirelo pattern, without the detail files.

/** A connection or a transaction handle: both run the same tagged templates. */
export type Db = Sql | TransactionSql;

export type ArtifactQuery =
  | { kind: "document"; name: string }
  | { kind: "rows"; table: string; columns: readonly string[] };

/** `campaign-day.parquet` → table `campaign_day`. */
export const tableOf = (file: string) =>
  file.replace(/\.parquet$/, "").replace(/-/g, "_");

const TABLES = new Map<string, { table: string; columns: string[] }>(
  Object.values(FILES).map((f) => [
    f.file,
    { table: tableOf(f.file), columns: Object.keys(f.columns) },
  ]),
);

/** The query for one artifact name, or null when the report never reads that name (the route answers 404). */
export function resolveArtifact(name: string): ArtifactQuery | null {
  if (name === "manifest.json") return { kind: "document", name };
  const t = TABLES.get(name);
  return t ? { kind: "rows", ...t } : null;
}

/** Every artifact name the report can ask for (the load script verifies them all). */
export const ARTIFACT_NAMES: readonly string[] = [
  "manifest.json",
  ...Object.values(FILES).map((f) => f.file),
];

/**
 * Runs one artifact query on a connection whose role has `search_path = marketing_demo` (both roles do, at login).
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
