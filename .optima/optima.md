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
- evidence: JS/TS scan 2026-11-18: arrow const at line 114 listed 850 lines; factory at 119 listed 845
- meta: status=suspected; seen=1; first=2026-11-18; last=2026-11-18; scope=general

### O-0009 | gotcha | perf | A Zod-validated env module reachable from one client component ships Zod to every page
- finding: A layout-level client nav imported site config for one string; config imported an env module that parses with Zod v4 at load. The build put a 283 kB raw / 64 kB gzip Zod chunk on every route.
- do: Grep 'use client' files for imports of config/env modules; pass the few values as props from the server, and mark env and config modules server-only.
- evidence: Fixed by passing the brand as a prop: home JS 263 kB to 199 kB gzip, 0 Zod chunks, Next 16 build 2026-11-18
- meta: status=confirmed; seen=2; first=2026-11-18; last=2026-11-18; scope=general
