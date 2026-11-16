# ADR-0002 — One `/work` showcase post per dashboard; no `/dashboards` section

- **Status:** accepted
- **Date:** 2026-07-31
- **Affects:** `docs/02-implementation-map.md`
- **Unaffected by `ADR-0003`** — this decision is about site structure, not about where Superset runs, and survived the hosting reversal untouched.

## Context

The original spec proposed two new pages: a `/dashboards` gallery listing embedded Superset
dashboards, and a `/dashboards/{slug}` viewer.

The site already has that surface. [`/work`](../../../src/app/%5Blocale%5D/work/) lists client
dashboards as case studies, `/work/{slug}` renders the write-up with the live report embedded
beneath it, and the registry in [`src/lib/work.ts`](../../../src/lib/work.ts) already carries a
`superset` value in `ShowcasePlatform` — the platform was anticipated, only the embedding mechanism
was missing.

A parallel `/dashboards` section would mean two registries, two list pages, two detail templates,
two entries in the nav and the sitemap, and an ongoing question for the reader: what is the
difference between a "showcase" and a "dashboard"? There isn't one.

## Decision

Each Superset dashboard is a **post under `/work`**, indistinguishable in navigation from the
Power BI case studies. No `/dashboards` route. The registry stays
[`src/lib/work.ts`](../../../src/lib/work.ts); Superset becomes a variant of the existing
`Showcase` type rather than a new type beside it.

## Consequences

**`Showcase` becomes a discriminated union.** A Power BI card embeds a public "publish to web" URL
and can offer an "open in a new tab" link. A Superset card has neither: it has an embed UUID and
mints a short-lived guest token per viewer. Carrying an `embedUrl` that is meaningless for half the
entries invites exactly the bug the union prevents — the type system now forces the call site to
branch.

**One consumer changes.** `embedUrl` and `href` are read only by
[`work/[slug]/page.tsx`](../../../src/app/%5Blocale%5D/work/%5Bslug%5D/page.tsx). `showcase-card.tsx`,
`showcase-list.tsx` and `report-mock.tsx` read `platform` and `metric` only, and are untouched.

**The "Open live dashboard" caption is omitted for Superset, deliberately.** A guest-token dashboard
has no publicly reachable URL — the link would have no valid target. Anyone "restoring" it later
will be re-adding a dead link.

**Adding a dashboard stays a one-entry change.** Build it in Superset → enable embedding → paste the
embed UUID into a new registry entry with the case-study copy. Nav, routing, sitemap and
`generateStaticParams` all follow automatically.

**A registry-only decision, revisitable.** If dashboards ever become numerous enough to want their
own filtered index, that is a new list page reading the same registry — not a re-architecture.

## Alternatives considered

- **Separate `/dashboards` section** — rejected: duplicated surface, no reader-visible distinction
  from `/work`.
- **Embedding dashboards inside blog posts** via the existing
  [`ReportEmbed`](../../../src/components/report-embed.tsx) — that component takes a public URL and
  cannot mint tokens. Still valid for Power BI in articles; not a route to Superset embedding.

## Amendment — 2026-11-16: `automation`, an n8n workflow as a showcase

The owner's call (D5 in `docs/automation/README.md`): n8n workflows are shown on `/work` like the reports, one
post per workflow, and the n8n server itself is never exposed or linked. The union gains a fifth kind,
`platform: "automation"`, carrying `workflow` (which public copy in `data/n8n/` to draw) and `test` (the demo
address, the public sheet and the steps, plus optional sample files in `public/samples/automation/`). The page reads
the general logic, then "How to test", then one "n8n workflow" button; the popup draws the canvas with n8n's
`<n8n-demo>` web component (`@n8n_io/n8n-demo-component`, rendered by n8n's hosted preview service), loaded only when
it opens. The JSON is sanitized by `scripts/n8n-export.ts` (no credentials, ids, webhook ids or private host) and must be
re-exported after each change to the live workflow.
