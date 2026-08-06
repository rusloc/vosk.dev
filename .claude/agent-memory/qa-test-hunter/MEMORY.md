# QA Test Hunter — Memory Index

## Collaboration

- [Feedback: scope discipline](feedback_scope_discipline.md) — report bugs don't fix them; never `pnpm format`; tree is dirty, user edits concurrently
- [Project: test bootstrap 2026-08-01](project_test_bootstrap.md) — Vitest 4 only, one suite (contact action); expires 2026-11-01

## Domain

<!-- format: <file> — N entries · <fresh>/<verified>/<aging> · hot: <top-3 IDs by score> · <PREFIX>-NNN -->
<!-- buckets: fresh = Last-verified <60d, verified = 60–180d, aging = >180d -->

- [test-infra-quirks.md](domain/test-infra-quirks.md) — 1 entry · 1/0/0 · hot: INFRA-001 · INFRA-NNN
- [mock-conventions.md](domain/mock-conventions.md) — 1 entry · 1/0/0 · hot: MOCK-001 · MOCK-NNN
- [security-findings.md](domain/security-findings.md) — 1 entry · 1/0/0 · hot: SEC-001 · SEC-NNN
- [candidates.md](domain/candidates.md) — 3 awaiting second hit
- [coverage-map.md](domain/coverage-map.md) — last pass 2026-08-01 (contact action only)
- [templates/](domain/templates/) — MOCK-001.server-action.ts

## Open questions

- 2026-08-01: `src/lib/contact-email.ts` `escapeHtml` is the only barrier between visitor input and email HTML, and has zero tests — propose covering it next?
- 2026-08-01: CLAUDE.md says invalid MDX frontmatter must "fail the build loudly" — unverified, `src/lib/content.ts` has no tests.
