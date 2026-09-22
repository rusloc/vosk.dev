import { env } from "./env";
import { localizedPath, type Locale } from "./i18n/config";

/**
 * Central site config — brand, nav, contact. Single source for metadata and UI.
 */
export const siteConfig = {
  name: "VOSK",
  title: "VOSK — Freelance BI Analyst & Developer",
  description:
    "Freelance Business Intelligence analyst and developer. Dashboards, data pipelines, and analytics that turn raw data into decisions.",
  url: env.NEXT_PUBLIC_SITE_URL,
  locale: "en_US",
  // Public/professional name; "Vosk" ties the person to the vosk.dev brand.
  // `name` is the byline (blog authors, OG cards, Person JSON-LD); `firstName`
  // is the informal form used where a full name reads stiff — the Contacts card
  // and the auto-reply signature.
  author: {
    name: "Kirill Vosk",
    firstName: "Kirill",
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
  // Real profile URLs only. The non-empty ones are also the Person's JSON-LD
  // `sameAs` in src/lib/structured-data.ts. An empty string renders the Contacts
  // row as a dull placeholder instead of a live link; a root URL like
  // "https://www.linkedin.com/" would dead-end the visitor on the platform's
  // home page, which is worse than no link at all.
  social: {
    github: "https://github.com/rusloc",
    linkedin: "https://www.linkedin.com/in/kirill-vosk/",
    upwork: "https://www.upwork.com/freelancers/~01a960a706057bdf85",
  },
} as const;

/**
 * Absolute URL for a logical path in a given locale — the one place that turns
 * "/blog/x" into "https://vosk.dev/ru/blog/x". Metadata can stay relative
 * (`metadataBase` absolutises it), but the sitemap, the RSS feed and JSON-LD all
 * need real absolute URLs, and each of them used to build its own.
 */
export function absoluteUrl(locale: Locale, path: string): string {
  return `${siteConfig.url}${localizedPath(locale, path)}`;
}
