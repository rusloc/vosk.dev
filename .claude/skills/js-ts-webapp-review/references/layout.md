# Layout: files and folders

A good layout lets someone find the code for a feature without search, change it without touching unrelated folders,
and delete it by removing one directory. Judge the layout against those three tests, not against a favourite template.

## First, name the scheme in use

Work out which scheme the repo follows, then judge consistency with it:

- **By feature** (`features/checkout/{components,hooks,api,types}`): scales well; watch for a swollen `shared/`.
- **By type** (`components/`, `hooks/`, `utils/`, `services/`): fine when small; past a few dozen files per folder a
  feature is smeared across the tree.
- **By layer** (`domain/`, `application/`, `infrastructure/`, `ui/`): watch import direction.
- **Framework-routed** (`app/` or `pages/`): routes are fixed by the framework; judge what sits beside them.

A mixed scheme with no rule is the finding. Recommend the smallest move toward the scheme that already dominates;
do not propose a rewrite of the tree.

## Checks

**Folders**
- Dumping grounds: `utils/`, `helpers/`, `common/`, `lib/`, `shared/`, `misc/` with unrelated files. Report the count
  and the three or four natural groups hiding inside.
- Folders with one file, or nesting deeper than about five levels below `src`.
- Folders past roughly 20 to 25 sibling files with no substructure.
- Two folders for one concept (`services/` and `api/`, `types/` and `models/`, `hooks/` in three places).
- Dead areas: files with zero importers (scan fan-in), `old/`, `backup/`, `*.bak`, `*copy*`, commented-out modules.

**Files**
- Size: over ~300 lines for a module or ~200 for a component is a lead to open, not a verdict.
- More than one unrelated export per file; a component file that also exports helpers, constants and types used elsewhere.
- Name does not match the main export; mixed case conventions (`UserCard.tsx`, `user-list.tsx`, `userForm.tsx`) in one folder.
- `.js` and `.ts` side by side for the same module; stray `.d.ts` covering code the repo owns.
- Tests, stories and styles: colocated or in a mirror tree, either is fine, but one rule across the repo.
- Giant `types.ts`, `constants.ts` or `index.ts` that everything imports: a change there rebuilds and re-checks everything.

**Imports and boundaries**
- Direction: UI may import domain; domain must not import UI, framework or transport code. Shared code must not import
  from features. List every violation path.
- Cross-feature reach-ins: `features/a` importing `features/b/components/internal/X`. Fix: a public entry point per
  feature, or move the shared part down.
- Cycles (from the scan). Each cycle is at least P1: cycles cause undefined-at-import bugs and slow tooling.
- Deep relative imports (`../../../../`). Fix: path aliases in `tsconfig` and the bundler, used consistently.
- Barrels: one per public boundary is reasonable; a barrel in every folder, or a barrel that re-exports a barrel, is not.
- Server and client code mixed in one module in SSR or RSC apps, with no naming or folder rule separating them.

**Config and root**
- Root clutter: scripts, one-off files and several configs for one tool.
- Config duplicated across packages with no shared base (`tsconfig`, ESLint, test config).
- Environment access scattered (`process.env.X` in dozens of files) instead of one typed config module.

**Monorepos**
- Apps importing from another app; packages importing from apps.
- Imports by relative path across package boundaries instead of the package name.
- A `shared` or `common` package that every other package depends on and that changes weekly.
- Missing or wrong `exports` and `sideEffects` fields, which block tree shaking.

## Reporting layout findings

Show the current shape and the proposed shape as two short trees, at most about 15 lines each, and give the moves
as a list (`git mv a b`) so the cost is visible. State how many files and import sites each move touches.
