# VOSK: Upwork Project Catalog + site alignment spec

Date: 2026-11-16 · Owner: Kirill Vosk · Scope: Upwork Project Catalog listings, vosk.dev consistency review, claims and pricing.

Pages read for the review: `/`, `/work` (page 1 of 3 only; pagination links were not reachable), `/services`, `/contact`, `/blog` (page 1). Individual case study pages were not opened.

Comments are marked `> COMMENT`. Anything in [brackets] is a blank for you to fill with a true fact; nothing in brackets should be published as is.

---

## 1. Summary of decisions

| Topic | Decision |
|---|---|
| Channel role | Project Catalog is a second channel next to proposals. Listings are linked from proposals and invite replies; search traffic is a bonus. |
| Rate basis | $35–38/hour gross, which nets about $30–34/hour after a 10–15% Upwork fee. This matches the site's subscription rate ($36.7–37.5/hour). |
| Listing count | 18 defined (Upwork allows 20). Publish in three waves, proof-backed first. |
| Tier ladder | Three tiers per listing. Starter is narrow and real, Standard is the intended sale, Advanced bridges to the site's $2k+ projects. |
| Site | Fix five consistency gaps (section 5) before the catalog goes live, because buyers will open the site from your Upwork profile. |

> COMMENT: Hours in every table are my estimates. Replace them with your tracked hours for similar past work before publishing. A fixed price on a wrong estimate is the main way catalog work loses money.

---

## 2. Project Catalog: platform rules to design around

- Fixed scope, fixed price, bought directly by the client. No Connects to list or to sell.
- Up to 20 unique projects live at once; up to 3 tiers (Starter, Standard, Advanced); add-ons allowed; price range $5 to $500,000.
- Title is prefixed automatically with "You will get". Do not repeat it.
- Freelancer service fee is variable, 0–15% per contract, and applies to catalog orders.
- Requirements form: the client has 48 hours to submit mandatory requirements, and the delivery clock starts when they do.
- Review before publishing: about two business days for Top Rated and above, possibly a few weeks for others.
- Gallery: images under 10 MB, 4:3, JPG or PNG; one MP4 video. Rejected: contact details, other companies' logos, watermarks, text-heavy or low-quality images.
- Ranking follows completed sales and reviews. A new listing with no sales gets little search exposure for the first 4–8 weeks.

> COMMENT: Your showcase screenshots are the gallery. Crop out the vosk.dev URL and any client or vendor logos (Power BI, n8n, Cube logos count as other companies' marks). Use altered-figure screenshots only.

---

## 3. Listing specification

### 3.1 Common rules for every listing

**Tier logic**

| Tier | Dashboards / reports | Automations (n8n) |
|---|---|---|
| Starter | 1 page, 1 clean data source supplied by client, up to 6 visuals, 1 revision | 1 workflow, up to 2 apps, 1 revision |
| Standard | 3 pages, data model + DAX measures, up to 2 sources, 2 revisions | 1 workflow with AI step, error handling, up to 4 apps, 2 revisions |
| Advanced | 5 pages, row-level security, scheduled refresh, documentation, handover call, 3 revisions | Up to 3 linked workflows, logging, documentation, handover call, 3 revisions |

**Add-ons (all listings where relevant)**

| Add-on | Price | Basis |
|---|---|---|
| Extra report page | +$120 | ~3h |
| Extra data source | +$150 | ~4h |
| Row-level security | +$150 | ~4h |
| Recorded walkthrough video | +$60 | ~1.5h |
| 48-hour rush | +30% | |

**Mandatory client requirements**

1. Data access or a sample export (and which tool it lives in).
2. List of KPIs or questions the report must answer, or the manual process to automate.
3. Who will use it and how often.
4. Power BI licence type / workspace access, or n8n instance (cloud or self-hosted) and app credentials.
5. Deadline, if any.

**Out of scope (state on every listing)**: source system fixes, data entry, licences and hosting costs, new data sources beyond the tier, ongoing support after delivery (sold as subscription).

### 3.2 Wave 1: publish first (strongest proof, broadest demand)

| # | Title (after "You will get…") | Starter | Standard | Advanced | Proof |
|---|---|---|---|---|---|
| 1 | a budget vs actual P&L report in Power BI | $290 · 8h · 4d | $690 · 18h · 8d | $1,290 · 34h · 14d | /work/pnl-suite |
| 2 | a SaaS marketing dashboard: CAC, ROAS, payback | $290 · 8h · 4d | $690 · 18h · 8d | $1,290 · 34h · 14d | /work/marketing-acquisition-dashboard |
| 4 | invoice PDFs or emails parsed into Google Sheets with AI (n8n) | $190 · 5h · 3d | $420 · 11h · 6d | $780 · 21h · 10d | /work/invoice-pdf-parser, /work/inbox-to-sheet-ai |
| 12 | your Excel or Google Sheets report rebuilt in Power BI | $220 · 6h · 3d | $520 · 14h · 6d | $980 · 26h · 10d | Any dashboard case |

> COMMENT: Market check. Generic Power BI dashboard listings sit at roughly $40–$300 Starter and $200–$700 Advanced; n8n listings cluster at about $150 / $350 / $700. Listings 1, 2 and 4 are priced above the median on purpose and rely on being specific (named KPIs, named industry, live demo). If a listing gets views but no orders after 6–8 weeks, cut scope on Starter rather than price.

### 3.3 Wave 2: publish next

| # | Title (after "You will get…") | Starter | Standard | Advanced | Proof |
|---|---|---|---|---|---|
| 3 | a slow Power BI report fixed: DAX and model tune-up | $180 · 5h · 2d | $420 · 11h · 4d | $840 · 22h · 7d | None yet |
| 5 | a "chat with your data" bot that emails reports (n8n) | $340 · 9h · 5d | $720 · 19h · 9d | $1,300 · 35h · 14d | /work/ceo-digest |
| 11 | a daily KPI digest sent to email or Slack (n8n) | $190 · 5h · 3d | $420 · 11h · 6d | $780 · 21h · 10d | /work/ceo-digest |
| 13 | row-level security set up in your Power BI model | $150 · 4h · 2d | $340 · 9h · 4d | $640 · 17h · 6d | None yet |
| 18 | 1:1 Power BI, DAX or SQL coaching on your own files | $50 · 1h | $140 · 3h | $260 · 6h | Blog posts |

> COMMENT: Listing 3 needs a before/after case (load time or refresh time, measured). Listing 3 Starter is an audit with written findings only; say so in the tier name so nobody expects a fix for $180.
> COMMENT: Listing 5 at $1,300 Advanced is well above where n8n listings top out (~$700–800). Expect it to sell at Starter/Standard; keep Advanced as the anchor.

### 3.4 Wave 3: industry variants and proof-pending

| # | Title (after "You will get…") | Starter | Standard | Advanced | Proof |
|---|---|---|---|---|---|
| 7 | a retail KPI dashboard vs budget and last year in Power BI | $290 · 8h · 4d | $690 · 18h · 8d | $1,290 · 34h · 14d | /work/executive-dashboard |
| 8 | a loan portfolio and revenue report for lenders in Power BI | $290 · 8h · 4d | $690 · 18h · 8d | $1,290 · 34h · 14d | /work/online-sales-report |
| 9 | an equipment utilization dashboard: planned vs actual hours | $290 · 8h · 4d | $690 · 18h · 8d | $1,290 · 34h · 14d | /work/mining-time-utilization |
| 10 | an online sales dashboard on a Cube semantic layer | $400 · 11h · 5d | $850 · 23h · 10d | $1,600 · 43h · 15d | /work/online-sales-cube |
| 6 | a Power BI model moved to Fabric Direct Lake | $450 · 12h · 5d | $950 · 25h · 10d | $1,900 · 50h · 15d | None on site |
| 14 | an Apache Superset dashboard on your database | $250 · 7h · 4d | $600 · 16h · 8d | $1,150 · 31h · 12d | None on site |
| 15 | a dbt project: staging, marts and tests for your sources | $380 · 10h · 5d | $800 · 21h · 10d | $1,500 · 40h · 15d | None on site |
| 16 | slow PostgreSQL queries tuned, or reporting views built | $150 · 4h · 2d | $360 · 10h · 4d | $700 · 19h · 7d | Blog posts |
| 17 | Git version control and deployment pipelines for Power BI | $300 · 8h · 4d | $650 · 17h · 7d | $1,200 · 32h · 12d | None on site |

> COMMENT: Listings 7, 8, 9 share a ladder with 1 and 2. Upwork's limit is for unique projects, so each needs its own screenshots, KPI list and description, or it risks rejection as a duplicate. Publish only the industries you want more of.
> COMMENT: Listings 6, 14, 15, 17 have no matching showcase. Do not publish until each has at least one screenshot or write-up. I found no Fabric listings in the catalog when searching, which means little competition but also unproven demand.

---

## 4. Site review: what each page claims

| Page | Title / headline | What it claims |
|---|---|---|
| Home | "Save money by understanding your data." | Full-stack BI on MS Fabric, Power BI, Apache Superset; raw data extraction to visualization |
| Showcase | "BI Dashboard Case Studies" | Client work with altered figures plus synthetic-data demos; each with a live report. Tools: n8n, Custom JS, Power BI, Cube + Tremor |
| Services | "Power BI Services & Pricing" | Power BI and Superset delivery; subscription, fixed project, urgent, full-time, education |
| Contact | "Contacts" | Works with clients worldwide; email, form, LinkedIn, Upwork, GitHub |
| Blog | 6 posts, Jan–Oct 2026 | Power BI/DAX, SQL/Postgres, Cube, one Fabric notebook post |

---

## 5. Site review: logic and claim consistency

Severity: **H** = a buyer can notice a contradiction, **M** = weakens the pitch, **L** = polish.

| # | Sev | Finding | Fix |
|---|---|---|---|
| C1 | H | **Fabric is claimed but not shown or sold.** Home names MS Fabric first. Services never mentions Fabric (title says "Power BI Services"). No showcase item uses Fabric. One blog post does. | Either add a Fabric case and a Fabric line in Services, or move Fabric to third place in the hero until proof exists. |
| C2 | H | **Superset is claimed on three pages but has no proof.** Home, Services and Contact all name Apache Superset; no showcase item and no blog post (page 1) uses it. | Add one Superset demo to the showcase, or drop it from the hero and keep it in the Services skills list. |
| C3 | H | **Automation is shown but not sold.** 3 of 9 showcase items are n8n/AI automations (ceo-digest, inbox-to-sheet-ai, invoice-pdf-parser). Services has no automation offer; "automation" appears only as refresh scheduling. Home does not mention it. | Add an "Automation" offer to Services with a from-price, and one phrase in the hero. |
| C4 | H | **Client work vs demo is not labelled per card.** The intro says both exist; no card says which it is. Only inbox-to-sheet mentions a demo inbox. Figures like $3.4B and €12.0M read as real client scale. | Add a tag on every card: "Client work, figures altered" or "Demo, synthetic data". |
| C5 | H | **"Save money" has no backing anywhere.** No number, testimonial or case states money or time saved. | Add one measured outcome under the hero, or change the headline to a claim the showcase already proves (see 6.2). |
| C6 | M | **Showcase title says dashboards; a third of it is not dashboards.** "BI Dashboard Case Studies" vs three automation workflows. | Retitle: "Dashboards & data automations: case studies". |
| C7 | M | **Subscription tiers contradict the included list.** Small is described as fixes and tweaks, yet "every subscription includes" warehouse design, dbt, pipelines. | Reword to "skills available in every plan; hours decide how much gets done", or split the list by tier. |
| C8 | M | **"Priority support" is in every plan and undefined.** Priority over whom, and how fast? | State a response time, e.g. "reply within [X] business hours". |
| C9 | M | **No location, time zone or response time on Contact**, while the meta says "clients worldwide". | Add time zone / working hours overlap and a reply-time promise. |
| C10 | M | **Home page has no proof at all**: no figures, logos, testimonials, certifications. | Add a proof strip (section 6.1). |
| C11 | L | Label drift: nav "Showcase" vs button "Showcases"; nav "Services" vs button "Pricing"; nav "Contacts" vs URL /contact. | Pick one word for each. |
| C12 | L | Slug mismatch: "Lender's Sales & Revenue report" lives at /work/online-sales-report, next to /work/online-sales-cube. | Rename slug (with redirect) to e.g. /work/lender-sales-report. |
| C13 | L | Headline figure "100%" on the mining card says nothing; three cards have no figure. | Use a meaningful figure (e.g. effective-time share) or a short outcome line on all cards. |
| C14 | L | Small, Short and Urgent tiers each appeared twice in the fetched page, probably from tab rendering. | Check on mobile and with JavaScript off. |
| C15 | L | Footer has a double space in "©  VOSK 2026". | Fix. |

> COMMENT: C1–C3 are one underlying problem: the three pages describe three different businesses. Home sells a Fabric/Power BI/Superset stack, Services sells Power BI and Superset hours, Showcase proves Power BI, Cube and n8n. Pick the list the showcase can prove today (Power BI, n8n/AI automation, Cube/SQL) and make all three pages say that, with Fabric and Superset added back as proof arrives.

---

## 6. Claims, key phrases and statements: what goes where

### 6.1 Placement map

| Location | Put here | Notes |
|---|---|---|
| Home hero headline | One outcome claim | See options in 6.2 |
| Home subheadline | What you build + for whom + tools (max 3, in proof order) | "Power BI dashboards and n8n automations for finance, marketing and operations teams." |
| Home proof strip (new, under hero) | 3 facts | "9 live case studies" · "[certification, e.g. DP-600, if current]" · "[one measured client outcome]" |
| Home, below strip (new) | 3 showcase cards + link | P&L, marketing dashboard, invoice parser: one per buyer type |
| Showcase cards | Client/demo tag + tool tag + one outcome line | Fixes C4, C13 |
| Services top | One line on how to choose: package, project or subscription | |
| Services, each offer | Price, typical timeline, what is included, what is not | Timelines are missing today except Urgent |
| Contact | Time zone, reply time, "what to send me" (3 bullets) | Fixes C9 |
| Upwork profile title | "Power BI Developer · DAX · n8n AI Automation" | Keywords buyers type |
| Upwork catalog titles | Deliverable + tool, as in section 3 | No adjectives like "amazing", "professional" |
| Catalog description, first 2 lines | Who it is for + exact deliverable + link-free proof ("see gallery for a live example screenshot") | No contact details or URLs in images |

### 6.2 Hero headline options

Only use an option whose claim you can back on the same screen.

1. "Reports your team trusts, built in days, not quarters." Backing: fixed timelines on Services.
2. "One source of truth for your numbers, and the routine reporting automated." Backing: P&L case + n8n cases.
3. Keep "Save money by understanding your data." only if you add a line under it such as "[Client type] cut [task] from [X hours] to [Y minutes]."

> COMMENT: Your profile notes mention org-app reporting for 300+ employees and data discovery cut from hours to minutes. If both are still accurate and you may state them, they are the strongest candidates for the proof strip and for option 3.

### 6.3 Key phrases

**Buyer language (site copy, catalog descriptions, proposals)**

- "one source of truth"
- "reports nobody trusts" / "numbers that don't match"
- "budget vs actual"
- "automate routine reporting"
- "chat with your data"
- "stop copying invoices into spreadsheets"
- "slow report", "stuck refresh"
- "Excel to Power BI"

**Search terms (catalog titles, tags, Upwork skills, page titles)**

- Power BI dashboard, Power BI report, DAX, data model, row-level security
- P&L report, budget vs actual, KPI dashboard, executive dashboard
- marketing dashboard, CAC, ROAS, cohort
- n8n automation, AI workflow, invoice parsing, email to Google Sheets
- PostgreSQL, SQL optimization, dbt, Cube semantic layer
- Microsoft Fabric, Direct Lake (only once proof exists)

**Avoid**

- "Full-stack BI solutions" and "modern stack": describe tools, not outcomes.
- "Priority support" without a number.
- Any metric, client name or certification you cannot show.

### 6.4 Statement templates

- Case card: "[Client type], [region]. Problem: [one line]. Built: [deliverable]. Result: [measured change]. Client work, figures altered."
- Catalog opener: "For [role] who need [deliverable] without [pain]. You send [inputs]; in [N] days you get [outputs]."
- Scope guard: "Not included: [list]. If your data needs cleaning first, message me before ordering."

---

## 7. Site prices and service mix

### 7.1 Price check

| Offer | Site price | Implied rate | Comment |
|---|---|---|---|
| Subscription Small | $1,500 / ~40h | $37.50/h | In your stated range |
| Subscription Medium | $2,200 / ~60h | $36.67/h | Cheapest per hour |
| Subscription Large | $3,000 / ~80h | $37.50/h | **More per hour than Medium.** No reason to buy Large over Medium + a few hours |
| Project Short | $2k–5k, one dashboard | 53–133h at $37.50 | Catalog sells a 5-page dashboard at $1,290 (34h). The gap is unexplained |
| Project Mid | $5k–12k | 133–320h | |
| Project Long | $10k–25k | 267–667h | **Overlaps Mid** between $10k and $12k |
| Urgent | $300+ | ~8h | Catalog #3 Standard ($420) is the same job; fine, but name the Upwork one "fix" and this one "rush" |
| Education | $50/h | $50/h | Higher than your build rate; consistent with catalog #18 |
| Full-time | TBD | | A blank price reads as unfinished |

### 7.2 Price fixes

1. **Large tier**: price at $2,800 (about $35/h) so volume is rewarded, or keep $3,000 and add something only Large gets (e.g. weekly call, same-day reply).
2. **Mid/Long overlap**: set Long to "$12k–25k".
3. **Short vs catalog**: state what Short includes that a package does not: discovery, messy or multiple sources, pipeline work, stakeholder rounds. Or lower Short's floor to $1,500 so the ladder is continuous from catalog Advanced ($1,290–$1,900).
4. **Full-time**: write "from $[X]/month" or remove the card.
5. **Timelines**: add typical duration to every project tier (e.g. Short 2–4 weeks).
6. **Subscription terms**: say what happens with unused or extra hours and the minimum term; "just ask" is not a term.

### 7.3 Service mix: recommended structure

| Order | Block | Contents | Price signal |
|---|---|---|---|
| 1 | **Packages** (new) | The catalog listings, grouped: Dashboards · Automations · Fixes & security | $150–$1,900, fixed |
| 2 | **Projects** | Short / Mid / Long with timelines | $2k–25k |
| 3 | **Subscription** | Small / Medium / Large | $1,500–3,000 per month |
| 4 | **Urgent** | Rush fix | $300+ |
| 5 | **Coaching** | 1:1 | $50/h |

> COMMENT: Today the cheapest way to hire you from the site is $300 (urgent) or $1,500 (subscription). A Packages block gives small buyers an entry point and keeps site and Upwork prices identical, so nobody finds two prices for the same thing.
> COMMENT: Automation is missing from the mix entirely (C3). It is also the most catalog-friendly part of your work: small, repeatable, easy to scope.

---

## 8. Action checklist

**Before publishing any listing**

- [ ] Replace estimated hours with tracked hours; adjust prices.
- [ ] Label every showcase card client/demo (C4).
- [ ] Align hero, Services intro and showcase title on one tool list (C1–C3, C6).
- [ ] Prepare 4:3 gallery images without URLs, logos or contact details.

**Wave 1 (week 1)**

- [ ] Publish listings 1, 2, 4, 12.
- [ ] Add Packages block and Automation offer to Services.
- [ ] Fix Large tier price and Mid/Long overlap.

**Wave 2 (weeks 2–4)**

- [ ] Write a before/after tune-up case, then publish 3, 5, 11, 13, 18.
- [ ] Add proof strip to home; add time zone and reply time to Contact.

**Wave 3 (when proof exists)**

- [ ] Fabric, Superset, dbt, CI/CD cases, then listings 6, 14, 15, 17.
- [ ] Industry variants 7–10 as wanted.

**Review at 8 weeks**: views, orders and tier chosen per listing; cut or re-scope listings with views and no orders.

---

## 9. Open questions

1. Which showcase items are real client work? (Needed for C4 and for what you may claim in catalog copy.)
2. Are DP-600 and the "300+ employees" / "hours to minutes" facts current and publishable?
3. Is $30–40/hour the gross Upwork rate or the net you want after fees? Prices here assume gross.
4. Your Upwork badge level (decides whether review takes days or weeks).

---

## Sources

- Upwork Help: [How to create a project in Project Catalog](https://support.upwork.com/hc/en-us/articles/360057397533-How-to-create-a-project-in-Project-Catalog)
- Upwork Help: [How we review your Project Catalog project](https://support.upwork.com/hc/en-us/articles/4408644453395-How-we-review-your-Project-Catalog-project)
- Upwork Help: [How to build your best project in Project Catalog](https://support.upwork.com/hc/en-us/articles/360058122033-How-to-build-your-best-project-in-Project-Catalog)
- Upwork Help: [How to add images and video to your project](https://support.upwork.com/hc/en-us/articles/1500011309082-How-to-add-images-and-video-to-your-Project-Catalog-project)
- [Is the Upwork Project Catalog Worth It? (Upwork Scout)](https://upwork-scout.com/blog/upwork-project-catalog-worth-it)
- [Upwork Project Catalog guide (AI Proposer)](https://aiproposer.com/guides/upwork-strategy/upwork-project-catalog-guide)
- [Upwork Fees (Freelance Nation)](https://freelancenation.com/blog/upwork-fees)
- [How to Use Upwork Project Catalog (GigUp)](https://giguphq.com/blog/upwork-project-catalog)
- [Image specs (Geek Freelancer)](https://geek-freelancer.com/how-to-successfully-create-an-upwork-project-catalog/)
- Sample Power BI listings: [$100/$250/$500](https://www.upwork.com/services/product/a-fantastic-interactive-dashboard-prepared-on-power-bi-1473172736857767936) · [$300/$500/$700](https://www.upwork.com/services/product/easy-to-use-and-aesthetically-pleasing-power-bi-dashboard-1383869020443545600) · [$40/$100/$250](https://www.upwork.com/services/product/a-power-bi-report-or-dashboard-analysing-your-data-1409123570542006272)
- Sample n8n listings: [$150/$350/$700](https://www.upwork.com/services/product/development-it-an-ai-powered-n8n-workflow-automation-for-your-business-processes-2039446474152099236) · [$149/$349/$699](https://www.upwork.com/services/product/development-it-n8n-workflow-automation-n8n-automation-api-crm-multi-app-integration-2039728930733754620) · [$285/$475/$750](https://www.upwork.com/services/product/development-it-an-expert-level-n8n-workflow-1876340595265451406)
- Site pages: [vosk.dev](https://vosk.dev/) · [/work](https://vosk.dev/work) · [/services](https://vosk.dev/services) · [/contact](https://vosk.dev/contact) · [/blog](https://vosk.dev/blog)

---

## 10. Assessment and fixes, 2026-11-17

Checked against the code and the owner's own job-flow docs (`docs/job/p1-guide.html`). Status: **fixed**, **open** (needs the owner's fact or price), **not a bug**, **won't do**.

| # | Confirmed? | Status | What was done / why not |
|---|---|---|---|
| C1 Fabric | Partly. Fabric is backed by DP-600 and the ISS employment ("built the company's Microsoft Fabric platform"), only no showcase. | fixed | Services title, meta, intro and skills list now name Microsoft Fabric. Hero keeps it, after Power BI. |
| C2 Superset | Yes. The Superset showcase is hidden in production (no instance). | fixed | Dropped from hero, Services meta and intro, Contact meta, blog CTA. Kept in the Services skills list. |
| C3 Automation | Yes. | partly | Named in hero, Services meta, intro and skills list. **Open:** an Automation offer with a price. |
| C4 Client vs demo | Yes. The lead also said "client work with the figures altered", but the one client set (mining) is real figures under anonymised names. | fixed | Required `data` field per showcase: "Demo on synthetic data" / "Real operating figures, names anonymised" (the owner's Upwork wording), on every card and under each page title; lead reworded. |
| C5 "Save money" | Yes. | open | Needs one measured outcome the owner can publish (the 300+ employees / hours-to-minutes facts, if current). |
| C6 Showcase title | Yes. | fixed | Meta title "Dashboard & Automation Case Studies"; lead says "Dashboards and automations". |
| C7 Subscription list | Yes. | fixed | "Every subscription includes" is now "Available in every plan". |
| C8 Priority support | Yes. | open | Needs a reply time. |
| C9 Contact | Yes. | partly | Location and hours added ("Turkey, working remotely on EU and UK hours", from the Upwork overview). **Open:** reply time. |
| C10 Home proof | Yes. | open | Needs the facts for a proof strip. |
| C11 Labels | Yes. | fixed | Nav "Contact" (and the Contact page title), home buttons "Showcase" and "Services & pricing". |
| C12 Slug | Yes. | won't do | `/work/online-sales-report` is already in the Upwork and Contra portfolio entries; a rename needs a redirect and every shared link goes through it, for little gain. |
| C13 "100%" | Yes: it is the waterfall's starting point. | open | Needs a real figure from the trucks data (e.g. effective-time share). |
| C14 Tiers twice | No bug. | not a bug | The endless carousel's first-tier clone. It is already `aria-hidden` and `inert`; only a raw text fetch sees it twice. |
| C15 Footer space | Yes. | fixed | "© VOSK 2026" with single spaces, also on mobile. |
| Extra | The Services "Conditions" popup showed Lorem-ipsum placeholder text on the live site. | fixed (hidden) | The button is gone until the terms exist (minimum term, unused hours, reply time); they go in `services.conditions.body` in `en.ts`. |

**Prices (§7):** the arithmetic is right (Large $37.50/h is dearer per hour than Medium $36.67/h; Mid and Long overlap at $10k–12k; Full-time is "TBD"). Nothing changed: prices are the owner's call.

**Conflicts with the owner's other channels, worth settling before the catalog goes live:**
- **Hourly rate:** the spec's ladder assumes $35–38/h gross, but the Upwork profile is set at **$50/h** (`docs/job/p1-guide.html`, Upwork step 3). A buyer comparing the hourly rate with a $290 Starter will see two price levels.
- **dbt:** catalog listing 15 tops out at $1,500 (Advanced), while the Contra service "dbt multi-source foundation" is **$2,800**.
- **AI automation:** catalog listing 5 starts at $340 (Starter), while the Contra service "AI automation: chat with your data, reports and alerts" is "**from $1,500**".

The Upwork platform rules in §2 were not re-checked here.

**Also fixed (SEO check of 11-17):**
- every showcase has a 120–160 character search description (a test holds the range);
- the ceo-digest page also waits for `CHAT_ENABLED`;
- n8n showcases are typed "Workflow automation" in their structured data;
- a dual-format showcase lists Power BI in its keywords and on its share card;
- each showcase page ends with contact and services links and two related case studies;
- "Management P&L report";
- executive-dashboard text names Power BI;
- `SITE_UPDATED` is 11-17.
