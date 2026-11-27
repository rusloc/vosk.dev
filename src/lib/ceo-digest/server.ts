import "server-only";
import postgres from "postgres";
import type { Sql } from "postgres";
import * as q from "./queries";
import type { DigestData, SqlTag } from "./queries";

// The site's one connection to the Tidewell data: role `ceo_digest_reader`, which can read schema `ceo_digest_demo`
// and run its functions, and nothing else (data/ceo-digest/sql/001-schema-and-roles.sql). The URL lives only in the
// server env (CEO_DIGEST_DATABASE_URL, **Session pooler, port 5432**: the Transaction pooler stalls concurrent reads,
// found on Mirelo 2026-11-03, src/lib/mirelo/server.ts); this module never leaves the server bundle.
//
// Released when idle, as the report readers are (src/lib/trucks/server.ts): a Vercel instance is frozen between
// requests, so `idle_timeout` never fires and its connections stay open; the pool ends as soon as no read is in
// flight on this instance.

let client: Sql | undefined;
let reading = 0;

function db(): Sql {
  const url = process.env.CEO_DIGEST_DATABASE_URL;
  if (!url) throw new Error("CEO_DIGEST_DATABASE_URL is not set");
  if (new URL(url).port === "6543")
    throw new Error(
      "CEO_DIGEST_DATABASE_URL must use the Session pooler (port 5432): through the Transaction pooler concurrent reads stall",
    );
  return (client ??= postgres(url, {
    max: 2,
    ssl: "require",
    idle_timeout: 20,
    connect_timeout: 10,
  }));
}

async function read<T>(run: (sql: SqlTag) => Promise<T>): Promise<T> {
  const sql = db();
  reading++;
  try {
    // the client's tagged template, narrowed to the one call shape the wrappers use
    return await run((strings, ...values) => sql(strings, ...values));
  } finally {
    if (--reading === 0) {
      client = undefined; // a read that starts now opens a new pool
      await sql.end({ timeout: 5 });
    }
  }
}

/** The contract's functions over the reader connection: one short read each. */
export const digestData: DigestData = {
  meta: () => read((sql) => q.meta(sql)),
  marketingByChannel: (from, to) =>
    read((sql) => q.marketingByChannel(sql, from, to)),
  marketingByWeek: (from, to) =>
    read((sql) => q.marketingByWeek(sql, from, to)),
  cashByCategory: (from, to) => read((sql) => q.cashByCategory(sql, from, to)),
  cashByWeek: (from, to) => read((sql) => q.cashByWeek(sql, from, to)),
  customersByPlan: (asOf) => read((sql) => q.customersByPlan(sql, asOf)),
  customerSearch: (query, limit) =>
    read((sql) => q.customerSearch(sql, query, limit)),
  topCustomers: (order, limit) =>
    read((sql) => q.topCustomers(sql, order, limit)),
  topCustomersPeriod: (from, to, metric, limit) =>
    read((sql) => q.topCustomersPeriod(sql, from, to, metric, limit)),
};
