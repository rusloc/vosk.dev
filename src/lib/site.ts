import { env } from "./env";

/**
 * Central site config — brand, nav, contact. Single source for metadata and UI.
 * TODO: replace placeholder owner details (email/social) with real values.
 */
export const siteConfig = {
  name: "VOSK",
  title: "VOSK — Freelance BI Analyst & Developer",
  description:
    "Freelance Business Intelligence analyst and developer. Dashboards, data pipelines, and analytics that turn raw data into decisions.",
  url: env.NEXT_PUBLIC_SITE_URL,
  nav: [
    { href: "/work", label: "Work" },
    { href: "/services", label: "Services" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ],
  contactEmail: "hello@vosk.dev",
  social: {
    github: "https://github.com/",
    linkedin: "https://www.linkedin.com/",
  },
} as const;

export type SiteConfig = typeof siteConfig;
