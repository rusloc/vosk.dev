#!/usr/bin/env node
// Static inventory of a JS/TS web app codebase. Node standard library only; reads files, runs nothing.
// Usage: node scan.mjs <dir> [--json] [--min-dup 8] [--top 20]
// Output is a list of leads for a reviewer, produced by heuristics (regex and brace counting, no parser).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i === -1 ? dflt : Number(args[i + 1]);
};
const asJson = args.includes("--json");
const MIN_DUP = flag("--min-dup", 8);
const TOP = flag("--top", 20);
const positional = args.filter((a, i) => !a.startsWith("--") && !["--min-dup", "--top"].includes(args[i - 1]));
const root = path.resolve(positional[0] ?? ".");

const CODE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"];
const OTHER_EXT = [".vue", ".svelte", ".astro", ".css", ".scss", ".json"];
const SKIP_DIR = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit", ".turbo", ".vercel",
  ".cache", "coverage", "storybook-static", ".output", "vendor", "__generated__", "generated",
]);
const rel = (p) => path.relative(root, p).split(path.sep).join("/");

// ---------- collect ----------
const files = [];
const otherCounts = {};
(function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walk(full); continue; }
    const ext = path.extname(e.name);
    if (CODE_EXT.includes(ext)) {
      if (/\.d\.[cm]?ts$/.test(e.name) || /\.min\.[cm]?js$/.test(e.name)) continue;
      if (fs.statSync(full).size > 2_000_000) continue;
      files.push(full);
    } else if (OTHER_EXT.includes(ext)) otherCounts[ext] = (otherCounts[ext] ?? 0) + 1;
  }
})(root);

if (!files.length) {
  console.error(`No JS/TS source files under ${root}`);
  process.exit(1);
}

const src = new Map(files.map((f) => [f, fs.readFileSync(f, "utf8").split(/\r?\n/)]));
const isTest = (f) => /(\.|\/)(test|spec|stories)\.[cm]?[jt]sx?$|\/__tests__\/|\/__mocks__\//.test(rel(f));

// ---------- sizes ----------
const byExt = {};
let totalLines = 0;
const sizes = [];
for (const [f, lines] of src) {
  const n = lines.filter((l) => l.trim()).length;
  const ext = path.extname(f);
  byExt[ext] ??= { files: 0, lines: 0 };
  byExt[ext].files++; byExt[ext].lines += n;
  totalLines += n;
  sizes.push({ file: rel(f), lines: n });
}
sizes.sort((a, b) => b.lines - a.lines);

// ---------- long functions (brace counting; approximate) ----------
const FN_START = [
  /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]*)/,
  /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*(?::[^=]+)?=>\s*\{?\s*$/,
  /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:React\.)?(?:memo|forwardRef|useCallback)\(/,
  /^\s*(?:public|private|protected|static|async|override|\s)*([A-Za-z0-9_$]+)\s*\([^)]*\)\s*(?::[^{]+)?\{\s*$/,
];
const NOT_FN = new Set(["if", "for", "while", "switch", "catch", "return", "else", "do", "try", "with"]);
const strip = (l) => l.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""').replace(/\/\/.*$/, "");
const functions = [];
for (const [f, lines] of src) {
  for (let i = 0; i < lines.length; i++) {
    let name = null;
    for (const re of FN_START) { const m = re.exec(lines[i]); if (m) { name = m[1] || "(anonymous)"; break; } }
    if (!name || NOT_FN.has(name)) continue;
    let depth = 0, opened = false, j = i;
    for (; j < lines.length && j < i + 2000; j++) {
      for (const ch of strip(lines[j])) {
        if (ch === "{") { depth++; opened = true; } else if (ch === "}") depth--;
      }
      if (opened && depth <= 0) break;
      if (!opened && j > i + 6) break;
    }
    if (opened && j - i + 1 >= 30) functions.push({ file: rel(f), name, line: i + 1, lines: j - i + 1 });
  }
}
functions.sort((a, b) => b.lines - a.lines);

// ---------- duplicated blocks ----------
const NOISE = /^(?:[{}()\[\];,]*|import\b.*|export\s+\*.*|export\s+\{[^}]*\}\s*from.*|\/\/.*|\/?\*.*|\*\/|<\/?[A-Za-z.]*>?|\);?|\}\);?|else\s*\{?|return;?)$/;
const norm = new Map();
for (const [f, lines] of src) {
  const kept = [];
  lines.forEach((l, i) => {
    const t = l.trim().replace(/\s+/g, " ");
    if (t && !NOISE.test(t)) kept.push({ t, line: i + 1 });
  });
  norm.set(f, kept);
}
const windows = new Map();
for (const [f, kept] of norm) {
  for (let i = 0; i + MIN_DUP <= kept.length; i++) {
    const h = crypto.createHash("sha1").update(kept.slice(i, i + MIN_DUP).map((k) => k.t).join("\n")).digest("base64");
    if (!windows.has(h)) windows.set(h, []);
    windows.get(h).push({ f, i });
  }
}
const at = new Map();
for (const [h, locs] of windows) if (locs.length > 1) for (const l of locs) at.set(`${l.f}#${l.i}`, h);
const seen = new Set();
const dups = [];
for (const [f, kept] of norm) {
  for (let i = 0; i + MIN_DUP <= kept.length; i++) {
    const key = `${f}#${i}`;
    const h = at.get(key);
    if (!h || seen.has(key)) continue;
    const locs = windows.get(h);
    let len = 0;
    while (true) {
      const next = at.get(`${f}#${i + len + 1}`);
      if (!next) break;
      const nl = windows.get(next);
      if (nl.length !== locs.length || !locs.every((l) => nl.some((n) => n.f === l.f && n.i === l.i + len + 1))) break;
      len++;
    }
    for (const l of locs) for (let k = 0; k <= len; k++) seen.add(`${l.f}#${l.i + k}`);
    const size = MIN_DUP + len;
    dups.push({
      lines: size,
      copies: locs.map((l) => {
        const k = norm.get(l.f);
        return `${rel(l.f)}:${k[l.i].line}-${k[Math.min(l.i + size - 1, k.length - 1)].line}`;
      }),
      tests: locs.every((l) => isTest(l.f)),
    });
  }
}
dups.sort((a, b) => b.lines * (b.copies.length - 1) - a.lines * (a.copies.length - 1));
const dupLines = dups.reduce((s, d) => s + d.lines * (d.copies.length - 1), 0);

// ---------- imports ----------
let aliases = [];
for (const cfg of ["tsconfig.json", "jsconfig.json"]) {
  try {
    const raw = fs.readFileSync(path.join(root, cfg), "utf8").replace(/("(?:\\.|[^"\\])*")|\/\/.*$|\/\*[\s\S]*?\*\//gm, (m, str) => str ?? "").replace(/,(\s*[}\]])/g, "$1");
    const co = JSON.parse(raw).compilerOptions ?? {};
    const base = path.resolve(root, co.baseUrl ?? ".");
    for (const [k, v] of Object.entries(co.paths ?? {})) {
      if (v?.[0]) aliases.push({ prefix: k.replace(/\*$/, ""), target: path.resolve(base, v[0].replace(/\*$/, "")) });
    }
    break;
  } catch { /* no config or not parseable: aliases stay unresolved */ }
}
const fileSet = new Set(files);
const resolveSpec = (from, spec) => {
  let base = null;
  if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else { const a = aliases.find((x) => spec.startsWith(x.prefix)); if (a) base = path.join(a.target, spec.slice(a.prefix.length)); }
  if (!base) return null;
  const stem = base.replace(/\.[cm]?js$/, "");
  for (const c of [base, ...CODE_EXT.map((e) => stem + e), ...CODE_EXT.map((e) => path.join(base, "index" + e))]) if (fileSet.has(c)) return c;
  return null;
};
const IMPORT_RE = /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)(["'])([^"']+)\1/gm;
const out = new Map(files.map((f) => [f, new Set()]));
const fanIn = new Map(files.map((f) => [f, 0]));
const external = {};
const deep = [];
const barrels = [];
for (const [f, lines] of src) {
  const text = lines.join("\n");
  let m, maxUp = 0;
  while ((m = IMPORT_RE.exec(text))) {
    const spec = m[2];
    maxUp = Math.max(maxUp, (spec.match(/\.\.\//g) ?? []).length);
    const target = resolveSpec(f, spec);
    if (target && target !== f) out.get(f).add(target);
    else if (!spec.startsWith(".") && !aliases.some((a) => spec.startsWith(a.prefix))) {
      const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
      external[pkg] = (external[pkg] ?? 0) + 1;
    }
  }
  if (maxUp >= 3) deep.push({ file: rel(f), up: maxUp });
  const body = lines.map((l) => l.trim()).filter((l) => l && !l.startsWith("//"));
  const reexports = body.filter((l) => /^export\s+(\*|\{[^}]*\})\s+from\b|^export\s+\*\s+as\b/.test(l)).length;
  if (/^index\.[cm]?[jt]sx?$/.test(path.basename(f)) && reexports >= 3 && reexports / body.length >= 0.7) {
    barrels.push({ file: rel(f), reexports, wildcard: body.some((l) => /^export\s+\*/.test(l)) });
  }
}
for (const targets of out.values()) for (const t of targets) fanIn.set(t, fanIn.get(t) + 1);
for (const b of barrels) b.importers = fanIn.get(path.join(root, b.file)) ?? 0;

// cycles: Tarjan strongly connected components, iterative
const cycles = [];
{
  let idx = 0;
  const index = new Map(), low = new Map(), onStack = new Set(), stack = [];
  for (const start of files) {
    if (index.has(start)) continue;
    const work = [[start, [...out.get(start)], 0]];
    index.set(start, idx); low.set(start, idx++); stack.push(start); onStack.add(start);
    while (work.length) {
      const frame = work[work.length - 1];
      const [v, succ] = frame;
      if (frame[2] < succ.length) {
        const w = succ[frame[2]++];
        if (!index.has(w)) {
          index.set(w, idx); low.set(w, idx++); stack.push(w); onStack.add(w);
          work.push([w, [...out.get(w)], 0]);
        } else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
      } else {
        work.pop();
        if (work.length) { const p = work[work.length - 1][0]; low.set(p, Math.min(low.get(p), low.get(v))); }
        if (low.get(v) === index.get(v)) {
          const comp = [];
          let w;
          do { w = stack.pop(); onStack.delete(w); comp.push(rel(w)); } while (w !== v);
          if (comp.length > 1) cycles.push(comp.reverse());
        }
      }
    }
  }
  cycles.sort((a, b) => b.length - a.length);
}

const ENTRY = /(^|\/)(index|main|app|_app|_document|page|layout|route|template|loading|error|not-found|middleware|server|client|entry[^/]*|setup[^/]*|instrumentation)\.[cm]?[jt]sx?$|\.config\.[cm]?[jt]s$|(^|\/)(pages|app|routes|scripts|bin)\//i;
const orphans = files.filter((f) => fanIn.get(f) === 0 && !isTest(f) && !ENTRY.test(rel(f))).map(rel);
const top = (m, n = TOP) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const dirCounts = {};
for (const f of files) { const d = path.dirname(rel(f)); dirCounts[d] = (dirCounts[d] ?? 0) + 1; }

const report = {
  root,
  totals: { files: files.length, lines: totalLines, byExt, other: otherCounts },
  largestFiles: sizes.slice(0, TOP),
  longestFunctions: functions.slice(0, TOP),
  duplication: {
    minBlock: MIN_DUP, blocks: dups.length, duplicatedLines: dupLines,
    share: +((dupLines / totalLines) * 100).toFixed(1), top: dups.slice(0, TOP),
  },
  imports: {
    aliasesResolved: aliases.map((a) => a.prefix),
    fanIn: top(fanIn).filter(([, n]) => n > 0).map(([f, n]) => ({ file: rel(f), importers: n })),
    fanOut: top(new Map([...out].map(([f, s]) => [f, s.size]))).filter(([, n]) => n > 0).map(([f, n]) => ({ file: rel(f), imports: n })),
    cycles, deepRelative: deep.sort((a, b) => b.up - a.up).slice(0, TOP), barrels,
    noImporters: orphans.slice(0, TOP * 2), noImportersTotal: orphans.length,
    externalPackages: Object.entries(external).sort((a, b) => b[1] - a[1]).slice(0, TOP * 2),
  },
  crowdedFolders: Object.entries(dirCounts).filter(([, n]) => n >= 20).sort((a, b) => b[1] - a[1]),
};

if (asJson) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

const h = (t) => console.log(`\n== ${t} ==`);
console.log(`Scan of ${root}`);
console.log(`${files.length} source files, ${totalLines} non-blank lines`);
for (const [e, v] of Object.entries(byExt)) console.log(`  ${e.padEnd(5)} ${String(v.files).padStart(5)} files ${String(v.lines).padStart(7)} lines`);
if (Object.keys(otherCounts).length) console.log(`  other: ${Object.entries(otherCounts).map(([e, n]) => `${n} ${e}`).join(", ")}`);
h(`Largest files (top ${TOP})`);
for (const s of report.largestFiles) console.log(`${String(s.lines).padStart(6)}  ${s.file}`);
h("Longest functions, 30+ lines (approximate)");
for (const f of report.longestFunctions) console.log(`${String(f.lines).padStart(6)}  ${f.file}:${f.line}  ${f.name}`);
h(`Duplicated blocks of ${MIN_DUP}+ normalized lines: ${dups.length} blocks, ${dupLines} redundant lines (${report.duplication.share}%)`);
for (const d of report.duplication.top) {
  console.log(`${String(d.lines).padStart(6)} lines × ${d.copies.length} copies${d.tests ? " (tests only)" : ""}`);
  for (const c of d.copies) console.log(`          ${c}`);
}
h("Most imported files (fan-in)");
for (const f of report.imports.fanIn) console.log(`${String(f.importers).padStart(6)}  ${f.file}`);
h("Files importing the most local modules (fan-out)");
for (const f of report.imports.fanOut) console.log(`${String(f.imports).padStart(6)}  ${f.file}`);
h(`Import cycles: ${cycles.length}`);
for (const c of cycles.slice(0, TOP)) console.log(`  [${c.length}] ${c.slice(0, 8).join(" -> ")}${c.length > 8 ? " -> ..." : ""}`);
h("Deep relative imports (3+ levels up)");
for (const d of report.imports.deepRelative) console.log(`${String(d.up).padStart(6)}  ${d.file}`);
h(`Barrel files: ${barrels.length}`);
for (const b of barrels) console.log(`  ${b.file}  ${b.reexports} re-exports, ${b.importers} importers${b.wildcard ? ", uses export *" : ""}`);
h(`Files with no local importer (not entries or tests): ${orphans.length}`);
for (const o of report.imports.noImporters) console.log(`  ${o}`);
h("Crowded folders (20+ source files)");
for (const [d, n] of report.crowdedFolders) console.log(`${String(n).padStart(6)}  ${d}`);
h("External packages by import count");
console.log("  " + report.imports.externalPackages.map(([p, n]) => `${p} (${n})`).join(", "));
console.log(`\nAliases resolved: ${aliases.length ? aliases.map((a) => a.prefix).join(", ") : "none (alias imports are not in the graph)"}`);
