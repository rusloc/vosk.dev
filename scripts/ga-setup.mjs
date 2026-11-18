// Google Analytics setup for vosk.dev as code: the GTM container's Google tag and the GA4 property's
// settings, through the Tag Manager API v2 and the GA Admin API. Idempotent; prints the plan and
// changes nothing unless run with --apply.
//
//   GA_SA_KEY_FILE=C:/Users/vosk/.secrets/ga-sa.json node scripts/ga-setup.mjs [--apply]
//
// The key file is a service account's JSON key, kept outside the repo. The script never prints it.
// The service account needs: GTM account Admin + container Publish; GA property Editor or Administrator.
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const GTM_PUBLIC_ID = "GTM-W5TDFQQJ";
const GA_MEASUREMENT_ID = "G-2FXCM9DL8S";
const GA_PROPERTY = "properties/565065076";
const KEY_EVENTS = ["generate_lead"]; // sent by trackLead() in src/components/analytics.tsx
const INIT_ALL_PAGES = "2147479573"; // built-in trigger "Initialization - All Pages"

const apply = process.argv.includes("--apply");
const keyFile = process.env.GA_SA_KEY_FILE;
if (!keyFile)
  throw new Error("Set GA_SA_KEY_FILE to the service account's JSON key path.");
const sa = JSON.parse(readFileSync(keyFile, "utf8"));

async function token() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const scope = [
    "tagmanager.readonly",
    "tagmanager.edit.containers",
    "tagmanager.edit.containerversions",
    "tagmanager.publish",
    "analytics.edit",
  ]
    .map((s) => `https://www.googleapis.com/auth/${s}`)
    .join(" ");
  const head = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope, aud: sa.token_uri, iat: now, exp: now + 3600 })}`;
  const sig = createSign("RSA-SHA256")
    .update(head)
    .sign(sa.private_key, "base64url");
  const r = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${sig}`,
    }),
  });
  if (!r.ok) throw new Error(`token: HTTP ${r.status}`); // the body can echo the assertion: not printed
  return (await r.json()).access_token;
}

const auth = { authorization: `Bearer ${await token()}` };
async function call(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: { ...auth, "content-type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      `${method} ${url}: HTTP ${r.status} ${j.error?.message ?? ""}`,
    );
  return j;
}
const step = async (label, fn) =>
  apply
    ? (await fn(), console.log(`done  ${label}`))
    : console.log(`plan  ${label}`);

// ---- Tag Manager: one Google tag for the GA4 stream, then a published version ----
const GTM = "https://tagmanager.googleapis.com/tagmanager/v2";
const { account = [] } = await call("GET", `${GTM}/accounts`);
let container;
for (const a of account) {
  const { container: cs = [] } = await call(
    "GET",
    `${GTM}/${a.path}/containers`,
  );
  container = cs.find((c) => c.publicId === GTM_PUBLIC_ID) ?? container;
}
if (!container)
  throw new Error(
    `${GTM_PUBLIC_ID} not visible to ${sa.client_email}: add it in GTM User Management.`,
  );
const { workspace = [] } = await call(
  "GET",
  `${GTM}/${container.path}/workspaces`,
);
const ws = workspace[0];
const { tag: tags = [] } = await call("GET", `${GTM}/${ws.path}/tags`);
const hasGoogleTag = tags.some(
  (t) =>
    t.type === "googtag" &&
    t.parameter?.some(
      (p) => p.key === "tagId" && p.value === GA_MEASUREMENT_ID,
    ),
);
console.log(
  `gtm   ${GTM_PUBLIC_ID} (${container.path}), workspace "${ws.name}", ${tags.length} tag(s)`,
);
if (hasGoogleTag) console.log(`ok    Google tag ${GA_MEASUREMENT_ID} present`);
else {
  await step(
    `create Google tag ${GA_MEASUREMENT_ID} on Initialization - All Pages`,
    () =>
      call("POST", `${GTM}/${ws.path}/tags`, {
        name: `Google tag - ${GA_MEASUREMENT_ID}`,
        type: "googtag",
        parameter: [
          { type: "TEMPLATE", key: "tagId", value: GA_MEASUREMENT_ID },
        ],
        firingTriggerId: [INIT_ALL_PAGES],
        tagFiringOption: "ONCE_PER_EVENT",
      }),
  );
}
const status = await call("GET", `${GTM}/${ws.path}/status`);
if (!hasGoogleTag || status.workspaceChange?.length) {
  await step("create and publish a container version", async () => {
    const v = await call("POST", `${GTM}/${ws.path}:create_version`, {
      name: `ga-setup ${new Date().toISOString().slice(0, 10)}`,
    });
    if (v.compilerError)
      throw new Error("GTM compiler error: version not created");
    await call("POST", `${GTM}/${v.containerVersion.path}:publish`);
  });
} else console.log("ok    workspace has nothing unpublished");

// ---- GA4 property: key events and 14-month data retention ----
const GA = "https://analyticsadmin.googleapis.com/v1beta";
const { keyEvents = [] } = await call("GET", `${GA}/${GA_PROPERTY}/keyEvents`);
for (const name of KEY_EVENTS) {
  if (keyEvents.some((k) => k.eventName === name))
    console.log(`ok    key event ${name}`);
  else
    await step(`create key event ${name}`, () =>
      call("POST", `${GA}/${GA_PROPERTY}/keyEvents`, {
        eventName: name,
        countingMethod: "ONCE_PER_EVENT",
      }),
    );
}
const ret = await call("GET", `${GA}/${GA_PROPERTY}/dataRetentionSettings`);
if (ret.eventDataRetention === "FOURTEEN_MONTHS")
  console.log("ok    data retention 14 months");
else
  await step(
    `data retention ${ret.eventDataRetention} -> FOURTEEN_MONTHS`,
    () =>
      call(
        "PATCH",
        `${GA}/${GA_PROPERTY}/dataRetentionSettings?updateMask=eventDataRetention`,
        { eventDataRetention: "FOURTEEN_MONTHS" },
      ),
  );

if (!apply) console.log("\ndry run: nothing changed. Re-run with --apply.");
