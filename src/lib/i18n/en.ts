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
    cta: "View case studies",
  },
  footer: {
    available: "Available for new projects",
  },
  services: {
    title: "Services",
    metaDescription: "BI consulting, dashboard development, and data pipelines.",
    subscription: {
      eyebrow: "Subscription",
      tiers: [
        {
          name: "Small",
          desc: "Light monthly upkeep — around 40h a month of small changes and priority answers.",
          price: "$1,500",
          unit: "/ mo",
        },
        {
          name: "Medium",
          desc: "Steady monthly capacity — around 60h a month for changes, new reports, and support.",
          price: "$2,200",
          unit: "/ mo",
        },
        {
          name: "Large",
          desc: "High-volume monthly work — around 80h a month across your full reporting stack.",
          price: "$3,000",
          unit: "/ mo",
        },
      ],
      servicesTitle: "Every subscription plan includes",
      services: [
        "Full-stack service",
        "Architecture setup",
        "Data management (ETL, quality)",
        "Reporting",
        "Automation solutions",
        "Analytics solutions",
        "Audit",
      ],
    },
    project: {
      eyebrow: "Project",
      tiers: [
        {
          name: "Short",
          desc: "A single dashboard or focused report, scoped and shipped end to end.",
          price: "$2k–5k",
          unit: "project",
        },
        {
          name: "Mid",
          desc: "A clean data model plus a connected set of dashboards for a team.",
          price: "$5k–12k",
          unit: "project",
        },
        {
          name: "Long",
          desc: "A full reporting platform built and evolved from source data to delivery.",
          price: "$10k–25k",
          unit: "project",
        },
      ],
    },
    other: {
      eyebrow: "Other",
      // Prices for full-time / tutoring are placeholders — confirm before publish.
      tiers: [
        {
          name: "Urgent",
          desc: "Same-week fix for a broken report, blocked refresh, or a deadline dashboard.",
          price: "$1k–3k",
          unit: "one-off",
        },
        {
          name: "Full-time",
          desc: "Dedicated full-time BI work as an embedded member of your team, month to month.",
          price: "from $6k",
          unit: "/ mo",
        },
        {
          name: "Education",
          desc: "One-on-one sessions on Power BI, DAX, SQL, and data modeling.",
          price: "$50",
          unit: "/ hr",
        },
      ],
    },
    cta: {
      title: "Not sure which one fits?",
      body: "Tell me what you're working on and I'll point you to the right engagement.",
      button: "Message me",
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
    prevAria: "Previous",
    nextAria: "Next",
  },
  contact: {
    title: "Contacts",
    metaDescription: "Get in touch about a BI or analytics project.",
    intro: "Send your business related message straight into my email box.",
    labelName: "Name",
    labelEmail: "Email",
    labelPhone: "Phone",
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
    metaTitle: "Blog",
    metaDescription: "Notes on BI, analytics, and data engineering.",
    empty: "Articles coming soon.",
    searchPlaceholder: "Search posts by keyword…",
    searchAria: "Search blog posts",
    newestFirst: "Newest first",
    oldestFirst: "Oldest first",
    noMatch: "No posts match",
    backToBlog: "Back to blog",
    older: "Older",
    newer: "Newer",
    paginationAria: "Blog pages",
  },
  work: {
    title: "Showcase",
    metaDescription:
      "Client dashboards written up as case studies — each with the story and a live Power BI or Apache Superset report you can explore.",
    intro: {
      lead: "Real client dashboards, written up as short case studies. Open any one for the story and the live report — filter and drill down exactly as the client does. Built in ",
      powerbi: "Power BI",
      and: " and ",
      superset: "Apache Superset",
      tail: ".",
    },
    empty: "Case studies coming soon.",
    backToShowcase: "Back to showcase",
    openLiveDashboard: "Open live dashboard",
    readWriteUp: "Read the full write-up on the blog",
    openLiveReport: "Open the live report",
    paginationAria: "Showcase pages",
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
