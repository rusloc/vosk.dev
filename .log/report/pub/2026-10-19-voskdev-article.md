# One window to rule them all: how I run AI agents from VS Code without handing over the keys

## The short version

I am a freelance BI developer. My clients get Power BI models, SQL, dbt, a warehouse, sometimes a small web app. Most of the typing is now done by an AI coding agent. None of the responsibility is. If a number on a client's P&L is wrong, nobody asks which model wrote the measure.

So the setup has two jobs, and they pull in opposite directions. Make the agent fast and well-informed. Keep me in the loop on everything that matters. Everything below lives in VS Code. It is the one window where code, data, logs, deploys and the agent meet.

## Several windows, one per project

I run several VS Code instances side by side, one per project: the website, a lead-generation engine, a QuickBooks P&L product, client reporting work. Each window has its own agent session, its own instructions file and its own tools. They run in parallel. While one agent builds a semantic model, another refactors a query and a third writes up yesterday.

Parallel only works if the windows can't step on each other, so the boundaries are written down:

- **One control root per project family.** My site and the lead engine are two repos, two deploys, two databases. They are driven from one folder that holds the instructions, the agents, the logs and the docs for both. One source of truth: two copies of the same rules drift within a week.
- **Commits never span repos.** Every change belongs to exactly one, and the agent says which.
- **Shared infrastructure is separated by role, not by trust.** The site never holds a database credential. The demo warehouse behind the public dashboard is readable by one role, from one service, and that role is proven unable to read anything else. "Proven" means a `set role` and a permission error, not a comment in a file.

## Skills: what the agent knows

A skill is a folder of instructions and references the agent loads when the task matches: Postgres query tuning, schema design with row-level security, Next.js review, SEO, test hunting, PBIP editing, DAX and SQL house style. My site project has 14. The Power BI projects carry Microsoft's published skills for TMDL, PBIR and the Fabric CLI, synced by a script.

The house-style skill matters more than it sounds. Every SQL statement and DAX measure comes back in my formatting, with leading commas and `where 1=1`. A client reading my code reads one author, whoever did the typing.

## Agents: who does the work

Sub-agents are specialists with short names, so I can route work in one word:

- **archi** for architecture and security decisions,
- **nerd** for picky React and Next.js review,
- **hunter** for tests, edge cases and RLS audits,
- **papa** for scope and priorities ("should this ship before launch?"),
- **chef** for Postgres schema and migrations.

The P&L project goes further: one agent per lane, each owning paths. **ferry** owns the ETL and dbt, **chef** the warehouse migrations, **bip** the Power BI model and report. A lane agent does the work and hands back a summary. Only the main session writes the logs. Each agent keeps its own memory folder, so lessons stay with the specialist who learned them.

## The harness: what the agent can touch

An agent that can't see guesses. Most of my setup is about giving it eyes, and a short leash on its hands.

- **MCP servers.** Supabase (schema, advisors, logs), Vercel (deployments, runtime errors), Microsoft's Power BI modeling server, a static analyser for dead code and duplication, and my own read-only `sqldev-mcp`, which I wrote about [last week](https://vosk.dev/blog/give-the-agent-eyes).
- **CLIs.** `gh`, `pnpm`, `dbt`, `sqlcmd`, the Fabric and Azure CLIs, plus project scripts: validators, data generators, sync jobs.
- **Its own eyes on the UI.** No browser plugin. A headless Edge driven over the DevTools protocol from Node takes screenshots at 1440 and 390 px, so "the layout fits" is a picture, not a claim.

The instructions file says what each tool may do. Reads are free. Local checks are free: tests, linters, dry runs, validators. **Anything that writes to a remote system stops and asks**: a migration, an insert into a shared database, a publish to the Power BI Service. So does anything destructive, so does anything touching auth or client data, and so does a new dependency.

## Staying in the loop: the rules I won't delegate

- **The agent never runs git.** After every change it prints one copy-paste block per repo: `add`, `commit`, `push`. I read it and I run it. The commit is my signature, so I sign it.
- **Suggest, then apply.** In a Power BI project the default answer to "why is this measure wrong?" is a diff, not an edit. A question is a request to look. Consent is per task and doesn't carry over.
- **Copy before editing, and match the bytes.** Power BI Desktop refuses to open a project if one file gains a byte-order mark. That happened once: the logic was right, the validator was green, and the whole report stopped opening. Now every edit snapshots the file first and reproduces its encoding exactly.
- **Money is never a float.** `Decimal` in Python, `numeric(15,2)` in Postgres, end to end. A failing reconciliation is never "fixed" by widening the tolerance.
- **Client data stays where it is.** The agent sees code, schema and aggregates, never rows. Anonymized is not anonymous, and every tool makes copies: transcripts, caches, the model's own data file.

None of this slows the agent much. It makes me the bottleneck only where a bottleneck belongs.

## The .log folder: agile, one day at a time

Agents forget, and so do I. The memory lives in plain markdown in the repo:

- **`coms/`**: one line per request and a short answer, stamped with the request's time, tagged `#bug`, `#decision` or `#idea` for grep.
- **`plan/`**: a board. What only I can move goes at the top, ranked cheapest first. Below it are today's items, the backlog, what's blocked and the watch list.
- **`daily/`**: the close: what shipped, findings, a board read, a consistency check.
- **`report/`**: longer write-ups, like a client-data privacy plan or the source of this article.

Since early July there is a daily file for every day, 105 of them, including the dull days when nothing happened. A gap in the trail looks like a missed day even when it wasn't one. Twenty-two boards have opened and closed in that time. A day starts with "start <date>": close what's open, backfill what's missing, check that yesterday's push actually landed.

The log has taught me more than any prompt:

- **Derive counters, never increment them.** "The 12th day untracked", restated each morning, drifted three times. Now every age is computed from a stated origin date.
- **Count requests against log entries.** Once, a question of mine got an error instead of an answer and nobody noticed. Four requests and three entries in the log found it.
- **"Succeeded" is not health.** A scheduled job reported success for 36 hours while every call behind it failed on an empty API balance. Engine health is now three reads, and the one that would have caught it counts the rows that should exist and don't.
- **"The block ran" needs proof.** A commit in the log is not a push. The agent checks `git status` for the ahead count before it says anything shipped.

## What this buys

Short loops: a request in the morning, a working preview by lunch, a commit block I read before it goes anywhere. Context that survives a restart, because the context is files and not chat. Parallel work across projects without one session clobbering another. And a paper trail a client could read, if they ever ask how the work was done.

The agent got good hands and good eyes. The keys stayed with me.
