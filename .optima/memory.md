# Project memory

Project facts and work done. Facts only: names, ids, paths, numbers, dates. No secrets, tokens or personal data.
Update the sections in place; add work-log lines with `optima.py log`. Keep under 200 lines.

## Project
- name:
- repo or folder:
- stack (languages, frameworks, versions):
- environments (dev / test / prod) and where they run:
- owners and consumers:

## Components
<!-- one line per app, service, package, agent or job: name | what it does | where it lives | status | notes -->

## Data and integrations
<!-- one line per database, API, file feed or third-party service: name | type | access (role, auth) | notes -->

## Benchmarks
<!-- what was measured | how | last run: date and the numbers -->

## Decisions
<!-- date | decision | why -->

## Open items
<!-- what is unresolved, who or what it waits on -->

## Work log
- 2026-11-18: 2026-11-18 codebase review, first run (migrated from .aid/): src+scripts 370 files/68k lines, dup 3.5%, 1 cycle, tsc 11.4s; P0 = Zod on every page via client nav
- 2026-11-19: 2026-11-19 codebase review, second run (HEAD 3bde271): 11-18 fixes verified; dup 3.5% to 2.3%, cycles 1 to 0, home JS 263 to 194 kB gz; new P1: showcase pages still ship Zod + chat panel (264 kB gz) via a client embed
- 2026-11-25: 2026-11-25 codebase review, third run (HEAD 1fce91e): 393 files/70.9k lines, dup 2.3% flat, 0 cycles, tsc 11.9s; new P0 freight popup reads 14.7 MB Parquet with no-store; S3 still open (showcase 265 vs 193 kB gz); no 11-19 finding fixed
- 2026-11-26: 2026-11-26 diff review of the Cash flow demo report (uncommitted): 3 P1 (heat grid eats first click when scrolled, URL rewrite strips campaign params, cross-report import of trucks parquet-columns), 10 P2; popup 80 kB gz incl. unused hyparquet 18.3; engine per call <=1.1 ms
