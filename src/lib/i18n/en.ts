import { AUTHOR_NAME } from "../person";

/**
 * English message catalog — the source of truth for the `Dictionary` shape.
 * `ru.ts` must satisfy the same type. Keys are grouped by surface (nav, home,
 * footer, …). Content bodies (blog MDX, showcase write-ups) are NOT here — they
 * live per-locale in `content/` and `lib/work.ts`.
 */
export const en = {
  meta: {
    // Site-wide defaults used by the root layout / OpenGraph, and `siteConfig.title` / `.description` (src/lib/site.ts).
    // 11-18 (SEO spec T-02): the name, not "VOSK", ends every title: "Vosk" alone is a speech-recognition toolkit.
    // DRAFT, owner review: the description.
    title: `Power BI & Fabric Consultant | ${AUTHOR_NAME}`,
    description:
      "Power BI and Microsoft Fabric consultant: reports, data models, n8n automations and AI chats over your data.",
  },
  nav: {
    home: "Home",
    work: "Showcase",
    blog: "Blog",
    services: "Services",
    about: "About",
    contact: "Contact",
    message: "Message",
    openMenu: "Toggle menu",
  },
  langSwitcher: {
    label: "Language",
  },
  home: {
    // 11-18 (SEO spec T-03). DRAFT, owner review (I-03): the H1, which takes the topic words; the headline above
    // stays as the line under it, styled as before. The sections below the hero are new copy too.
    h1: "Power BI and Microsoft Fabric consultant",
    // Headline is split so the two emphasized words can be styled; word order
    // differs per language, hence the five parts.
    headline: {
      lead: "Save ",
      em1: "money",
      mid: " by understanding your ",
      em2: "data",
      tail: ".",
    },
    // The headline is brand voice and names nothing searchable; this line is the
    // page's only body copy, so it carries the query terms on its own.
    // 11-17 (Upwork / site spec C1–C3, C11): the tools the showcase and the CV prove, automation named, one word per
    // destination ("Showcase", "Services") as in the nav.
    lede: "Power BI and Microsoft Fabric reporting, n8n automations and AI chats over your data, and the SQL underneath. From raw data to live data that you can see and chat with.",
    cta: "Showcase",
    ctaSecondary: "Services & pricing",
  },
  services: {
    title: "Services",
    // The page H1 (SEO spec T-07); `title` is also the nav label and the breadcrumb name.
    heading:
      "Data & Fabric engineering, Power BI, n8n, AI agents and automation",
    // The hub's links to the service pages (SEO spec T-04); the list shows only pages out of draft.
    pagesTitle: "Services in detail",
    metaTitle: "Power BI & Fabric Services and Pricing",
    metaDescription:
      "Power BI and Microsoft Fabric consulting, n8n automations and AI data chats: dashboards, models, pipelines. Subscription, project and urgent work, priced.",
    subscription: {
      eyebrow: "Subscription",
      badge: "Billed monthly",
      tiers: [
        {
          name: "Small",
          desc: "Keep your dashboards humming without a second thought. Around 40 hours a month for fixes, tweaks and quick answers — just ask.",
          price: "$1,500",
          unit: "per month · ~40h",
        },
        {
          name: "Medium",
          desc: "Like having a data person on the team, minus the hiring. Around 60 hours a month for new reports, model changes and that growing wishlist.",
          price: "$2,200",
          unit: "per month · ~60h",
        },
        {
          name: "Large",
          desc: "Hand me the whole reporting stack. Around 80 hours a month, from pipelines to the last chart — you set the priorities, I get them shipped.",
          price: "$3,000",
          unit: "per month · ~80h",
        },
      ],
      // 11-17 (spec C7): what the hours can go to, not a bundle every tier delivers in full
      servicesTitle: "Available in every plan",
      services: [
        "Power BI & Superset dashboards",
        "Microsoft Fabric platforms",
        "n8n automations & AI data chats",
        "Data modeling & DAX",
        "SQL & PostgreSQL development",
        "ETL / ELT pipelines",
        "dbt models & tests",
        "Data quality monitoring",
        "Warehouse & architecture design",
        "Semantic layers design",
        "Refresh automation & scheduling",
        "Performance optimization",
        "Row-level security & access",
        "KPI & metric definitions",
        "Audits & code reviews",
        "Documentation & handover",
        "Priority support",
      ],
    },
    project: {
      eyebrow: "Project",
      badge: "Fixed scope",
      tiers: [
        {
          name: "Short",
          desc: "That one dashboard you keep putting off? Let's scope it together and ship it — properly, end to end.",
          price: "$2k–5k",
          unit: "per project",
        },
        {
          name: "Mid",
          desc: "A clean data model and a set of dashboards your team will actually open every morning. Tell me what you need to see.",
          price: "$5k–12k",
          unit: "per project",
        },
        {
          name: "Long",
          desc: "From raw source data to a reporting platform that grows with you. A big build with clear milestones and no surprises.",
          price: "$10k–25k",
          unit: "per project",
        },
      ],
    },
    other: {
      eyebrow: "Other",
      // 11-17 (owner): Full-time removed; Education became Initial consulting, price kept. 11-19 (owner): it is free.
      tiers: [
        {
          name: "Urgent",
          desc: "Report broken, refresh stuck, board meeting on Friday? Ping me for super speedy assistance.",
          price: "$300+",
          unit: "one-off",
        },
        {
          name: "Initial consulting",
          desc: "Want an expert review of your tech stack or code, or just need to understand & learn? General BI and AI consulting, in plain words.",
          price: "Free",
          unit: "",
        },
      ],
    },
    // The card's conditions popup. Empty `body` = no button (11-17: the placeholder text was live); the owner writes
    // the terms (minimum term, unused hours, reply time) and they go here.
    conditions: {
      aria: "View conditions",
      title: "Conditions",
      close: "Close",
      body: [] as string[],
    },
  },
  // /privacy (readiness spec R-06, 11-19): plain facts about what the code does, each checked against the source
  // (components/analytics.tsx, contact/actions.ts, lib/chat/route.ts, lib/ceo-digest/chat-tools.ts). The owner asked for
  // a short text and no review. Update it when tracking, the form or the chats change.
  privacy: {
    title: "Privacy",
    metaDescription:
      "What vosk.dev collects and why: analytics only after you accept the cookie card, contact form messages sent by email, questions asked in the AI chats.",
    lede: "What this site collects, and what it doesn't.",
    updated: "Updated 19 November 2026",
    sections: [
      {
        title: "Analytics",
        body: [
          "Google Analytics, through Google Tag Manager, loads only after you press Accept on the cookie card. It counts page views and clicks on the main buttons, such as Message, a report or the contact form, and shows whether a visit came from a Google ad.",
          "Press Decline and nothing loads. Your choice is kept in your own browser (localStorage, key vosk.consent), not on my server.",
        ],
      },
      {
        title: "Contact form",
        body: [
          "The form sends your email address, the subject and the message to my mailbox through Resend, an email service, and sends you a copy. The site keeps no database of messages.",
          "With the message the form also sends the page you first opened on this site and, if the link you came by had campaign tags (for example from an ad), those tags. They are kept in your browser tab until it closes, without a cookie, and go nowhere else.",
        ],
      },
      {
        title: "AI chats",
        body: [
          "Questions typed into a report's Ask AI chat go to an AI model provider to get the answer. For each question the site logs its size, cost and a scrambled, shortened form of your IP address, never the text.",
          "The Tidewell data chat emails a report only to an address you type and confirm yourself. My n8n automation server sends it.",
        ],
      },
      {
        title: "Reports and previews",
        body: [
          "Some reports load from outside services, such as Microsoft Power BI, and workflow previews load from n8n, only when you click to open them. Those services follow their own privacy policies.",
        ],
      },
      {
        title: "Hosting",
        body: [
          "The site runs on Vercel, which keeps short-lived technical logs to run and protect the service.",
        ],
      },
    ],
    contactTitle: "Questions",
    contactBody:
      "To ask what I hold about you, or to have it deleted, write to",
    changeChoice: "Change cookie choice",
  },
  // /about (SEO spec T-05, 11-18). DRAFT, owner review: every line. Facts from the spec's section 2.3 only; years of
  // experience, industries and a photo wait for the owner.
  about: {
    title: "About",
    metaTitle: `About ${AUTHOR_NAME}: Power BI & Fabric Consultant (DP-600)`,
    metaDescription: `${AUTHOR_NAME}, Power BI and Microsoft Fabric consultant with the DP-600 certificate. Based in Turkey, working remotely.`,
    lede: "Power BI and Microsoft Fabric consultant.",
    body: [
      "I build Power BI and Fabric reports, the data models and SQL under them, and the pipelines that keep them fresh. Around them: n8n automations for reports, inboxes and invoices, and AI chats that answer questions straight from your data.",
      "I'm based in Turkey and work remotely.",
    ],
    // The logo row (owner, 11-27): companies the owner has worked for, as clients or as an employee.
    clientsTitle: "Worked with",
    stackTitle: "What I work with",
    stack: [
      "Microsoft Fabric",
      "Power BI",
      "MS SQL",
      "PostgreSQL",
      "dbt",
      "n8n",
      "AI agents",
      "Ontologies",
      "Semantic layers",
      "ETL",
      "ELT",
    ],
    credentialTitle: "Certificate",
    credential:
      "Microsoft Certified: Fabric Analytics Engineer Associate (DP-600)",
    linkCertificate: "see certificate",
    // The contact details block (moved from /contact, owner 11-20).
    contactsTitle: "Contacts",
    labelName: "Name",
    labelEmail: "Email",
    labelLinkedin: "LinkedIn",
    labelUpwork: "Upwork",
    labelGithub: "GitHub",
    labelDp600: "DP-600",
    // Link text for a profile row — the same for every platform; the row label
    // names it, and the link's aria-label joins the two.
    linkProfile: "see profile",
    // Shown in place of a profile link until siteConfig.social holds a real URL.
    linkPending: "Coming soon",
  },
  // One service page, /services/<slug> (SEO spec T-04). The entries themselves are in src/lib/services.ts.
  serviceDetail: {
    audienceTitle: "Who it's for",
    deliverablesTitle: "What you get",
    pricingTitle: "Price",
    casesTitle: "Case studies",
    stepsTitle: "How it runs",
    faqTitle: "Questions",
    postsTitle: "Further reading",
    ctaTitle: "Got a project like this?",
    ctaBody:
      "Tell me what the report should answer and where the data lives, and I'll tell you what it would take.",
    ctaContact: "Get in touch",
  },
  contact: {
    title: "Contact",
    metaTitle: "Contact a BI Consultant",
    metaDescription:
      "Get in touch about a Power BI, Fabric, automation or analytics project, by form or email. BI consultant in Turkey.",
    // 11-17 (spec C9): where and when, from the owner's Upwork overview (docs/job/p1-guide.html)
    intro:
      "Send your business related message straight into my email box. I'm in Turkey, working remotely.",
    // Shown only when `siteConfig.bookingUrl` is set (SEO spec T-06).
    bookCall: "Book a 20-minute call",
  },
  form: {
    emailLabel: "Email",
    emailPlaceholder: "your contact email",
    subjectLabel: "Subject",
    subjectOptional: "(optional)",
    subjectPlaceholder: "what is the request about",
    messageLabel: "Message",
    messagePlaceholder:
      "Ask me about rates, availability, or an initial assessment.",
    submit: "Send message",
    sending: "Sending…",
    // Field validation (used to build the Zod schema server-side).
    invalidEmail: "Please enter a valid email address",
    messageTooShort: "Please write at least 10 characters",
    messageTooLong: "Message is too long",
    // Server-action results (kept in sync with the action's message map).
    success: "Thanks — your message is on its way. I'll get back to you soon.",
    errorFields: "Please fix the highlighted fields.",
    errorRateLimit:
      "Too many messages in a short time. Please try again later.",
    errorNotConfigured:
      "The contact form isn't fully set up yet. Please email me directly at",
    errorSendFailed: "Sorry — sending failed. Please email me directly at",
  },
  sendDialog: {
    open: "Message",
    title: "Send a message",
    subtitle: "Straight into my inbox — I'll get back to you soon.",
    close: "Close",
    ariaLabel: "Send a message",
  },
  blog: {
    title: "Blog",
    metaTitle: "Blog — Power BI, DAX & SQL notes",
    metaDescription:
      "Hands-on notes on Power BI, DAX, SQL and data modeling from a BI consultant — working patterns from real client work, not tutorials.",
    intro:
      "Working notes from client projects: Power BI and DAX patterns, SQL and Postgres workflows, and the delivery plumbing around them.",
    // `{tag}` is replaced with the tag's display label — every tag page used to
    // share the generic blog description above.
    tagMetaDescription:
      "Every article tagged {tag} — hands-on notes on BI, dashboards, data models and the tooling around them, from a BI consultant.",
    tagIntro: "Every article tagged {tag}, newest first.",
    breadcrumbHome: "Home",
    related: "Related posts",
    ctaTitle: "Need this built for your team?",
    ctaBody:
      "I do this work for a living: Power BI and Fabric reports, the data models under them, the pipelines that keep them fresh, and the automations around them.",
    ctaServices: "See services & pricing",
    ctaContact: "Get in touch",
    empty: "Articles coming soon.",
    searchPlaceholder: "Search posts by keyword…",
    searchAria: "Search blog posts",
    newestFirst: "Newest first",
    oldestFirst: "Oldest first",
    noMatch: "No posts match",
    tagged: "Tagged",
    backToBlog: "Back to blog",
    older: "Older",
    newer: "Newer",
    // Post header (SEO spec T-05): shown when the frontmatter has `updated`.
    updated: "Updated",
    paginationAria: "Blog pages",
  },
  work: {
    title: "Showcase",
    metaTitle: "Dashboard & Automation Case Studies",
    breadcrumbHome: "Home",
    aboutHeading: "About this project",
    // The client type under a showcase title and on its card (owner, 11-15).
    clientLabel: "Client",
    metaDescription:
      "Sample work to open live: Power BI and Fabric dashboards, n8n automations, AI agents and chats, data engineering, semantic layers and ontologies.",
    // The owner's words (11-26): a lead, then the topics in bold, split by " | ". Fixed copy, no longer built from the
    // showcases' platforms.
    intro: {
      lead: "My sample work and live/interactive examples: ",
      topics: [
        "Power BI / Fabric dashboards & report",
        "n8n automations",
        "AI agents and chats",
        "data engineering solutions",
        "semantic layers",
        "ontologies",
      ],
    },
    empty: "Case studies coming soon.",
    backToShowcase: "Back to showcase",
    closeReport: "Close the report",
    // A showcase with both flavours of the same report shows two buttons side by side, each
    // opening its report in the popup (owner, 10-31; labels 11-03). Since 11-04 every showcase uses these two
    // names: "Power BI" for a Power BI report, "Web report" for one drawn on the site.
    openPowerBi: "Power BI",
    openWebReport: "Web report",
    // The AI chat (ADR-0005, 11-06): a neon button that opens the web report with its chat up.
    askAi: "Ask AI",
    // A data chat with no report of its own (the Tidewell showcase, 11-16): "Ask AI" opens it beside an empty slot that
    // says where the client's app or report would sit (owner, 11-16).
    chatAppSlot: "Your APP or BI REPORT here",
    writeUp: "Write-up",
    // Guest-token dashboards (Superset) mount client-side, so they need a wait state
    // and a visible failure — an embed that quietly renders nothing reads as a bug.
    dashboardLoading: "Loading the live dashboard…",
    dashboardError:
      "The dashboard couldn't be loaded. Try refreshing the page.",
    // An n8n workflow showcase (11-16; order 11-16 owner): the button opens the canvas in the popup, then "Try it
    // yourself" with the sample files in a dropdown, then "About this project".
    openWorkflow: "Open n8n flow",
    howToTestHeading: "Try it yourself",
    samplesLabel: "Sample invoices",
    sampleName: "Invoice #{n}",
    workflowLoading: "Loading the workflow…",
    workflowError:
      "The workflow preview couldn't be loaded. Try again in a minute.",
    paginationAria: "Showcase pages",
    // Where the figures come from (lib/work.ts `data`, 11-17, spec C4): on every card and under the page title.
    dataLabel: {
      synthetic: "Demo on synthetic data",
      client: "Real operating figures, names anonymised",
      anonymised: "Client report, anonymised data",
    },
    // The foot of a showcase page (11-17 SEO check: no way on from a showcase but back). One sentence and the buttons
    // (owner, 11-18). `nextCtaBooking` replaces `nextCta` once `siteConfig.bookingUrl` is set, with a "Book a free call"
    // button in front.
    nextCta: "Want this for your data? Message me.",
    nextCtaBooking: "Book a free call or message me.",
    nextBook: "Book a free call",
    nextContact: "Contact me",
    nextServices: "See pricing",
    relatedTitle: "More case studies",
  },
  // The Cube-backed online-sales dashboard (components/sales-dashboard.tsx). `{period}` is
  // filled in by the component: "2025", or "Jan–Aug 2025" while the selected year is partial.
  // The four metric names double as tile labels, legend entries, toggles and column heads.
  salesDashboard: {
    filtersAria: "Dashboard filters",
    yearLabel: "Year",
    allYears: "All",
    revenue: "Revenue",
    profit: "Profit",
    orders: "Orders",
    margin: "Margin",
    vsPrior: "Change vs {period}",
    noPriorYear: "No prior year to compare",
    monthlyTitle: "Revenue, profit and orders by month",
    topTitle: "Top 5",
    topKindAria: "Rank",
    byCategory: "Category",
    byCountry: "Country",
    metricAria: "Metric",
    channelsTitle: "Sales by channel",
    viewAria: "View",
    viewTable: "Table",
    viewChart: "Chart",
    colChannel: "Channel",
    total: "Total",
    footnote:
      "Completed orders only. Profit is revenue minus product cost. Synthetic data, queried through a Cube semantic layer.",
  },
  notFound: {
    code: "404",
    title: "Page not found",
    body: "The page you're looking for doesn't exist or has moved.",
    back: "Back home",
  },
};

// `en` is intentionally NOT `as const` — leaves widen to `string` so `ru.ts`
// (and any future locale) can satisfy the same shape.
export type Dictionary = typeof en;
