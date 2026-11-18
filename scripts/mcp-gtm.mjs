// Launches the local Google Tag Manager MCP server (stape-io, Apache-2.0) with the service account key
// read from GA_SA_KEY_FILE, so the key stays a file outside the repo and never sits in .mcp.json or in
// a user-level env var. The hosted variant (gtm-mcp.stape.io) is not used: it routes GTM data through Stape.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const keyFile = process.env.GA_SA_KEY_FILE;
if (!keyFile) {
  console.error(
    "mcp-gtm: set GA_SA_KEY_FILE to the service account's JSON key path.",
  );
  process.exit(1);
}
const child = spawn("npx -y google-tag-manager-mcp-server@6.0.1", {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    GOOGLE_SERVICE_ACCOUNT_KEY: readFileSync(keyFile, "utf8"),
  },
});
child.on("exit", (code) => process.exit(code ?? 1));
