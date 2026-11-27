# QA Test Hunter — Memory Index

## Collaboration

- [Feedback: scope discipline](feedback_scope_discipline.md) — report bugs don't fix them; never `pnpm format`; tree is dirty, user edits concurrently
- [Project: test bootstrap](project_test_bootstrap.md) — Vitest 4 node-only, 4 suites / 146 tests at 2026-09-27; components untestable; expires 2026-11-01

## Domain

<!-- format: <file> — N entries · <fresh>/<verified>/<aging> · hot: <top-3 IDs by score> · <PREFIX>-NNN -->
<!-- buckets: fresh = Last-verified <60d, verified = 60–180d, aging = >180d -->

- [defect-patterns.md](domain/defect-patterns.md) — 2 entries · 2/0/0 · hot: DEF-001, GAP-001 · DEF-NNN + GAP-NNN (gaps folded in, `kind:` field)
- [test-infra-quirks.md](domain/test-infra-quirks.md) — 1 entry · 1/0/0 · hot: INFRA-001 · INFRA-NNN
- [mock-conventions.md](domain/mock-conventions.md) — 1 entry · 1/0/0 · hot: MOCK-001 · MOCK-NNN
- [security-findings.md](domain/security-findings.md) — 3 entries · 3/0/0 · hot: SEC-001, SEC-002, SEC-003 · SEC-NNN
- [candidates.md](domain/candidates.md) — 5 awaiting second hit (CAND-001, 003, 004, 005, 006); CAND-002 promoted → DEF-001
- [coverage-map.md](domain/coverage-map.md) — last pass 2026-11-27 (Telegram live chat, uncommitted, schema not applied; read-only)
- [templates/](domain/templates/) — MOCK-001.server-action.ts

## Open questions

- 2026-08-01: `src/lib/contact-email.ts` `escapeHtml` is the only barrier between visitor input and email HTML, and has zero tests — propose covering it next?
- 2026-08-01: CLAUDE.md says invalid MDX frontmatter must "fail the build loudly" — unverified, `src/lib/content.ts` has no tests.
- 2026-09-27: `components/sales-dashboard.tsx` view logic (caption, `partialYear`, `Delta` tone, `monthLabel`) is unreachable by the node-only suite — lift into a pure `lib/` module (GAP-001), or accept it stays report-only?
- 2026-11-27: live chat `store.ts` SQL is never executed by a test (the store is faked) — accept until the schema is applied, or add a Postgres-backed suite?
