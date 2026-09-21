import { absoluteUrl, siteConfig } from "./site";
import { type Locale } from "./i18n/config";

/**
 * JSON-LD builders. Every graph is emitted server-side via `<JsonLd>` and must
 * mirror what the page actually shows — markup describing things a visitor
 * can't see is a manual-action offense, not a shortcut.
 *
 * Entity `@id`s are anchored to the English (canonical) origin so the org, the
 * person and the site resolve to one entity.
 */
const ORG_ID = `${siteConfig.url}/#org`;
const PERSON_ID = `${siteConfig.url}/#person`;
const WEBSITE_ID = `${siteConfig.url}/#website`;

// The site publishes one language. This was a `locale => tag` lookup while
// Russian existed; it is a constant now rather than a function that ignores its
// argument. A second locale turns it back into a lookup at these four call sites.
const IN_LANGUAGE = "en-US";

/**
 * Home-page structured data: the freelancer (Person), the practice
 * (ProfessionalService) and the site (WebSite), linked by @id.
 * Emit once on the home page via <JsonLd data={homeGraph()} />. Takes no locale:
 * every URL in this graph is the site origin and the language is the constant
 * above. The other builders still take one because they resolve per-page URLs.
 *
 * `sameAs` is every non-empty `siteConfig.social` URL — the same profiles the
 * Contacts card links with `rel="me"`. Person markup mirrors the byline the site shows
 * publicly — blog authors and the per-post OG cards (required for policy
 * compliance). The Contacts card deliberately shows the first name only; the
 * full name is what this markup has to match, and it is visible on every post.
 */
export function homeGraph(): Record<string, unknown> {
  const { name, title, description, author, contactEmail } = siteConfig;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": ORG_ID,
        name,
        alternateName: title,
        url: siteConfig.url,
        description,
        areaServed: "Worldwide",
        founder: { "@id": PERSON_ID },
        email: contactEmail,
        knowsAbout: [
          "Business Intelligence",
          "Power BI",
          "Apache Superset",
          "DAX",
          "SQL",
          "PostgreSQL",
          "Data modeling",
          "ETL",
        ],
      },
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: author.name,
        jobTitle: author.jobTitle,
        url: siteConfig.url,
        sameAs: Object.values(siteConfig.social).filter(Boolean),
        worksFor: { "@id": ORG_ID },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: siteConfig.url,
        name,
        inLanguage: IN_LANGUAGE,
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}

/**
 * BlogPosting schema for a single article. Author mirrors the site's Person entity.
 *
 * `locale` is required: the URL properties have to match the page's canonical,
 * and a Russian page emitting English URLs contradicts its own `<link rel=canonical>`.
 * `inLanguage` is always English — the prose is, whichever locale's chrome wraps it.
 */
export function blogPostingGraph(
  locale: Locale,
  post: {
    slug: string;
    title: string;
    description: string;
    date: string;
    updated?: string;
    tags: string[];
  },
): Record<string, unknown> {
  const { author } = siteConfig;
  const postUrl = absoluteUrl(locale, `/blog/${post.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    inLanguage: "en-US",
    author: { "@type": "Person", "@id": PERSON_ID, name: author.name },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    mainEntityOfPage: postUrl,
    url: postUrl,
    image: `${postUrl}/opengraph-image`,
    ...(post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
  };
}

/**
 * BreadcrumbList for pages below the home page. The last crumb is the current
 * page and carries no `item`, per Google's guidance. Mirrors the visible
 * <Breadcrumbs> trail — emit both or neither.
 */
export function breadcrumbGraph(
  locale: Locale,
  trail: readonly { name: string; path?: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absoluteUrl(locale, crumb.path) } : {}),
    })),
  };
}

/** CollectionPage + ItemList for /blog and the tag pages. */
export function collectionGraph(
  locale: Locale,
  {
    name,
    description,
    path,
    posts,
  }: {
    name: string;
    description: string;
    path: string;
    posts: readonly { slug: string; title: string }[];
  },
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(locale, path),
    inLanguage: IN_LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: posts.length,
      itemListElement: posts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: post.title,
        url: absoluteUrl(locale, `/blog/${post.slug}`),
      })),
    },
  };
}

/**
 * Service + OfferCatalog for /services, built from the same dictionary the page
 * renders — so the markup can't drift from the visible prices.
 *
 * Prices are passed through as the display strings ("$1,500", "$2k–5k"): several
 * tiers are genuinely ranges, and a range is `priceSpecification`, not `price`.
 * Emitting a single invented number for "$2k–5k" would be markup that doesn't
 * match the page.
 */
export function serviceGraph(
  locale: Locale,
  {
    name,
    description,
    groups,
  }: {
    name: string;
    description: string;
    groups: readonly {
      eyebrow: string;
      tiers: readonly { name: string; desc: string; price: string; unit: string }[];
    }[];
  },
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType: "Business Intelligence consulting",
    url: absoluteUrl(locale, "/services"),
    areaServed: "Worldwide",
    provider: { "@id": ORG_ID },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name,
      itemListElement: groups.map((group) => ({
        "@type": "OfferCatalog",
        name: group.eyebrow,
        itemListElement: group.tiers.map((tier) => ({
          "@type": "Offer",
          name: `${group.eyebrow} — ${tier.name}`,
          description: tier.desc,
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "PriceSpecification",
            price: tier.price,
            priceCurrency: "USD",
            unitText: tier.unit,
          },
          availability: "https://schema.org/InStock",
          url: absoluteUrl(locale, "/services"),
        })),
      })),
    },
  };
}

/**
 * ContactPage + the org's ContactPoint. `email` is the only channel here because
 * it is the only one visible on the page — the phone row was removed 08-07 and
 * `telephone` went with it, since markup that claims a channel the page does not
 * offer is exactly the mismatch this file exists to avoid.
 */
export function contactGraph(
  locale: Locale,
  { name, description }: { name: string; description: string },
): Record<string, unknown> {
  const { contactEmail } = siteConfig;

  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name,
    description,
    url: absoluteUrl(locale, "/contact"),
    inLanguage: IN_LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@id": ORG_ID,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        email: contactEmail,
        areaServed: "Worldwide",
        availableLanguage: ["en"],
      },
    },
  };
}

/**
 * CreativeWork for a /work/[slug] case study. The live report is an iframe —
 * opaque to crawlers — so this is the only machine-readable description of what
 * the page actually demonstrates.
 */
export function showcaseGraph(
  locale: Locale,
  showcase: {
    slug: string;
    title: string;
    summary: string;
    platform: string;
    platformLabel: string;
  },
): Record<string, unknown> {
  const url = absoluteUrl(locale, `/work/${showcase.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: showcase.title,
    description: showcase.summary,
    url,
    inLanguage: IN_LANGUAGE,
    creator: { "@id": PERSON_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    genre: "Data visualization",
    keywords: [showcase.platformLabel, "dashboard", "business intelligence"].join(
      ", ",
    ),
  };
}
