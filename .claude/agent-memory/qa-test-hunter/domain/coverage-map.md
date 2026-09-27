# Coverage Map

Audit history by code region. Security-sensitive regions re-audit at 90 days, others at 180.

| Region                              | Last audited | By             | Findings                                        | Re-audit due |
| ----------------------------------- | ------------ | -------------- | ----------------------------------------------- | ------------ |
| src/app/[locale]/contact/actions.ts | 2026-08-01   | qa-test-hunter | SEC-001, CAND-002 (→ DEF-001), CAND-003         | 2026-10-30   |
| src/lib/schema.ts                   | 2026-08-01   | qa-test-hunter | CAND-002 → DEF-001 (read-only, not edited)      | 2026-10-30   |
| src/lib/sales-dashboard.ts          | 2026-09-27   | qa-test-hunter | CAND-005 (read-only hunt)                       | 2027-03-26   |
| src/lib/sales-dashboard-calc.ts     | 2026-09-27   | qa-test-hunter | (clean; 3 speculative asymmetries reported)     | 2027-03-26   |
| src/components/sales-dashboard.tsx  | 2026-09-27   | qa-test-hunter | DEF-001, GAP-001, CAND-004 (read-only hunt)     | 2027-03-26   |

Untested at 2026-09-27 (no coverage anywhere): `src/lib/content.ts` (MDX frontmatter validation — CLAUDE.md says it must fail the build loudly, unverified), `src/lib/contact-email.ts` (`escapeHtml` — the only XSS barrier for visitor input reaching email HTML), `src/app/api/superset/guest-token/route.ts` (only dynamic route in the app; handles credentials), `src/proxy.ts` (locale routing), and every file under `src/components/` (node-only Vitest, no DOM — see GAP-001). `src/lib/cube.ts` gained `cube.test.ts` between the two audits (not yet reviewed by this agent).
