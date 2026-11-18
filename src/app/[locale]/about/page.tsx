import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { localizedPath, resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

// Profile rows, in the Contacts card's order; `rel="me"` pairs with the Person's JSON-LD `sameAs`.
const PROFILES = [
  ["LinkedIn", siteConfig.social.linkedin],
  ["Upwork", siteConfig.social.upwork],
  ["GitHub", siteConfig.social.github],
] as const;

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
      <PageHeader title={siteConfig.author.name}>{t.lede}</PageHeader>

      <div className="mt-6 max-w-prose space-y-4">
        {t.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

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

      <section className="mt-10 max-w-prose">
        <h2 className={h2}>{t.profilesTitle}</h2>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {PROFILES.filter(([, url]) => url).map(([name, url]) => (
            <li key={name}>
              <a
                href={url}
                target="_blank"
                rel="me noopener noreferrer"
                className="text-primary hover:underline"
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 max-w-prose">
        {t.nextBody}{" "}
        <Link
          href={localizedPath(l, "/work")}
          className="text-primary hover:underline"
        >
          {t.nextWork}
        </Link>
        {" · "}
        <Link
          href={localizedPath(l, "/services")}
          className="text-primary hover:underline"
        >
          {t.nextServices}
        </Link>
      </p>
    </Container>
  );
}
