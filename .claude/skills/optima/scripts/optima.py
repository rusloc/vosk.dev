#!/usr/bin/env python3
"""optima.py - memory and Optima stores for any agent on any project. Standard library only.

Stores (plain Markdown):
  memory.md  project facts and work done        <root>/memory.md
  optima.md  field knowledge: gotcha, oops, aha  $OPTIMA_FILE or <root>/optima.md
Root: --root, else $OPTIMA_DIR, else ./.optima

Commands:
  start                      create missing stores, then print memory and the active Optima digest
  add    --kind K --area A --title T --finding F --do D [--evidence E] [--status S] [--scope general|project] [--new]
                             refuses a near-duplicate title in the same area: confirm the existing entry, or pass --new
  confirm ID [--evidence E]  mark an entry seen again (becomes confirmed)
  retire  ID --why W         mark an entry no longer true
  find   [TERMS...] [--area A] [--kind K] [--all] [--full]
  log    TEXT                append a dated line to the memory work log
  check                      validate both stores
  paths                      print resolved paths
"""
import argparse
import datetime
import os
import pathlib
import re
import shutil
import sys

KINDS = ("gotcha", "oops", "aha")
AREAS = ("arch", "code", "data", "sql", "api", "ai", "config", "runtime", "deps", "test",
         "perf", "security", "ui", "delivery", "ops", "tooling", "docs")
STATUSES = ("suspected", "confirmed", "retired")
LIMITS = {"title": 90, "finding": 280, "do": 200, "evidence": 200}
MEMORY_SECTIONS = ("## Project", "## Components", "## Data and integrations", "## Benchmarks",
                   "## Decisions", "## Open items", "## Work log")
HEAD = re.compile(r"^### (O-\d{4}) \| (\w+) \| ([\w-]+) \| (.+)$")
SECRET = re.compile(r"(?i)(password|pwd|secret|api[_-]?key|token)\s*[=:]\s*\S+|eyJ[A-Za-z0-9_-]{20,}")
ASSETS = pathlib.Path(__file__).resolve().parent.parent / "assets"


def paths(root=None):
    root = pathlib.Path(root or os.environ.get("OPTIMA_DIR") or ".optima")
    optima = pathlib.Path(os.environ["OPTIMA_FILE"]) if os.environ.get("OPTIMA_FILE") else root / "optima.md"
    return root, root / "memory.md", optima


def today(args):
    return getattr(args, "date", None) or datetime.date.today().isoformat()


def fail(msg):
    sys.exit(f"optima: {msg}")


def guard(**fields):
    for name, text in fields.items():
        if text is None:
            continue
        if "\n" in text:
            fail(f"{name} must be one line")
        if name in LIMITS and len(text) > LIMITS[name]:
            fail(f"{name} is {len(text)} chars, limit {LIMITS[name]}: tighten it")
        if SECRET.search(text):
            fail(f"{name} looks like it contains a secret; remove it")


def init(root, memory, optima):
    root.mkdir(parents=True, exist_ok=True)
    created = []
    if not memory.exists():
        shutil.copy(ASSETS / "memory.template.md", memory)
        created.append(str(memory))
    if not optima.exists():
        optima.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(ASSETS / "optima.seed.md", optima)
        created.append(str(optima))
    return created


def load(optima):
    """Return (preamble_lines, entries). Each entry: dict with id, kind, area, title, fields, meta."""
    pre, entries, cur = [], [], None
    for line in optima.read_text(encoding="utf-8").splitlines():
        m = HEAD.match(line)
        if m:
            cur = {"id": m[1], "kind": m[2], "area": m[3], "title": m[4].strip(), "fields": {}, "meta": {}}
            entries.append(cur)
        elif cur is None:
            pre.append(line)
        elif line.startswith("- meta:"):
            cur["meta"] = dict(p.strip().split("=", 1) for p in line[7:].split(";") if "=" in p)
        elif line.startswith("- ") and ":" in line:
            key, val = line[2:].split(":", 1)
            cur["fields"][key.strip()] = val.strip()
    return pre, entries


def render(e):
    out = [f"### {e['id']} | {e['kind']} | {e['area']} | {e['title']}"]
    for key in ("finding", "do", "evidence", "retired"):
        if e["fields"].get(key):
            out.append(f"- {key}: {e['fields'][key]}")
    out.append("- meta: " + "; ".join(f"{k}={e['meta'][k]}" for k in ("status", "seen", "first", "last", "scope")))
    return "\n".join(out)


def save(optima, pre, entries):
    while pre and not pre[-1].strip():
        pre.pop()
    body = "\n\n".join(render(e) for e in entries)
    optima.write_text("\n".join(pre) + "\n\n" + body + "\n", encoding="utf-8")


STOP = {"the", "and", "for", "with", "not", "are", "from", "that", "this", "when", "into", "does"}


def tokens(text):
    return {w for w in re.findall(r"[a-z0-9_]+", text.lower()) if len(w) > 2 and w not in STOP}


def similar(a, b):
    ta, tb = tokens(a), tokens(b)
    return len(ta & tb) / max(1, len(ta | tb))


def digest(e, full=False):
    m = e["meta"]
    line = f"{e['id']} [{e['kind']}/{e['area']}/{m.get('status')} x{m.get('seen')}] {e['title']}\n    do: {e['fields'].get('do', '')}"
    if full:
        line += f"\n    finding: {e['fields'].get('finding', '')}\n    evidence: {e['fields'].get('evidence', '')}"
    return line


def cmd_start(args):
    root, memory, optima = paths(args.root)
    for p in init(root, memory, optima):
        print(f"created {p}")
    print(f"===== MEMORY ({memory}) =====")
    print(memory.read_text(encoding="utf-8").rstrip())
    _, entries = load(optima)
    active = [e for e in entries if e["meta"].get("status") != "retired"]
    print(f"\n===== OPTIMA ({optima}): {len(active)} active entries =====")
    for e in active:
        print(digest(e))


def cmd_add(args):
    if args.kind not in KINDS:
        fail(f"kind must be one of {KINDS}")
    if args.area not in AREAS:
        fail(f"area must be one of {AREAS}")
    guard(title=args.title, finding=args.finding, do=args.do, evidence=args.evidence)
    root, memory, optima = paths(args.root)
    init(root, memory, optima)
    pre, entries = load(optima)
    day = today(args)
    if not args.new:
        for e in entries:
            if e["area"] == args.area and e["meta"].get("status") != "retired" and similar(e["title"], args.title) >= 0.5:
                print(f"not added: similar to {e['id']}: {e['title']}")
                print(f"  same finding  -> optima.py confirm {e['id']} --evidence \"...\"")
                print("  different one -> repeat the add command with --new")
                sys.exit(2)
    next_id = max([int(e["id"][2:]) for e in entries] or [0]) + 1
    entry = {
        "id": f"O-{next_id:04d}", "kind": args.kind, "area": args.area, "title": args.title.strip(),
        "fields": {"finding": args.finding, "do": args.do, "evidence": args.evidence or ""},
        "meta": {"status": args.status, "seen": "1", "first": day, "last": day, "scope": args.scope},
    }
    entries.append(entry)
    save(optima, pre, entries)
    print(f"added {entry['id']}: {entry['title']}")


def find_entry(entries, entry_id):
    for e in entries:
        if e["id"] == entry_id:
            return e
    fail(f"no entry {entry_id}")


def cmd_confirm(args):
    guard(evidence=args.evidence)
    _, _, optima = paths(args.root)
    pre, entries = load(optima)
    e = find_entry(entries, args.id)
    e["meta"].update(seen=str(int(e["meta"].get("seen", "1")) + 1), last=today(args), status="confirmed")
    if args.evidence:
        e["fields"]["evidence"] = args.evidence
    save(optima, pre, entries)
    print(f"confirmed {e['id']} (seen x{e['meta']['seen']})")


def cmd_retire(args):
    guard(evidence=args.why)
    _, _, optima = paths(args.root)
    pre, entries = load(optima)
    e = find_entry(entries, args.id)
    e["meta"].update(status="retired", last=today(args))
    e["fields"]["retired"] = args.why
    save(optima, pre, entries)
    print(f"retired {e['id']}")


def cmd_find(args):
    _, _, optima = paths(args.root)
    _, entries = load(optima)
    terms = [t.lower() for t in args.terms]
    hits = []
    for e in entries:
        if not args.all and e["meta"].get("status") == "retired":
            continue
        if args.area and e["area"] != args.area:
            continue
        if args.kind and e["kind"] != args.kind:
            continue
        text = " ".join([e["title"], *e["fields"].values()]).lower()
        if all(t in text for t in terms):
            hits.append(e)
    for e in hits:
        print(digest(e, args.full))
    print(f"{len(hits)} match(es)")


def cmd_log(args):
    guard(log=args.text)
    root, memory, optima = paths(args.root)
    init(root, memory, optima)
    text = memory.read_text(encoding="utf-8").rstrip()
    if "## Work log" not in text:
        text += "\n\n## Work log"
    memory.write_text(f"{text}\n- {today(args)}: {args.text}\n", encoding="utf-8")
    print("logged")


def cmd_check(args):
    root, memory, optima = paths(args.root)
    problems = []
    if not memory.exists() or not optima.exists():
        fail("stores missing; run: optima.py start")
    mem = memory.read_text(encoding="utf-8")
    for section in MEMORY_SECTIONS:
        if section not in mem:
            problems.append(f"memory: missing section '{section}'")
    heads = [l for l in mem.splitlines() if l.startswith("## ")]
    if heads and heads[-1] != "## Work log":
        problems.append("memory: '## Work log' must be the last section")
    if len(mem.splitlines()) > 200:
        problems.append("memory: over 200 lines; fold old work-log lines into Decisions and Benchmarks")
    if SECRET.search(mem):
        problems.append("memory: possible secret")
    _, entries = load(optima)
    seen_ids = set()
    for e in entries:
        tag = e["id"]
        if tag in seen_ids:
            problems.append(f"{tag}: duplicate id")
        seen_ids.add(tag)
        if e["kind"] not in KINDS:
            problems.append(f"{tag}: bad kind {e['kind']}")
        if e["area"] not in AREAS:
            problems.append(f"{tag}: bad area {e['area']}")
        for key in ("finding", "do"):
            if not e["fields"].get(key):
                problems.append(f"{tag}: missing {key}")
        for key, limit in LIMITS.items():
            value = e["title"] if key == "title" else e["fields"].get(key, "")
            if len(value) > limit:
                problems.append(f"{tag}: {key} over {limit} chars")
        if e["meta"].get("status") not in STATUSES:
            problems.append(f"{tag}: bad status")
        for key in ("seen", "first", "last", "scope"):
            if key not in e["meta"]:
                problems.append(f"{tag}: meta missing {key}")
    for p in problems:
        print(p)
    print(f"{len(entries)} optima entries, {len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


def cmd_paths(args):
    root, memory, optima = paths(args.root)
    print(f"root:   {root.resolve()}\nmemory: {memory.resolve()}\noptima: {optima.resolve()}")


def main():
    p = argparse.ArgumentParser(prog="optima.py", description="memory and Optima stores for any agent on any project")
    p.add_argument("--root", help="store folder (default $OPTIMA_DIR or ./.optima)")
    p.add_argument("--date", help="override today's date (YYYY-MM-DD)")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("start").set_defaults(fn=cmd_start)
    a = sub.add_parser("add")
    a.add_argument("--kind", required=True); a.add_argument("--area", required=True)
    a.add_argument("--title", required=True); a.add_argument("--finding", required=True)
    a.add_argument("--do", required=True); a.add_argument("--evidence")
    a.add_argument("--status", default="suspected", choices=("suspected", "confirmed"))
    a.add_argument("--scope", default="general", choices=("general", "project"))
    a.add_argument("--new", action="store_true", help="skip duplicate merging")
    a.set_defaults(fn=cmd_add)
    c = sub.add_parser("confirm"); c.add_argument("id"); c.add_argument("--evidence"); c.set_defaults(fn=cmd_confirm)
    r = sub.add_parser("retire"); r.add_argument("id"); r.add_argument("--why", required=True); r.set_defaults(fn=cmd_retire)
    f = sub.add_parser("find")
    f.add_argument("terms", nargs="*"); f.add_argument("--area"); f.add_argument("--kind")
    f.add_argument("--all", action="store_true"); f.add_argument("--full", action="store_true")
    f.set_defaults(fn=cmd_find)
    l = sub.add_parser("log"); l.add_argument("text"); l.set_defaults(fn=cmd_log)
    sub.add_parser("check").set_defaults(fn=cmd_check)
    sub.add_parser("paths").set_defaults(fn=cmd_paths)
    args = p.parse_args()
    try:
        args.fn(args)
    except BrokenPipeError:
        sys.exit(0)


if __name__ == "__main__":
    main()
