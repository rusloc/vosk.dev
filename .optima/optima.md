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
- evidence: 2026-11-25: scan on export root with tsconfig printed 'Aliases resolved: @/'
- meta: status=confirmed; seen=2; first=2026-11-18; last=2026-11-25; scope=general

### O-0008 | gotcha | tooling | Longest-function list can credit a big factory's length to a tiny arrow above it
- finding: The scan reported an 850-line 'nonEmpty' at a 3-line arrow const; the 845-line function was the factory declared five lines below it. Names in the list are approximate.
- do: Open each longest-function lead at its line and read the real enclosing function before citing its name or length.
- evidence: 2026-11-25: scan credited 850 lines to nonEmpty at marketing chat-tools :125; real factory createChatTools :130 is 845
- meta: status=confirmed; seen=3; first=2026-11-18; last=2026-11-25; scope=general

### O-0009 | gotcha | perf | A Zod-validated env module reachable from one client component ships Zod to every page
- finding: A layout-level client nav imported site config for one string; config imported an env module that parses with Zod v4 at load. The build put a 283 kB raw / 64 kB gzip Zod chunk on every route.
- do: Grep 'use client' files for imports of config/env modules; pass the few values as props from the server, and mark env and config modules server-only.
- evidence: 2026-11-25 build: showcase pages 265 kB gz vs 193 kB, 65 kB chunk with Zod via a client embed importing env
- meta: status=confirmed; seen=4; first=2026-11-18; last=2026-11-25; scope=general

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
- evidence: 2026-11-25: git archive -o file then tar -xf worked; HEAD export scanned 393 files
- meta: status=confirmed; seen=2; first=2026-11-19; last=2026-11-25; scope=general

### O-0013 | gotcha | tooling | GNU tar in Git Bash reads a drive-letter archive or -C path as a remote host
- finding: tar -xf with -C C:/... failed with 'Cannot connect to C: resolve failed': GNU tar treats 'host:path' as a remote archive. Relative paths worked.
- do: In Git Bash cd into the target folder and pass relative paths to tar, or add --force-local.
- evidence: 2026-11-25 review run, Git Bash on Windows 11
- meta: status=suspected; seen=1; first=2026-11-25; last=2026-11-25; scope=general

### O-0014 | gotcha | perf | A codec object holding a reader keeps that reader's library in the client chunk
- finding: A factory took {readRows, checkRows} and returned a browser source that calls only checkRows; the object reference kept readRows and its Parquet library in three client chunks (18 kB gz) though production never calls it.
- do: Split node-only readers into their own module imported by tests and scripts; pass the client path only the functions it calls. Verify by grepping the chunk for a library string.
- evidence: 2026-11-26 Next 16 build: a 7th report popup whose browser path calls only checkRows still loads the 18.3 kB gz hyparquet chunk via the codec object
- meta: status=confirmed; seen=2; first=2026-11-25; last=2026-11-26; scope=general

### O-0015 | gotcha | perf | cache: no-store as a fix for range-request cache errors re-downloads big static files
- finding: Parallel HTTP range reads of one URL hit a Chromium cache error; the workaround fetch option no-store makes every page load refetch the file, here about 15 MB of Parquet column chunks.
- do: Serialize or coalesce range reads of one URL instead of disabling the cache; when no-store stays, size the bytes it refetches and report them.
- evidence: 2026-11-25 review: 4.90 + 9.81 MB of column chunks read per open, from Parquet metadata; wire bytes not measured
- meta: status=suspected; seen=1; first=2026-11-25; last=2026-11-25; scope=general

### O-0016 | gotcha | tooling | tsx run from a scratch folder ignores NODE_PATH for bare imports
- finding: A .tsx bench script kept outside the repo failed on 'react' with tsx 4.23 even with NODE_PATH set; resolution starts at the script's own folder. Absolute paths to the repo's node_modules entry files worked.
- do: For scratch benches of repo code, import packages by absolute path to node_modules entry files (react/index.js, react-dom/server.node.js) and pass --tsconfig for aliases.
- evidence: 2026-11-26, Node 24.19, tsx 4.23.15, Windows Git Bash
- meta: status=suspected; seen=1; first=2026-11-26; last=2026-11-26; scope=general

### O-0017 | gotcha | ui | A focus handler that scrolls to a keyboard cursor can swallow the first mouse click
- finding: A focusable SVG grid set its cursor to cell 0,0 on focus and scrolled it into view. Mousedown focuses first, so on a scrolled grid the content moves before mouseup and the click lands on the common ancestor, not the cell.
- do: Set the cursor from pointerdown (the clicked cell) before focus, or only on :focus-visible; never scroll content inside a focus handler that a mouse click can trigger.
- evidence: 2026-11-26 code read of a heatmap view, not reproduced in a browser
- meta: status=suspected; seen=1; first=2026-11-26; last=2026-11-26; scope=general
