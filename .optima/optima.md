# Optima

Field knowledge: tricky things learned on real systems and real tasks. Dry, one finding per entry, fact plus rule.
Managed with `optima.py`. Do not hand-edit the meta line.

- kinds: gotcha (a tool or system behaves unexpectedly) | oops (our mistake and how to avoid it) | aha (a technique that worked, measured)
- areas: arch, code, data, sql, api, ai, config, runtime, deps, test, perf, security, ui, delivery, ops, tooling, docs
- status: suspected (seen once, unverified) | confirmed (seen twice or verified) | retired (no longer true)
- limits: title 90, finding 280, do 200, evidence 200 characters

## Entries

### O-0007 | gotcha | tooling | Inventory scan resolves path aliases only from a tsconfig in the target dir
- finding: Scanning src/ found no tsconfig there, so every @/ import fell out of the graph: 57 false orphans, fan-in undercounted (28 vs 38 on the top file), cycles checked on relative imports only.
- do: Run the scan on the folder that holds tsconfig.json and check the 'Aliases resolved' line before trusting fan-in, orphans or cycles.
- evidence: Next.js app, scan on src/ vs repo root, 2026-11-18: orphans 57 vs 7, aliases none vs @/
- meta: status=suspected; seen=1; first=2026-11-18; last=2026-11-18; scope=general

### O-0008 | gotcha | tooling | Longest-function list can credit a big factory's length to a tiny arrow above it
- finding: The scan reported an 850-line 'nonEmpty' at a 3-line arrow const; the 845-line function was the factory declared five lines below it. Names in the list are approximate.
- do: Open each longest-function lead at its line and read the real enclosing function before citing its name or length.
- evidence: 2026-11-19 rerun: scan again credited an 845-line factory to the 2-line arrow above it
- meta: status=confirmed; seen=2; first=2026-11-18; last=2026-11-19; scope=general

### O-0009 | gotcha | perf | A Zod-validated env module reachable from one client component ships Zod to every page
- finding: A layout-level client nav imported site config for one string; config imported an env module that parses with Zod v4 at load. The build put a 283 kB raw / 64 kB gzip Zod chunk on every route.
- do: Grep 'use client' files for imports of config/env modules; pass the few values as props from the server, and mark env and config modules server-only.
- evidence: 2026-11-19: home fixed (263 to 194 kB gz), but a second client component (an embed) still parsed the env module on every showcase page
- meta: status=confirmed; seen=3; first=2026-11-18; last=2026-11-19; scope=general

### O-0010 | gotcha | delivery | next/font/google downloads fonts at build time, so a CI build can fail on the network
- finding: Next 16 next/font/google fetches the font files during the build. On Vercel 3 of 5 production builds in one day failed with module-not-found on the font CSS; the same commits built locally and on other runs.
- do: Self-host fonts with next/font/local (files in the repo) for production builds; after every push read the deploy state, not only the push.
- evidence: Vercel deploys 2026-11-18 11:46, 13:09, 17:46 ERROR (IBM Plex Sans, Manrope); 12:31, 13:01 READY
- meta: status=confirmed; seen=1; first=2026-11-19; last=2026-11-19; scope=general

### O-0011 | gotcha | perf | A client component a server page imports ships on every render of that route, used or not
- finding: A server page rendered a client embed only for one platform branch; the embed and its env-schema import were in the first-load chunks of every page of that dynamic route, including pages that never render it.
- do: Wrap branch-only client components in next/dynamic (a client lazy wrapper) and pass config as props; check a page that never renders the branch for the component's strings.
- evidence: Second sighting: same route measured 2026-09-27 (a chart bundle shipped to iframe-only pages until moved behind a client next/dynamic wrapper)
- meta: status=confirmed; seen=2; first=2026-11-19; last=2026-11-19; scope=general

### O-0012 | gotcha | tooling | git archive piped straight into tar fails in Git Bash on Windows
- finding: git archive HEAD | tar -x gave 'This does not look like a tar archive' in Git Bash; writing the archive with -o and extracting the file worked.
- do: On Windows write git archive to a file with -o, then tar -xf it; use that HEAD export to scan committed code while the tree holds uncommitted work.
- evidence: Git Bash on Windows 11, 2026-11-19 review run
- meta: status=suspected; seen=1; first=2026-11-19; last=2026-11-19; scope=general
