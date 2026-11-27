import "server-only";
import postgres from "postgres";
import type { Sql } from "postgres";

// The chat's one connection: role `livechat_app`, which reads and writes schema `livechat` and nothing else
// (data/livechat/sql/001-schema-and-roles.sql). The URL lives only in the server env (LIVECHAT_DATABASE_URL, **Session
// pooler, port 5432**), for the reasons src/lib/report-data/reader.ts gives: through the Transaction pooler this
// driver's concurrent queries stall, and the topic guard holds a row lock in a transaction, which needs a session.
//
// Released when idle, as the readers are (2026-11-06): a Vercel instance is frozen between requests and its connections
// would stay open, so the pool ends as soon as no request is in flight on this instance. The role allows 10.

let client: Sql | undefined;
let inFlight = 0;

function open(url: string): Sql {
  if (new URL(url).port === "6543")
    throw new Error(
      "LIVECHAT_DATABASE_URL must use the Session pooler (port 5432): through the Transaction pooler concurrent queries stall",
    );
  return (client ??= postgres(url, {
    max: 2,
    ssl: "require",
    idle_timeout: 20,
    connect_timeout: 10,
    // int8 (the message ids, Telegram's thread and message ids) as a number: all stay far below 2^53.
    types: {
      bigint: {
        to: 20,
        from: [20],
        serialize: (x: number) => String(x),
        parse: (x: string) => Number(x),
      },
    },
  }));
}

/** Runs `fn` on the chat's connection; the pool ends when the last request in flight on this instance is done. */
export async function withDb<T>(
  url: string,
  fn: (sql: Sql) => Promise<T>,
): Promise<T> {
  const sql = open(url);
  inFlight++;
  try {
    return await fn(sql);
  } finally {
    if (--inFlight === 0) {
      client = undefined; // a request that starts now opens a new pool
      await sql.end({ timeout: 5 });
    }
  }
}
