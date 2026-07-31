#!/usr/bin/env node
/**
 * Superset handshake harness — proves credentials outside the app.
 *
 * When an embed fails, the question is always "are my credentials and permissions wrong,
 * or is my Next.js code wrong?". This answers the first half in one command, with no
 * Next.js, no browser and no dashboard involved: log in, fetch a CSRF token, mint a guest
 * token, print the result.
 *
 *   node scripts/superset-handshake.mjs <embed-uuid>
 *
 * Reads SUPERSET_DOMAIN, SUPERSET_SVC_USERNAME, SUPERSET_SVC_PASSWORD from the environment
 * (or .env.local, which it parses directly — this runs outside Next.js, so nothing loads
 * that file for us).
 *
 * The embed UUID comes from the dashboard's "Embed dashboard" dialog. It is NOT the
 * numeric dashboard id in the URL; the numeric id fails silently inside the iframe.
 */
import { readFileSync } from "node:fs";

const REQUIRED = [
  "SUPERSET_DOMAIN",
  "SUPERSET_SVC_USERNAME",
  "SUPERSET_SVC_PASSWORD",
];

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

function requireString(value, path) {
  if (typeof value !== "string" || !value)
    fail(`Response did not contain "${path}".`);
  return value;
}

/**
 * A wrong domain, a firewall or a not-yet-issued certificate are the most likely first
 * failures, and bare `fetch` reports all of them as an opaque "TypeError: fetch failed"
 * with a stack trace. In a tool whose entire job is to make failures legible, that is the
 * one error worth translating.
 */
async function call(url, init, label) {
  try {
    return await fetch(url, init);
  } catch (error) {
    fail(
      `Could not reach ${label} at ${url}\n` +
        `  ${error.cause?.message ?? error.message}\n\n` +
        "  Check SUPERSET_DOMAIN, that the instance is up, and that its certificate is valid.",
    );
  }
}

async function json(res, label) {
  const text = await res.text();
  if (!res.ok) fail(`${res.status} from ${label}\n${text}`);
  try {
    return JSON.parse(text);
  } catch {
    // An HTML body here almost always means a reverse proxy answered instead of Superset.
    fail(`${label} returned non-JSON:\n${text.slice(0, 400)}`);
  }
}

loadDotEnvLocal();

const embedId = process.argv[2];
if (!embedId) fail("Usage: node scripts/superset-handshake.mjs <embed-uuid>");

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length)
  fail(`Missing environment variables: ${missing.join(", ")}`);

const base = process.env.SUPERSET_DOMAIN.replace(/\/+$/, "");

console.log("→ POST /api/v1/security/login");
const login = await json(
  await call(
    `${base}/api/v1/security/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.SUPERSET_SVC_USERNAME,
        password: process.env.SUPERSET_SVC_PASSWORD,
        provider: "db",
        refresh: true,
      }),
    },
    "login",
  ),
  "login",
);
const accessToken = requireString(login.access_token, "access_token");
console.log(`✓ access token (${accessToken.length} chars)`);

console.log("→ GET  /api/v1/security/csrf_token/");
const csrfRes = await call(
  `${base}/api/v1/security/csrf_token/`,
  { headers: { Authorization: `Bearer ${accessToken}` } },
  "csrf_token",
);
const csrfToken = requireString(
  (await json(csrfRes, "csrf_token")).result,
  "result",
);
// The CSRF token is only valid alongside the session cookie issued with it.
const cookie = csrfRes.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
console.log(
  `✓ csrf token (${csrfToken.length} chars), cookie ${cookie ? "captured" : "MISSING"}`,
);

console.log("→ POST /api/v1/security/guest_token/");
const guest = await json(
  await call(
    `${base}/api/v1/security/guest_token/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-CSRFToken": csrfToken,
        Cookie: cookie,
      },
      body: JSON.stringify({
        user: {
          username: "site-visitor",
          first_name: "Site",
          last_name: "Visitor",
        },
        resources: [{ type: "dashboard", id: embedId }],
        rls: [],
      }),
    },
    "guest_token",
  ),
  "guest_token",
);
const guestToken = requireString(guest.token, "token");

console.log(`✓ guest token (${guestToken.length} chars)\n`);
console.log(guestToken);
console.log(
  "\nHandshake OK — credentials, permissions and embed UUID are all valid.\n" +
    "If the site embed still fails, the problem is CSP frame-ancestors or site code,\n" +
    "not Superset auth.",
);
