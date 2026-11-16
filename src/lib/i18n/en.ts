/**
 * English message catalog — the source of truth for the `Dictionary` shape.
 * `ru.ts` must satisfy the same type. Keys are grouped by surface (nav, home,
 * footer, …). Content bodies (blog MDX, showcase write-ups) are NOT here — they
 * live per-locale in `content/` and `lib/work.ts`.
 */
export const en = {
  meta: {
    // Site-wide defaults used by the root layout / OpenGraph.
    title: "VOSK — Freelance BI Analyst & Developer",
    description:
      "Freelance Business Intelligence analyst and developer. Dashboards, data pipelines, and analytics that turn raw data into decisions.",
  },
  nav: {
    home: "Home",
    work: "Showcase",
    blog: "Blog",
    services: "Services",
    contact: "Contacts",
    message: "Message",
    openMenu: "Toggle menu",
  },
  langSwitcher: {
    label: "Language",
  },
  home: {
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
    lede: "Full-stack BI solutions based on modern open-source & SaaS stack: MS Fabric, Power BI, Apache Superset. From raw data extraction to visualization.",
    cta: "Showcases",
    ctaSecondary: "Pricing",
  },
  footer: {
    available: "Available for new projects",
    rss: "RSS feed",
  },
  services: {
    title: "Services",
    metaTitle: "Power BI Services & Pricing",
    metaDescription:
      "Power BI and Apache Superset consulting — dashboards, data models, pipelines. Subscription, project, and urgent-fix engagements, with prices.",
    intro:
      "BI delivery and consulting on Power BI and Apache Superset — pick the engagement that fits. Monthly capacity for teams with an ongoing reporting load, fixed-scope projects for a specific build, and one-off urgent work when a report breaks before a deadline.",
    engagementsHeading: "Engagement models",
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
      servicesTitle: "Every subscription includes",
      services: [
        "Power BI & Superset dashboards",
        "Data modeling & DAX",
        "SQL & PostgreSQL development",
        "ETL / ELT pipelines",
        "dbt models & tests",
        "Data quality monitoring",
        "Warehouse & architecture design",
        "Semantic layers (Cube)",
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
      // The tutoring price is a placeholder — confirm before publish. Full-time
      // is deliberately TBD ("to be disclosed").
      tiers: [
        {
          name: "Urgent",
          desc: "Report broken, refresh stuck, board meeting on Friday? Send it over — I'll get it sorted this week.",
          price: "$300+",
          unit: "one-off",
        },
        {
          name: "Full-time",
          desc: "Want me in your stand-ups? I can join your team full-time, month to month, as your embedded BI person.",
          price: "TBD",
          unit: "per month",
        },
        {
          name: "Education",
          desc: "Learn Power BI, DAX, SQL or data modeling one-on-one — at your own pace, on real problems, no slide decks.",
          price: "$50",
          unit: "per hour",
        },
      ],
    },
    // Placeholder terms shown by the card's conditions popup — real copy TBD.
    conditions: {
      aria: "View conditions",
      title: "Conditions",
      close: "Close",
      body: [
        "Placeholder conditions — the real terms for this engagement will go here. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        "Scope, payment schedule, revisions, and cancellation terms will be listed as short, plain-language points.",
        "Nothing here is binding yet; this text is a stand-in until the final conditions are provided.",
      ],
    },
    nextAria: "Next",
  },
  contact: {
    title: "Contacts",
    metaTitle: "Contact a Freelance BI Analyst",
    metaDescription:
      "Get in touch about a Power BI, Superset, or analytics project — by form or email. Freelance BI analyst working with clients worldwide.",
    intro: "Send your business related message straight into my email box.",
    labelName: "Name",
    labelEmail: "Email",
    labelLinkedin: "LinkedIn",
    labelUpwork: "Upwork",
    labelGithub: "GitHub",
    labelDp600: "DP-600",
    // Link text for a profile row — the same for every platform; the row label
    // names it, and the link's aria-label joins the two.
    linkProfile: "see profile",
    linkCertificate: "see certificate",
    // Shown in place of a profile link until siteConfig.social holds a real URL.
    linkPending: "Coming soon",
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
      "Hands-on notes on Power BI, DAX, SQL and data modeling from a freelance BI analyst — working patterns from real client work, not tutorials.",
    intro:
      "Working notes from client projects: Power BI and DAX patterns, SQL and Postgres workflows, and the delivery plumbing around them.",
    // `{tag}` is replaced with the tag's display label — every tag page used to
    // share the generic blog description above.
    tagMetaDescription:
      "Every article tagged {tag} — hands-on notes on BI, dashboards, data models and the tooling around them, from a freelance BI analyst.",
    tagIntro: "Every article tagged {tag}, newest first.",
    breadcrumbHome: "Home",
    related: "Related posts",
    ctaTitle: "Need this built for your team?",
    ctaBody:
      "I do this work for a living — Power BI and Superset dashboards, the data models under them, and the pipelines that keep them fresh.",
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
    paginationAria: "Blog pages",
  },
  work: {
    title: "Showcase",
    metaTitle: "BI Dashboard Case Studies",
    breadcrumbHome: "Home",
    aboutHeading: "About this project",
    // The client type under a showcase title and on its card (owner, 11-15).
    clientLabel: "Client",
    metaDescription:
      "BI dashboard case studies with live reports to explore: client work with the figures altered and demos on synthetic data, built in {platforms}.",
    // The platform list after `lead` is built from the showcases on the site (lib/work.ts).
    intro: {
      lead: "Dashboards written up as short case studies: client work with the figures altered, and demos built on synthetic data. Open any one for the story and the live report — filter and drill down as its users do. Built in ",
      tail: ".",
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
    sheetLink: "the public Google Sheet",
    samplesLabel: "Sample invoices",
    sampleName: "Invoice #{n}",
    workflowLoading: "Loading the workflow…",
    workflowError:
      "The workflow preview couldn't be loaded. Try again in a minute.",
    paginationAria: "Showcase pages",
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
