---
title: vosk.dev — SEO and campaign-readiness spec for the coding agent
site: https://vosk.dev
repo: rusloc/vosk.dev
written: 2026-11-18
verified_against: commit 7a8b5a6 (2026-11-18), live site in a browser, PageSpeed Insights (home, mobile)
supersedes: vosk-dev-seo-audit-agent.md (2026-11-17) — where the two disagree, this file wins
scope: code and copy changes inside this repo; no ads, no off-site work
---

# vosk.dev — SEO and campaign-readiness spec

## 0. How to use this file

1. Read `CLAUDE.md` first. Its rules override this file. The ones that matter here are restated in section 1.
2. Read sections 1–3, then work through section 4 in order (T-01 → T-16).
3. One task = one commit. Put the task ID in the commit subject: `feat(seo): T-02 title suffix`.
4. After each task run its **Verify** step and `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. Record the result in section 6.
5. A task marked **Owner input** has two parts: the code (do it now, behind the stated fallback) and the content (wait for the owner). Never invent the content. If the fallback says "do not ship", stop and set the task to `blocked`.
6. Do not start Block 2 before Block 1 is merged, and do not start Block 3 before Block 2.

## 1. Rules that bind every task

From `CLAUDE.md`:

- **Git:** do not commit, push or touch the working tree with git. After each task, output the git commands as one copy-paste block (`git add "<paths>"`, `git commit -m "…"`, `git push`). No `cd`, no `git -C`.
- **No AI attribution** anywhere: commit messages, code comments, page copy, docs.
- **Never read `.env*` files.** Whether an env var is set in production is a question for the owner (section 5).
- **Never hard-code the domain.** Use `siteConfig.url` / `absoluteUrl()`.
- **Published copy goes through the `text-writer` skill** and `.claude/skills/text-writer/references/owner-voice.md`. Every new sentence a visitor reads is drafted that way and marked for owner review.
- **Zod `.strict()`** on frontmatter: a new frontmatter key must be added to the schema in `src/lib/content.ts` or the build fails.
- **Simplicity and surgical changes:** touch only what the task names.
- **Log** each request in `.log/coms/coms {yyyy-mm-dd}.md`.

SEO guardrails:

- Do not change or remove an existing URL. If one must change, add a permanent redirect in `next.config.ts` and update internal links.
- Do not invent testimonials, client names, prices, years of experience, credentials or results. Facts come from section 2.3 or from the owner.
- Structured data must describe only what the page visibly shows. Builders live in `src/lib/structured-data.ts`; keep building them from the same strings the page renders.
- All indexable content stays in the server-rendered HTML.
- `noindex` only where a task says so.
- Do not block AI crawlers in `robots.ts`.
- `<title>` ≤ 60 characters including the suffix where possible. Meta descriptions 140–160 characters, unique per page.
- `en.ts` defines the `Dictionary` type and `ru.ts` is still imported by tests. Every key added to `en.ts` gets a counterpart in `ru.ts` (an English placeholder is acceptable; Russian is not published) so `pnpm typecheck` and `pnpm test` stay green.
- `siteConfig.name` ("VOSK") is used by the nav logo, the manifest and the contact emails. **Do not change it.** The brand fix is the title suffix only (T-02).

## 2. Current state (verified 2026-11-18)

### 2.1 Where things live

| Concern | File |
| --- | --- |
| Site config, profiles, contact email | `src/lib/site.ts` |
| Page metadata builder (title, description, canonical, OG, Twitter) | `src/lib/metadata.ts` |
| Title template and default robots | `src/app/[locale]/layout.tsx` |
| JSON-LD builders | `src/lib/structured-data.ts`, rendered by `src/components/json-ld.tsx` |
| Sitemap, robots | `src/app/sitemap.ts`, `src/app/robots.ts` |
| Page copy (all UI strings) | `src/lib/i18n/en.ts` (+ `ru.ts` mirror) |
| Blog posts and frontmatter schema | `content/blog/*.mdx`, `src/lib/content.ts` |
| Tag set | `src/lib/tags.ts` |
| Case studies ("showcases") | `src/lib/work.ts` (registry, not MDX) |
| Home, services, contact, blog, work pages | `src/app/[locale]/…` |
| Nav, footer, post meta row, breadcrumbs | `src/components/nav.tsx`, `footer.tsx`, `post-meta-row.tsx`, `breadcrumbs.tsx` |
| Analytics (GTM, consent, `trackLead`) | `src/components/analytics.tsx` |
| Locale routing, `/ru` and `/en` 308s | `src/proxy.ts` |

### 2.2 Already done — do not redo

- Unique description and self-referencing canonical on every page (`buildMetadata`).
- Open Graph and Twitter tags with a 1200×630 image on every page; generated cards per post and per case study.
- JSON-LD: `Person` + `ProfessionalService` + `WebSite` (home), `Service` + `OfferCatalog` (`/services`), `BlogPosting` + `BreadcrumbList` (posts), `CreativeWork` + `BreadcrumbList` (case studies), `CollectionPage` (blog index, tag pages), `ContactPage` (contact).
- 404 via `src/app/global-not-found.tsx`; `www` and trailing-slash variants resolve to the canonical URL; `/Services` is a 404, not a duplicate.
- Static rendering. `/work` and `/blog` render every card and link in the HTML and hide off-page ones with CSS, so pagination is **not** a crawl problem. Leave `pagination.tsx`, `showcase-list.tsx` and `blog-list.tsx` alone.
- Home page, mobile lab: Performance 100, SEO 100, LCP 0.9 s, CLS 0, TBT 0 ms. Keep it there: no new client components on the home page beyond what a task names, no unsized images.

### 2.3 Facts usable in copy and markup

- Person: Kirill Vosk. Based in Turkey; works remotely on EU and UK hours.
- Services: Power BI and Microsoft Fabric reporting, n8n automations, AI chats over data, SQL/PostgreSQL, dbt, ETL/ELT.
- Credential: Microsoft DP-600 (`siteConfig.dp600Url`).
- Profiles: `siteConfig.social` (LinkedIn, Upwork, GitHub).
- Prices: exactly the strings in `en.ts` → `services` (subscription $1,500 / $2,200 / $3,000 per month; projects $2k–5k, $5k–12k, $10k–25k; urgent $300+; initial consulting $50 per hour). Read them from the dictionary; never retype a price.
- Proof on the site: the case studies in `src/lib/work.ts` (three n8n workflows; web reports with an AI chat; Power BI reports) and the nine posts in `content/blog`.

### 2.4 Problems this spec fixes

| ID | Problem |
| --- | --- |
| P-1 | Analytics appears to be off in production: no consent banner renders on the live site, and the banner renders only when `NEXT_PUBLIC_GTM_ID` is set |
| P-2 | No page targets a hire-intent search; all services share `/services`, whose H1 is "Services" |
| P-3 | Home page: H1 has no topic words; one paragraph of body copy |
| P-4 | Titles end in `· VOSK`, which collides with the Vosk speech-recognition toolkit |
| P-5 | No About page; posts show a date but no author, while `structured-data.ts` assumes the name is visible on every post |
| P-6 | Contact: no call booking, no reply-time promise, Gmail address |
| P-7 | `/services` shows one plan per group until the visitor clicks "Next"; the first card is cloned in the DOM |
| P-8 | Post and case-study CTAs all point to `/services`; footer links only to RSS |
| P-9 | Post titles describe the idea, not the searched query |
| P-10 | `/work/online-sales-cube` is live and linked from two posts but `noindex` |
| P-11 | Tag pages with 1 post (Python) and 3 posts (JS) are indexable and in the sitemap |
| P-12 | One shared `lastmod` (`SITE_UPDATED`) for 13 URLs; `Host:` line in robots; two post descriptions at 161 characters |

## 3. Target structure

```
/                         home: topical H1, proof, service cards, cases, pricing teaser, posts, CTA
/services                 hub: all prices visible, links to every service page
/services/{slug}          one page per service, one search intent each
/about                    the person, the credential, the profiles
/work, /work/{slug}       case studies → each links to its one service page
/blog, /blog/{slug}       posts → each links to its one service page
/contact                  form, booking link, reply time
```

Service pages, in build order:

| Slug | `<title>` (suffix added by the template) | H1 | Block |
| --- | --- | --- | --- |
| `power-bi-consulting` | Power BI Consulting & Dashboard Development | Power BI consulting and dashboard development | 1 |
| `power-bi-support` | Power BI Support Retainer from $1,500/month | Power BI support on a monthly retainer | 1 |
| `microsoft-fabric` | Microsoft Fabric Consultant: Migration & Setup | Microsoft Fabric migration and platform setup | 1 |
| `ai-data-chat` | AI Chat Over Your Data, Without Made-Up Numbers | AI chat over your company data | 2 |
| `n8n-automation` | n8n Automation for Reporting and Back Office | n8n automations for reports, inboxes and invoices | 2 |
| `power-bi-audit` | Power BI Audit: Fixed-Price Performance Review | Power BI audit: find what makes reports slow and wrong | 2, only with owner input I-07 |

The price in the `power-bi-support` title must be read from `en.services.subscription.tiers[0].price`, not typed.

## 4. Tasks

### Block 1 — gate for the test campaign

#### T-01 Measurement events (fixes P-1)

The GTM ID itself is the owner's (I-01). The code part:

- In `src/components/analytics.tsx`, add event helpers beside `trackLead()` using `sendGTMEvent`:
  - `trackBookingClick()` → `{ event: "booking_click" }`
  - `trackEmailClick()` → `{ event: "email_click" }`
  - `trackReportOpen(kind, slug)` → `{ event: "report_open", report_kind: "web" | "power_bi" | "ask_ai" | "n8n", showcase: slug }`
- Wire them: the `mailto:` link on `/contact` (it is rendered in a Server Component; wrap only the link in a small client component), the booking link from T-06, and the report buttons opened through `src/components/report-dialog.tsx` / the Ask AI trigger.
- Do not load any tag outside the existing consent gate. Do not add Consent Mode; that is an owner decision (I-01).
- **Acceptance:** helpers are no-ops when GTM is absent (same behaviour as `trackLead`); no new client component on the home page; unit test for each helper's payload.
- **Verify:** `pnpm test`; with a GTM ID set locally and consent granted, `window.dataLayer` receives each event.

#### T-02 Title suffix and home title (fixes P-4)

- `src/app/[locale]/layout.tsx`: template `%s · ${siteConfig.name}` → `%s | ${siteConfig.author.name}`.
- `src/lib/metadata.ts`: the two `${title} · ${siteConfig.name}` strings (OG and Twitter) → the same `| ${siteConfig.author.name}` form.
- `src/lib/site.ts` `title` and `en.ts` `meta.title`: `Freelance Power BI & Fabric Consultant | Kirill Vosk`. Build it from `siteConfig.author.name`, do not repeat the literal in two places if one can import the other.
- `siteConfig.author.jobTitle`: `Freelance Power BI & Microsoft Fabric Consultant`.
- `en.ts` `meta.description` and `siteConfig.description`: one 140–160 character description naming Power BI, Microsoft Fabric, n8n automations, AI data chats and EU/UK hours. Draft, owner review.
- Leave `siteConfig.name`, the nav logo, the manifest `short_name` and the email templates as they are.
- **Acceptance:** every page `<title>` ends with `| Kirill Vosk` except the home page, whose title already contains the name once, and `/about` (T-05).
- **Verify:** `pnpm build`, then grep the built HTML: no `· VOSK` in any `<title>`, `og:title` or `twitter:title`.

#### T-03 Home page (fixes P-3) — Owner input I-03, I-04, I-05

In `src/app/[locale]/page.tsx` and `en.ts` → `home`:

- H1: `Freelance Power BI and Microsoft Fabric consultant`. The current headline ("Save money by understanding your data.", with its two emphasised words) becomes the line directly under the H1, styled as now. **Fallback until I-03 is approved:** ship it; the owner can reword.
- Keep the existing lede and the two buttons.
- Add these sections below the hero, in order, all Server Components:
  1. **Proof bar:** DP-600 (links to `siteConfig.dp600Url`), "EU and UK hours". Further items only from I-04.
  2. **Service cards:** one card per service page that exists (T-04 registry), each a link with the service name as anchor text.
  3. **Three case studies:** from `showcases` in `work.ts`, reusing `ShowcaseCard`. Pick the three newest indexable entries unless the owner names others.
  4. **Pricing teaser:** the three subscription prices read from the dictionary, link to `/services`.
  5. **Testimonials:** render only when the list from I-05 is non-empty. **Fallback: section absent.** No placeholder text.
  6. **Latest three posts:** from `getAllPosts()`.
  7. **Contact block:** link to `/contact` (and the booking link once T-06 has it).
- Extend `homeGraph()` only if a new visible fact needs it (T-11 covers the markup).
- **Acceptance:** exactly one `<h1>`; every section present in the built HTML; a link to every existing service page; home stays static; no new client components.
- **Verify:** built HTML has one `<h1`; links to `/services/…` present; re-run PageSpeed Insights on the preview deploy — LCP < 2.5 s, CLS < 0.1.

#### T-04 Service pages, first three (fixes P-2) — Owner input I-04 (copy approval)

- New registry `src/lib/services.ts`, modelled on `work.ts`: an array of entries with `slug`, `title` (for `<title>`), `h1`, `description` (140–160 chars), `audience` (who it is for and the problem, ≤ 100 words), `deliverables: string[]`, `pricing` (a reference to dictionary tiers, never a typed number), `steps: string[]` (3–4), `faq: { q: string; a: string }[]` (five buyer questions), `caseSlugs: [string, string]`, `postSlugs: string[]` (2–3), `draft: boolean`.
- New route `src/app/[locale]/services/[slug]/page.tsx` with `generateStaticParams`, `generateMetadata` through `buildMetadata`, visible `<Breadcrumbs>` (Home → Services → page) plus `breadcrumbGraph`, and a per-service JSON-LD builder in `structured-data.ts` (`Service` with `provider`, `areaServed`, and `Offer`s whose prices are the visible strings, following the existing `serviceGraph` pattern).
- Page template, in order: (1) audience and problem; (2) deliverables; (3) price or range and typical duration; (4) two case studies; (5) how the engagement runs; (6) the five questions and answers as visible text (no `FAQPage` markup); (7) one CTA to `/contact`.
- Case and post links must resolve: fail the build if a `caseSlugs` or `postSlugs` entry does not exist or is hidden (showcases are env-gated — check against `showcases`, not `allShowcases`).
- Create the three Block 1 entries from section 3. Draft the copy with the `text-writer` skill from section 2.3 facts and the case-study text in `work.ts`. Set `draft: true`.
- **`draft: true` behaviour:** the page builds and is reachable on preview deploys, is `noindex, follow`, and is left out of the sitemap and out of nav, footer and home. The owner flips it to `false` after approving the copy.
- Add non-draft service pages to `src/app/sitemap.ts`.
- `/services` (hub) links to every non-draft service page with the service name as anchor text.
- **Acceptance:** three URLs return 200; each has a unique title, description, self-canonical and one H1; no price is typed in `services.ts`; draft pages never appear in the sitemap.
- **Verify:** `pnpm build`; a unit test like the one in `work.test.ts` asserting 140–160 character descriptions, resolvable slugs and exactly five FAQ items per entry.

#### T-05 About page and post bylines (fixes P-5) — Owner input I-04, I-08

- New route `src/app/[locale]/about/page.tsx`. `<title>`: `About Kirill Vosk: Power BI & Fabric Consultant (DP-600)` — set as an absolute title so the suffix is not appended.
- Content from section 2.3 only: who, where, hours, what the work is, DP-600 link, profile links (`rel="me"` as on `/contact`), links to `/services` and `/work`. Years of experience, industries and a photo appear only when supplied (I-04). **Fallback: omit them.**
- If the owner answers I-08 with a sentence about the professional name, add it; otherwise add nothing about names.
- Add `/about` to the nav (`src/components/nav.tsx`, `en.ts` → `nav.about`) and to `sitemap.ts`.
- Posts: in `src/app/[locale]/blog/[slug]/page.tsx` show "Kirill Vosk" (from `siteConfig.author.name`) linked to `/about` beside the date, and "Updated {date}" when frontmatter has `updated`. Extend `PostMetaRow` with optional props rather than forking it; the blog list cards stay as they are.
- Point the `Person` `url` in `homeGraph()` and the `author` in `blogPostingGraph()` at `/about`.
- **Acceptance:** `/about` is in the nav and sitemap; every post shows the author link; the comment in `structured-data.ts` about the visible byline is now true.
- **Verify:** built HTML of any post contains a link to `/about` with the author's name.

#### T-06 Contact page (fixes P-6) — Owner input I-06

- Add to `siteConfig`: `bookingUrl: ""` and `replyTime: ""`.
- `/contact`: render a "Book a 20-minute call" link when `bookingUrl` is non-empty, and the reply-time sentence when `replyTime` is non-empty. **Fallback: both absent.** Do not ship a promise the owner has not confirmed.
- When the owner supplies a domain mailbox, change `siteConfig.contactEmail`; nothing else references the address directly.
- Booking link fires `trackBookingClick()` (T-01).
- **Acceptance:** with empty values the page is unchanged; `contactGraph` gains nothing that is not visible.

#### T-07 Services hub: every plan visible (fixes P-7)

- In `src/app/[locale]/services/`, render all tiers of each group at once (grid or table) and remove the cloned slide and the "Next" button. Keep the three groups, the "Available in every plan" list and the conditions button behaviour.
- Mobile: all plans reachable by scrolling; the pill row may stay as an in-page jump but must not hide content from the DOM.
- H1 (`en.services.title` is also the nav label and breadcrumb name, so add a separate key): `Power BI & Fabric services and pricing`.
- **Acceptance:** each plan name appears exactly once in the built HTML; no `aria-hidden` duplicate cards; `serviceGraph` output unchanged.
- **Verify:** grep the built `/services` HTML for each tier name; count is 1.

### Block 2 — first two weeks

#### T-08 Search titles (fixes P-9) — Owner input I-04 (approval)

- `src/lib/content.ts`: add optional `seoTitle: z.string().min(1).optional()` to the frontmatter schema and to `PostMeta`.
- `blog/[slug]/page.tsx` `generateMetadata`: use `post.seoTitle ?? post.title` for the title. The H1, the cards, the feed and the OG card keep `post.title`.
- Proposed `seoTitle` values (≤ 60 characters with the suffix; owner approves or rewords):

| Slug | Proposed `seoTitle` |
| --- | --- |
| `give-the-agent-eyes` | Slow Power BI refresh on PostgreSQL: 5 min to 15 s |
| `metric-functions-for-ai-agents` | AI agent over SQL: metric functions, not generated SQL |
| `do-you-need-a-semantic-layer` | Semantic layer: dbt vs Cube vs Looker vs plain SQL |
| `one-model-two-front-doors` | One semantic model for Power BI and Excel |
| `deliver-data-without-dashboards-or-ai` | Email a Power BI table from a Fabric notebook |
| `postgres-power-bi-workflow` | Store Power BI SQL in Postgres, not in Power Query |

- Case studies: add an optional `seoTitle` to `ShowcaseBase` in `work.ts`, pattern `{Use case} in {Tool}: Case Study`, with the tool read from that entry (`platform`, `powerBi`, `details`) — never assume Power BI. Used for `<title>` only.
- **Acceptance:** no two pages share a `<title>`; every case-study title names its tool; test asserting uniqueness across posts, showcases and services.

#### T-09 Internal links, footer, nav (fixes P-8)

- Posts: optional frontmatter `service: <service slug>` (add to the Zod schema; validate against `services.ts`). The CTA block at the foot of a post links to that service page with the service name as anchor text; without the key it keeps today's `/services` link.
- Case studies: optional `serviceSlug` on the showcase entry; same behaviour in the "Want this for your data?" block.
- Assign every post and every case study its one most relevant service. Do not assign a draft service.
- `src/components/footer.tsx`: add links to each non-draft service page, `/about`, `/contact`, LinkedIn, Upwork, GitHub (from `siteConfig.social`), and keep RSS.
- `src/components/nav.tsx`: a "Services" menu listing the non-draft service pages; `/services` itself stays reachable as the menu's first item. Keyboard accessible; works in the mobile menu.
- **Acceptance:** every non-draft service page has inbound links from nav, footer, `/services` and at least two content pages. Add a test that computes this from the registries.

#### T-10 Remaining service pages — Owner input I-07 for the audit page

- Add `ai-data-chat` and `n8n-automation` as in T-04 (`draft: true`).
- Add `power-bi-audit` only when I-07 gives a price and scope. **Fallback: do not create the entry.**

#### T-11 Markup additions

In `src/lib/structured-data.ts`:

- `Person`: `hasCredential` (`EducationalOccupationalCredential`, name "Microsoft Certified: Fabric Analytics Engineer Associate (DP-600)", `url: siteConfig.dp600Url`) — visible on `/about` and `/contact`; `image` only when I-04 supplies a photo that is shown on `/about`; `knowsAbout` aligned with section 2.3.
- `ProfessionalService`, `serviceGraph` and `contactGraph`: `areaServed` — keep "Worldwide" unless the owner wants "United Kingdom" and "European Union" (I-04); the page copy must say the same.
- Emit `Person` on `/about` too, with the same `@id`.
- **Verify:** Rich Results Test on the preview deploy, one URL per template; no errors.

#### T-12 Index the Cube case study (fixes P-10) — Owner input I-09

- After the owner signs off the write-up: remove `noindex: true` from the `online-sales-cube` entry in `work.ts`. **Fallback: leave as is.**
- **Verify:** the URL appears in `sitemap.xml`; its robots meta is `index, follow`.

### Block 3 — hygiene

#### T-13 Thin tag pages (fixes P-11)

- A tag page with fewer than 4 posts gets `robots: { index: false, follow: true }` through `buildMetadata` and is left out of `sitemap.ts`. Put the threshold in one constant in `src/lib/content.ts` and use it in both places.
- **Acceptance:** today that is `python` (1) and `js` (3); the sitemap contains no noindexed URL. Add a test.

#### T-14 Per-showcase `lastmod` (fixes P-12)

- Add `updated: "YYYY-MM-DD"` to each showcase entry (required field), initialised to `2026-11-17`. `sitemap.ts` uses it for `/work/{slug}`; `/work` uses the newest of them. `SITE_UPDATED` stays for `/`, `/services`, `/contact`, `/about`.
- **Acceptance:** rebuilding without content changes leaves every `lastmod` unchanged.

#### T-15 robots

- Remove `host` from `src/app/robots.ts`. Keep everything else.

#### T-16 Descriptions

- Trim the descriptions of `do-you-need-a-semantic-layer` and `give-the-agent-eyes` to ≤ 160 characters without changing their meaning (owner's wording; propose, do not rewrite freely).

## 5. Owner inputs

Ask once, in one message, when a task first needs one. Never guess.

| ID | Input | Needed by |
| --- | --- | --- |
| I-01 | Is `NEXT_PUBLIC_GTM_ID` set in Vercel production? GA4 key event `generate_lead` configured? Consent Mode: yes or no (a privacy decision) | T-01, campaign |
| I-02 | Search Console and Bing verified, sitemap submitted | after Block 1 deploy |
| I-03 | Approval or rewording of the home H1 | T-03 |
| I-04 | Years of experience, industries served, photo, extra proof-bar items; approval of drafted service copy and search titles; which two case studies go on each service page; `areaServed` wording | T-03, T-04, T-05, T-08, T-11 |
| I-05 | Two or three client testimonials with permission to publish | T-03 |
| I-06 | Booking URL; domain mailbox; the reply time to promise | T-06 |
| I-07 | Price and scope of the fixed-price Power BI audit | T-10 |
| I-08 | Whether `/about` should explain the professional name, given the surname shown on the DP-600 share page | T-05 |
| I-09 | Sign-off on the Cube write-up | T-12 |

## 6. Results log (agent fills in)

| ID | Status (todo / done / blocked / n-a) | Date | Evidence or note |
| --- | --- | --- | --- |
| T-01 | done (code) | 2026-11-18 | Not `sendGTMEvent`: the container ignores plain `{event}` pushes (probe 11-18). Clicks use the live `data-ga` contract: `email_click` on the /contact mailto, `booking_click` on the booking link (home + contact, renders once `bookingUrl` is set). `report_open` already live (content_id = slug, content_type = power_bi / web_report / n8n_workflow); Ask AI = `chat_open`. No GTM change needed. Key events for the two clicks: owner's yes. |
| T-02 | done | 2026-11-18 | Built HTML: no `· VOSK` in any title / og:title; home title "Freelance Power BI & Fabric Consultant \| Kirill Vosk"; `siteConfig.title`/`description` read from `en.meta`. Description is a draft. |
| T-03 | done (draft copy) | 2026-11-18 | One `<h1>`; proof bar (DP-600, EU and UK hours), 3 newest indexable cases, subscription prices from the dictionary, 3 posts, contact block. Service cards render once a service page leaves draft; testimonials absent (I-05). PSI on the preview deploy still to run. |
| T-04 | done, draft | 2026-11-18 | `src/lib/services.ts` + `/services/[slug]`, 3 entries `draft: true` (noindex, follow; out of sitemap, nav, home, hub). `services.test.ts`: 140–160 descriptions, 5 FAQs, resolvable slugs (build throws otherwise), no typed price. Copy and case picks wait on I-04. |
| T-05 | done (draft copy) | 2026-11-18 | `/about` (absolute title, nav, sitemap); post header shows "Kirill Vosk" → /about (rel=author) and "Updated" when set; Person url and BlogPosting author url → /about. Years, industries, photo, name note: I-04 / I-08. |
| T-06 | done (fallback) | 2026-11-18 | `siteConfig.bookingUrl` / `replyTime` empty → page unchanged. Waits on I-06. |
| T-07 | done | 2026-11-18 | Server-rendered; each of the 8 plan names once in the built HTML, no aria-hidden clone; H1 = `services.heading`; serviceGraph unchanged. |
| T-08 | todo | | |
| T-09 | todo | | |
| T-10 | todo | | |
| T-11 | todo | | |
| T-12 | todo | | |
| T-13 | todo | | |
| T-14 | todo | | |
| T-15 | todo | | |
| T-16 | todo | | |

## 7. After each block is deployed

- Bump `SITE_UPDATED` in `src/app/sitemap.ts` to the deploy date when `/`, `/services`, `/contact` or `/about` changed.
- Block 1: owner resubmits the sitemap and requests indexing for `/`, `/about` and each non-draft service page (I-02). Re-run PageSpeed Insights on `/` and one service page.
- Campaign go/no-go, all must be true: GTM live and `generate_lead` seen in GA4 after a real form send; contact form tested end to end from a clean browser; three service pages live and not draft; all plans visible on `/services`; one UTM convention agreed.
- Expect indexing in days to weeks and ranking movement in weeks to months.

## 8. Not verified by the author of this spec

- HTTP status codes and redirect hop counts (final URLs were observed in a browser only). Check on a preview deploy: `curl -sI` for a missing page (expect 404), `http://` and `www` (expect one permanent redirect).
- Search Console coverage and field Core Web Vitals.
- The `seoTitle` proposals and example queries are judgment, not search-volume data.
