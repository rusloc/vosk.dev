import { absoluteUrl, siteConfig } from "./site";
import { type Locale } from "./i18n/config";
import type { Dictionary } from "./i18n/en";

/** One price tier as the services dictionary holds it, display strings included. */
type Tier = Dictionary["services"]["subscription"]["tiers"][number];

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

// Where the practice works, in every graph that says so (SEO spec T-11 may narrow it to the UK and the EU).
const AREA_SERVED = "Worldwide";

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
 * full name is what this markup has to match: it is the H1 of `/about` and the byline of every post.
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
        areaServed: AREA_SERVED,
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
        // The page about the person (SEO spec T-05), not the site root.
        url: absoluteUrl("en", "/about"),
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
    inLanguage: IN_LANGUAGE,
    author: {
      "@type": "Person",
      "@id": PERSON_ID,
      name: author.name,
      url: absoluteUrl("en", "/about"),
    },
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
 * One tier as an Offer. The price stays the display string ("$1,500", "$2k–5k"): several tiers are ranges, and a
 * range is `priceSpecification`, not `price`.
 */
function tierOffer(tier: Tier, name: string, url: string) {
  return {
    "@type": "Offer",
    name,
    description: tier.desc,
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "PriceSpecification",
      price: tier.price,
      priceCurrency: "USD",
      unitText: tier.unit,
    },
    availability: "https://schema.org/InStock",
    url,
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
    groups: readonly { eyebrow: string; tiers: readonly Tier[] }[];
  },
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType: "Business Intelligence consulting",
    url: absoluteUrl(locale, "/services"),
    areaServed: AREA_SERVED,
    provider: { "@id": ORG_ID },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name,
      itemListElement: groups.map((group) => ({
        "@type": "OfferCatalog",
        name: group.eyebrow,
        itemListElement: group.tiers.map((tier) =>
          tierOffer(
            tier,
            `${group.eyebrow} — ${tier.name}`,
            absoluteUrl(locale, "/services"),
          ),
        ),
      })),
    },
  };
}

/**
 * Service for one /services/<slug> page (SEO spec T-04), the `serviceGraph` pattern for one service: the offers are
 * the tiers the page shows, with their display prices.
 */
export function serviceDetailGraph(
  locale: Locale,
  {
    slug,
    name,
    description,
    tiers,
  }: {
    slug: string;
    name: string;
    description: string;
    tiers: readonly Tier[];
  },
): Record<string, unknown> {
  const url = absoluteUrl(locale, `/services/${slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url,
    areaServed: AREA_SERVED,
    provider: { "@id": ORG_ID },
    offers: tiers.map((tier) => tierOffer(tier, tier.name, url)),
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
        areaServed: AREA_SERVED,
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
    description: string;
    platform: string;
    formats: string[]; // "Custom JS", "Power BI", "n8n": every format the page opens
    articleSlug?: string; // only when the page links the write-up
  },
): Record<string, unknown> {
  const url = absoluteUrl(locale, `/work/${showcase.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: showcase.title,
    description: showcase.description,
    url,
    image: `${url}/opengraph-image`,
    inLanguage: IN_LANGUAGE,
    creator: { "@id": PERSON_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    // An n8n showcase is a workflow, not a dashboard (11-17 SEO check)
    ...(showcase.platform === "automation"
      ? {
          genre: "Workflow automation",
          keywords: [...showcase.formats, "workflow automation", "AI"].join(
            ", ",
          ),
        }
      : {
          genre: "Data visualization",
          keywords: [
            ...showcase.formats,
            "dashboard",
            "business intelligence",
          ].join(", "),
        }),
    ...(showcase.articleSlug
      ? {
          subjectOf: {
            "@type": "BlogPosting",
            url: absoluteUrl(locale, `/blog/${showcase.articleSlug}`),
          },
        }
      : {}),
  };
}
