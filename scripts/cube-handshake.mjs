#!/usr/bin/env node
/**
 * Cube handshake harness — proves the deployment, the secret and the model outside the app.
 *
 * When the sales showcase fails to build, the question is "is Cube wrong, or is my Next.js
 * code wrong?". This answers the first half in one command, with no Next.js involved: mint
 * a token exactly as lib/cube.ts does, ask the REST API and the SQL API for two figures
 * known to the cent, print what came back.
 *
 *   node scripts/cube-handshake.mjs
 *
 * Reads CUBE_API_URL and CUBE_API_SECRET from the environment (or .env.local, which it
 * parses directly — this runs outside Next.js, so nothing loads that file for us).
 *
 * CUBE_API_SECRET is the SIGNING secret (`CUBEJS_API_SECRET` in the deployment's settings),
 * not the ready-made JWT that Cube Cloud's curl snippet shows. A JWT pasted in its place
 * signs tokens nobody can verify, and step 1 says so: 403 Invalid token.
 *
 * Nothing printed here is secret — the output is safe to paste into a chat or an issue.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const REQUIRED = ["CUBE_API_URL", "CUBE_API_SECRET"];

// Completed-order totals of the demo_sales seed (docs/08-cube-sales-showcase.md §4). The
// seed is deterministic, so anything else means the model, not the data, is off.
const EXPECTED = { revenue: 4766371.12, orders: 34293 };

// A suspended free-tier deployment answers `{"error":"Continue wait"}` while it wakes.
const WAIT_ATTEMPTS = 12;
const WAIT_MS = 5_000;

function loadDotEnvLocal() {
  let raw;
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return; // absent is fine — the vars may come from the real environment
  }
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[match[1]]) process.env[match[1]] = value;
  }
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const base64url = (value) => Buffer.from(value).toString("base64url");

/** Same token lib/cube.ts mints: HS256, no claims beyond iat/exp. */
function mintToken(secret) {
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    base64url(JSON.stringify({ iat, exp: iat + 300 })),
  ].join(".");
  return `${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
}

async function call(url, init, label) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (error) {
    fail(
      `Could not reach ${label} at ${url}\n` +
        `  ${error.cause?.message ?? error.message}\n\n` +
        "  Check CUBE_API_URL — it is pasted as Cube Cloud shows it, ending in /cubejs-api/v1.",
    );
  }
  const text = await res.text();
  if (res.status === 403) {
    fail(
      `403 from ${label}\n${text}\n\n` +
        "  The token was rejected. CUBE_API_SECRET must be the deployment's CUBEJS_API_SECRET\n" +
        "  (Settings → Environment variables), not the JWT from Cube's curl snippet.",
    );
  }
  if (!res.ok) fail(`${res.status} from ${label}\n${text}`);
  return text;
}

function verdict(label, got, want) {
  const ok = Math.abs(Number(got) - want) < 0.005;
  console.log(`  ${ok ? "✓" : "✗"} ${label}: ${got}${ok ? "" : `   (expected ${want})`}`);
  return ok;
}

loadDotEnvLocal();

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length)
  fail(`Missing environment variables: ${missing.join(", ")}`);

const base = process.env.CUBE_API_URL.replace(/\/+$/, "");
const headers = { Authorization: mintToken(process.env.CUBE_API_SECRET) };
let allOk = true;

// --- 1. REST API: is the token accepted, and is `sales_overview` in production? -------------
console.log("→ GET  /load   sales_overview.revenue, sales_overview.orders");
const loadQuery = encodeURIComponent(
  JSON.stringify({
    measures: ["sales_overview.revenue", "sales_overview.orders"],
  }),
);
let load;
for (let attempt = 1; ; attempt++) {
  load = JSON.parse(
    await call(`${base}/load?query=${loadQuery}`, { headers }, "/load"),
  );
  if (load.error !== "Continue wait") break;
  if (attempt === WAIT_ATTEMPTS)
    fail("Cube kept answering 'Continue wait' — the deployment never woke up.");
  console.log(`  … deployment is waking (${attempt}/${WAIT_ATTEMPTS})`);
  await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
}
if (load.error) {
  fail(
    `/load answered an error:\n  ${load.error}\n\n` +
      "  'not found' here means cube/model/sales.yml is not in the production branch yet:\n" +
      "  Commit & Sync, then Merge the dev branch into master.",
  );
}
const row = load.data?.[0] ?? {};
allOk = verdict("revenue", row["sales_overview.revenue"], EXPECTED.revenue) && allOk;
allOk = verdict("orders ", row["sales_overview.orders"], EXPECTED.orders) && allOk;

// --- 2. SQL API over HTTP — the endpoint the site actually uses --------------------------------
// The query has the two constructs lib/sales-dashboard.ts leans on and Cube's docs leave
// open: `date_trunc` on the time dimension and a `date '…'` literal in the filter. The raw
// lines are printed because their `column_type` strings are what lib/cube.ts casts by.
const sql = `
select
     date_trunc('year', s.ordered_at)    _year
    ,measure(s.revenue)                  _revenue
    ,measure(s.orders)                   _orders
from sales_overview s
where 1=1
    and s.ordered_at >= date '2024-01-01'
group by 1
order by 1`.trim();

console.log("\n→ POST /cubesql   revenue + orders by year");
const ndjson = await call(
  `${base}/cubesql`,
  {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  },
  "/cubesql",
);
const lines = ndjson.split(/\r?\n/).filter((line) => line.trim());
for (const line of lines) console.log(`  ${line.slice(0, 400)}`);

let messages;
try {
  messages = lines.map((line) => JSON.parse(line));
} catch {
  fail("/cubesql did not answer newline-delimited JSON — see the raw lines above.");
}
const sqlError = messages.find((message) => message.error);
if (sqlError) {
  fail(
    `/cubesql answered an error:\n  ${sqlError.error}\n\n` +
      "  If /load above worked, the REST API is fine and only the SQL API is refusing —\n" +
      "  the site's client (lib/cube.ts) then has to switch to /load.",
  );
}
const rows = messages.flatMap((message) => message.data ?? []);
const total = (index) => rows.reduce((sum, values) => sum + Number(values[index]), 0);
allOk = verdict("revenue, years summed", total(1).toFixed(2), EXPECTED.revenue) && allOk;
allOk = verdict("orders,  years summed", total(2), EXPECTED.orders) && allOk;

console.log(
  allOk
    ? "\nHandshake OK — secret, deployment, model and both APIs agree with the seed.\n" +
        "If the site build still fails, the problem is site code, not Cube."
    : "\nReached Cube, but the figures are off — the model in production is not\n" +
        "cube/model/sales.yml as written. Paste this output back.",
);
// `exitCode`, not `process.exit()`: on Windows, exiting while fetch's sockets are still
// closing trips a libuv assertion and prints a crash under a run that succeeded.
process.exitCode = allOk ? 0 : 1;
