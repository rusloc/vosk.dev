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
  locale: "en_US",
  // Public/professional name; "Vosk" ties the person to the vosk.dev brand.
  // `legalName` is what appears on contracts/invoices/ID — shown in the footer
  // so the brand resolves to an accountable person (and not translated: legal
  // identity is the same string in every locale).
  author: {
    name: "Kirill Vosk",
    legalName: "Kirill Bezzubkin",
    jobTitle: "Freelance BI Analyst & Developer",
  },
  nav: [
    { href: "/", label: "Home" },
    { href: "/work", label: "Showcase" },
    { href: "/blog", label: "Blog" },
    { href: "/services", label: "Services" },
    { href: "/contact", label: "Contacts" },
  ],
  contactEmail: "vosk.dev@gmail.com",
  // Display form; `contactPhoneHref` is the tel: value (digits + leading +).
  contactPhone: "+90 506 042 59 33",
  contactPhoneHref: "+905060425933",
  // TODO: replace with real profile URLs, then add them to JSON-LD `sameAs`
  // in src/lib/structured-data.ts (currently omitted — no false entity signals).
  social: {
    github: "https://github.com/",
    linkedin: "https://www.linkedin.com/",
  },
} as const;
