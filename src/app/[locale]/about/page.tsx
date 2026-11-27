import { Fragment } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { PageHeader } from "@/components/page-header";
import { buildMetadata } from "@/lib/metadata";
import { aboutGraph } from "@/lib/structured-data";
import { siteConfig } from "@/lib/site";
import { ga } from "@/lib/analytics";
import { resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

/**
 * A profile row of the Contacts block. Until `siteConfig.social` holds a real URL it renders dull text: a link to a
 * platform's root would dead-end the visitor. `rel="me"` pairs with the Person's JSON-LD `sameAs`. Every row shares one
 * link text, so the `aria-label` names the platform (WCAG 2.5.3: it still contains the visible text).
 */
function Profile({
  url,
  platform,
  text,
  pending,
}: {
  url: string;
  platform: string;
  text: string;
  pending: string;
}) {
  if (!url) {
    return <span className="text-muted-foreground/60 italic">{pending}</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="me noopener noreferrer"
      aria-label={`${platform}: ${text}`}
      className="text-primary hover:underline"
    >
      {text}
    </a>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).about;
  // The title already names the person, so no "| Kirill Vosk" suffix (SEO spec T-05).
  return buildMetadata({
    title: t.metaTitle,
    absoluteTitle: true,
    description: t.metaDescription,
    path: "/about",
    locale: l,
  });
}

/** Who is behind the site (SEO spec T-05, 11-18): the facts the spec allows, the credential, the profiles. */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).about;
  const h2 = "text-lg font-semibold tracking-tight";

  return (
    <Container className="py-10 sm:py-12">
      <JsonLd data={aboutGraph()} />
      <PageHeader title={siteConfig.author.name}>{t.lede}</PageHeader>

      <div className="mt-6 max-w-prose space-y-4">
        {t.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      {/* Logos at one height, muted until hover (owner, 11-27); not links: the page keeps the visitor. */}
      <section className="mt-10 max-w-3xl">
        <h2 className={h2}>{t.clientsTitle}</h2>
        <ul className="mt-4 flex flex-wrap items-center gap-x-10 gap-y-6">
          {siteConfig.clients.map((c) => (
            <li key={c.name}>
              <Image
                src={c.logo}
                alt={c.name}
                title={c.name}
                width={c.width}
                height={c.height}
                className={`${"tall" in c ? "h-10" : "h-8"} w-auto opacity-70 grayscale transition duration-200 hover:opacity-100 hover:grayscale-0`}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 max-w-prose">
        <h2 className={h2}>{t.stackTitle}</h2>
        <ul className="text-muted-foreground mt-3 flex flex-wrap gap-2 text-sm">
          {t.stack.map((s) => (
            <li key={s} className="border-border rounded-full border px-3 py-1">
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 max-w-prose">
        <h2 className={h2}>{t.credentialTitle}</h2>
        <p className="mt-3">
          {t.credential}:{" "}
          <a
            href={siteConfig.dp600Url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t.linkCertificate}
          </a>
        </p>
      </section>

      {/* Moved here from /contact (owner, 11-20). A two-column grid, so the label column sizes to the longest label. */}
      <section className="mt-10 max-w-prose">
        <h2 className={h2}>{t.contactsTitle}</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted-foreground">{t.labelName}</dt>
          <dd className="font-medium">{siteConfig.author.firstName}</dd>

          <dt className="text-muted-foreground">{t.labelEmail}</dt>
          <dd>
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="text-primary hover:underline"
              {...ga("email_click", undefined, "about")}
            >
              {siteConfig.contactEmail}
            </a>
          </dd>

          {(
            [
              [t.labelLinkedin, siteConfig.social.linkedin],
              [t.labelUpwork, siteConfig.social.upwork],
              [t.labelGithub, siteConfig.social.github],
            ] as const
          ).map(([platform, url]) => (
            <Fragment key={platform}>
              <dt className="text-muted-foreground">{platform}</dt>
              <dd>
                <Profile
                  url={url}
                  platform={platform}
                  text={t.linkProfile}
                  pending={t.linkPending}
                />
              </dd>
            </Fragment>
          ))}

          <dt className="text-muted-foreground">{t.labelDp600}</dt>
          <dd>
            <a
              href={siteConfig.dp600Url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t.labelDp600}: ${t.linkCertificate}`}
              className="text-primary hover:underline"
            >
              {t.linkCertificate}
            </a>
          </dd>
        </dl>
      </section>
    </Container>
  );
}
