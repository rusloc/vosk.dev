/**
 * Turns an n8n workflow export into the public copy the /work showcase draws (`data/n8n/<flow>.json`).
 *
 *   pnpm exec tsx scripts/n8n-export.ts <raw export .json> data/n8n/<flow>.json
 *
 * The raw export is what n8n's MCP `get_workflow_details` (or the editor's Download) returns, saved outside the
 * repo. Kept per node: name, type, typeVersion, position, parameters and the execution flags (retries, onError…),
 * plus connections and sticky notes. Dropped: credentials, ids, webhookId, pinData, versionId, meta, settings,
 * tags and node groups. The public demo addresses and the public sheet id stay: they are meant to be public.
 * Refuses to write if the result still names the private n8n host or looks like it carries a secret.
 */
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: tsx scripts/n8n-export.ts <raw.json> <out.json>");
  process.exit(1);
}

type RawNode = Record<string, unknown> & { name: string };
const raw = JSON.parse(readFileSync(input, "utf8"));
const wf = raw.workflow ?? raw;

const KEEP = [
  "name",
  "type",
  "typeVersion",
  "position",
  "parameters",
  "disabled",
  "notes",
  "notesInFlow",
];
const FLAGS = [
  "retryOnFail",
  "maxTries",
  "waitBetweenTries",
  "onError",
  "alwaysOutputData",
  "executeOnce",
];

const nodes = (wf.nodes as RawNode[]).map((n) =>
  Object.fromEntries(
    [...KEEP, ...FLAGS].filter((k) => n[k] !== undefined).map((k) => [k, n[k]]),
  ),
);
const clean = { name: wf.name, nodes, connections: wf.connections };
const text = JSON.stringify(clean, null, 2) + "\n";

const FORBIDDEN = [
  /n8n\.vosk\.dev/i,
  /"credentials"/,
  /webhookId/,
  /sk-ant-/,
  /Bearer\s+[A-Za-z0-9._-]{16,}/,
  /api[_-]?key"\s*:\s*"[^"]{8,}/i,
];
const hit = FORBIDDEN.find((re) => re.test(text));
if (hit) {
  console.error(`refused: the export still matches ${hit}`);
  process.exit(1);
}

writeFileSync(output, text);
console.log(
  `${output}: ${nodes.length} nodes, ${Object.keys(clean.connections).length} connection sources`,
);
