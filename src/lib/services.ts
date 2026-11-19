import { en } from "./i18n/en";
import { getAllPosts, type PostMeta } from "./content";
import { showcases, type Showcase } from "./work";

/**
 * Service pages registry (SEO spec T-04, 11-18): one page per service, one search intent each, at /services/<slug>.
 * Modelled on lib/work.ts: entries here, the route in app/[locale]/services/[slug].
 *
 * Prices are never typed here. `pricing.group` names a group of tiers in the services dictionary and the page reads
 * the visible strings from there; a title that names a price builds it from the same dictionary.
 *
 * `draft: true`: the page builds and is reachable (preview deploys), but it is `noindex, follow` and stays out of the
 * sitemap, the nav, the footer and the /services hub. The owner flips it after approving the copy.
 *
 * Server-only in effect: it reads the post files and the showcase registry.
 */
export type PricingGroup = "subscription" | "project" | "other";

export type ServiceEntry = {
  slug: string;
  name: string; // the anchor text wherever the page is linked
  title: string; // <title>; the layout adds "| Kirill Vosk"
  h1: string;
  description: string; // meta description, 140–160 characters (checked in services.test.ts)
  audience: string; // who it is for and the problem, at most 100 words
  deliverables: string[];
  pricing: { group: PricingGroup };
  steps: string[]; // 3–4
  faq: { q: string; a: string }[]; // exactly five, shown as text (no FAQPage markup)
  caseSlugs: [string, string];
  postSlugs: string[]; // 2–3
  draft: boolean;
};

// DRAFT, owner review (SEO spec I-04): all copy below, and which two case studies go on each page.
export const services: ServiceEntry[] = [
  {
    slug: "power-bi-consulting",
    name: "Power BI consulting",
    title: "Power BI Consulting & Dashboard Development",
    h1: "Power BI consulting and dashboard development",
    description:
      "Freelance Power BI consulting: dashboards your team opens every morning, the data model and DAX under them, and the SQL that keeps them fresh.",
    audience:
      "For a team that has the data but not the report. The numbers live in a database, a few Excel files and an app or two, and every month someone glues them together by hand. Or there's a Power BI report already, but it's slow, nobody trusts the totals and the person who built it has left. I build the report end to end: from your sources to a model that answers the questions you actually ask.",
    deliverables: [
      "Power BI reports and dashboards built around the questions your team asks",
      "A clean data model, DAX measures written once and reused everywhere",
      "SQL and Power Query that pull from your databases, files and apps",
      "Scheduled refresh and row-level security where you need them",
      "Documentation and a handover, so your team can own it",
    ],
    pricing: { group: "project" },
    steps: [
      "A call about what the report should answer and where the data lives.",
      "A written scope with milestones and a fixed price.",
      "Build in short rounds: you see a working report early and steer it.",
      "Handover: the file, the docs and a walk-through for your team.",
    ],
    faq: [
      {
        q: "How much does a Power BI dashboard cost?",
        a: "Depends on the sources and how many pages. The project ranges on this page cover most builds, and the scope call pins it down.",
      },
      {
        q: "Can you fix our existing Power BI reports?",
        a: "Yes. Fixing, speeding up or rebuilding an existing report is a common job. I read the model and the queries first, then tell you what's worth keeping.",
      },
      {
        q: "Which data sources can you connect?",
        a: "Anything Power BI can reach: SQL Server, PostgreSQL, Excel and CSV files, SharePoint, APIs, Microsoft Fabric. If the data needs a pipeline first, I build that too.",
      },
      {
        q: "Do you work remotely?",
        a: "Yes. I'm in Turkey and work on EU and UK hours.",
      },
      {
        q: "What if we need changes after the project?",
        a: "Small fixes and new pages go to the monthly support retainer. A report that breaks right before a deadline is an urgent one-off job.",
      },
    ],
    caseSlugs: ["mining-time-utilization", "executive-dashboard"],
    postSlugs: [
      "power-bi-time-utilization-funnel",
      "postgres-power-bi-workflow",
      "one-model-two-front-doors",
    ],
    draft: true,
  },
  {
    slug: "power-bi-support",
    name: "Power BI support retainer",
    // The price is the dictionary's, never typed (SEO spec section 3).
    title: `Power BI Support Retainer from ${en.services.subscription.tiers[0]!.price}/month`,
    h1: "Power BI support on a monthly retainer",
    description:
      "Power BI support on a monthly retainer: fixes, new reports, model changes and refresh problems, handled by one freelance consultant who knows your reports.",
    audience:
      "For a company that already runs on Power BI and keeps finding things to fix and add. Reports break after a source changes, refreshes fail at night, the wishlist grows, and there's no data person on the team to take it. A retainer gives you a set number of hours each month: you set the priorities, I get them shipped.",
    deliverables: [
      "Fixes for broken visuals, measures and refreshes",
      "New reports and pages from your wishlist",
      "Data model and DAX changes",
      "Refresh, gateway and performance problems sorted",
      "Quick answers when someone asks what a number means",
    ],
    pricing: { group: "subscription" },
    steps: [
      "A call to look at your reports and the backlog.",
      "Pick a plan by the hours you need a month.",
      "You send requests as they come, I work through them in your order.",
    ],
    faq: [
      {
        q: "Which plan do I need?",
        a: "Count what your team asks for in a month. A handful of fixes and tweaks fits Small, a steady stream of new reports fits Medium, and if I run the whole reporting stack it's Large.",
      },
      {
        q: "Can the hours go to work other than Power BI?",
        a: "Yes, anything from the plan list on the services page: SQL, pipelines, dbt, Microsoft Fabric, n8n automations, AI data chats.",
      },
      {
        q: "Can you take over reports someone else built?",
        a: "Yes. I read the model and the queries first, then tell you what's fragile and what's fine.",
      },
      {
        q: "Can we start with a one-off job?",
        a: "An urgent fix or a fixed-scope project is a fine way to see how I work before a retainer.",
      },
      {
        q: "Which hours do you work?",
        a: "I'm in Turkey and work remotely on EU and UK hours.",
      },
    ],
    caseSlugs: ["marketing-acquisition-dashboard", "online-sales-report"],
    postSlugs: [
      "give-the-agent-eyes",
      "postgres-power-bi-workflow",
      "formatting-sql-for-readability",
    ],
    draft: true,
  },
  {
    slug: "microsoft-fabric",
    name: "Microsoft Fabric",
    title: "Microsoft Fabric Consultant: Migration & Setup",
    h1: "Microsoft Fabric migration and platform setup",
    description:
      "Microsoft Fabric consultant, DP-600 certified: workspace and lakehouse setup, Power BI and SQL moved onto Fabric, pipelines, notebooks and semantic models.",
    audience:
      "For a team on Power BI that's outgrowing it: data comes from too many places, refreshes take hours and the SQL lives in a dozen report files. Or you bought Fabric capacity and nobody has set it up properly yet. I set up the platform, move what's worth moving, and leave a structure your team can keep running.",
    deliverables: [
      "Workspace, lakehouse and warehouse setup",
      "Pipelines and notebooks that load your sources on a schedule",
      "Semantic models shared by reports and Excel",
      "Existing Power BI datasets and SQL moved onto Fabric",
      "Access, security and documentation for the handover",
    ],
    pricing: { group: "project" },
    steps: [
      "A call about your sources, your reports and what hurts today.",
      "A written plan: what moves, in what order, at a fixed price.",
      "Build and migrate in stages, one area at a time.",
      "Handover with docs and a walk-through for your team.",
    ],
    faq: [
      {
        q: "Do we need Fabric at all?",
        a: "Not always. If Power BI with a database under it does the job, I'll say so on the first call. Fabric pays off with many sources, heavy refreshes, or a team that needs one shared model.",
      },
      {
        q: "Are you certified?",
        a: "Yes: Microsoft Certified Fabric Analytics Engineer Associate (DP-600).",
      },
      {
        q: "Can you move our existing Power BI reports?",
        a: "Yes. The reports usually stay as they are; what moves is the data and the model under them.",
      },
      {
        q: "What does a Fabric project cost?",
        a: "Depends on the number of sources and reports. The project ranges on this page cover most setups, and the plan pins it down.",
      },
      {
        q: "Do you work remotely?",
        a: "Yes. I'm in Turkey and work on EU and UK hours.",
      },
    ],
    caseSlugs: ["pnl-suite", "executive-dashboard"],
    postSlugs: [
      "deliver-data-without-dashboards-or-ai",
      "do-you-need-a-semantic-layer",
      "one-model-two-front-doors",
    ],
    draft: true,
  },
];

export function getService(slug: string): ServiceEntry | undefined {
  return services.find((s) => s.slug === slug);
}

/** Service pages that may be linked from the nav, the footer and the hub, and listed in the sitemap. */
export function getPublishedServices(): ServiceEntry[] {
  return services.filter((s) => !s.draft);
}

/**
 * The case studies and posts a service page links to. Throws (so the build fails) when a slug does not exist or the
 * showcase is hidden: showcases are env-gated, so this checks `showcases`, not the full registry.
 */
export function getServiceLinks(entry: ServiceEntry): {
  cases: Showcase[];
  posts: PostMeta[];
} {
  const posts = getAllPosts();
  const find = <T extends { slug: string }>(
    list: T[],
    slug: string,
    kind: string,
  ) => {
    const hit = list.find((x) => x.slug === slug);
    if (!hit)
      throw new Error(
        `services.ts: "${entry.slug}" links ${kind} "${slug}", which is missing or hidden`,
      );
    return hit;
  };
  return {
    cases: entry.caseSlugs.map((s) => find(showcases, s, "showcase")),
    posts: entry.postSlugs.map((s) => find(posts, s, "post")),
  };
}
