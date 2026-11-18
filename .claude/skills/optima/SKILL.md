---
name: optima
description: >
  Keeps an agent's working memory and its field knowledge across sessions, on any project and any stack. Use at the
  start and end of any substantial task (a build, a review, a migration, an investigation), and whenever something
  surprising is learned during it. Two stores: "memory" (project facts and work done) and "Optima" (reusable lessons:
  gotcha, oops and aha findings from real systems and tasks). Trigger on "check memory", "what did we learn", "log this
  finding", "add to optima", "gotcha", "oops", "aha", "remember this for next time", or when a result contradicts the
  docs, a playbook or expectations.
metadata:
  version: "0.2.0"
---

# Optima: memory and field knowledge

Two plain Markdown stores, read at the start of a task and updated before it ends. A task is not finished until both are current.

| Store | Holds | Scope | Changes |
|---|---|---|---|
| **memory** (`memory.md`) | Project facts and work done: stack, components, data and integrations, benchmarks, decisions, open items, work log | One project or repo | Sections edited in place; work log appended |
| **Optima** (`optima.md`) | Tricky things learned on real systems and tasks: **gotcha**, **oops**, **aha** | General, reusable across projects | Entries added, confirmed or retired; never rewritten |

A project fact ("the API reads replica B") goes to memory. A lesson that would help on another project ("a config module imported by one client component shipped its validation library to every page") goes to Optima.

An agent that already keeps its own memory (for example a subagent with a memory directory) keeps project facts there and uses Optima for the general lessons only; it may skip `memory.md` apart from the work log.

## Where the stores live

- Default: `.optima/` in the project root (`.optima/memory.md`, `.optima/optima.md`). Commit it with the repo, or ignore it if the lessons are personal.
- `OPTIMA_DIR` moves the folder. `OPTIMA_FILE` points Optima at one shared file used by every project, so lessons travel between repos.
- Persistence is only as good as the folder. In a session with no project folder or repo, the stores last for that session; say so in the final report.
- New stores are created from templates in `assets/`; Optima starts empty.

## The tool

`scripts/optima.py` (Python 3, standard library only), run from the project root:

```
optima.py start                      # create if missing, print memory and the active Optima digest
optima.py find [terms] [--area A] [--kind K] [--full]
optima.py add --kind gotcha|oops|aha --area A --title "..." --finding "..." --do "..." [--evidence "..."] [--status confirmed] [--scope project]
optima.py confirm O-0007 [--evidence "..."]
optima.py retire O-0007 --why "..."
optima.py log "what was done and the result"
optima.py check
optima.py paths
```

Areas: `arch`, `code`, `data`, `sql`, `api`, `ai`, `config`, `runtime`, `deps`, `test`, `perf`, `security`, `ui`, `delivery`, `ops`, `tooling`, `docs`.

## The flow

**1. Start.** Run `optima.py start` and read the output before anything else. Then `find --area <area>` for the areas the task touches and apply each entry's `do` rule. State in one line which entries apply.

**2. During work, log at the moment of discovery.** Add an entry when one of these happens:

| Kind | Trigger |
|---|---|
| **gotcha** | A tool, library, platform or dataset behaved differently from its docs, a playbook or expectation |
| **oops** | Advice, code or an artifact from this agent was wrong or failed; record what prevents a repeat |
| **aha** | A technique, shortcut or fix worked and its effect was measured |

If `add` reports a similar entry: `confirm` it when it is the same finding, or repeat with `--new` when it is different. An entry seen twice or verified against a primary source is `confirmed`; a first unverified sighting stays `suspected`. `retire` an entry when the tool changes and it stops being true.

**3. Finish.** Update memory sections that changed, add one `log` line, run `optima.py check`, and list in the final report what was added, confirmed or retired, or state that nothing new was learned.

## Writing an entry

- One finding per entry. Fact first, then the rule: `finding` says what is true, `do` says what to do next time.
- Dry and short: title 90, finding 280, do 200, evidence 200 characters. The tool rejects longer text.
- Evidence is required for `confirmed`: a run date, measured numbers, a commit, a log line or a doc page.
- Generalize. Strip customer, project, table and person names unless `--scope project`. Name the tool and its version when the finding depends on them.
- No secrets, tokens or personal data in either store. The tool blocks obvious ones.
- Not for Optima: project facts (memory), anything the tool's own docs already state plainly, opinions without evidence.

Example:

```
optima.py add --kind aha --area perf \
  --title "Passing one config value as a prop removed a library from every page" \
  --finding "A client component imported a config module for one string; the module parsed env with a schema library at load, so the library shipped on every route." \
  --do "Keep config and env modules out of client components; pass the values they need as props from the server." \
  --evidence "Next 16 build: home JS 263 kB to 199 kB gzip, 2026-11-18"
```

## Using what was learned

- A `confirmed` entry outranks a playbook or a skill reference when they disagree and the entry is newer. Flag it in the report as an update candidate for that playbook.
- A `suspected` entry is a hypothesis: test it before relying on it, then `confirm` or `retire`.
- When memory passes 200 lines, fold old work-log lines into Decisions and Benchmarks.
