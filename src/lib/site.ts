import { env } from "./env";
import { localizedPath, type Locale } from "./i18n/config";
import { en } from "./i18n/en";
import { AUTHOR_NAME } from "./person";

/**
 * Central site config — brand, nav, contact. Single source for metadata and UI.
 */
export const siteConfig = {
  name: "VOSK",
  // The site-wide title and description live in the dictionary (the layout reads them there); one copy (SEO spec T-02).
  title: en.meta.title,
  description: en.meta.description,
  url: env.NEXT_PUBLIC_SITE_URL,
  locale: "en_US",
  // Public/professional name; "Vosk" ties the person to the vosk.dev brand.
  // `name` is the byline (blog authors, OG cards, Person JSON-LD); `firstName`
  // is the informal form used where a full name reads stiff — the Contacts card
  // and the auto-reply signature.
  author: {
    name: AUTHOR_NAME,
    firstName: "Kirill",
    jobTitle: "Power BI & Microsoft Fabric Consultant",
  },
  nav: [
    { href: "/", label: "Home" },
    { href: "/work", label: "Showcase" },
    { href: "/blog", label: "Blog" },
    { href: "/services", label: "Services" },
    { href: "/contact", label: "Contacts" },
  ],
  contactEmail: "vosk.dev@gmail.com",
  // SEO spec T-06 (11-18): both stay empty until the owner gives them; empty = nothing on /contact. A call-booking
  // link (Calendly / Cal.com) and the reply time to promise ("I reply within one working day").
  bookingUrl: "",
  replyTime: "",
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
  // A credential, not a profile: kept out of `social`, which feeds the Person's `sameAs`.
  // The /about "Worked with" column (owner, 11-27); each logo links to the domain the owner gave. Files in public/images/clients/, from each company's site (Citilink's from
  // its Wikipedia page; the site sits behind a bot check); Realweb's white logo recoloured to the site's foreground.
  clients: [
    {
      name: "X5 Group",
      url: "https://www.x5.ru",
      logo: "/images/clients/x5.svg",
      width: 62,
      height: 42,
    },
    {
      name: "eapteka",
      url: "https://www.eapteka.ru",
      logo: "/images/clients/eapteka.svg",
      width: 228,
      height: 56,
    },
    {
      name: "ISS Global Forwarding",
      url: "https://iss-globalforwarding.com",
      logo: "/images/clients/iss.png",
      // small print in the logo: one step taller than the others
      tall: true,
      width: 262,
      height: 76,
    },
    {
      name: "Citilink",
      url: "https://www.citilink.ru",
      logo: "/images/clients/citilink.svg",
      width: 195,
      height: 40,
    },
    {
      name: "Realweb",
      url: "https://realweb.ru",
      logo: "/images/clients/realweb.svg",
      width: 126,
      height: 38,
    },
  ],
  dp600Url:
    "https://learn.microsoft.com/api/credentials/share/en-us/KirillBezzubkinISSGHQ-1802/65289BC12515DA2B?sharingId=617FA0AB7D498F12",
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
