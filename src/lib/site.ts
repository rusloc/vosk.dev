import { env } from "./env";

/**
 * Central site config — brand, nav, contact. Single source for metadata and UI.
 * TODO: replace placeholder social URLs with real profiles.
 */
export const siteConfig = {
  name: "VOSK",
  title: "VOSK — Freelance BI Analyst & Developer",
  description:
    "Freelance Business Intelligence analyst and developer. Dashboards, data pipelines, and analytics that turn raw data into decisions.",
  url: env.NEXT_PUBLIC_SITE_URL,
  nav: [
    { href: "/work", label: "Showcase" },
    { href: "/blog", label: "Blog" },
    { href: "/services", label: "Service" },
    { href: "/contact", label: "Contracts" },
  ],
  contactEmail: "vosk.dev@gmail.com",
  // Display form; `contactPhoneHref` is the tel: value (digits + leading +).
  contactPhone: "+90 506 042 59 33",
  contactPhoneHref: "+905060425933",
  social: {
    github: "https://github.com/",
    linkedin: "https://www.linkedin.com/",
  },
} as const;

export type SiteConfig = typeof siteConfig;
