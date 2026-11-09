import type { Sql, TransactionSql } from "postgres";
import {
  OPS_COLUMNS,
  OPS_NAME,
  PL_COLUMNS,
  parsePlChunkName,
} from "./data/columns-loader";

// Artifact name → the query that reproduces it from Supabase schema `pnl_demo` (2026-11-09: the P&L's rows moved
// out of public/data/pnl into the database, as Mirelo's and ACME Marketing's did). Pure, framework-free: the
// server route (server.ts) and the load script's verification (scripts/pnl-load.ts) both build on it. Tables and
// columns come from our own specs (columns-loader.ts), never from the request; the request contributes only a
// validated version index and month range (one chunk of one entity's rows), and rows keep the file order in `seq`.

/** A connection or a transaction handle: both run the same tagged templates. */
export type Db = Sql | TransactionSql;

export type ArtifactQuery =
  | { kind: "document"; name: string }
  | {
      kind: "pl";
      table: "pl_p" | "pl_s";
      columns: readonly string[];
      version: number;
      from: number;
      to: number;
    }
  | { kind: "ops"; table: "ops"; columns: readonly string[] };

/** The query for one artifact name, or null when the report never reads that name (the route answers 404). */
export function resolveArtifact(name: string): ArtifactQuery | null {
  if (name === "manifest.json") return { kind: "document", name };
  if (name === OPS_NAME)
    return { kind: "ops", table: "ops", columns: OPS_COLUMNS };
  const chunk = parsePlChunkName(name);
  if (!chunk) return null;
  return {
    kind: "pl",
    table: chunk.entity === "P" ? "pl_p" : "pl_s",
    columns: PL_COLUMNS,
    version: chunk.version,
    from: chunk.from,
    to: chunk.to,
  };
}

/**
 * Runs one artifact query on a connection whose role has `search_path = pnl_demo` (both roles do, at login).
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
  if (q.kind === "ops")
    return [
      ...(await sql`select ${sql([...q.columns])} from ${sql(q.table)} order by seq`),
    ];
  return [
    ...(await sql`select ${sql([...q.columns])} from ${sql(q.table)}
      where version = ${q.version} and month_idx between ${q.from} and ${q.to}
      order by seq`),
  ];
}
