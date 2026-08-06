# Coverage Map

Audit history by code region. Security-sensitive regions re-audit at 90 days, others at 180.

| Region                              | Last audited | By             | Findings                         | Re-audit due |
| ----------------------------------- | ------------ | -------------- | -------------------------------- | ------------ |
| src/app/[locale]/contact/actions.ts | 2026-08-01   | qa-test-hunter | SEC-001, CAND-002, CAND-003      | 2026-10-30   |
| src/lib/schema.ts                   | 2026-08-01   | qa-test-hunter | CAND-002 (read-only, not edited) | 2026-10-30   |

Untested at 2026-08-01 (no coverage anywhere): `src/lib/content.ts` (MDX frontmatter validation — CLAUDE.md says it must fail the build loudly, unverified), `src/lib/contact-email.ts` (`escapeHtml` — the only XSS barrier for visitor input reaching email HTML), `src/app/api/superset/guest-token/route.ts` (only dynamic route in the app; handles credentials), `src/proxy.ts` (locale routing).
