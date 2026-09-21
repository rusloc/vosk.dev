import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";

/**
 * Cube Cloud client for the online-sales showcase (docs/08-cube-sales-showcase.md §3).
 *
 * Server-only by construction, and unlike lib/superset.ts there is no route in front of
 * it: a Cube JWT grants the WHOLE data model, not one dashboard, so the token is minted
 * here, used here, and never leaves the server. The ISR page calls this at revalidation
 * time and hands plain rows to the client component.
 *
 * Transport is the SQL API over HTTP (`POST …/cubejs-api/v1/cubesql`), which answers in
 * newline-delimited JSON: one `{"schema":[…]}` line, then `{"data":[[…]]}` chunks, or an
 * `{"error":"…"}` line in place of either.
 *
 * Checked against the live Free-tier deployment on 2026-09-22: `/cubesql` is enabled, the
 * raw-token `Authorization` form is right, and columns come back typed `Timestamp` /
 * `String` / `Double` / `Int64` with numbers as strings. Not yet observed: what a deployment
 * waking from suspension answers. Everything still open is asserted rather than assumed, so
 * a wrong guess fails loudly.
 */
const TOKEN_TTL_S = 5 * 60;

// Cube's free tier suspends after 30 idle minutes and the first request after wake is
// slow — hence a generous timeout and exactly one retry.
const TIMEOUT_MS = 60_000;

export type CubeValue = string | number | boolean | null;
export type CubeRow = Record<string, CubeValue>;

/**
 * Validated here, not in lib/env.ts. That module is reachable from client components, and
 * — as with the SUPERSET_SVC_* credentials — a server secret's schema has no business in a
 * client chunk, even when its value never gets there. Both optional: when either is unset
 * the showcase is hidden (`isCubeConfigured`) and the build passes.
 *
 * CUBE_API_URL is pasted exactly as Cube Cloud displays it, ending in `/cubejs-api/v1`; a
 * trailing slash is dropped so `${url}/cubesql` never becomes `//cubesql`.
 */
const cubeEnv = z
  .object({
    CUBE_API_URL: z
      .url()
      .transform((url) => url.replace(/\/+$/, ""))
      .optional(),
    CUBE_API_SECRET: z.string().min(1).optional(),
  })
  .parse({
    // `|| undefined`: an empty string (`CUBE_API_URL=` in a .env, a blank dashboard field)
    // must read as unset. `.optional()` alone lets `""` through to the inner check, which
    // then fails the build over a var nobody set.
    CUBE_API_URL: process.env.CUBE_API_URL || undefined,
    CUBE_API_SECRET: process.env.CUBE_API_SECRET || undefined,
  });

export function isCubeConfigured(): boolean {
  return !!cubeEnv.CUBE_API_URL && !!cubeEnv.CUBE_API_SECRET;
}

function cubeConfig(): { url: string; secret: string } {
  const { CUBE_API_URL: url, CUBE_API_SECRET: secret } = cubeEnv;
  if (!url || !secret) {
    throw new Error(
      "Cube is not configured: set CUBE_API_URL and CUBE_API_SECRET",
    );
  }
  return { url, secret };
}

const base64url = (value: string) => Buffer.from(value).toString("base64url");

/**
 * HS256 JWT via node:crypto — two JSON blobs and an HMAC do not justify a JWT library.
 * The payload carries no claims: Cube's default auth only verifies signature and expiry.
 */
export function mintCubeToken(): string {
  const { secret } = cubeConfig();
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    base64url(JSON.stringify({ iat, exp: iat + TOKEN_TTL_S })),
  ].join(".");
  const signature = createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64url");
  return `${unsigned}.${signature}`;
}

// The ENVELOPE of a line is deliberately not strict. The error arm throws either way, and an
// extra field must not turn Cube's own message into a generic "unrecognised line". The
// schema line really does carry more than `schema` — the live deployment sends
// `"lastRefreshTime"` beside it (observed 2026-09-22) — and refusing a line over envelope
// metadata would fail every build for a field that is not data.
//
// The same goes one level down. A column descriptor gains `format` (and `currency`) whenever
// the member declares one — `format: currency` on `revenue` in cube/model/sales.yml put
// `"format":"currency"` on every query's schema line, and a strict descriptor failed the
// build over it (2026-09-22). That is presentation metadata: the parser reads `name` and
// `column_type`, both still required, and zod strips the rest. What IS data stays pinned:
// every row in lib/sales-dashboard.ts.
const lineSchema = z.union([
  z.object({ error: z.string() }),
  z.object({
    schema: z.array(z.object({ name: z.string(), column_type: z.string() })),
  }),
  z.object({ data: z.array(z.array(z.unknown())) }),
]);

// Anchored with a trailing `\b` so `Interval(…)` does not pass for an `Int`.
const NUMERIC_TYPE =
  /^(u?(big|small|tiny)?int(eger)?\d*|float\d*|double|decimal|numeric|real)\b/i;
const BOOLEAN_TYPE = /^bool/i;

function castValue(value: unknown, column: string, type: string): CubeValue {
  if (value === null) return null;
  const fail = () =>
    new Error(
      `Cube column "${column}" (${type}): cannot cast ${JSON.stringify(value)}`,
    );

  if (NUMERIC_TYPE.test(type)) {
    // Numbers arrive as strings; every amount here is far below Number.MAX_SAFE_INTEGER.
    // `Number("")` is 0, hence the blank check — an empty cell is an error, not a zero.
    const parsed =
      typeof value === "string" && value.trim() ? Number(value) : value;
    if (typeof parsed !== "number" || !Number.isFinite(parsed)) throw fail();
    return parsed;
  }
  if (BOOLEAN_TYPE.test(type)) {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "false") return value === "true";
    throw fail();
  }
  // Timestamps and strings stay strings — no Date, so no timezone can creep in.
  if (typeof value === "object") throw fail();
  return String(value);
}

/** Pure NDJSON → rows keyed by column name, cast by the `column_type` of the schema line. */
export function parseCubeSqlResponse(text: string): CubeRow[] {
  let columns: { name: string; column_type: string }[] | undefined;
  const rows: CubeRow[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;

    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      throw new Error(`Cube response is not JSON: ${line.slice(0, 200)}`);
    }
    const parsed = lineSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Unrecognised Cube response line: ${line.slice(0, 200)}`);
    }
    const message = parsed.data;

    if ("error" in message) throw new Error(`Cube SQL error: ${message.error}`);
    if ("schema" in message) {
      columns = message.schema;
      continue;
    }
    if (!columns) throw new Error("Cube response has data before its schema");

    for (const values of message.data) {
      if (values.length !== columns.length) {
        throw new Error(
          `Cube row has ${values.length} values for ${columns.length} columns`,
        );
      }
      const row: CubeRow = {};
      columns.forEach(({ name, column_type }, i) => {
        row[name] = castValue(values[i], name, column_type);
      });
      rows.push(row);
    }
  }

  if (!columns) throw new Error("Cube response has no schema line");
  return rows;
}

class CubeHttpError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`Cube responded ${status}: ${body.slice(0, 300)}`);
  }
}

async function post(url: string, query: string): Promise<string> {
  const res = await fetch(`${url}/cubesql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Cube's documented form is the raw token — no "Bearer" prefix.
      Authorization: mintCubeToken(),
    },
    body: JSON.stringify({ query }),
    // No `cache` option, ON PURPOSE — do not "tidy" this into `cache: "no-store"`. An
    // explicit no-store gives the fetch `revalidate: 0`, which Next counts as dynamic usage
    // and answers by de-opting the calling ISR page to per-request rendering
    // (next/dist/server/lib/patch-fetch.js → markCurrentScopeAsDynamic): every visitor
    // would then run four Cube queries, which is the one thing docs/08 §3 rules out.
    // Left unset, a POST with an Authorization header is "auto no cache" — fetched fresh
    // on each revalidation, not stored, and the page's own `revalidate` stays in charge.
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // Read inside the attempt: the timeout also covers a body that stalls mid-stream.
  const text = await res.text();
  if (!res.ok) throw new CubeHttpError(res.status, text);
  return text;
}

/** Runs one SQL API query and returns its rows. Throws on any failure — never partial data. */
export async function cubeSql(query: string): Promise<CubeRow[]> {
  const { url } = cubeConfig();

  let text: string;
  try {
    text = await post(url, query);
  } catch (error) {
    // A 4xx is ours — bad SQL, bad token — and a second try cannot fix it. Anything else
    // (network error, timeout, 5xx) is what a waking deployment looks like: retry once.
    if (error instanceof CubeHttpError && error.status < 500) throw error;
    text = await post(url, query);
  }
  // Parsed outside the retry: an `{"error":…}` line or a malformed body is deterministic.
  return parseCubeSqlResponse(text);
}
