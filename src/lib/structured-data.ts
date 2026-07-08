import { siteConfig } from "./site";

/**
 * Home-page structured data: the freelancer (Person "Alex Vosk"), the practice
 * (ProfessionalService "VOSK"), and the site (WebSite), linked by @id.
 * Emit once on the home page via <JsonLd data={homeGraph()} />.
 *
 * `sameAs` is intentionally omitted until real social profile URLs exist — see
 * the TODO in src/lib/site.ts. Person markup mirrors the visible "Alex Vosk"
 * name on the Contacts page (required for policy compliance).
 */
export function homeGraph(): Record<string, unknown> {
  const { url, name, title, description, author } = siteConfig;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": `${url}/#org`,
        name,
        alternateName: title,
        url,
        description,
        areaServed: "Worldwide",
        founder: { "@id": `${url}/#person` },
      },
      {
        "@type": "Person",
        "@id": `${url}/#person`,
        name: author.name,
        jobTitle: author.jobTitle,
        url,
        worksFor: { "@id": `${url}/#org` },
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name,
        publisher: { "@id": `${url}/#org` },
      },
    ],
  };
}
