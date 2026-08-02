/**
 * Syndication CLI. Dry-run by default:
 *
 *   pnpm syndicate                        → show what would be posted
 *   pnpm syndicate --only devto           → one platform
 *   pnpm syndicate --publish              → actually post
 *   pnpm syndicate --publish --backfill   → allowed to post >1 on a first run
 *
 * Runs under `--conditions=react-server` because it reaches `lib/content.ts`, which
 * imports `server-only` — that package throws unless the react-server condition is
 * set. Going through content.ts rather than re-reading `content/` keeps the MDX
 * seam single (CLAUDE.md), including its strict frontmatter validation.
 *
 * `.mts`, not `.ts`: the package is CommonJS by default, and this file uses
 * top-level await. Same reason `vitest.config` carries the extension.
 */
import { run } from "../src/lib/syndication/run";

const argv = process.argv.slice(2);
const has = (flag: string) => argv.includes(flag);

function value(flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
}

const summary = await run({
  publish: has("--publish"),
  backfill: has("--backfill"),
  only: value("--only"),
});

console.log(summary.lines.join("\n"));

// Non-zero on failure so a CI run that half-posted is visibly red.
if (summary.failed > 0) process.exitCode = 1;
