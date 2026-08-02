# Syndication — cross-posting to Dev.to and LinkedIn

> **Shelved 2026-08-02 — this describes code that is no longer in the deployable tree.**
> The implementation was moved to [`.archive/syndication/`](../.archive/syndication/README.md)
> before it ever ran against a live account. Every path referenced below (`src/lib/syndication/`,
> `scripts/syndicate.mts`, `.github/workflows/syndicate.yml`, `syndication.json`) now lives there
> instead. Kept as-is so the runbook is intact if the feature is restored.

How new blog posts and showcases get announced on Dev.to and LinkedIn. Design rationale
and the decisions behind it are in
[`ADR-0004`](architecture/decisions/ADR-0004-syndication-devto-linkedin.md); this is the
operator runbook.

## What it posts

A **teaser**, not a copy of the article: the title, the hand-written `description` from
frontmatter, up to three opening paragraphs, and a call to action back to `vosk.dev`. The
click-through is the point — the reader gets the gist where they already are, then follows
the link for the rest.

The copy is generated **deterministically** ([`src/lib/syndication/summary.ts`](../src/lib/syndication/summary.ts)) —
no LLM. The same post always produces the same text, so a dry run is a truthful preview of
what will publish.

|                                | Dev.to                                        | LinkedIn        |
| ------------------------------ | --------------------------------------------- | --------------- |
| Blog posts                     | ✅ teaser article, `canonical_url` → vosk.dev | ✅ link share   |
| Showcases                      | ❌ not an article                             | ✅ link share   |
| Drafts / placeholder showcases | ❌                                            | ❌              |
| Russian                        | ❌ English only                               | ❌ English only |

## Running it

```bash
pnpm syndicate                       # dry run — prints exactly what would be posted
pnpm syndicate --only devto          # one platform
pnpm syndicate --publish             # actually post
pnpm syndicate --publish --backfill  # allowed to post >1 item on a first run
```

`NEXT_PUBLIC_SITE_URL` must be the public `https://` origin. The runner refuses to start
otherwise — a `localhost` canonical baked into a published Dev.to article would point search
engines at nothing, permanently.

Nothing publishes without `--publish`. On a never-run manifest, publishing more than one item
additionally requires `--backfill`, so wiring this up cannot fire the whole back catalogue at
once.

## State

[`syndication.json`](../syndication.json) records what has been posted where, keyed per item
**per platform**. It is committed — git is the state store, since the repo has no database.

Only successes are recorded. A platform that fails is simply still pending, so the next run
retries it; a run where Dev.to succeeds and LinkedIn fails keeps the half that worked. Deleting
an entry by hand will re-post that item, which is the intended escape hatch.

## Automation

[`.github/workflows/syndicate.yml`](../.github/workflows/syndicate.yml) runs on pushes to `main`
that touch `content/blog/**` or `src/lib/work.ts`, and on manual dispatch.

Two jobs: **plan** always runs and only prints, putting the drafted copy in the run summary;
**publish** sits behind the `syndication` environment and waits for a human to approve while
looking at that copy.

### One-time setup

1. **Environment** — Settings → Environments → new environment named `syndication`, with
   yourself as a **required reviewer**. _Without this the approval gate does not exist and
   publishing runs unattended._
2. **Repository variable** — `NEXT_PUBLIC_SITE_URL` = the production origin.
3. **Environment secrets** — `DEVTO_API_KEY`, `LINKEDIN_ACCESS_TOKEN`, and optionally
   `LINKEDIN_AUTHOR_URN`.

These are GitHub secrets, never `lib/env.ts` — that module is reachable from client components
and anything in its schema risks being bundled.

## Credentials

### Dev.to

Settings → Extensions → **DEV Community API Keys** → generate. One key, no expiry, no review.

### LinkedIn

Posting is to a **personal profile** via the consumer _Share on LinkedIn_ product. This is the
self-serve path; the Company Page path requires a registered legal entity and a two-tier
LinkedIn review, and is not open to individuals.

1. Create an app at [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps).
   It must be associated with a LinkedIn Page — create a bare one if you have none.
2. **Products** tab → add **Share on LinkedIn** and **Sign In with LinkedIn using OpenID
   Connect**. Both are self-serve; no app review.
3. Run the OAuth 2 authorization-code flow with scopes `w_member_social openid profile` and
   exchange the code for an access token.
4. Store it as `LINKEDIN_ACCESS_TOKEN`. Optionally set `LINKEDIN_AUTHOR_URN`
   (`urn:li:person:…`) to skip the `userinfo` lookup on every run.

> ### ⚠️ The token expires every 60 days
>
> Apps outside the Marketing Developer Platform are issued **no refresh token**. There is no
> automated fix; the token must be re-minted by hand roughly every two months, forever.
>
> **This is how the feature fails silently.** Two months from now the workflow will 401 and
> nothing will say so except a red Actions run. The adapter tags any 401 with an explicit
> "the 60-day token has almost certainly expired" hint. Put a recurring reminder in a calendar.

## Adding or removing a platform

One file implementing `Adapter` ([`types.ts`](../src/lib/syndication/types.ts)), plus one line in
`adapters` in [`run.ts`](../src/lib/syndication/run.ts). Nothing else needs to know.

**X (Twitter) is deliberately not implemented** — see `ADR-0004`. It is cheap now (pay-per-use,
~$0.20 per post containing a link), so if it is ever wanted, cost is not the objection.

## Gotchas

- **Showcases need real copy.** A `Showcase` marked `draft: true` in
  [`work.ts`](../src/lib/work.ts) renders on `/work` but is never syndicated. `retail-sales`
  carries that flag today because it is still placeholder text over Microsoft's public sample.
  Clear the flag when the real write-up lands.
- **MDX is not markdown.** Block-level JSX (`<WorkflowDiagram />`, `<ReportEmbed …>`) is replaced
  with a pointer back to the original, and fenced code, headings, lists and tables are excluded
  from the excerpt. A post that opens with a code block will produce a thin teaser — check the
  dry run.
- **`og:image` matters here.** LinkedIn shares render as link cards. Every page carries the site
  card via `buildMetadata`; if that regresses, shares go out blank.
