# ADR-0004 — Syndicate to Dev.to and LinkedIn; drop X

- **Status:** accepted, then **shelved 2026-08-02** — the implementation was pulled out of the
  deployable tree before it ever ran against a live account. The decisions below still stand and
  were not reversed; only the shipping of them was. Code preserved at
  [`.archive/syndication/`](../../../.archive/syndication/README.md).
- **Date:** 2026-08-01
- **Relates to:** [`ADR-0003`](ADR-0003-self-hosted-superset-over-preset.md) — same "price the
  vendor before building against it" discipline, applied before any code was written

## Context

The ask was a mechanism that automatically posts new blog posts and showcases to **LinkedIn**,
**X (Twitter)** and **Dev.to**. The publishing itself is easy; the decisions around it are not,
because posting is public, irreversible, and fires under the author's professional identity on a
site whose entire job is credibility.

The working plan carried a per-platform table flagged **"re-verify, this moves."** Re-verifying it
inverted two of its three rows.

### What the plan assumed vs. what is true (verified 2026-08-01)

|              | Plan's assumption                                                                                         | Verified reality                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **X**        | "Write access is a paid tier… ~$100/mo for Basic. Price it before building it, and be willing to drop X." | Wrong shape, right instinct. The free tier is gone and **pay-per-use is the default for new developers**: $0.015/post — but **$0.20/post when the post contains a link**. Every syndication post contains a link. Legacy Basic ($200/mo) is closed to new signups.                                                                                                                                       |
| **LinkedIn** | "A Company Page is a different (often easier) path than a personal profile."                              | **Backwards.** Personal-profile posting is the _self-serve_ path: add the **Share on LinkedIn** product in the Developer Portal, get `w_member_social`, no app review. The **Company Page** path runs through the Community Management API, which is _"not available to individuals at all… reserved for registered legal organizations,"_ gated behind a registered legal entity and a two-tier review. |
| **Dev.to**   | "Easiest by a distance. Free. Accepts markdown + `canonical_url`. Start here."                            | Confirmed, unchanged.                                                                                                                                                                                                                                                                                                                                                                                    |

So the expected blocker (X's price) evaporated, and the expected easy win (a Company Page) turned
out to be the closed door.

### The cost X actually carries

At this blog's cadence — a handful of posts a year — X would run to a couple of dollars annually.
It was **not** dropped on price. It was dropped because it is the platform where a BI consultant's
audience isn't, it needs a developer account with a card on file to save that couple of dollars,
and every additional platform is another credential to rotate and another way for an automated run
to fail. Three platforms is not 1.5× the work of two; it is 1.5× the surface that can post
something wrong under the author's name.

### The cost LinkedIn actually carries

Not approval — **token rot**. Apps outside the Marketing Developer Platform are issued **no refresh
token**, and access tokens expire after **60 days**. `LINKEDIN_ACCESS_TOKEN` therefore has to be
re-minted by hand roughly every two months, forever. This is the single ongoing maintenance cost of
the feature, and the most likely way it fails silently: a 401 two months after it was set up and
last thought about. The adapter special-cases 401 with an explicit "the 60-day token has almost
certainly expired" hint for exactly this reason.

## Decision

Syndicate to **Dev.to** and **LinkedIn personal profile**, in both cases as a generated **teaser
with a call to action** back to `vosk.dev` rather than a copy of the article. **X is not
implemented.**

The eight open decisions the plan deliberately withheld from implementation, resolved:

1. **Trigger** — GitHub Actions, on pushes to `main` that touch `content/blog/**` or
   `src/lib/work.ts`, plus manual dispatch for backfills. Actions is forced by the state store
   (below): a Vercel function cannot commit to the repo.
2. **Approval gate** — three layers, because posting is irreversible. The runner is **dry-run by
   default** and publishing requires an explicit `--publish`. A never-run manifest refuses to
   publish more than one item without `--backfill`, so wiring this up cannot fire the whole back
   catalogue in one burst. And in CI the publish job sits behind a **protected GitHub environment**,
   so a human approves it while reading the drafted copy that the preceding plan job printed.
   A bot-PR gate was considered and rejected: the manifest only changes _after_ publishing, so a PR
   could not carry the change under review without a second queue file to merge against.
3. **Showcases are not articles** — correct, and enforced in code. `SyndicationItem.body` is present
   for blog posts only; the Dev.to adapter's `accepts()` declines anything without one. Showcases go
   to LinkedIn as a link and a blurb, and nowhere else.
4. **Locale** — English only. Blog MDX is single-language today, and posting Russian copy to Dev.to
   would be wrong even once it isn't.
5. **Canonical URLs** — non-negotiable and structural. `canonical_url` is built from the item inside
   the Dev.to adapter's payload function, so no call site can omit it. The runner additionally
   refuses to run at all unless `NEXT_PUBLIC_SITE_URL` is an `https://` origin — a localhost
   canonical baked into a published Dev.to article would permanently point search engines at nothing.
6. **Copy per platform** — a **generated teaser, not a cross-post**. Both platforms get the title,
   the hand-written `description`, up to three opening paragraphs, and a CTA back to `vosk.dev`.
   The syndicated post exists to earn the click, not to host a second copy of the article on
   someone else's domain.

   Generation is **deterministic** — extraction and formatting, no LLM. Three reasons, in order of
   weight: this text publishes irreversibly under the author's name; a reviewer approving the CI
   gate has to be looking at what will actually go out, which requires the dry run and the publish
   to produce identical text; and the repo has no AI dependency, key, or cost line today, which is
   not a thing to add casually. `summary.ts` is the only module that would change if that trade is
   ever revisited.

   No per-platform frontmatter overrides until there is evidence they're needed — that is
   speculative config of exactly the kind CLAUDE.md rules out.

7. **Secrets** — GitHub Actions secrets, read via `process.env` inside the adapters. They must never
   reach `lib/env.ts`, which is client-reachable and whose contents risk being bundled. Same
   reasoning as `SUPERSET_SVC_*`.
8. **Failure policy** — per (item, platform). Only successes are written to the manifest, so a
   platform that fails is simply still pending and the next run retries it. One platform's failure
   never blocks another's, and the run exits non-zero so a half-posted CI run is visibly red.

### State lives in git

The repo is deliberately DB-free (CLAUDE.md), so "what has been posted where" needed a home. It is a
committed `syndication.json`, keyed per item **per platform**. Git is the state store: auditable in
history, reviewable in a diff, no infrastructure. This is what forces decision 1 — the runner has to
be somewhere that can commit back.

## Consequences

**One file per platform, behind one interface.** Same instinct that made the Preset → Superset
reversal cost ~60 lines (`ADR-0003`): `Adapter` is four methods, and adding Bluesky or Mastodon — or
reversing this ADR and adding X after all — means one new file plus one line in `adapters`.

**`og:image` had to be fixed first.** `buildMetadata` set `openGraph` wholesale, which replaced the
root segment's file-based card, so every non-post page shared with a blank preview. LinkedIn shares
render as a link card; syndicating before fixing that would have auto-published blank cards. Fixed in
the same change.

**MDX is not markdown.** Two of three posts embed React components (`<WorkflowDiagram />`,
`<ReportEmbed …>`). A naive cross-post would ship raw JSX into the syndicated article. Block-level
JSX is replaced with a pointer back to the original, which is where the interactive version
actually works, and headings, fenced code, lists and tables are excluded from the excerpt.

**Line endings turned out to be load-bearing.** Every rule in the excerpt and JSX-stripping logic
is line-oriented, and the MDX is read straight off disk — which on a Windows checkout means CRLF.
`\n{2,}` never matches `\r\n\r\n`, and multiline `$` sits after the `\r`, so an entire article
collapsed into a single block and JSX survived stripping. Caught in a dry run against the real
posts; it would have behaved _differently on a Linux CI runner than on the author's laptop_, which
is the worst version of this bug. Input is normalised at the seam.

**Placeholder content needed a machine-readable guard.** The `retail-sales` showcase is still
placeholder copy over Microsoft's public sample report. Relying on a human to spot that in a dry run
is not a control, so `Showcase` gained a `draft` flag — mirroring blog frontmatter — that renders on
`/work` as normal but is skipped by syndication.

**The LinkedIn token is a recurring chore, not a one-off setup.** Diarise it. Two months from now,
this will have stopped working and nothing will say so except a red Actions run.
