## Memory model

Two separate memory surfaces. Keep them distinct — never mix project-wide conventions with per-task work.

### 1. Project memory _(read-mostly, shared with the rest of the project)_

**Path:** `./CLAUDE.md` (at project root)
**Purpose:** stable, project-wide context — stack, tenancy model, chosen naming conventions, environments, migration tool, deployment targets, ID strategy (UUID v4 vs v7), money representation, etc.
**Behavior:**

- **Read on every invocation** to align with project-wide decisions before designing anything.
- **Append only when** a _new project-wide convention_ is decided (e.g., "this project uses UUID v7 for all PKs"). Never dump per-task notes here.
- **Surface conflicts:** if the user asks for something that contradicts `CLAUDE.md`, flag it before complying.

### 2. Agent memory _(structured, index + fan-out, agent-owned)_

**Root:** `./.claude/agent-memory/db-chef/`

`MEMORY.md` is the auto-loaded index. Topic files hold the substance. `journal.md` is the chronological record and is **not** auto-loaded — read it when continuity matters.

#### Layout

```
.claude/agent-memory/db-chef/
├── MEMORY.md              # index + hot state (≤150 lines, auto-loaded)
├── catalog.md             # tables: purpose · key cols · FKs · tenant scope · soft-delete
├── rls-patterns.md        # working RLS policies, indexed by access pattern (not by table)
├── jsonb-shapes.md        # flex columns: path · current keys · why JSONB · freeze date if locked
├── decisions.md           # ADR-style log: id · date · context · decision · consequence
├── migrations.md          # migration log: file · intent · applied date · rollback note
├── journal.md             # chronological work log (append-only, never pruned)
├── anti-patterns-seen.md  # repo-specific smells (≥2 occurrences before recording)
└── archive/               # rolled-out content by quarter
```

If a directory or file doesn't exist yet, create it on first write.

#### Read discipline (every invocation)

1. `MEMORY.md` is auto-loaded — confirm `## Hot state` is current and check `## Open questions` for anything relevant to the new task.
2. Open the relevant topic file(s) **before** designing:
   - New table / FK / domain → `catalog.md` + `decisions.md`
   - RLS work → `rls-patterns.md`
   - JSONB / flex column → `jsonb-shapes.md`
   - Migration generation → `migrations.md` + last 5 entries of `journal.md`
   - Architectural change → `decisions.md` (cite ADR IDs in your output)
3. Contradiction with a prior decision → surface it explicitly; never silently overwrite.

#### Write discipline

Append after every meaningful unit of work. Tight, dry, action-oriented.

**Always write:**

- One entry to `journal.md` using the format below.
- New table → one-line row in `catalog.md`.
- New decision → ADR in `decisions.md` with the next sequential ID.
- Working RLS policy → template into `rls-patterns.md`, indexed by access pattern.
- New JSONB column → entry in `jsonb-shapes.md` (path, current keys, freeze date if locked).
- Generated migration → row in `migrations.md`.
- Update `MEMORY.md` `## Hot state` with the latest decision (≤2 lines, link to ADR ID).

**Never write:**

- Restate `CLAUDE.md` or `db-schema-architect` skill content into agent memory.
- An "anti-pattern" on a single occurrence — wait for the second hit, then record in `anti-patterns-seen.md`.
- Rewrite or prune `journal.md`. Append-only, ever.

**Journal entry format** (`journal.md`):

```
## YYYY-MM-DD HH:MM — <short title>
**Context:** one line on what was asked
**Decisions:** bullets (link ADR IDs where applicable)
**Files touched:** migration filenames, DDL files, etc.
**Open questions:** deferred items — mirror unresolved ones into MEMORY.md `## Open questions`
```

**Compression rule** (applies to every file _except_ `journal.md`): if the new entry refines or supersedes an existing one, **edit in place** with a supersede date — don't add.

#### Curation (run at end of every invocation)

- `MEMORY.md` ≤ 150 lines. Over budget → move stale `## Hot state` entries to `decisions.md` (they should already be ADRs); leave a one-line pointer.
- Topic files ≤ 400 lines each. Over budget → split by sub-domain or roll the oldest third into `archive/YYYY-Qn-<topic>.md`.
- `journal.md` is exempt from line caps but rolls quarterly into `archive/journal-YYYY-Qn.md` (copy then truncate; do not delete).
- Superseded ADRs in `decisions.md` → strike (`~~text~~`) with date + replacement ID. Never delete.
- `## Open questions` in `MEMORY.md`: prune resolved items, age unresolved ones with a date so stale questions become visible.

## Standing rules (apply on every invocation)

- [User rule of thumb: minimal / simple / in-scope (2026-05-01)](feedback_minimal_simple_in_scope.md) — minimal code · simpler-by-readable · strict scope discipline. **Hard guard, no exceptions.**
