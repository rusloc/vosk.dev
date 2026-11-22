import type { Metadata } from "next";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { ChangeConsentButton } from "@/components/analytics";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).privacy;
  // A legal page, not a search target: reachable from every footer, kept out of the index and the sitemap.
  return buildMetadata({
    title: t.title,
    description: t.metaDescription,
    path: "/privacy",
    locale: l,
    robots: { index: false, follow: true },
  });
}

/** What the site collects (readiness spec R-06, 11-19). Each line is a fact about the code; see the dictionary note. */
export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).privacy;
  const h2 = "text-lg font-semibold tracking-tight";

  return (
    <Container className="py-10 sm:py-12">
      <PageHeader title={t.title}>{t.lede}</PageHeader>
      <p className="text-muted-foreground mt-2 text-sm">{t.updated}</p>

      {t.sections.map((s) => (
        <section key={s.title} className="mt-8 max-w-prose">
          <h2 className={h2}>{s.title}</h2>
          <div className="mt-3 space-y-3">
            {s.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-8 max-w-prose">
        <h2 className={h2}>{t.contactTitle}</h2>
        <p className="mt-3">
          {t.contactBody}{" "}
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="text-primary hover:underline"
          >
            {siteConfig.contactEmail}
          </a>
          .
        </p>
        <div className="mt-6">
          <ChangeConsentButton label={t.changeChoice} />
        </div>
      </section>
    </Container>
  );
}
