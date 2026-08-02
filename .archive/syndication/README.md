# Archived: blog/showcase auto-posting (Dev.to + LinkedIn)

**Pulled from deployable code on 2026-08-02.** Built 2026-08-01; never ran against a live
account. Archived rather than deleted — the code was still untracked at the time, so deleting
it would have destroyed it with no git history to recover from.

Decision record: [`ADR-0004`](../../docs/architecture/decisions/ADR-0004-syndication-devto-linkedin.md)
· Operator guide: [`docs/04-syndication.md`](../../docs/04-syndication.md)

## What this was

A CLI + GitHub Actions pipeline that turned new blog posts and work showcases into a
deterministically generated teaser + CTA, then posted them to Dev.to and a personal LinkedIn
profile — driving click-through back to vosk.dev rather than cross-posting full text.
The teaser was generated without an LLM on purpose: the CI approval gate is only meaningful
if the dry run and the publish emit byte-identical text.

## Layout here vs. where it came from

| Archived path | Original path |
| --- | --- |
| `lib/` | `src/lib/syndication/` |
| `scripts/syndicate.mts` | `scripts/syndicate.mts` |
| `workflows/syndicate.yml` | `.github/workflows/syndicate.yml` |
| `syndication.json` | `syndication.json` (repo root — state store, "git as DB") |

`lib/syndication.test.ts` holds the 38 tests that came with the feature. They no longer run:
Vitest only collects `src/**/*.test.ts`.

## What was removed alongside it

- `package.json` — the `syndicate` script and the `tsx` devDependency (used by nothing else).
- `src/lib/work.ts` — `draft?: boolean` on `Showcase`, and `draft: true` on `retail-sales`.
  Only syndication read that flag; `/work` renders draft entries normally. It existed so an
  automated post could never announce "this is a placeholder case study" under the author's name.
- `vitest.config.mts` — the clause explaining that `scripts/syndicate.ts` needed the same
  `react-server` condition.

## To restore

1. `lib/` → `src/lib/syndication/`, `scripts/syndicate.mts` → `scripts/`,
   `workflows/syndicate.yml` → `.github/workflows/`, `syndication.json` → repo root.
2. Re-add to `package.json`:
   `"syndicate": "node --import tsx --conditions=react-server scripts/syndicate.mts"` and
   `"tsx": "^4.20.6"` under devDependencies.
3. Re-add `draft?: boolean` to `ShowcaseBase` in `src/lib/work.ts` if you still want placeholder
   entries held back from posting.
4. Drop `.archive` from the ignore lists in `tsconfig.json`, `eslint.config.mjs`, `.prettierignore`
   — or just move the files out first, which is simpler.
5. Re-create the protected `syndication` GitHub environment and its secrets. The workflow's
   publish job is gated on it and will not run without it.

## Known standing costs, if it ever comes back

- **The LinkedIn token expires every 60 days**, and non-MDP apps get no refresh token — manual
  re-auth, forever. This is the way the feature dies quietly. 401s are tagged with an explicit hint.
- Dev.to's API was stable as of 2026-08-01; LinkedIn's Company Page path needs a registered legal
  entity and two-tier review, which is why this used a personal profile (`w_member_social`).
